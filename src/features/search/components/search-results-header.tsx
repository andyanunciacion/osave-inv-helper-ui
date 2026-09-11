import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatSearchResultsTitle } from "../hooks/format-search-results-title";

interface SearchResultsHeaderProps {
  query: string;
  from?: string;
  to?: string;
}

// Thin: renders the back button and a title derived from the search
// params (query text, else the date range, else a generic label) via
// formatSearchResultsTitle. Mirrors SearchHeader's layout so the
// back-button/title sit outside the card, same as the search page.
export function SearchResultsHeader({
  query,
  from,
  to,
}: SearchResultsHeaderProps) {
  const title = formatSearchResultsTitle({ query, from, to });

  return (
    <div className="flex items-center justify-between gap-3">
      <Button
        variant="ghost"
        size="icon-lg"
        className="md:size-8"
        aria-label="Back to search"
        nativeButton={false}
        render={<Link href="/search" />}
      >
        <ArrowLeft className="size-5" aria-hidden="true" />
      </Button>
      <h1 className="truncate  font-semibold">{title}</h1>
    </div>
  );
}
