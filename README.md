# 🌉 Get To Know This Place

An interactive guide to exploring the **San Francisco Bay Area** — art museums, galleries,
movie theaters, parks, botanic gardens, hikes, and event venues, all on one map.

Built as a plain static website (HTML + CSS + vanilla JavaScript), so it runs anywhere
and deploys for free to GitHub Pages. No build step, no API keys.

## ✨ Features

- **🗺️ Interactive map** (first thing you see) — colored pins by category, click for details,
  website links, one-tap directions, and a **"Near me"** button.
- **🃏 Cards tab** — filterable cards with descriptions, tags, and free/paid badges.
- **📋 List tab** — a compact, sortable table (click any column header to sort).
- **Shared filters** across all three views:
  - Search box (matches names, descriptions, areas, and tags)
  - Category chips (toggle on/off)
  - Area dropdown (San Francisco, East Bay, Marin, Peninsula, South Bay)
  - "Free only" toggle
  - "⭐ Favorites only" toggle
- **⭐ Favorites** — saved in your browser (localStorage), so they stick between visits.

## 🚀 Run it locally

It's just static files. Either:

- **Double-click `index.html`**, or
- Serve it (recommended, avoids browser file restrictions):
  ```bash
  python3 -m http.server 8000
  # then open http://localhost:8000
  ```

## 🌐 Publish it (free, public website)

This repo includes a GitHub Actions workflow that publishes the site to **GitHub Pages**.

1. Push to the default branch.
2. In your repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Your site goes live at `https://<your-username>.github.io/<repo-name>/`.

## ✏️ Add or edit places

All the content lives in **`data.js`**. Each place looks like this:

```js
{
  id: "unique-id",
  name: "Place Name",
  category: "Art Museum",      // must match a key in CATEGORIES
  area: "San Francisco",        // must match an entry in AREAS
  lat: 37.7857, lng: -122.4011, // map coordinates
  description: "Short blurb shown on the card, map popup, etc.",
  address: "123 Example St, San Francisco",
  website: "https://example.com",
  free: false,                  // true = shows a FREE badge
  tags: ["indoor", "rainy day"],
}
```

To add a **new category**, add it to the `CATEGORIES` object at the top of `data.js`
(give it a color + emoji) and it'll automatically appear as a filter chip and map pin.

## 🛣️ Ideas for later

- Plug in **live events** (Eventbrite, ticketing feeds, city calendars).
- "Open now" hours, ratings, and photos.
- Routes / day-trip itineraries by area.
- Share a filtered view via URL.

---
*Data is curated and approximate — always check the venue's website before you go.*
