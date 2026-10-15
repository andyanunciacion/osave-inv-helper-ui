"use client";

import { AlertTriangle, Merge } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  describeDifferingFields,
  repeatedGroupLabel,
  type RepeatedItemGroup,
} from "../lib/repeated-items";

// The pre-save counterpart of MergedItemsNotice: rows the backend will
// combine when this page is confirmed. Shown before Confirm because a misread
// item code that merges two different items can't be fixed afterwards (only
// quantity is editable once saved). A warning only — the receipt may really
// list an item twice.
export function RepeatedItemsNotice({ groups }: { groups: RepeatedItemGroup[] }) {
  const clean = groups.filter((group) => group.differingFields.length === 0);
  const disagreed = groups.filter((group) => group.differingFields.length > 0);

  return (
    <>
      {disagreed.length > 0 ? (
        <Alert className="border-amber-500/50">
          <AlertTriangle className="text-amber-600 dark:text-amber-400" />
          <AlertTitle>
            {disagreed.length === 1
              ? "1 repeated item doesn't match"
              : `${disagreed.length} repeated items don't match`}
          </AlertTitle>
          <AlertDescription>
            <span className="block">
              Listed more than once, but with different values — often a misread item code. Check
              them against the receipt. If they&apos;re right, each is saved as one row using the
              first row&apos;s values:
            </span>
            <ul className="list-disc pl-4">
              {disagreed.map((group) => (
                <li key={group.localIds[0]}>
                  {repeatedGroupLabel(group)} — {describeDifferingFields(group.differingFields)}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}
      {clean.length > 0 ? (
        <Alert>
          <Merge />
          <AlertTitle>
            {clean.length} item{clean.length === 1 ? "" : "s"} listed more than once
          </AlertTitle>
          <AlertDescription>
            Each is saved as one row, with Qty and Total added together:{" "}
            {clean.map(repeatedGroupLabel).join(", ")}.
          </AlertDescription>
        </Alert>
      ) : null}
    </>
  );
}
