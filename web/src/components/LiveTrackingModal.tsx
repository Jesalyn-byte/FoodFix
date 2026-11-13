import { ExternalLink, MapPin, Navigation, Phone, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { buildDeliveryMapHtml, type DeliveryMapSyncPayload } from "@shared/lib/delivery-map-html";
import {
  getSettings,
  onLocationUpdate,
  upsertLocationWeb,
  type AppSettings,
  type LiveLocation,
  type Order,
} from "../lib/store-web";
import OrderBreakdown from "./OrderBreakdown";
import { toast } from "./Toast";

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function LiveTrackingModal({
  order,
  role,
  viewerId,
  onClose,
}: {
  order: Order;
  role: "customer" | "staff" | "admin";
  viewerId?: string;
  onClose: () => void;
}) {
  const isCustomer = role === "customer";
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [driverLoc, setDriverLoc] = useState<LiveLocation | null>(null);
  const [customerLoc, setCustomerLoc] = useState<LiveLocation | null>(null);
  const [iframeReady, setIframeReady] = useState(false);
  const [sharingGps, setSharingGps] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    getSettings().then(setSettings).catch(() => {});
  }, []);

  useEffect(() => {
    const unsubDriver = onLocationUpdate(order.id, "staff", setDriverLoc);
    const unsubCust = onLocationUpdate(order.id, "customer", setCustomerLoc);
    return () => {
      unsubDriver();
      unsubCust();
      if (watchIdRef.current != null && typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [order.id]);

  const storeLat = settings?.store_lat ?? 14.031902;
  const storeLng = settings?.store_lng ?? 121.206633;
  const destLat = order.customer_lat ?? customerLoc?.lat ?? storeLat;
  const destLng = order.customer_lng ?? customerLoc?.lng ?? storeLng;

  const initialMapHtml = useMemo(
    () =>
      buildDeliveryMapHtml({
        storeLat,
        storeLng,
        storeName: settings?.store_name || "FoodFix Store",
        customerLat: destLat,
        customerLng: destLng,
        customerAddress: order.customer_address || "Delivery Destination",
        driverLat: driverLoc?.lat ?? null,
        driverLng: driverLoc?.lng ?? null,
        driverLabel: isCustomer ? order.driver_name || "Your Driver" : "Driver (Live)",
        isCustomer,
      }),
    // Only seed HTML once per open order modal so map never flickers on updates
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [order.id, isCustomer],
  );

  useEffect(() => {
    if (!iframeReady || !iframeRef.current?.contentWindow) return;
    const payload: DeliveryMapSyncPayload = {
      type: "sync",
      store: { lat: storeLat, lng: storeLng, name: settings?.store_name || "FoodFix Store" },
      customer: { lat: destLat, lng: destLng, address: order.customer_address || "Delivery Destination" },
      driver: driverLoc
        ? {
            lat: driverLoc.lat,
            lng: driverLoc.lng,
            speed: driverLoc.speed,
            label: isCustomer ? order.driver_name || "Your Driver" : "Driver (Live)",
          }
        : null,
    };
    iframeRef.current.contentWindow.postMessage(JSON.stringify(payload), "*");
  }, [
    iframeReady,
    storeLat,
    storeLng,
    destLat,
    destLng,
    driverLoc,
    order.customer_address,
    order.driver_name,
    settings?.store_name,
    isCustomer,
  ]);

  function toggleShareBrowserGps() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("Browser geolocation is not supported on this device.");
      return;
    }
    if (sharingGps) {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setSharingGps(false);
      toast.info("Stopped live GPS sharing.");
      return;
    }

    const pushLoc = (pos: GeolocationPosition) => {
      const speedKmh = pos.coords.speed != null && pos.coords.speed > 0 ? Math.round(pos.coords.speed * 3.6) : undefined;
      upsertLocationWeb(order.id, viewerId || "web-rider", "staff", {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy ?? undefined,
        speed: speedKmh,
      }).catch(() => {});
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        pushLoc(pos);
        watchIdRef.current = navigator.geolocation.watchPosition(pushLoc, () => {}, {
          enableHighAccuracy: true,
          maximumAge: 4000,
        });
        setSharingGps(true);
        toast.success("Broadcasting live driver GPS to Firestore.");
      },
      (err) => {
        toast.error(err.message || "Location permission denied.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  const distanceKm = driverLoc ? haversineKm(driverLoc.lat, driverLoc.lng, destLat, destLng) : null;
  const etaMins =
    distanceKm != null
      ? Math.max(1, Math.round((distanceKm / (driverLoc?.speed && driverLoc.speed > 2 ? driverLoc.speed : 25)) * 60))
      : null;

  return (
    <div className="ff-modal-overlay" role="dialog" aria-modal="true" aria-label={`Live tracking for order ${order.order_number}`} onClick={onClose}>
      <div className="ff-modal" style={{ maxWidth: 820, width: "95%", maxHeight: "92vh", display: "flex", flexDirection: "column", gap: 12, overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "#FEF3EC", color: "#F25C05", display: "grid", placeItems: "center" }}>
              <MapPin size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16.5 }}>Live Delivery Map · #{order.order_number}</h3>
              <div style={{ fontSize: 12, color: "var(--ff-espresso-muted)" }}>
                {driverLoc
                  ? `Live Rider GPS · ~${etaMins} min (${distanceKm?.toFixed(1)} km remaining)`
                  : "Waiting for rider GPS signal — showing pinned route destination"}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <a
              className="ff-btn ff-btn-soft"
              style={{ fontSize: 12, padding: "6px 12px" }}
              href={`https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink size={13} /> Google Maps
            </a>
            <button type="button" className="ff-icon-btn" onClick={onClose} aria-label="Close live tracking modal">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Map Canvas */}
        <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid var(--ff-border)", height: 360, background: "#F6EFE0" }}>
          <iframe
            ref={iframeRef}
            srcDoc={initialMapHtml}
            title={`Live Delivery Map Order ${order.order_number}`}
            style={{ width: "100%", height: "100%", border: "none", display: "block" }}
            onLoad={() => setIframeReady(true)}
          />
        </div>

        {/* Dedicated Non-Overlapping Legend Strip */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 14,
            alignItems: "center",
            padding: "8px 12px",
            borderRadius: 10,
            background: "var(--ff-cream-card)",
            border: "1px solid var(--ff-border)",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#E74C3C", display: "inline-block" }} />
            Delivery Destination
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#3498DB", display: "inline-block" }} />
            {isCustomer ? "Driver (Live)" : "Driver / Rider"}
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#F25C05", display: "inline-block" }} />
            Store Origin
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 16, height: 3, borderRadius: 2, background: "#F25C05", display: "inline-block" }} />
            Active Road Route
          </span>
        </div>

        {/* Order Details & Rider Info */}
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 12, alignItems: "start" }}>
          <div style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid var(--ff-border)", fontSize: 12.5 }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>{order.customer_name}</div>
            <div style={{ color: "var(--ff-espresso-muted)" }}>{order.customer_address}</div>
            {order.driver_name && (
              <div style={{ marginTop: 6, color: "#1F618D", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                Rider: {order.driver_name}
                {order.driver_phone && (
                  <a href={`tel:${order.driver_phone}`} style={{ color: "#27AE60", display: "inline-flex", alignItems: "center", gap: 3 }}>
                    <Phone size={12} /> {order.driver_phone}
                  </a>
                )}
              </div>
            )}
            {role === "staff" && (
              <button
                type="button"
                className={`ff-btn ${sharingGps ? "ff-btn-danger" : "ff-btn-primary"}`}
                style={{ marginTop: 10, width: "100%", fontSize: 12.5 }}
                onClick={toggleShareBrowserGps}
              >
                <Navigation size={14} /> {sharingGps ? "Stop Live GPS Broadcast" : "Broadcast My Location"}
              </button>
            )}
          </div>
          <OrderBreakdown
            items={order.items || []}
            subtotal={order.subtotal}
            deliveryFee={order.delivery_fee}
            total={order.total}
          />
        </div>
      </div>
    </div>
  );
}
