import { useCallback, useMemo, useState } from "react";
import { useCreateDelivery } from "@/features/deliveries/hooks/use-create-delivery";
import { hasPriceMismatch } from "@/features/deliveries/lib/format";
import type { CreateDeliveryResult, NewDeliveryInput } from "@/features/deliveries/types";
import type { ItemUnit } from "@/types/schema";
import type { DraftHeader, DraftItem, OcrResult } from "../types";

// §6 flow B step 4-5: the review/edit screen's state. Seeded from the OCR
// result, fully editable (incl. the Inv. Tran. No. — §5 rule 2 calls out
// that a misread there matters more than a misread item name), and owns
// the confirm → write step against features/deliveries.
export type DraftStage = "editing" | "submitting" | "submitted";

export interface DraftItemView extends DraftItem {
  hasMismatch: boolean;
}

export type DraftItemField = keyof Omit<DraftItem, "localId">;

export interface UseDeliveryDraftResult {
  header: DraftHeader;
  items: DraftItemView[];
  storeMismatch: boolean;
  stage: DraftStage;
  result: CreateDeliveryResult | null;
  updateHeaderField: (field: keyof DraftHeader, value: string) => void;
  updateItemField: (localId: string, field: DraftItemField, value: string) => void;
  addItem: () => void;
  removeItem: (localId: string) => void;
  confirm: () => void;
  editAgain: () => void;
}

function emptyItem(): DraftItem {
  return {
    localId: crypto.randomUUID(),
    item_code: "",
    item_name: "",
    quantity: "",
    unit: "PIECE",
    item_price: "",
    total_item_price: "",
  };
}

function toNumberOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function toItemUnitOrNull(value: string): ItemUnit | null {
  return value === "BOX" || value === "PIECE" ? value : null;
}

export function useDeliveryDraft(
  ocrResult: OcrResult,
  sessionStoreCode: string,
): UseDeliveryDraftResult {
  const [header, setHeader] = useState<DraftHeader>(ocrResult.header);
  const [items, setItems] = useState<DraftItem[]>(ocrResult.items);
  const [stage, setStage] = useState<DraftStage>("editing");
  const [result, setResult] = useState<CreateDeliveryResult | null>(null);
  const { submitDelivery } = useCreateDelivery();

  const storeMismatch = useMemo(() => {
    const receiptCode = header.receipt_store_code.trim().toUpperCase();
    return Boolean(receiptCode) && receiptCode !== sessionStoreCode.trim().toUpperCase();
  }, [header.receipt_store_code, sessionStoreCode]);

  const itemViews: DraftItemView[] = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        hasMismatch: hasPriceMismatch(
          toNumberOrNull(item.quantity),
          toNumberOrNull(item.item_price),
          toNumberOrNull(item.total_item_price),
        ),
      })),
    [items],
  );

  const updateHeaderField = useCallback((field: keyof DraftHeader, value: string) => {
    setHeader((prev) => ({ ...prev, [field]: value }));
  }, []);

  const updateItemField = useCallback(
    (localId: string, field: DraftItemField, value: string) => {
      setItems((prev) =>
        prev.map((item) => (item.localId === localId ? { ...item, [field]: value } : item)),
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
    setStage("submitting");

    const input: NewDeliveryInput = {
      delivery_code: header.delivery_code.trim(),
      store_code: sessionStoreCode,
      warehouse_code: header.warehouse_code.trim() || null,
      delivery_date: header.delivery_date,
      receipt_store_code: header.receipt_store_code.trim() || null,
      items: items
        .filter((item) => item.item_name.trim())
        .map((item) => ({
          item_code: item.item_code.trim() || null,
          item_name: item.item_name.trim(),
          quantity: toNumberOrNull(item.quantity),
          unit: toItemUnitOrNull(item.unit),
          item_price: toNumberOrNull(item.item_price),
          total_item_price: toNumberOrNull(item.total_item_price),
        })),
    };

    setResult(submitDelivery(input));
    setStage("submitted");
  }, [header, items, sessionStoreCode, submitDelivery]);

  // Lets the review screen return to editing after a duplicate_delivery
  // rejection (§5 rule 2) without losing the item rows already keyed in.
  const editAgain = useCallback(() => {
    setStage("editing");
    setResult(null);
  }, []);

  return {
    header,
    items: itemViews,
    storeMismatch,
    stage,
    result,
    updateHeaderField,
    updateItemField,
    addItem,
    removeItem,
    confirm,
    editAgain,
  };
}
