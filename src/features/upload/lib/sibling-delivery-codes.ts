// Pages of one print run share an Inv. Tran. No. (main-file.md §5 rules 7-8),
// so a page whose code differs from its siblings' is almost always a misread —
// and saving it creates a second, bogus delivery that can't be deleted. The
// server fills a blank code from siblings but never overwrites a read one
// (frontend-contract.md §6); comparing is done here, against the page's code
// as edited.

import type { CreateDeliveryResult } from "@/features/deliveries/types";
import type { DraftHeader, SavedPage } from "../types";

// The delivery codes the other pages of `index`'s print run (same non-blank
// printout_datetime, the server's sibling rule) stand at: the code an
// already-saved page was saved under, otherwise the code it came back with.
// Distinct, trimmed, blanks left out.
export function siblingDeliveryCodes(headers: DraftHeader[], index: number, savedPages: SavedPage[]): string[] {
  const printout = headers[index]?.printout_datetime;
  if (!printout) return [];

  const savedCode = new Map(savedPages.map((page) => [page.index, savedDeliveryCode(page.result)]));
  const codes = new Set<string>();
  headers.forEach((header, i) => {
    if (i === index || header.printout_datetime !== printout) return;
    const code = (savedCode.get(i) || header.delivery_code).trim();
    if (code) codes.add(code);
  });
  return [...codes];
}

function savedDeliveryCode(result: CreateDeliveryResult): string {
  return result.delivery?.delivery_code ?? "";
}

// The sibling codes `code` disagrees with, or [] when it matches one of them
// (or there's nothing to compare). Exact after trimming — the backend keys
// deliveries the same way, so "itph1" and "ITPH1" would be two deliveries.
// A blank code isn't a mismatch: it already blocks Confirm on its own.
export function deliveryCodeMismatch(code: string, siblingCodes: string[]): string[] {
  const trimmed = code.trim();
  if (!trimmed || siblingCodes.length === 0 || siblingCodes.includes(trimmed)) return [];
  return siblingCodes;
}
