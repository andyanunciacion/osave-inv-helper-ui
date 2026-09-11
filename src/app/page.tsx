import { StoreCodeForm } from "@/features/store-session/components/store-code-form";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-4 py-8 font-sans dark:bg-black">
      <main className="flex w-full max-w-md flex-col gap-6 rounded-lg border bg-white p-6 sm:p-8 dark:bg-black">
        <div>
          <h1 className="text-xl font-semibold">osave inventory helper</h1>
          <p className="text-sm text-muted-foreground">
            Select a store to start scanning deliveries.
          </p>
        </div>
        <StoreCodeForm />
      </main>
    </div>
  );
}
