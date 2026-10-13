import { Boxes } from "lucide-react";
import { StoreCodeForm } from "@/features/store-session/components/store-code-form";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 bg-background px-4 py-8 font-sans">
      <div className="flex flex-col items-center gap-3">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
          <Boxes className="size-9" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Inventory Helper</h1>
      </div>
      <main className="flex w-full max-w-md flex-col gap-6 rounded-lg border bg-card p-6 text-card-foreground shadow-sm sm:p-8">
        <StoreCodeForm />
      </main>
    </div>
  );
}
