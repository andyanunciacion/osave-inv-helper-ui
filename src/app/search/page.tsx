import { RequireStoreSession } from "@/features/store-session/components/require-store-session";
import { SearchHeader } from "@/features/search/components/search-header";
import { SearchPanel } from "@/features/search/components/search-panel";

export default function SearchPage() {
  return (
    <RequireStoreSession>
      <div className="flex flex-1 flex-col items-center gap-6 bg-background px-4 py-8 font-sans">
        <div className="flex w-full max-w-md flex-col gap-4">
          <SearchHeader />
          <main className="flex flex-col gap-6 rounded-lg bg-card p-6 text-card-foreground shadow-2xl shadow-black/30 sm:p-8">
            <SearchPanel />
          </main>
        </div>
      </div>
    </RequireStoreSession>
  );
}
