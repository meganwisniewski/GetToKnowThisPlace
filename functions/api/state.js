// functions/api/state.js — passphrase-gated cloud sync backed by Turso (libSQL).
// Stores one row (id='main') holding the user's favorites + visited as JSON.
// The table is created automatically on first use — no manual SQL needed.
// Env (Cloudflare Pages project → Settings → Environment variables):
//   APP_PASSPHRASE      — the shared passphrase that gates this endpoint
//   TURSO_DATABASE_URL  — libsql://<db>-<org>.turso.io
//   TURSO_AUTH_TOKEN    — a read-write Turso token (server-only)

const DDL =
  "CREATE TABLE IF NOT EXISTS bay_state (id TEXT PRIMARY KEY, json TEXT NOT NULL, updated_at INTEGER NOT NULL DEFAULT 0)";

export async function onRequest(context) {
  const { request, env } = context;
  const cors = {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,PUT,OPTIONS",
    "access-control-allow-headers": "content-type,x-app-passphrase",
  };
  if (request.method === "OPTIONS") return new Response(null, { headers: cors });

  if (!env.APP_PASSPHRASE || !env.TURSO_DATABASE_URL || !env.TURSO_AUTH_TOKEN) {
    return json({ error: "Sync not configured on the server yet." }, 503, cors);
  }
  const pass = request.headers.get("x-app-passphrase") || "";
  if (!timingSafeEqual(pass, env.APP_PASSPHRASE)) {
    return json({ error: "Unauthorized" }, 401, cors);
  }

  try {
    if (request.method === "GET") {
      const res = await turso(env, [DDL, "SELECT json, updated_at FROM bay_state WHERE id = 'main'"]);
      const row = res.rows[0];
      if (!row) return json({ state: null, updated_at: 0 }, 200, cors);
      return json({ state: safeParse(row[0]), updated_at: Number(row[1]) || 0 }, 200, cors);
    }
    if (request.method === "PUT") {
      const body = await request.json();
      const updated_at = Number(body && body.updated_at) || Date.now();
      const payload = JSON.stringify({
        favorites: Array.isArray(body.favorites) ? body.favorites : [],
        visited: Array.isArray(body.visited) ? body.visited : [],
        updated_at,
      });
      await turso(env, [
        DDL,
        {
          sql:
            "INSERT INTO bay_state (id, json, updated_at) VALUES ('main', ?, ?) " +
            "ON CONFLICT(id) DO UPDATE SET json = excluded.json, updated_at = excluded.updated_at",
          args: [
            { type: "text", value: payload },
            { type: "integer", value: String(updated_at) },
          ],
        },
      ]);
      return json({ ok: true, updated_at }, 200, cors);
    }
    return json({ error: "Method not allowed" }, 405, cors);
  } catch (e) {
    return json({ error: String((e && e.message) || e) }, 500, cors);
  }
}

// --- Turso libSQL HTTP "pipeline" helper. Accepts one statement or an array;
//     returns the rows of the LAST statement. ---
async function turso(env, stmts) {
  const base = env.TURSO_DATABASE_URL.replace(/^libsql:\/\//, "https://").replace(/\/+$/, "");
  const list = (Array.isArray(stmts) ? stmts : [stmts]).map((s) => (typeof s === "string" ? { sql: s } : s));
  const requests = list.map((stmt) => ({ type: "execute", stmt })).concat([{ type: "close" }]);
  const res = await fetch(base + "/v2/pipeline", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer " + env.TURSO_AUTH_TOKEN },
    body: JSON.stringify({ requests }),
  });
  if (!res.ok) throw new Error("Turso HTTP " + res.status + " " + (await res.text()).slice(0, 200));
  const data = await res.json();
  const execs = (data.results || []).slice(0, list.length);
  for (const r of execs) {
    if (!r || r.type !== "ok") throw new Error("Turso error: " + JSON.stringify((r && r.error) || r));
  }
  const last = execs[execs.length - 1];
  const result = last && last.response && last.response.result;
  const rows = ((result && result.rows) || []).map((r) => r.map((cell) => cell.value));
  return { rows };
}

function timingSafeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}
function safeParse(s) { try { return JSON.parse(s); } catch { return null; } }
function json(obj, status = 200, extra = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extra },
  });
}
