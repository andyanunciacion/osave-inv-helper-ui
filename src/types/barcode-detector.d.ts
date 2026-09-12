// Ambient types for the native Barcode Detection API — not yet in
// TypeScript's bundled lib.dom.d.ts. Feature-detected at runtime via
// `"BarcodeDetector" in window` before use (see use-qr-scanner.ts).
interface DetectedBarcode {
  readonly boundingBox: DOMRectReadOnly;
  readonly cornerPoints: ReadonlyArray<{ x: number; y: number }>;
  readonly format: string;
  readonly rawValue: string;
}

interface BarcodeDetectorOptions {
  formats?: string[];
}

declare class BarcodeDetector {
  constructor(options?: BarcodeDetectorOptions);
  detect(image: ImageBitmapSource): Promise<DetectedBarcode[]>;
  static getSupportedFormats(): Promise<string[]>;
}
