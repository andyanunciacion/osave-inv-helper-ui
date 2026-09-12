// Encodes/decodes the /search/results URL so filters are shareable and
// survive the back button, instead of living only in component state.
import { format, parse } from "date-fns";
import type { DateRange } from "react-day-picker";
import { formatDateRangeLabel } from "./date-range";

export interface ResultsFilters {
  query: string;
  range: DateRange | undefined;
}

const DATE_FORMAT = "yyyy-MM-dd";

export function buildResultsSearchParams({
  query,
  range,
}: ResultsFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (query.trim()) params.set("q", query.trim());
  if (range?.from) {
    params.set("from", format(range.from, DATE_FORMAT));
    params.set("to", format(range.to ?? range.from, DATE_FORMAT));
  }
  return params;
}

// date-fns's parseISO (and native `new Date("yyyy-MM-dd")`) treat a
// date-only string as UTC midnight, which shifts by a day once formatted
// back in a local time zone ahead of UTC. Parsing against a local
// reference date instead keeps it as local midnight, matching how the
// calendar picker and `format(..., DATE_FORMAT)` above already behave.
function parseLocalDate(value: string): Date {
  return parse(value, DATE_FORMAT, new Date());
}

export function parseResultsSearchParams(
  params: URLSearchParams | { get(key: string): string | null },
): ResultsFilters {
  const query = params.get("q") ?? "";
  const fromRaw = params.get("from");
  const toRaw = params.get("to");
  const range: DateRange | undefined = fromRaw
    ? { from: parseLocalDate(fromRaw), to: parseLocalDate(toRaw ?? fromRaw) }
    : undefined;
  return { query, range };
}

export function describeResultsFilters(
  query: string,
  range: DateRange | undefined,
): string {
  const parts: string[] = [];
  if (query.trim()) parts.push(`${query.trim()}`);
  const rangeLabel = formatDateRangeLabel(range);
  if (rangeLabel) parts.push(rangeLabel);
  return parts.length > 0 ? parts.join(" · ") : "All results";
}
