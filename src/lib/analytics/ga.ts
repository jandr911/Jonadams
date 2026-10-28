import "server-only";
import { createSign } from "node:crypto";
import { cacheLife } from "next/cache";
import { unstable_rethrow } from "next/navigation";

export const RANGES = [7, 28, 90] as const;
export type Range = (typeof RANGES)[number];
export const DEFAULT_RANGE: Range = 28;

export const SONG_EVENTS = ["song_play", "song_pause", "song_stop"] as const;

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const DATA_URL = "https://analyticsdata.googleapis.com/v1beta/properties";
const SCOPE = "https://www.googleapis.com/auth/analytics.readonly";
const TIMEOUT_MS = 10_000;

export interface Row {
  dims: string[];
  values: number[];
}

interface Credentials {
  property: string;
  email: string;
  key: string;
}

interface ReportRequest {
  range: Range;
  metrics: string[];
  dimensions?: string[];
  limit?: number;
  orderBy?: { metric?: string; dimension?: string; desc?: boolean };
  eventNames?: readonly string[];
}

export function analyticsEnv() {
  return {
    measurementId: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "",
    property: process.env.GA_PROPERTY_ID ?? "",
    email: process.env.GA_CLIENT_EMAIL ?? "",
    key: process.env.GA_PRIVATE_KEY ?? "",
  };
}

export function analyticsConfigured(): boolean {
  const { property, email, key } = analyticsEnv();
  return Boolean(property && email && key);
}

export function parseRange(value: string | undefined): Range {
  const n = Number(value);
  return RANGES.find((r) => r === n) ?? DEFAULT_RANGE;
}

function credentials(): Credentials {
  const { property, email, key } = analyticsEnv();
  if (!property || !email || !key) throw new Error("Google Analytics is not connected.");
  return { property, email, key: key.replace(/\\n/g, "\n") };
}

let token: { value: string; expires: number } | undefined;
let signingIn: Promise<string> | undefined;

async function signIn(c: Credentials): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const encode = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const unsigned = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({ iss: c.email, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 })}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(c.key, "base64url");
  const { ok, status, data } = await post<{ access_token?: string; expires_in?: number; error_description?: string; error?: string }>(TOKEN_URL, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${signature}` }),
  });
  if (!ok || !data?.access_token) throw new Error(`Google sign-in failed: ${data?.error_description ?? data?.error ?? status}`);
  token = { value: data.access_token, expires: Date.now() + (data.expires_in ?? 3600) * 1000 };
  return token.value;
}

async function accessToken(c: Credentials): Promise<string> {
  if (token && token.expires > Date.now() + 60_000) return token.value;
  signingIn ??= signIn(c).finally(() => {
    signingIn = undefined;
  });
  return signingIn;
}

interface ApiRow {
  dimensionValues?: { value: string }[];
  metricValues?: { value: string }[];
}

async function post<T>(url: string, init: RequestInit): Promise<{ ok: boolean; status: number; data: T | undefined }> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, method: "POST", signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (error) {
    const cause = error instanceof Error && error.cause instanceof Error ? error.cause.message : String(error);
    throw new Error(`Google could not be reached: ${cause}`);
  }
  let data: T | undefined;
  try {
    data = (await res.json()) as T;
  } catch {
    data = undefined;
  }
  return { ok: res.ok, status: res.status, data };
}

async function call(method: string, body: object): Promise<Row[]> {
  const c = credentials();
  const { ok, status, data } = await post<{ rows?: ApiRow[]; error?: { message?: string } }>(`${DATA_URL}/${c.property}:${method}`, {
    headers: { Authorization: `Bearer ${await accessToken(c)}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!ok || !data) throw new Error(data?.error?.message ?? `Google Analytics answered ${status}`);
  return (data.rows ?? []).map((r) => ({
    dims: (r.dimensionValues ?? []).map((v) => v.value),
    values: (r.metricValues ?? []).map((v) => Number(v.value)),
  }));
}

export type Settled<T> = { value: T; error?: undefined } | { value?: undefined; error: string };

async function settleCached<T>(work: Promise<T>): Promise<Settled<T>> {
  try {
    return { value: await work };
  } catch (error) {
    unstable_rethrow(error);
    cacheLife("seconds");
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

export async function report(req: ReportRequest): Promise<Settled<Row[]>> {
  "use cache";
  cacheLife("hours");
  const orderBys = req.orderBy
    ? [req.orderBy.metric ? { metric: { metricName: req.orderBy.metric }, desc: req.orderBy.desc ?? false } : { dimension: { dimensionName: req.orderBy.dimension }, desc: req.orderBy.desc ?? false }]
    : undefined;
  return settleCached(
    call("runReport", {
      dateRanges: [{ startDate: `${req.range - 1}daysAgo`, endDate: "today" }],
      dimensions: req.dimensions?.map((name) => ({ name })),
      metrics: req.metrics.map((name) => ({ name })),
      dimensionFilter: req.eventNames ? { filter: { fieldName: "eventName", inListFilter: { values: [...req.eventNames] } } } : undefined,
      orderBys,
      limit: req.limit ?? 50,
    }),
  );
}

export async function liveVisitors(): Promise<Settled<number>> {
  "use cache";
  cacheLife("minutes");
  return settleCached(call("runRealtimeReport", { metrics: [{ name: "activeUsers" }] }).then((rows) => rows[0]?.values[0] ?? 0));
}

export const totals = (range: Range) =>
  report({ range, metrics: ["activeUsers", "newUsers", "sessions", "screenPageViews", "userEngagementDuration", "engagedSessions"] });

export const daily = (range: Range) =>
  report({ range, dimensions: ["date"], metrics: ["activeUsers", "sessions"], orderBy: { dimension: "date" }, limit: 100 });

export const pages = (range: Range) =>
  report({ range, dimensions: ["pagePath", "pageTitle"], metrics: ["screenPageViews", "activeUsers"], orderBy: { metric: "screenPageViews", desc: true }, limit: 30 });

export const visitorsBy = (range: Range, dimension: string, limit = 20) =>
  report({ range, dimensions: [dimension], metrics: ["activeUsers"], orderBy: { metric: "activeUsers", desc: true }, limit });

export const sessionsBy = (range: Range, dimension: string, limit = 20) =>
  report({ range, dimensions: [dimension], metrics: ["sessions"], orderBy: { metric: "sessions", desc: true }, limit });

export const songEvents = (range: Range) =>
  report({ range, dimensions: ["eventName"], metrics: ["eventCount", "totalUsers"], eventNames: SONG_EVENTS, orderBy: { dimension: "eventName" } });

export const songPositions = (range: Range) =>
  report({ range, dimensions: ["eventName"], metrics: ["eventCount", "customEvent:position_seconds"], eventNames: ["song_pause", "song_stop"] });

export const videoPlays = (range: Range) =>
  report({ range, dimensions: ["customEvent:video_title"], metrics: ["eventCount", "totalUsers"], eventNames: ["video_play"], orderBy: { metric: "eventCount", desc: true }, limit: 30 });

export const districtFlights = (range: Range) =>
  report({ range, dimensions: ["customEvent:district"], metrics: ["eventCount", "totalUsers"], eventNames: ["district_fly"], orderBy: { metric: "eventCount", desc: true } });

export const cityEntries = (range: Range) => report({ range, metrics: ["eventCount", "totalUsers", "customEvent:wait_seconds"], eventNames: ["city_enter"] });
