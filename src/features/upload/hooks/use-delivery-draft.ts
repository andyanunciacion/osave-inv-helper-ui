import { useCallback, useMemo, useState } from "react";
import { useCreateDelivery } from "@/features/deliveries/hooks/use-create-delivery";
import { hasPriceMismatch } from "@/features/deliveries/lib/format";
import type { CreateDeliveryResult, NewDeliveryInput } from "@/features/deliveries/types";
import type { ItemUnit } from "@/types/schema";
import { checkReceiptTotals, type TotalsCheck } from "../lib/receipt-totals";
import { describeSaveError } from "../lib/save-error";
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
  canConfirm: boolean;
  stage: DraftStage;
  result: CreateDeliveryResult | null;
  submitError: string | null;
  updateHeaderField: (field: keyof DraftHeader, value: string) => void;
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

export function useDeliveryDraft(
  ocrResult: OcrResult,
  sessionStoreCode: string,
): UseDeliveryDraftResult {
  const [header, setHeader] = useState<DraftHeader>(ocrResult.header);
  const [items, setItems] = useState<DraftItem[]>(() => missingFirst(ocrResult.items));
  const [stage, setStage] = useState<DraftStage>("editing");
  const [result, setResult] = useState<CreateDeliveryResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { submitDelivery } = useCreateDelivery();

  const receiptStoreCode = header.receipt_store_code.trim().toUpperCase();
  const missingReceiptStoreCode = !receiptStoreCode;
  const missingDeliveryDate = isBlank(header.delivery_date);
  const storeMismatch = Boolean(receiptStoreCode) && receiptStoreCode !== sessionStoreCode.trim().toUpperCase();

  const itemViews: DraftItemView[] = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        hasMismatch: hasPriceMismatch(
          toNumberOrNull(item.quantity),
          toNumberOrNull(item.unit_count),
          toNumberOrNull(item.item_price),
          toNumberOrNull(item.total_item_price),
        ),
        blankFields: blankFieldsOf(item),
      })),
    [items],
  );

  const unnamedRowCount = useMemo(
    () => itemViews.filter((item) => hasContent(item) && isBlank(item.item_name)).length,
    [itemViews],
  );

  const blankFieldCount = useMemo(
    () => itemViews.reduce((sum, item) => sum + item.blankFields.filter((f) => f !== "item_name").length, 0),
    [itemViews],
  );

  const totalsCheck = useMemo(() => checkReceiptTotals(ocrResult.totals, items), [ocrResult.totals, items]);

  const canConfirm =
    !storeMismatch &&
    !missingReceiptStoreCode &&
    !missingDeliveryDate &&
    unnamedRowCount === 0 &&
    blankFieldCount === 0 &&
    items.length > 0;

  const updateHeaderField = useCallback((field: keyof DraftHeader, value: string) => {
    setHeader((prev) => ({ ...prev, [field]: value }));
  }, []);

  // A cell the user typed is no longer "calculated".
  const updateItemField = useCallback(
    (localId: string, field: DraftItemField, value: string) => {
      setItems((prev) =>
        prev.map((item) =>
          item.localId === localId
            ? { ...item, [field]: value, inferred: item.inferred.filter((f) => f !== field) }
            : item,
        ),
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
    unnamedRowCount,
    blankFieldCount,
    totalsCheck,
    canConfirm,
    stage,
    result,
    submitError,
    updateHeaderField,
    updateItemField,
    addItem,
    removeItem,
    confirm,
    editAgain,
  };
}
