export const dynamic = "force-dynamic";

/** Configuration-only status. Does not call GNews or reveal provider credentials. */
export function GET() {
  const feedMode = process.env.GNEWS_API_KEY?.trim() ? "configured" : "demo";
  return Response.json(
    { status: "ok", feedMode, browserCache: "localStorage" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
