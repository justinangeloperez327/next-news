/** Minimal structured server logs. Never include API keys, search strings, or article URLs. */
export type NewsEvent = {
  event: "provider_fetch";
  result: "success" | "authorization" | "quota" | "throttled" | "upstream" | "invalid-data" | "network";
  elapsedMs: number;
  category: string;
  country: string;
  page: number;
  articleCount?: number;
};

export function logNewsEvent(event: NewsEvent): void {
  const payload = JSON.stringify({ service: "next-news", ...event });
  if (event.result === "success") console.info(payload);
  else console.warn(payload);
}
