/**
 * Ballpark scores API — a single Cloudflare Worker backed by D1.
 *
 * Routes:
 *   POST /submit          { day, score, hits, clientId } -> { buckets, total }
 *   GET  /distribution?day=N                             -> { buckets, total }
 *
 * Anti-abuse:
 *   - One row per (day, clientId): the PRIMARY KEY makes resubmits no-ops.
 *   - Per-IP daily cap so a single client can't flood the histogram.
 *   - Strict range validation on every field.
 *   - clientId and IP are only ever stored as salted SHA-256 hashes.
 */

export interface Env {
  DB: D1Database;
  /** Secret used to salt the stored hashes. Set with `wrangler secret put SALT`. */
  SALT?: string;
  /** Comma-separated allow-list of origins, or "*" (default). */
  ALLOW_ORIGIN?: string;
}

const BUCKETS = 10;
const MAX_SCORE = 1000;
const PER_IP_DAILY_CAP = 40;

function corsHeaders(env: Env, origin: string | null): Record<string, string> {
  const allow = env.ALLOW_ORIGIN ?? "*";
  let value = "*";
  if (allow !== "*") {
    const list = allow.split(",").map((s) => s.trim());
    value = origin && list.includes(origin) ? origin : list[0];
  }
  return {
    "Access-Control-Allow-Origin": value,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(data: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Turn grouped (bucket -> count) rows into a dense BUCKETS-length array. */
function toBuckets(rows: { b: number; c: number }[]): { buckets: number[]; total: number } {
  const buckets = new Array(BUCKETS).fill(0);
  let total = 0;
  for (const row of rows) {
    const i = Math.max(0, Math.min(BUCKETS - 1, row.b));
    buckets[i] += row.c;
    total += row.c;
  }
  return { buckets, total };
}

async function distributionFor(env: Env, day: number) {
  const { results } = await env.DB.prepare(
    `SELECT CASE WHEN score >= ${MAX_SCORE} THEN ${BUCKETS - 1} ELSE score / 100 END AS b,
            COUNT(*) AS c
       FROM scores WHERE day = ? GROUP BY b`,
  )
    .bind(day)
    .all<{ b: number; c: number }>();
  return toBuckets(results ?? []);
}

function isInt(n: unknown, lo: number, hi: number): n is number {
  return typeof n === "number" && Number.isInteger(n) && n >= lo && n <= hi;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin");
    const cors = corsHeaders(env, origin);
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    try {
      if (request.method === "GET" && url.pathname === "/distribution") {
        const day = Number(url.searchParams.get("day"));
        if (!isInt(day, 0, 100000)) return json({ error: "bad day" }, 400, cors);
        return json(await distributionFor(env, day), 200, cors);
      }

      if (request.method === "POST" && url.pathname === "/submit") {
        const body = (await request.json().catch(() => null)) as {
          day?: unknown;
          score?: unknown;
          hits?: unknown;
          clientId?: unknown;
        } | null;
        if (!body) return json({ error: "bad json" }, 400, cors);

        const { day, score, hits, clientId } = body;
        if (
          !isInt(day, 0, 100000) ||
          !isInt(score, 0, MAX_SCORE) ||
          !isInt(hits, 0, 5) ||
          typeof clientId !== "string" ||
          clientId.length < 8 ||
          clientId.length > 128
        ) {
          return json({ error: "invalid payload" }, 400, cors);
        }

        const salt = env.SALT ?? "ballpark-dev-salt";
        const ip = request.headers.get("CF-Connecting-IP") ?? "0.0.0.0";
        const [clientHash, ipHash] = await Promise.all([
          sha256(`${salt}:${clientId}`),
          sha256(`${salt}:${ip}`),
        ]);

        // Per-IP daily cap.
        const countRow = await env.DB.prepare(
          "SELECT COUNT(*) AS n FROM scores WHERE day = ? AND ip_hash = ?",
        )
          .bind(day, ipHash)
          .first<{ n: number }>();
        if ((countRow?.n ?? 0) >= PER_IP_DAILY_CAP) {
          // Don't error — just return the current distribution.
          return json(await distributionFor(env, day), 200, cors);
        }

        await env.DB.prepare(
          `INSERT OR IGNORE INTO scores (day, client_hash, ip_hash, score, hits, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
          .bind(day, clientHash, ipHash, score, hits, Date.now())
          .run();

        return json(await distributionFor(env, day), 200, cors);
      }

      return json({ error: "not found" }, 404, cors);
    } catch (err) {
      return json({ error: "server error", detail: String(err) }, 500, cors);
    }
  },
};
