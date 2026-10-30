import { budgetConfigurationState, budgetConfigFromEnv } from "../../../lib/request-budget.ts";

export const dynamic = "force-dynamic";

/**
 * Lightweight readiness/configuration probe. Does not call GNews or Redis,
 * expose tokens, perform provider requests, or mutate rate counters.
 */
export function GET() {
  const mode = process.env.GNEWS_API_KEY?.trim() ? "configured" : "demo";
  const budget = budgetConfigurationState(budgetConfigFromEnv());
  const status = budget === "invalid" ? "configuration-error" : "ok";
  return Response.json(
    { status, feedMode: mode, sharedBudget: budget },
    { status: status === "ok" ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
