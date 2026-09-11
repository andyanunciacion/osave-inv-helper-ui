interface SearchResultsPanelProps {
  query: string;
  from?: string;
  to?: string;
}

// Debug/placeholder view for §6 flow C: confirms the query string sent by
// SearchPanel's onSubmit reaches this route correctly. Swap the "raw
// params" block for an actual delivery-search results list once
// features/deliveries lands.
export function SearchResultsPanel({ query, from, to }: SearchResultsPanelProps) {
  return (
    <dl className="flex flex-col gap-3 text-sm">
      <div className="flex flex-col gap-1">
        <dt className="text-muted-foreground">Query</dt>
        <dd className="rounded-md bg-muted px-3 py-2 font-mono text-card-foreground">
          {query || "(empty)"}
        </dd>
      </div>
      <div className="flex flex-col gap-1">
        <dt className="text-muted-foreground">From</dt>
        <dd className="rounded-md bg-muted px-3 py-2 font-mono text-card-foreground">
          {from ?? "(none)"}
        </dd>
      </div>
      <div className="flex flex-col gap-1">
        <dt className="text-muted-foreground">To</dt>
        <dd className="rounded-md bg-muted px-3 py-2 font-mono text-card-foreground">
          {to ?? "(none)"}
        </dd>
      </div>
    </dl>
  );
}
