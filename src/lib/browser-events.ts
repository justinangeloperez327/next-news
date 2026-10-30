"use client";

import { useSyncExternalStore } from "react";

/** All tabs receive the native storage event; this tab receives our custom event. */
const STORE_EVENT = "next-news:storage";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(STORE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(STORE_EVENT, callback);
  };
}
function snapshot(key: string): string | null {
  try { return window.localStorage.getItem(key); }
  catch { return null; }
}
function getServerSnapshot(): null { return null; }

export function useStoredText(key: string): string | null {
  return useSyncExternalStore(subscribe, () => snapshot(key), getServerSnapshot);
}

export function notifyStorageChanged(): void {
  window.dispatchEvent(new Event(STORE_EVENT));
}
