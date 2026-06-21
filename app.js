// ============================================================================
//  Get To Know This Place — app logic
//  Vanilla JS. Three synced views (map / cards / list) over one filtered set.
// ============================================================================

const { CATEGORIES, AREAS, PLACES } = window.BAY;

// ----------------------------- App state ------------------------------------
const state = {
  search: "",
  area: "",
  freeOnly: false,
  favOnly: false,
  activeCats: new Set(Object.keys(CATEGORIES)), // all on by default
  view: "map",
  sortKey: "name",
  sortDir: 1,
  favorites: loadFavorites(),
};

// ----------------------------- Favorites ------------------------------------
function loadFavorites() {
  try {
    return new Set(JSON.parse(localStorage.getItem("bay_favorites") || "[]"));
  } catch {
    return new Set();
  }
}
function saveFavorites() {
  localStorage.setItem("bay_favorites", JSON.stringify([...state.favorites]));
}
function toggleFavorite(id) {
  if (state.favorites.has(id)) state.favorites.delete(id);
  else state.favorites.add(id);
  saveFavorites();
  render();
}

// ----------------------------- Filtering ------------------------------------
function getFiltered() {
  const q = state.search.trim().toLowerCase();
  return PLACES.filter((p) => {
    if (!state.activeCats.has(p.category)) return false;
    if (state.area && p.area !== state.area) return false;
    if (state.freeOnly && !p.free) return false;
    if (state.favOnly && !state.favorites.has(p.id)) return false;
    if (q) {
      const hay = [p.name, p.description, p.category, p.area, ...(p.tags || [])]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

// ----------------------------- Build filters UI -----------------------------
function buildFilterControls() {
  // Areas
  const areaSelect = document.getElementById("areaSelect");
  AREAS.forEach((a) => {
    const opt = document.createElement("option");
    opt.value = a;
    opt.textContent = a;
    areaSelect.appendChild(opt);
  });

  // Category chips
  const chipWrap = document.getElementById("categoryChips");
  Object.entries(CATEGORIES).forEach(([name, meta]) => {
    const btn = document.createElement("button");
    btn.className = "chip active";
    btn.style.setProperty("--chip-color", meta.color);
    btn.innerHTML = `${meta.icon} ${name}`;
    btn.dataset.cat = name;
    btn.addEventListener("click", () => {
      if (state.activeCats.has(name)) state.activeCats.delete(name);
      else state.activeCats.add(name);
      btn.classList.toggle("active");
      render();
    });
    chipWrap.appendChild(btn);
  });
}

// ----------------------------- Map ------------------------------------------
let map;
let markerLayer;
let youMarker;

function initMap() {
  map = L.map("map", { zoomControl: true }).setView([37.78, -122.35], 10);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "© OpenStreetMap contributors",
  }).addTo(map);
  markerLayer = L.layerGroup().addTo(map);
}

function makeIcon(category) {
  const meta = CATEGORIES[category];
  return L.divIcon({
    className: "",
    html: `<div class="pin" style="background:${meta.color}"><span>${meta.icon}</span></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
    popupAnchor: [0, -26],
  });
}

function popupHtml(p) {
  const meta = CATEGORIES[p.category];
  const fav = state.favorites.has(p.id);
  return `
    <div class="popup">
      <span class="popup-cat" style="color:${meta.color}">${meta.icon} ${p.category}</span>
      <h3>${p.name}</h3>
      <p>${p.description}</p>
      <p>📍 ${p.address}${p.free ? " · 🆓 Free" : ""}</p>
      <div class="popup-links">
        <a href="${p.website}" target="_blank" rel="noopener">Website ↗</a>
        <a href="https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}" target="_blank" rel="noopener">Directions ↗</a>
        <button class="fav-btn" data-fav="${p.id}" title="Toggle favorite">${fav ? "⭐" : "☆"}</button>
      </div>
    </div>`;
}

function renderMap(places) {
  if (!map) return;
  markerLayer.clearLayers();
  places.forEach((p) => {
    const m = L.marker([p.lat, p.lng], { icon: makeIcon(p.category) });
    m.bindPopup(popupHtml(p));
    markerLayer.addLayer(m);
  });
  // Wire favorite buttons inside popups when opened
  map.off("popupopen");
  map.on("popupopen", (e) => {
    const btn = e.popup.getElement().querySelector("[data-fav]");
    if (btn) btn.addEventListener("click", () => toggleFavorite(btn.dataset.fav));
  });
}

function locateMe() {
  if (!navigator.geolocation) {
    alert("Geolocation isn't supported by your browser.");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      if (youMarker) map.removeLayer(youMarker);
      youMarker = L.circleMarker([latitude, longitude], {
        radius: 9,
        color: "#fff",
        weight: 2,
        fillColor: "#4aa3df",
        fillOpacity: 1,
      }).addTo(map).bindPopup("You are here").openPopup();
      map.setView([latitude, longitude], 12);
    },
    () => alert("Could not get your location. Check browser permissions."),
  );
}

// ----------------------------- Cards ----------------------------------------
function renderCards(places) {
  const grid = document.getElementById("cardsGrid");
  const empty = document.getElementById("cardsEmpty");
  grid.innerHTML = "";
  empty.hidden = places.length > 0;

  places.forEach((p) => {
    const meta = CATEGORIES[p.category];
    const fav = state.favorites.has(p.id);
    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `
      <div class="card-top">
        <span class="card-cat" style="background:${meta.color}">${meta.icon} ${p.category}</span>
        <button class="fav-star ${fav ? "on" : ""}" data-fav="${p.id}" title="Save to favorites">⭐</button>
      </div>
      <h3>${p.name}</h3>
      <div class="card-meta">
        <span>📍 ${p.area}</span>
        ${p.free ? '<span class="badge-free">FREE</span>' : ""}
      </div>
      <p class="card-desc">${p.description}</p>
      <div class="card-tags">${(p.tags || []).map((t) => `<span class="tag">${t}</span>`).join("")}</div>
      <div class="card-actions">
        <a href="${p.website}" target="_blank" rel="noopener">Website ↗</a>
        <a href="https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}" target="_blank" rel="noopener">Directions ↗</a>
      </div>`;
    card.querySelector("[data-fav]").addEventListener("click", () => toggleFavorite(p.id));
    grid.appendChild(card);
  });
}

// ----------------------------- List -----------------------------------------
function renderList(places) {
  const body = document.getElementById("listBody");
  const empty = document.getElementById("listEmpty");
  body.innerHTML = "";
  empty.hidden = places.length > 0;

  const sorted = [...places].sort((a, b) => {
    let av = a[state.sortKey];
    let bv = b[state.sortKey];
    if (state.sortKey === "free") { av = a.free ? 0 : 1; bv = b.free ? 0 : 1; }
    if (typeof av === "string") { av = av.toLowerCase(); bv = bv.toLowerCase(); }
    if (av < bv) return -1 * state.sortDir;
    if (av > bv) return 1 * state.sortDir;
    return 0;
  });

  sorted.forEach((p) => {
    const meta = CATEGORIES[p.category];
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${p.name}</strong></td>
      <td><span class="list-cat-dot" style="background:${meta.color}"></span>${p.category}</td>
      <td>${p.area}</td>
      <td>${p.free ? "🆓 Free" : "💲 Paid"}</td>
      <td>
        <a href="${p.website}" target="_blank" rel="noopener">Site ↗</a> ·
        <a href="https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}" target="_blank" rel="noopener">Map ↗</a>
      </td>`;
    body.appendChild(tr);
  });
}

// ----------------------------- Render all -----------------------------------
function render() {
  const places = getFiltered();
  document.getElementById("resultCount").textContent =
    `${places.length} place${places.length === 1 ? "" : "s"}`;
  renderMap(places);
  renderCards(places);
  renderList(places);
}

// ----------------------------- Tabs -----------------------------------------
function switchView(view) {
  state.view = view;
  document.querySelectorAll(".tab").forEach((t) => {
    const on = t.dataset.view === view;
    t.classList.toggle("active", on);
    t.setAttribute("aria-selected", on);
  });
  document.querySelectorAll(".view").forEach((v) => {
    v.classList.toggle("active", v.id === `view-${view}`);
  });
  // Leaflet needs a nudge after being shown from display:none
  if (view === "map" && map) setTimeout(() => map.invalidateSize(), 50);
}

// ----------------------------- Wire events ----------------------------------
function wireEvents() {
  document.getElementById("searchInput").addEventListener("input", (e) => {
    state.search = e.target.value;
    render();
  });
  document.getElementById("areaSelect").addEventListener("change", (e) => {
    state.area = e.target.value;
    render();
  });
  document.getElementById("freeOnly").addEventListener("change", (e) => {
    state.freeOnly = e.target.checked;
    render();
  });
  document.getElementById("favOnly").addEventListener("change", (e) => {
    state.favOnly = e.target.checked;
    render();
  });
  document.getElementById("resetBtn").addEventListener("click", () => {
    state.search = "";
    state.area = "";
    state.freeOnly = false;
    state.favOnly = false;
    state.activeCats = new Set(Object.keys(CATEGORIES));
    document.getElementById("searchInput").value = "";
    document.getElementById("areaSelect").value = "";
    document.getElementById("freeOnly").checked = false;
    document.getElementById("favOnly").checked = false;
    document.querySelectorAll(".chip").forEach((c) => c.classList.add("active"));
    render();
  });

  document.querySelectorAll(".tab").forEach((t) =>
    t.addEventListener("click", () => switchView(t.dataset.view)),
  );

  document.getElementById("locateBtn").addEventListener("click", locateMe);

  document.querySelectorAll("#listTable th[data-sort]").forEach((th) => {
    th.addEventListener("click", () => {
      const key = th.dataset.sort;
      if (state.sortKey === key) state.sortDir *= -1;
      else { state.sortKey = key; state.sortDir = 1; }
      render();
    });
  });
}

// ----------------------------- Boot -----------------------------------------
function boot() {
  buildFilterControls();
  initMap();
  wireEvents();
  render();
}

document.addEventListener("DOMContentLoaded", boot);
