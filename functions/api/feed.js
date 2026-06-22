// functions/api/feed.js — Cloudflare Pages Function
// Per-venue scraper: fetches a venue page server-side, extracts live info,
// caches ~30 min, returns JSON. Add ?debug=1 to see raw signals for tuning.

const VENUES = {
  "grand-lake": {
    url: "https://www.renaissancerialto.com/",
    label: "Upcoming showtimes",
    kind: "showtimes",
  },
  "omca": {
    url: "https://museumca.org/on-view/",
    label: "Exhibitions on view",
    kind: "exhibitions",
  },
};

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const id = url.searchParams.get("place");
  const debug = url.searchParams.get("debug") === "1";
  const v = VENUES[id];
  if (!v) return json({ error: "unknown place", supported: Object.keys(VENUES) }, 400);

  const cache = caches.default;
  const cacheKey = new Request("https://gtktp-feed/" + id);
  if (!debug) {
    const hit = await cache.match(cacheKey);
    if (hit) return hit;
  }

  let html = "", items = [], error = null;
  try {
    const r = await fetch(v.url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; GetToKnowThisPlace/1.0)", Accept: "text/html" },
      cf: { cacheTtl: 1800, cacheEverything: true },
    });
    if (!r.ok) error = "upstream HTTP " + r.status;
    html = await r.text();
  } catch (e) {
    error = "fetch failed: " + (e && e.message ? e.message : String(e));
  }

  if (html) items = extract(html, v.kind);

  const body = {
    place: id, label: v.label, kind: v.kind, source: v.url,
    fetchedAt: new Date().toISOString(), count: items.length, items, error,
  };

  if (debug) {
    body.htmlBytes = html.length;
    body.times = uniq(html.match(/\b\d{1,2}:\d{2}\s?[AaPp][Mm]\b/g) || []).slice(0, 50);
    body.headings = uniq(
      [...html.matchAll(/<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/g)].map((m) => strip(m[1])).filter(Boolean)
    ).slice(0, 50);
    body.rawSample = html.slice(0, 3000);
  }

  const resp = json(body, 200, debug ? {} : { "cache-control": "public, max-age=1800" });
  if (!debug && items.length) context.waitUntil(cache.put(cacheKey, resp.clone()));
  return resp;
}

// Best-effort extraction (refined per venue once we see real markup)
function extract(html, kind) {
  if (kind === "showtimes") {
    return uniq(html.match(/\b\d{1,2}:\d{2}\s?[AaPp][Mm]\b/g) || []).slice(0, 16);
  }
  if (kind === "exhibitions") {
    return uniq(
      [...html.matchAll(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/g)]
        .map((m) => strip(m[1]))
        .filter((t) => t && t.length > 3 && t.length < 120)
    ).slice(0, 12);
  }
  return [];
}

function uniq(a) { return [...new Set(a.map((s) => (typeof s === "string" ? s.trim() : s)))]; }
function strip(s) {
  return s.replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&").replace(/&#8217;|&rsquo;|&#039;/g, "'")
    .replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}
function json(obj, status = 200, extra = {}) {
  return new Response(JSON.stringify(obj, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*", ...extra },
  });
}
