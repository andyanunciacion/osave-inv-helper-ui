// Chrome on Windows reports `.jfif` (the extension Messenger/Facebook and
// some Windows tools save JPEGs under) as `application/octet-stream`, and the
// backend's /api/ocr rejects anything that isn't `image/*` with
// `invalid_file_type`. JFIF is just JPEG, so relabel it before upload rather
// than making staff rename files.

const JPEG_EXTENSIONS = new Set(["jfif", "jpe", "jpg", "jpeg", "pjpeg", "pjp"]);

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot + 1).toLowerCase();
}

export function normalizeImageFile(file: File): File {
  if (file.type.startsWith("image/")) return file;
  if (!JPEG_EXTENSIONS.has(extensionOf(file.name))) return file;
  return new File([file], file.name, { type: "image/jpeg", lastModified: file.lastModified });
}
