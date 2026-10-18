import { useCallback, useMemo, useState } from "react";
import { useCreateDelivery } from "@/features/deliveries/hooks/use-create-delivery";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { hasPriceMismatch } from "@/features/deliveries/lib/format";
import type { CreateDeliveryResult, NewDeliveryInput } from "@/features/deliveries/types";
import type { ItemUnit } from "@/types/schema";
import { AUTO_TOTAL_INPUTS, withAutoTotal } from "../lib/auto-total";
import { summarizeDraft, type DraftSummary } from "../lib/draft-summary";
import { checkReceiptTotals, type TotalsCheck } from "../lib/receipt-totals";
import { findRepeatedItems, type RepeatedItemGroup, type RowRepeat } from "../lib/repeated-items";
import { describeSaveError } from "../lib/save-error";
import { deliveryCodeMismatch } from "../lib/sibling-delivery-codes";
import type { DraftHeader, DraftItem, OcrResult } from "../types";

// §6 flow B step 4-5: the review/edit screen's state. Seeded from the OCR
// result, fully editable (incl. the Inv. Tran. No. — §5 rule 2 calls out
// that a misread there matters more than a misread item name), and owns
// the confirm → write step against features/deliveries.
export type DraftStage = "editing" | "submitting" | "submitted";

// The editable (string) cells of a row — not its OCR metadata.
export type DraftItemField =
  | "item_code"
  | "item_name"
  | "unit_count"
  | "quantity"
  | "unit"
  | "item_price"
  | "total_item_price";

export interface DraftItemView extends DraftItem {
  hasMismatch: boolean;
  // Cells the user still needs to look at: empty on a row that has other
  // content (OCR couldn't read them). item_code is left out — a receipt may
  // legitimately have no code (§4).
  blankFields: DraftItemField[];
  // Set when another row has the same item code (or, with no code, the same
  // description) — the backend will combine them on save.
  repeat: RowRepeat | null;
}

export interface UseDeliveryDraftResult {
  header: DraftHeader;
  items: DraftItemView[];
  // §5 rule 6: the receipt is addressed to a different store than this
  // session's. This blocks saving — a receipt for one store must not end up
  // in another store's records.
  storeMismatch: boolean;
  // The backend requires the receipt's "To" store code; OCR returns it blank
  // when it couldn't read it, so it has to be typed from the paper.
  missingReceiptStoreCode: boolean;
  // Same for the Transaction date: the backend rejects a blank one (400),
  // and a later page of a batch can come back without it.
  missingDeliveryDate: boolean;
  // Same for the Inv. Tran. No. — the backend rejects a blank one (400), and
  // without it there's no delivery to save the rows under.
  missingDeliveryCode: boolean;
  // The codes other pages of this receipt read, when this page's Inv. Tran.
  // No. matches none of them (likely a misread — saving it would create a
  // second delivery); [] otherwise. Blocks saving until the code is changed
  // to match or staff keep it (keepDeliveryCode).
  deliveryCodeConflict: string[];
  // Staff kept this page's code although the other pages read a different
  // one.
  deliveryCodeKept: boolean;
  // Rows with numbers/code but no description. Dropping them silently would
  // lose data, so they block saving until named or removed.
  unnamedRowCount: number;
  // Red-outlined cells still blank across all rows (item_name excluded —
  // unnamedRowCount covers it). They block saving: a half-read row saved
  // as-is would put a wrong/unknown quantity or price on record.
  blankFieldCount: number;
  // The rows compared against the receipt's printed totals block — a
  // warning (a row may be missing, or a quantity misread), not a block.
  totalsCheck: TotalsCheck;
  // Rows the backend will combine into one on save. A warning, not a block —
  // a receipt can genuinely print an item twice — but one with
  // differingFields is likely a misread code, which can't be fixed after save.
  repeatedItems: RepeatedItemGroup[];
  // Grand totals summed from the rows as they stand (not the receipt's
  // printed ones), for staff to check against the paper.
  summary: DraftSummary;
  // Offline mode is read-only (frontend-left-to-do.md §4): Confirm waits for
  // the connection. Edits stay in the draft meanwhile.
  isOffline: boolean;
  canConfirm: boolean;
  stage: DraftStage;
  result: CreateDeliveryResult | null;
  submitError: string | null;
  updateHeaderField: (field: keyof DraftHeader, value: string) => void;
  // "This page is right": accept the current code despite the other pages.
  // Only that exact code — editing it afterwards checks again.
  keepDeliveryCode: () => void;
  updateItemField: (localId: string, field: DraftItemField, value: string) => void;
  addItem: () => void;
  removeItem: (localId: string) => void;
  confirm: () => void;
  editAgain: () => void;
}

const REQUIRED_ITEM_FIELDS: DraftItemField[] = [
  "item_name",
  "unit_count",
  "unit",
  "quantity",
  "item_price",
  "total_item_price",
];

function emptyItem(): DraftItem {
  return {
    localId: crypto.randomUUID(),
    item_code: "",
    item_name: "",
    unit_count: "",
    quantity: "",
    unit: "PIECE",
    item_price: "",
    total_item_price: "",
    inferred: [],
    has_annotation: false,
  };
}

const isBlank = (value: string): boolean => !value.trim();

function toNumberOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function toItemUnitOrNull(value: string): ItemUnit | null {
  return value === "BOX" || value === "PIECE" ? value : null;
}

// `unit` is deliberately not counted: a freshly added row defaults it to
// PIECE, and that alone shouldn't make the row look "started".
function hasContent(item: DraftItem): boolean {
  return [
    item.item_code,
    item.item_name,
    item.unit_count,
    item.quantity,
    item.item_price,
    item.total_item_price,
  ].some((value) => !isBlank(value));
}

function blankFieldsOf(item: DraftItem): DraftItemField[] {
  return hasContent(item) ? REQUIRED_ITEM_FIELDS.filter((field) => isBlank(item[field])) : [];
}

// Rows OCR left incomplete go first, so staff don't scroll a 40-row page to
// find the few red-outlined cells. Stable, and done once when the draft is
// seeded — re-sorting on edit would move a row out from under the user as
// they fill it in.
function missingFirst(items: DraftItem[]): DraftItem[] {
  const incomplete = items.filter((item) => blankFieldsOf(item).length > 0);
  if (incomplete.length === 0) return items;
  return [...incomplete, ...items.filter((item) => blankFieldsOf(item).length === 0)];
}

// `siblingDeliveryCodes`: the Inv. Tran. Nos. the other pages of the same
// print run stand at (useSiblingDeliveryCodes) — [] for a single photo.
export function useDeliveryDraft(
  ocrResult: OcrResult,
  sessionStoreCode: string,
  siblingDeliveryCodes: string[] = [],
): UseDeliveryDraftResult {
  const [header, setHeader] = useState<DraftHeader>(ocrResult.header);
  const [items, setItems] = useState<DraftItem[]>(() => missingFirst(ocrResult.items.map(withAutoTotal)));
  const [keptDeliveryCode, setKeptDeliveryCode] = useState<string | null>(null);
  const [stage, setStage] = useState<DraftStage>("editing");
  const [result, setResult] = useState<CreateDeliveryResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { submitDelivery } = useCreateDelivery();
  const isOffline = !useOnlineStatus();

  const receiptStoreCode = header.receipt_store_code.trim().toUpperCase();
  const missingReceiptStoreCode = !receiptStoreCode;
  const missingDeliveryDate = isBlank(header.delivery_date);
  const missingDeliveryCode = isBlank(header.delivery_code);
  const storeMismatch = Boolean(receiptStoreCode) && receiptStoreCode !== sessionStoreCode.trim().toUpperCase();

  const mismatchedSiblingCodes = deliveryCodeMismatch(header.delivery_code, siblingDeliveryCodes);
  const deliveryCodeKept = mismatchedSiblingCodes.length > 0 && keptDeliveryCode === header.delivery_code.trim();
  const deliveryCodeConflict = deliveryCodeKept ? [] : mismatchedSiblingCodes;

  const repeatedItems = useMemo(() => findRepeatedItems(items), [items]);

  const itemViews: DraftItemView[] = useMemo(() => {
    const groupOf = new Map(
      repeatedItems.flatMap((group) => group.localIds.map((localId) => [localId, group] as const)),
    );
    return items.map((item) => {
      const group = groupOf.get(item.localId);
      return {
        ...item,
        hasMismatch: hasPriceMismatch(
          toNumberOrNull(item.quantity),
          toNumberOrNull(item.unit_count),
          toNumberOrNull(item.item_price),
          toNumberOrNull(item.total_item_price),
        ),
        blankFields: blankFieldsOf(item),
        repeat: group
          ? {
              matchedBy: group.matchedBy,
              differingFields: group.differingFields,
              otherRows: group.localIds.length - 1,
            }
          : null,
      };
    });
  }, [items, repeatedItems]);

  const unnamedRowCount = useMemo(
    () => itemViews.filter((item) => hasContent(item) && isBlank(item.item_name)).length,
    [itemViews],
  );

  const blankFieldCount = useMemo(
    () => itemViews.reduce((sum, item) => sum + item.blankFields.filter((f) => f !== "item_name").length, 0),
    [itemViews],
  );

  const totalsCheck = useMemo(() => checkReceiptTotals(ocrResult.totals, items), [ocrResult.totals, items]);

  const summary = useMemo(() => summarizeDraft(items.filter(hasContent)), [items]);

  const canConfirm =
    !isOffline &&
    !storeMismatch &&
    !missingReceiptStoreCode &&
    !missingDeliveryDate &&
    !missingDeliveryCode &&
    deliveryCodeConflict.length === 0 &&
    unnamedRowCount === 0 &&
    blankFieldCount === 0 &&
    items.length > 0;

  const updateHeaderField = useCallback((field: keyof DraftHeader, value: string) => {
    setHeader((prev) => ({ ...prev, [field]: value }));
  }, []);

  const keepDeliveryCode = useCallback(() => {
    setKeptDeliveryCode(header.delivery_code.trim());
  }, [header.delivery_code]);

  // A cell the user typed is no longer "calculated". Editing Qty, Unit/Box or
  // Price refreshes a blank or calculated Total; editing the Total itself
  // doesn't — clearing it to retype must not have it refill underneath.
  const updateItemField = useCallback(
    (localId: string, field: DraftItemField, value: string) => {
      setItems((prev) =>
        prev.map((item) => {
          if (item.localId !== localId) return item;
          const next = { ...item, [field]: value, inferred: item.inferred.filter((f) => f !== field) };
          return (AUTO_TOTAL_INPUTS as readonly string[]).includes(field) ? withAutoTotal(next) : next;
        }),
      );
    },
    [],
  );

  const addItem = useCallback(() => {
    setItems((prev) => [...prev, emptyItem()]);
  }, []);

  const removeItem = useCallback((localId: string) => {
    setItems((prev) => prev.filter((item) => item.localId !== localId));
  }, []);

  const confirm = useCallback(() => {
    if (!canConfirm) return;
    setStage("submitting");
    setSubmitError(null);

    const input: NewDeliveryInput = {
      delivery_code: header.delivery_code.trim(),
      store_code: sessionStoreCode,
      warehouse_code: header.warehouse_code.trim() || null,
      delivery_date: header.delivery_date,
      receipt_store_code: header.receipt_store_code.trim(),
      items: items
        // Only fully empty rows reach this filter blank — a row with other
        // content but no name blocks confirm (unnamedRowCount).
        .filter((item) => item.item_name.trim())
        .map((item) => ({
          item_code: item.item_code.trim() || null,
          item_name: item.item_name.trim(),
          unit_count: toNumberOrNull(item.unit_count),
          quantity: toNumberOrNull(item.quantity),
          unit: toItemUnitOrNull(item.unit),
          item_price: toNumberOrNull(item.item_price),
          total_item_price: toNumberOrNull(item.total_item_price),
        })),
    };

    void submitDelivery(input)
      .then((res) => {
        setResult(res);
        setStage("submitted");
      })
      .catch((err: unknown) => {
        // A network failure or an HTTP error, distinct from a domain-level
        // rejection (duplicate_delivery/store_mismatch/partial, which resolve
        // normally) — stay on the review screen with the typed rows intact,
        // same as editAgain. describeSaveError tells the two kinds apart.
        setSubmitError(describeSaveError(err));
        setStage("editing");
      });
  }, [canConfirm, header, items, sessionStoreCode, submitDelivery]);

  // Lets the review screen return to editing after a duplicate_delivery or
  // store_mismatch rejection (§5 rules 2, 6) without losing the item rows
  // already keyed in.
  const editAgain = useCallback(() => {
    setStage("editing");
    setResult(null);
  }, []);

  return {
    header,
    items: itemViews,
    storeMismatch,
    missingReceiptStoreCode,
    missingDeliveryDate,
    missingDeliveryCode,
    deliveryCodeConflict,
    deliveryCodeKept,
    unnamedRowCount,
    blankFieldCount,
    totalsCheck,
    repeatedItems,
    summary,
    isOffline,
    canConfirm,
    stage,
    result,
    submitError,
    updateHeaderField,
    keepDeliveryCode,
    updateItemField,
    addItem,
    removeItem,
    confirm,
    editAgain,
  };
}
