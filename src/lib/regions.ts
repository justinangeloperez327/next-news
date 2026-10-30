/** Explicitly supported GNews country codes, rather than accepting arbitrary query parameters. */
export const NEWS_REGIONS = [
  { code: "", label: "Worldwide" },
  { code: "us", label: "United States" },
  { code: "gb", label: "United Kingdom" },
  { code: "ph", label: "Philippines" },
  { code: "jp", label: "Japan" },
  { code: "in", label: "India" },
  { code: "sg", label: "Singapore" },
  { code: "au", label: "Australia" },
  { code: "ca", label: "Canada" },
] as const;

export type NewsCountry = (typeof NEWS_REGIONS)[number]["code"];

export function parseNewsCountry(value: string | string[] | undefined): NewsCountry {
  const raw = (typeof value === "string" ? value : value?.[0])?.toLowerCase() ?? "";
  return NEWS_REGIONS.find(({ code }) => code === raw)?.code ?? "";
}
