/**
 * Optional shared request admission guard, backed by Upstash Redis REST.
 * All deployments using the same GNews key MUST share this Redis database.
 * The Lua check is atomic across concurrent instances.
 *
 * This conservatively counts provider-fetch attempts, not billable GNews calls.
 * It deliberately fails closed if Redis is configured but unreachable.
 */
export type BudgetDecision = "allowed" | "disabled" | "daily-limit" | "burst-limit" | "unavailable";

export type BudgetConfig = {
  redisUrl?: string;
  redisToken?: string;
  dailyLimit: number;
  perSecondLimit: number;
};

export const RATE_LIMIT_LUA = [
  "local daily = tonumber(redis.call('GET', KEYS[1]) or '0')",
  "local burst = tonumber(redis.call('GET', KEYS[2]) or '0')",
  "if daily >= tonumber(ARGV[1]) then return 1 end",
  "if burst >= tonumber(ARGV[2]) then return 2 end",
  "redis.call('INCR', KEYS[1])",
  "if daily == 0 then redis.call('EXPIRE', KEYS[1], tonumber(ARGV[3])) end",
  "redis.call('INCR', KEYS[2])",
  "if burst == 0 then redis.call('EXPIRE', KEYS[2], 2) end",
  "return 0",
].join("\n");

export function limitedInteger(input: string | undefined, fallback: number, max: number): number {
  if (!input || !/^[1-9]\d*$/.test(input)) return fallback;
  const parsed = Number(input);
  return Number.isSafeInteger(parsed) && parsed <= max ? parsed : fallback;
}

export function budgetConfigFromEnv(env: NodeJS.ProcessEnv = process.env): BudgetConfig {
  return {
    redisUrl: env.UPSTASH_REDIS_REST_URL,
    redisToken: env.UPSTASH_REDIS_REST_TOKEN,
    dailyLimit: limitedInteger(env.NEWS_DAILY_REQUEST_BUDGET, 90, 100_000),
    perSecondLimit: limitedInteger(env.NEWS_PER_SECOND_BUDGET, 1, 100),
  };
}

export function budgetConfigurationState(config: BudgetConfig): "disabled" | "enabled" | "invalid" {
  if (!config.redisUrl && !config.redisToken) return "disabled";
  if (!config.redisUrl || !config.redisToken) return "invalid";
  try {
    const url = new URL(config.redisUrl);
    if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/") return "invalid";
    return "enabled";
  } catch {
    return "invalid";
  }
}

export async function admitProviderRequest(
  config: BudgetConfig = budgetConfigFromEnv(),
  options: { fetcher?: typeof fetch; now?: number } = {},
): Promise<BudgetDecision> {
  const state = budgetConfigurationState(config);
  if (state === "disabled") return "disabled";
  if (state === "invalid") return "unavailable";

  const now = options.now ?? Date.now();
  const date = new Date(now);
  const utcDay = date.toISOString().slice(0, 10);
  const midnight = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1);
  const remaining = Math.max(1, Math.ceil((midnight - now) / 1000)) + 60;
  const second = Math.floor(now / 1000);
  const payload = ["EVAL", RATE_LIMIT_LUA, 2, `next-news:daily:${utcDay}`, `next-news:second:${second}`,
    config.dailyLimit, config.perSecondLimit, remaining];

  try {
    const response = await (options.fetcher ?? fetch)(config.redisUrl!, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.redisToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(3_000),
    });

    if (!response.ok) return "unavailable";
    const result: unknown = await response.json();
    if (!result || typeof result !== "object" || !("result" in result)) return "unavailable";
    if (result.result === 0) return "allowed";
    if (result.result === 1) return "daily-limit";
    if (result.result === 2) return "burst-limit";
    return "unavailable";
  } catch {
    return "unavailable";
  }
}
