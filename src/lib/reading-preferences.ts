import type { StorageLike } from "./browser-storage.ts";

export const READING_PREF_KEY = "next-news:v1:reading-size";
export const READING_SIZES = ["standard", "large", "extra-large"] as const;
export type ReadingSize = (typeof READING_SIZES)[number];

export function parseReadingSize(raw: string | null): ReadingSize {
  return READING_SIZES.find((size) => size === raw) ?? "standard";
}

export function saveReadingSize(storage: StorageLike, size: ReadingSize): boolean {
  if (!READING_SIZES.includes(size)) return false;
  try {
    storage.setItem(READING_PREF_KEY, size);
    return true;
  } catch {
    return false;
  }
}
