import { SearchResultsHeader } from "@/features/search/components/search-results-header";
import { SearchResultsPanel } from "@/features/search/components/search-results-panel";

interface SearchResultsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function SearchResultsPage({
  searchParams,
}: SearchResultsPageProps) {
  const params = await searchParams;
  const query = typeof params.query === "string" ? params.query : "";
  const from = typeof params.from === "string" ? params.from : undefined;
  const to = typeof params.to === "string" ? params.to : undefined;

  return (
    <div className="flex flex-1 flex-col items-center gap-6 bg-background px-4 py-8 font-sans">
      <div className="flex w-full max-w-md flex-col gap-4">
        <SearchResultsHeader query={query} from={from} to={to} />
        <main className="flex flex-col gap-6 rounded-lg bg-card p-6 text-card-foreground shadow-2xl shadow-black/30 sm:p-8">
          <SearchResultsPanel query={query} from={from} to={to} />
        </main>
      </div>
    </div>
  );
}
