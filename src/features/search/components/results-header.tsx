"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { describeResultsFilters } from "../lib/search-params";
import { useResultsFilters } from "../hooks/use-results-filters";

// Thin: pure layout + a call into useResultsFilters. Lives outside the
// results card, mirroring SearchHeader's placement on /search — back button
// on one side, the active filter description on the other.
export function ResultsHeader() {
  const { query, range } = useResultsFilters();

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
      <span className="truncate text-lg font-semibold text-foreground">
        {describeResultsFilters(query, range)}
      </span>
    </div>
  );
}
