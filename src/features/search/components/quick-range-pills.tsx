"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { QuickRangeKey, QuickRangeOption } from "../types";

interface QuickRangePillsProps {
  options: QuickRangeOption[];
  activeKey: QuickRangeKey | null;
  onSelect: (key: QuickRangeKey) => void;
}

// Dense, secondary nav — size="sm" pills are the documented exception to
// the ≥44px primary-touch-target rule.
export function QuickRangePills({
  options,
  activeKey,
  onSelect,
}: QuickRangePillsProps) {
  return (
    <div
      className="flex flex-wrap gap-2"
      role="group"
      aria-label="Quick date filters"
    >
      {options.map((option) => {
        const active = option.key === activeKey;
        return (
          <Button
            key={option.key}
            type="button"
            variant={active ? "default" : "outline"}
            size="sm"
            className={cn("rounded-full", !active && "text-muted-foreground")}
            aria-pressed={active}
            onClick={() => onSelect(option.key)}
          >
            {option.label}
          </Button>
        );
      })}
    </div>
  );
}
