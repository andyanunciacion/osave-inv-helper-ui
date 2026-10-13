import { QrScanView } from "@/features/store-session/components/qr-scan-view";

export default function ScanStoreCodePage() {
  return (
    <div className="flex flex-1 flex-col items-center gap-6 bg-background px-4 py-8 font-sans">
      <main className="flex w-full max-w-md flex-col gap-6 rounded-lg border bg-card p-6 text-card-foreground shadow-sm sm:p-8">
        <QrScanView />
      </main>
    </div>
  );
}
