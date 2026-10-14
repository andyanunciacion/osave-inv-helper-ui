import { formatCurrency } from "@/features/deliveries/lib/format";
import type { DraftSummary } from "../lib/draft-summary";

const rowsNote = (count: number, what: string): string =>
  `${count} row${count === 1 ? "" : "s"} ${count === 1 ? "has" : "have"} no ${what} yet — not counted`;

function SummaryLine({ label, value, note }: { label: string; value: string; note: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-baseline justify-between gap-3">
        <dt className="text-sm text-muted-foreground">{label}</dt>
        <dd className="text-base font-semibold tabular-nums">{value}</dd>
      </div>
      {note ? <p className="text-xs text-amber-700 dark:text-amber-400">{note}</p> : null}
    </div>
  );
}

// Thin: renders the running grand totals summarizeDraft computes from the
// rows. The same labels as the receipt's own totals block, so staff can
// compare line by line.
export function DraftSummaryCard({ summary }: { summary: DraftSummary }) {
  return (
    <section aria-label="Totals of these rows" className="flex flex-col gap-2 rounded-lg bg-muted p-3">
      <p className="text-xs text-muted-foreground">
        Added up from the rows above — check against the totals printed on the receipt.
      </p>
      <dl className="flex flex-col gap-2">
        <SummaryLine
          label="Total Box"
          value={String(summary.totalBox)}
          note={summary.rowsMissingBox > 0 ? rowsNote(summary.rowsMissingBox, "Qty or UOM") : null}
        />
        <SummaryLine
          label="Total Value"
          value={formatCurrency(summary.totalValue)}
          note={summary.rowsMissingTotal > 0 ? rowsNote(summary.rowsMissingTotal, "Total") : null}
        />
      </dl>
    </section>
  );
}
