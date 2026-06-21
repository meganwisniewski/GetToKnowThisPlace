# 🌉 Get To Know This Place

An interactive guide to exploring the **San Francisco Bay Area** — art museums, galleries,
movie theaters, parks, botanic gardens, hikes, and event venues, all on one map.

A plain static site (HTML + CSS + vanilla JavaScript) — **no build step, no framework** —
deployed on **Cloudflare Pages**, Git-connected (push → auto-deploy).

## 📁 Layout

```
public/index.html   THE ENTIRE APP — markup, styles, JS, and the place data, inlined.
wrangler.toml       Cloudflare Pages config (pages_build_output_dir = "public")
```

Everything is inlined into one file on purpose: a single request that can't be
partially blocked or 404. There is no `/src`, no `/dist`, no separate JS/CSS.

## ✨ Features

- **🗺️ Interactive map** (Leaflet + OpenStreetMap) — category-colored pins, popups with
  website links, one-tap directions, and a **"Near me"** button.
- **🃏 Cards** — filterable cards with descriptions, tags, and free/paid badges.
- **📋 List** — a compact, sortable table.
- **Shared filters** across all three views: search, category chips, area dropdown,
  "Free only," and **⭐ Favorites** (saved in the browser via localStorage).
- Hardened boot: the Cards/List tabs keep working even if the map library fails to load.

## 🚀 Deploy (Cloudflare Pages, Git-connected)

1. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git** → pick this repo.
2. Production branch: `claude/youthful-meitner-z6yld7` (or whatever you set as default).
3. Build command: **(none)** · Build output directory: **`public`** (auto-read from `wrangler.toml`).
4. Every push then auto-deploys to `<project>.pages.dev`.
5. Add a custom domain (e.g. `gettoknowthisplace.dumbbugbaby.com`) in the Pages project →
   **Custom domains** tab; Cloudflare manages the DNS automatically.

## 🧪 Run locally

It's just static files:

```bash
# simplest
python3 -m http.server 8000 --directory public
# then open http://localhost:8000

# or, matching the Cloudflare runtime:
npx wrangler pages dev public
```

## ✏️ Add or edit places

All content lives in the `PLACES` array inside **`public/index.html`** (search for
`const PLACES`). Each place:

```js
{
  id: "unique-id",
  name: "Place Name",
  category: "Art Museum",       // must match a key in CATEGORIES
  area: "San Francisco",         // must match an entry in AREAS
  lat: 37.7857, lng: -122.4011,
  description: "Short blurb.",
  address: "123 Example St, San Francisco",
  website: "https://example.com",
  free: false,                   // true = shows a FREE badge
  tags: ["indoor", "rainy day"],
}
```

Add a new **category** by adding it to the `CATEGORIES` object at the top of `data.js`
(color + emoji) — it auto-appears as a filter chip and map pin.

---
*Data is curated and approximate — always check the venue's website before you go.*
