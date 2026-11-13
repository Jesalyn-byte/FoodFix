export interface DeliveryMapInitOptions {
  storeLat: number;
  storeLng: number;
  storeName?: string;
  customerLat: number;
  customerLng: number;
  customerAddress?: string;
  driverLat?: number | null;
  driverLng?: number | null;
  driverLabel?: string;
  isCustomer: boolean;
}

export interface DeliveryMapSyncPayload {
  type: "sync";
  store: { lat: number; lng: number; name?: string };
  customer: { lat: number; lng: number; address?: string };
  driver: { lat: number; lng: number; speed?: number; label?: string } | null;
}

function escapeJs(value: string): string {
  return JSON.stringify(String(value || ""));
}

/**
 * Shared Leaflet interactive map HTML for both React Native WebView and Web iframe.
 * Designed to avoid any bottom-corner legend/attribution overlap on narrow viewports
 * while adding OSRM road routing, dashed fallback, pulsing live driver marker,
 * map-style switching, Fit Route, and Follow Rider controls.
 */
export function buildDeliveryMapHtml(opts: DeliveryMapInitOptions): string {
  const sLat = Number.isFinite(opts.storeLat) ? opts.storeLat : 14.031902;
  const sLng = Number.isFinite(opts.storeLng) ? opts.storeLng : 121.206633;
  const cLat = Number.isFinite(opts.customerLat) ? opts.customerLat : sLat;
  const cLng = Number.isFinite(opts.customerLng) ? opts.customerLng : sLng;
  const hasDriver =
    typeof opts.driverLat === "number" &&
    Number.isFinite(opts.driverLat) &&
    typeof opts.driverLng === "number" &&
    Number.isFinite(opts.driverLng);
  const dLat = hasDriver ? (opts.driverLat as number) : null;
  const dLng = hasDriver ? (opts.driverLng as number) : null;

  const centerLat = ((dLat ?? sLat) + cLat) / 2;
  const centerLng = ((dLng ?? sLng) + cLng) / 2;
  const driverPopup = opts.driverLabel || (opts.isCustomer ? "Your Driver" : "You (Driver)");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  * { box-sizing: border-box; }
  html, body, #map {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: #F6EFE0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }
  .leaflet-top.leaflet-left {
    top: 8px;
    left: 8px;
  }
  .leaflet-bar {
    border: none !important;
    box-shadow: 0 2px 8px rgba(46, 26, 6, 0.16) !important;
    border-radius: 10px !important;
    overflow: hidden;
  }
  .leaflet-bar a {
    width: 32px !important;
    height: 32px !important;
    line-height: 32px !important;
    color: #2E1A06 !important;
    font-weight: 700 !important;
    border-bottom-color: #EFE5D0 !important;
  }
  .leaflet-control-attribution {
    background: rgba(255, 255, 255, 0.86) !important;
    color: #5E4A39 !important;
    font-size: 9px !important;
    line-height: 1.2 !important;
    padding: 3px 7px !important;
    border-radius: 8px 0 0 0 !important;
    max-width: 145px !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }
  .map-actions {
    position: fixed;
    top: 8px;
    right: 8px;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    gap: 6px;
    align-items: flex-end;
  }
  .map-btn {
    border: 1px solid rgba(46, 26, 6, 0.12);
    background: rgba(255, 255, 255, 0.95);
    color: #2E1A06;
    font-size: 11px;
    font-weight: 700;
    padding: 6px 10px;
    border-radius: 999px;
    box-shadow: 0 2px 8px rgba(46, 26, 6, 0.14);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    white-space: nowrap;
    backdrop-filter: blur(6px);
  }
  .map-btn.active {
    background: #F25C05;
    color: #fff;
    border-color: #F25C05;
  }
  .route-hud {
    position: fixed;
    bottom: 8px;
    left: 8px;
    z-index: 1000;
    max-width: calc(100vw - 165px);
    background: rgba(255, 255, 255, 0.95);
    color: #2E1A06;
    border: 1px solid #E8D8B0;
    border-radius: 999px;
    padding: 5px 10px;
    font-size: 11px;
    font-weight: 700;
    box-shadow: 0 2px 8px rgba(46, 26, 6, 0.14);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .hud-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #27AE60;
    flex-shrink: 0;
  }
  .pin-wrap {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .pin-badge {
    width: 28px;
    height: 28px;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2.5px solid #ffffff;
    box-shadow: 0 3px 8px rgba(0, 0, 0, 0.32);
  }
  .pin-badge > span {
    transform: rotate(45deg);
    color: #ffffff;
    font-size: 11px;
    font-weight: 800;
    line-height: 1;
  }
  .driver-orb {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: #3498DB;
    border: 3px solid #ffffff;
    box-shadow: 0 2px 10px rgba(52, 152, 219, 0.55);
    color: #ffffff;
    font-size: 11px;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    z-index: 2;
  }
  .driver-pulse {
    position: absolute;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: rgba(52, 152, 219, 0.28);
    animation: pulseRing 1.9s ease-out infinite;
    z-index: 1;
  }
  @keyframes pulseRing {
    0% { transform: scale(0.65); opacity: 0.9; }
    100% { transform: scale(1.45); opacity: 0; }
  }
  .leaflet-popup-content-wrapper {
    border-radius: 12px !important;
    font-size: 12px !important;
    color: #2E1A06 !important;
  }
</style>
</head>
<body>
<div id="map"></div>

<div class="map-actions">
  <button type="button" class="map-btn" id="btnFit" title="Fit entire route">Fit Route</button>
  <button type="button" class="map-btn" id="btnFollow" title="Follow live rider">Follow Driver</button>
  <button type="button" class="map-btn" id="btnLayer" title="Toggle map style">Clean Map</button>
</div>

<div class="route-hud" id="routeHud">
  <span class="hud-dot" id="hudDot"></span>
  <span id="hudText">Calculating route...</span>
</div>

<script>
  var state = {
    store: { lat: ${sLat}, lng: ${sLng}, name: ${escapeJs(opts.storeName || "FOODFIX Store")} },
    customer: { lat: ${cLat}, lng: ${cLng}, address: ${escapeJs(opts.customerAddress || "Delivery Destination")} },
    driver: ${hasDriver ? `{ lat: ${dLat}, lng: ${dLng}, speed: null, label: ${escapeJs(driverPopup)} }` : "null"},
    followDriver: false,
    userInteracted: false,
    useAltLayer: false,
    lastRouteKey: "",
    lastRouteAt: 0
  };

  var map = L.map("map", {
    zoomControl: true,
    attributionControl: false
  }).setView([${centerLat}, ${centerLng}], 14);

  L.control.attribution({ position: "bottomright", prefix: false }).addTo(map);

  var osmLayer = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap",
    maxZoom: 19
  });

  var esriLayer = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}", {
    attribution: "&copy; Esri &copy; OSM",
    maxZoom: 19
  });

  var osmTileErrors = 0;
  osmLayer.on("tileerror", function() {
    osmTileErrors++;
    if (osmTileErrors >= 3 && !state.useAltLayer) {
      state.useAltLayer = true;
      map.removeLayer(osmLayer);
      esriLayer.addTo(map);
      var btn = document.getElementById("btnLayer");
      if (btn) {
        btn.textContent = "Street Map";
        btn.classList.add("active");
      }
    }
  });

  osmLayer.addTo(map);

  function makePin(bg, letter) {
    return L.divIcon({
      html: '<div class="pin-wrap"><div class="pin-badge" style="background:' + bg + '"><span>' + letter + '</span></div></div>',
      className: "",
      iconSize: [28, 34],
      iconAnchor: [14, 30],
      popupAnchor: [0, -28]
    });
  }

  function makeDriverPin() {
    return L.divIcon({
      html: '<div class="pin-wrap" style="width:44px;height:44px"><div class="driver-pulse"></div><div class="driver-orb">D</div></div>',
      className: "",
      iconSize: [44, 44],
      iconAnchor: [22, 22],
      popupAnchor: [0, -18]
    });
  }

  var storeMarker = L.marker([state.store.lat, state.store.lng], {
    icon: makePin("#F25C05", "S")
  }).addTo(map).bindPopup("<b>" + state.store.name + "</b><br/>Store Origin");

  var custMarker = L.marker([state.customer.lat, state.customer.lng], {
    icon: makePin("#E74C3C", "C")
  }).addTo(map).bindPopup("<b>Delivery Destination</b><br/>" + state.customer.address);

  var arrivalCircle = L.circle([state.customer.lat, state.customer.lng], {
    radius: 120,
    color: "#E74C3C",
    weight: 1.2,
    opacity: 0.45,
    fillColor: "#E74C3C",
    fillOpacity: 0.08
  }).addTo(map);

  var driverMarker = null;
  if (state.driver) {
    driverMarker = L.marker([state.driver.lat, state.driver.lng], {
      icon: makeDriverPin(),
      zIndexOffset: 1000
    }).addTo(map).bindPopup("<b>" + state.driver.label + "</b><br/>Live location");
  }

  // Route polylines: Store->Origin dashed leg, and Delivery active leg (casing + orange inner)
  var pickupLine = L.polyline([], {
    color: "#64748B",
    weight: 3,
    opacity: 0.65,
    dashArray: "5, 7"
  }).addTo(map);

  var routeCasing = L.polyline([], {
    color: "#FFFFFF",
    weight: 7,
    opacity: 0.92,
    lineCap: "round",
    lineJoin: "round"
  }).addTo(map);

  var routeLine = L.polyline([], {
    color: "#F25C05",
    weight: 4.5,
    opacity: 0.95,
    lineCap: "round",
    lineJoin: "round"
  }).addTo(map);

  function haversineKm(aLat, aLng, bLat, bLng) {
    var R = 6371;
    var dLat = (bLat - aLat) * Math.PI / 180;
    var dLng = (bLng - aLng) * Math.PI / 180;
    var s = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(aLat * Math.PI / 180) * Math.cos(bLat * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  }

  function updateHud(roadKm, roadMin, isEstimated) {
    var dot = document.getElementById("hudDot");
    var txt = document.getElementById("hudText");
    if (!dot || !txt) return;
    if (!state.driver) {
      dot.style.background = "#F39C12";
      txt.textContent = "Route: " + roadKm.toFixed(1) + " km from store";
      return;
    }
    dot.style.background = "#27AE60";
    var distLabel = roadKm < 1 ? Math.round(roadKm * 1000) + " m" : roadKm.toFixed(1) + " km";
    var spd = state.driver.speed && state.driver.speed > 2 ? " · " + state.driver.speed + " km/h" : "";
    var prefix = isEstimated ? "~" : "Road ";
    txt.textContent = prefix + distLabel + " · ~" + Math.max(1, Math.round(roadMin)) + " min" + spd;
  }

  function drawRoutes(forceRouteFetch) {
    var fromPt = state.driver ? state.driver : state.store;
    var toPt = state.customer;

    if (state.driver) {
      pickupLine.setLatLngs([[state.store.lat, state.store.lng], [state.driver.lat, state.driver.lng]]);
    } else {
      pickupLine.setLatLngs([]);
    }

    var fallbackKm = haversineKm(fromPt.lat, fromPt.lng, toPt.lat, toPt.lng);
    var spd = (state.driver && state.driver.speed && state.driver.speed > 2) ? state.driver.speed : 26;
    var fallbackMin = (fallbackKm / spd) * 60;

    if (routeLine.getLatLngs().length === 0) {
      var straight = [[fromPt.lat, fromPt.lng], [toPt.lat, toPt.lng]];
      routeCasing.setLatLngs(straight);
      routeLine.setStyle({ dashArray: "6, 8" });
      routeLine.setLatLngs(straight);
      updateHud(fallbackKm, fallbackMin, true);
    }

    var routeKey = fromPt.lat.toFixed(3) + "," + fromPt.lng.toFixed(3) + "->" + toPt.lat.toFixed(3) + "," + toPt.lng.toFixed(3);
    var now = Date.now();
    if (!forceRouteFetch && routeKey === state.lastRouteKey && now - state.lastRouteAt < 15000) {
      return;
    }
    state.lastRouteKey = routeKey;
    state.lastRouteAt = now;

    var url = "https://router.project-osrm.org/route/v1/driving/" +
      fromPt.lng + "," + fromPt.lat + ";" + toPt.lng + "," + toPt.lat +
      "?overview=full&geometries=geojson";

    fetch(url)
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data && data.routes && data.routes[0] && data.routes[0].geometry && data.routes[0].geometry.coordinates) {
          var latLngs = data.routes[0].geometry.coordinates.map(function(c) { return [c[1], c[0]]; });
          routeCasing.setLatLngs(latLngs);
          routeLine.setStyle({ dashArray: null });
          routeLine.setLatLngs(latLngs);
          var km = (data.routes[0].distance || 0) / 1000;
          var mins = (data.routes[0].duration || 0) / 60;
          if (km > 0) updateHud(km, mins, false);
        }
      })
      .catch(function() {
        var straight = [[fromPt.lat, fromPt.lng], [toPt.lat, toPt.lng]];
        routeCasing.setLatLngs(straight);
        routeLine.setStyle({ dashArray: "6, 8" });
        routeLine.setLatLngs(straight);
        updateHud(fallbackKm, fallbackMin, true);
      });
  }

  function fitAll(paddingTopBottom) {
    var markers = [storeMarker, custMarker];
    if (driverMarker) markers.push(driverMarker);
    var group = new L.featureGroup(markers);
    var bounds = group.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, {
        paddingTopLeft: [46, paddingTopBottom || 52],
        paddingBottomRight: [46, paddingTopBottom || 52],
        maxZoom: 16
      });
    }
  }

  function syncFollowButton() {
    var btn = document.getElementById("btnFollow");
    if (!btn) return;
    if (state.followDriver) btn.classList.add("active");
    else btn.classList.remove("active");
  }

  document.getElementById("btnFit").addEventListener("click", function() {
    state.followDriver = false;
    state.userInteracted = false;
    syncFollowButton();
    fitAll();
  });

  document.getElementById("btnFollow").addEventListener("click", function() {
    if (!driverMarker) {
      fitAll();
      return;
    }
    state.followDriver = !state.followDriver;
    syncFollowButton();
    if (state.followDriver) {
      map.setView(driverMarker.getLatLng(), Math.max(map.getZoom(), 15), { animate: true });
    }
  });

  document.getElementById("btnLayer").addEventListener("click", function() {
    state.useAltLayer = !state.useAltLayer;
    var btn = document.getElementById("btnLayer");
    if (state.useAltLayer) {
      map.removeLayer(osmLayer);
      esriLayer.addTo(map);
      btn.textContent = "Street Map";
      btn.classList.add("active");
    } else {
      map.removeLayer(esriLayer);
      osmLayer.addTo(map);
      btn.textContent = "Clean Map";
      btn.classList.remove("active");
    }
  });

  map.on("dragstart", function() {
    state.userInteracted = true;
    if (state.followDriver) {
      state.followDriver = false;
      syncFollowButton();
    }
  });

  function applySync(d) {
    if (d.store && typeof d.store.lat === "number" && typeof d.store.lng === "number") {
      state.store = { lat: d.store.lat, lng: d.store.lng, name: d.store.name || state.store.name };
      storeMarker.setLatLng([state.store.lat, state.store.lng]);
      storeMarker.setPopupContent("<b>" + state.store.name + "</b><br/>Store Origin");
    }
    if (d.customer && typeof d.customer.lat === "number" && typeof d.customer.lng === "number") {
      state.customer = { lat: d.customer.lat, lng: d.customer.lng, address: d.customer.address || state.customer.address };
      custMarker.setLatLng([state.customer.lat, state.customer.lng]);
      arrivalCircle.setLatLng([state.customer.lat, state.customer.lng]);
      custMarker.setPopupContent("<b>Delivery Destination</b><br/>" + state.customer.address);
    }
    if (d.driver && typeof d.driver.lat === "number" && typeof d.driver.lng === "number") {
      var spd = typeof d.driver.speed === "number" ? d.driver.speed : null;
      var lbl = d.driver.label || (state.driver ? state.driver.label : "Driver");
      state.driver = { lat: d.driver.lat, lng: d.driver.lng, speed: spd, label: lbl };
      var popupHtml = "<b>" + lbl + "</b><br/>Live GPS" + (spd && spd > 0 ? " · " + spd + " km/h" : "");
      if (!driverMarker) {
        driverMarker = L.marker([d.driver.lat, d.driver.lng], {
          icon: makeDriverPin(),
          zIndexOffset: 1000
        }).addTo(map).bindPopup(popupHtml);
        if (!state.userInteracted) fitAll();
      } else {
        driverMarker.setLatLng([d.driver.lat, d.driver.lng]);
        driverMarker.setPopupContent(popupHtml);
        if (state.followDriver) {
          map.panTo([d.driver.lat, d.driver.lng], { animate: true });
        }
      }
    } else if (d.type === "driverUpdate" && typeof d.lat === "number" && typeof d.lng === "number") {
      applySync({ driver: { lat: d.lat, lng: d.lng, speed: d.speed } });
      return;
    }
    drawRoutes(false);
    if (!state.userInteracted && !state.followDriver) {
      fitAll();
    }
  }

  function handleMsg(raw) {
    try {
      var d = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (!d || typeof d !== "object") return;
      if (d.type === "sync" || d.type === "driverUpdate") {
        applySync(d);
      }
    } catch (err) {}
  }

  document.addEventListener("message", function(e) { handleMsg(e.data); });
  window.addEventListener("message", function(e) { handleMsg(e.data); });

  fitAll();
  drawRoutes(true);
</script>
</body>
</html>`;
}

