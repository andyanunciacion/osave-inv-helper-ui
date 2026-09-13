import { Suspense } from "react";
import { ResultsHeader } from "@/features/search/components/results-header";
import { SearchResultsPage } from "@/features/search/components/search-results-page";
import { RequireStoreSession } from "@/features/store-session/components/require-store-session";

// h-dvh + overflow-hidden caps this page to the visible viewport (dvh
// tracks mobile browser chrome resizing, unlike a bare vh/h-screen — see
// CLAUDE.md's mobile-first notes) so the card below is the only scrolling
// region, instead of the whole page growing taller than the screen and
// scrolling alongside it.
export default function ResultsPage() {
  return (
    <RequireStoreSession>
      <div className="flex h-dvh flex-col items-center gap-6 overflow-hidden bg-background px-4 py-8 font-sans">
        <div className="flex w-full max-w-md flex-1 flex-col gap-4 overflow-hidden">
          <Suspense fallback={null}>
            <ResultsHeader />
            <main className="flex flex-1 flex-col gap-6 overflow-y-auto rounded-lg bg-card p-6 text-card-foreground shadow-2xl shadow-black/30 sm:p-8">
              <SearchResultsPage />
            </main>
          </Suspense>
        </div>
      </div>
    </RequireStoreSession>
  );
}
