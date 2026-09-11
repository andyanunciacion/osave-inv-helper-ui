import Image from "next/image";
import { StoreCodeForm } from "@/features/store-session/components/store-code-form";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 bg-background px-4 py-8 font-sans">
      <Image
        src="/osave-logo.svg"
        alt="osave"
        width={180}
        height={180}
        priority
        className="rounded-2xl"
      />
      <main className="flex w-full max-w-md flex-col gap-6 rounded-lg bg-card p-6 text-card-foreground shadow-2xl shadow-black/30 sm:p-8">
        <StoreCodeForm />
      </main>
    </div>
  );
}
