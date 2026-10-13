// What the review screen says when confirming a page throws. Only a request
// that never got an answer is a connection problem — telling staff to "check
// your connection" when the server actually refused the page (e.g. a blank
// field it requires) sends them looking in the wrong place.
import { DeliveryRequestError } from "@/features/deliveries/lib/request-error";

const HEADER_FIELD_LABELS: Record<string, string> = {
  delivery_code: "Inv. Tran. No.",
  warehouse_code: "Warehouse",
  delivery_date: "Transaction date",
  receipt_store_code: "Receipt \"To\" store code",
  store_code: "store code",
};

const NETWORK_MESSAGE = "Couldn't reach the server. Check your connection and try again.";

// "Transaction date and 2 item rows". Item rows are counted, not numbered:
// the server's indexes are into the submitted rows, which don't line up with
// the on-screen order (incomplete rows are listed first, empty ones dropped).
function describeFields(fields: string[]): string | null {
  const headers = new Set<string>();
  const itemRows = new Set<string>();
  for (const field of fields) {
    const [top, index] = field.split(".");
    if (top === "items" && index !== undefined) itemRows.add(index);
    else if (HEADER_FIELD_LABELS[top]) headers.add(HEADER_FIELD_LABELS[top]);
  }
  const parts = [...headers];
  if (itemRows.size > 0) parts.push(`${itemRows.size} item row${itemRows.size === 1 ? "" : "s"}`);
  if (parts.length === 0) return null;
  return parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`;
}

export function describeSaveError(err: unknown): string {
  if (!(err instanceof DeliveryRequestError)) return NETWORK_MESSAGE;

  if (err.status === 400) {
    const fields = describeFields(err.fields);
    return fields
      ? `The server didn't accept this page — check ${fields}, then try again.`
      : "The server didn't accept this page — check the fields against the receipt, then try again.";
  }
  if (err.status >= 500) {
    return "The server had a problem saving this page. Your changes are kept — try again in a moment.";
  }
  return `The server couldn't save this page (error ${err.status}). Your changes are kept — try again.`;
}
