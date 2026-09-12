"use client";

import { useState } from "react";
import { Calendar as CalendarIcon, Search, X } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatDateRangeLabel } from "../hooks/use-search-filters";

interface SearchBarProps {
  query: string;
  onQueryChange: (query: string) => void;
  range: DateRange | undefined;
  onRangeChange: (range: DateRange | undefined) => void;
  onClearRange: () => void;
  onSubmit: () => void;
}

// Thin: local popover-open state only. Filter state and date-range math
// live in useSearchFilters.
export function SearchBar({
  query,
  onQueryChange,
  range,
  onRangeChange,
  onClearRange,
  onSubmit,
}: SearchBarProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const rangeLabel = formatDateRangeLabel(range);

  return (
    <form
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="flex flex-col gap-1.5 sm:flex-1">
        <Label className="text-lg font-semibold" htmlFor="search-query">
          Search Deliveries
        </Label>
        <Input
          id="search-query"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Item name, item code, date, or delivery code"
          autoFocus
        />
      </div>
      <div className="flex gap-2">
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger
            render={
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0 hover:text-card-foreground aria-expanded:text-card-foreground"
                aria-label={
                  rangeLabel ? `Date range: ${rangeLabel}` : "Pick a date range"
                }
              >
                <CalendarIcon className="size-4" aria-hidden="true" />
              </Button>
            }
          />
          <PopoverContent align="end" className="w-auto p-0 shadow-xl border">
            <Calendar
              mode="range"
              selected={range}
              onSelect={onRangeChange}
              numberOfMonths={1}
              defaultMonth={range?.from}
            />
            <div className="flex items-center justify-between gap-2 border-t border-border px-2.5 pt-2.5 pb-2.5">
              <span className="text-xs text-muted-foreground">
                {rangeLabel ?? "No dates selected"}
              </span>
              <div className="flex gap-1">
                {range?.from ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onClearRange}
                  >
                    <X className="size-3.5" aria-hidden="true" />
                    Clear
                  </Button>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  className="cursor-pointer"
                  disabled={!rangeLabel?.trim()}
                  onClick={() => setCalendarOpen(false)}
                >
                  Apply
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
        <Button type="submit" className="flex-1 sm:flex-initial cursor-pointer">
          <Search className="size-4" aria-hidden="true" />
          Search
        </Button>
      </div>
    </form>
  );
}
