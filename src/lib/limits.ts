export const LIMITS = {
  photoBytes: 20 * 1024 * 1024,
  videoBytes: 120 * 1024 * 1024,
  photos: 80,
  videos: 20,
  herName: 48,
  hisName: 48,
  eyebrow: 80,
  openingLine: 180,
  letterLead: 900,
  finaleLine: 400,
  passphrase: 60,
  noteTitle: 80,
  noteBody: 4000,
  caption: 240,
};

export const PHOTO_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/avif": ".avif",
};

export const VIDEO_TYPES: Record<string, string> = {
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
};

export const EXT_TYPES: Record<string, { kind: "photo" | "video"; ext: string; mime: string }> = {
  ".jpg": { kind: "photo", ext: ".jpg", mime: "image/jpeg" },
  ".jpeg": { kind: "photo", ext: ".jpg", mime: "image/jpeg" },
  ".png": { kind: "photo", ext: ".png", mime: "image/png" },
  ".webp": { kind: "photo", ext: ".webp", mime: "image/webp" },
  ".gif": { kind: "photo", ext: ".gif", mime: "image/gif" },
  ".avif": { kind: "photo", ext: ".avif", mime: "image/avif" },
  ".mp4": { kind: "video", ext: ".mp4", mime: "video/mp4" },
  ".webm": { kind: "video", ext: ".webm", mime: "video/webm" },
  ".mov": { kind: "video", ext: ".mov", mime: "video/quicktime" },
};

export function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}
