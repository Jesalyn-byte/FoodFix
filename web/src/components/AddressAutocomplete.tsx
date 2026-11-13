import { Loader2, LocateFixed, MapPin } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "./Toast";

export interface PlaceSuggestion {
  label: string;
  lat: number;
  lng: number;
  tag?: string;
}

const QUICK_PLACES: PlaceSuggestion[] = [
  {
    label: "PUP Santo Tomas Campus, Poblacion II, Santo Tomas, Batangas",
    lat: 14.1079,
    lng: 121.1419,
    tag: "Popular",
  },
  {
    label: "P. Herrera St, Poblacion, Batangas City, 4200 Batangas",
    lat: 13.7565,
    lng: 121.0583,
    tag: "Near Store",
  },
  {
    label: "SM City Santo Tomas, Maharlika Hwy, Santo Tomas, Batangas",
    lat: 14.1112,
    lng: 121.1436,
    tag: "Landmark",
  },
  {
    label: "Tanauan City Public Market, Poblacion, Tanauan, Batangas",
    lat: 14.0861,
    lng: 121.1502,
    tag: "Landmark",
  },
  {
    label: "Lipa City Hall, Maraouy, Lipa City, Batangas",
    lat: 13.9547,
    lng: 121.1636,
    tag: "Landmark",
  },
  {
    label: "SM City Calamba, Real, Calamba, Laguna",
    lat: 14.2059,
    lng: 121.1558,
    tag: "Landmark",
  },
];

interface Props {
  value: string;
  coords?: { lat: number; lng: number } | null;
  placeholder?: string;
  onChange: (address: string, coords?: { lat: number; lng: number } | null) => void;
}

export default function AddressAutocomplete({
  value,
  coords,
  placeholder = "Search delivery place or street...",
  onChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [remote, setRemote] = useState<PlaceSuggestion[]>([]);
  const timerRef = useRef<number | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  async function fetchPlaces(queryText: string) {
    const q = queryText.trim();
    if (q.length < 3) {
      setRemote([]);
      return;
    }
    setSearching(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        q,
      )}&format=json&limit=5&addressdetails=1&countrycodes=ph`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (res.ok) {
        const rows = (await res.json()) as any[];
        setRemote(
          (rows || []).map((r) => ({
            label: String(r.display_name || ""),
            lat: Number(r.lat),
            lng: Number(r.lon),
            tag: r.type ? String(r.type).replace(/_/g, " ") : "Place",
          })),
        );
      }
    } catch {
      // Fallback to quick curated places silently when offline
    } finally {
      setSearching(false);
    }
  }

  function handleInputChange(next: string) {
    onChange(next, null);
    setOpen(true);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      fetchPlaces(next);
    }, 400);
  }

  function handleSelect(place: PlaceSuggestion) {
    onChange(place.label, { lat: place.lat, lng: place.lng });
    setOpen(false);
  }

  function handleUseGps() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("GPS location is unavailable in this browser.");
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        let label = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
          );
          if (res.ok) {
            const data = await res.json();
            if (data?.display_name) label = data.display_name;
          }
        } catch {
          // Keep coordinate label fallback
        }
        onChange(label, { lat, lng });
        setOpen(false);
        setGpsLoading(false);
        toast.success("Pinned current location!");
      },
      (err) => {
        setGpsLoading(false);
        toast.error(err.message || "Could not get GPS location.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  const qLower = value.trim().toLowerCase();
  const filteredLocal = QUICK_PLACES.filter(
    (p) => !qLower || p.label.toLowerCase().includes(qLower),
  );
  const suggestions = remote.length > 0 ? remote : filteredLocal;

  return (
    <div ref={wrapRef} className="ff-address-autocomplete">
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1 }}>
          <MapPin
            size={15}
            color="#F25C05"
            style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
          />
          <input
            className="ff-input"
            style={{ paddingLeft: 34 }}
            placeholder={placeholder}
            value={value}
            onFocus={() => setOpen(true)}
            onChange={(e) => handleInputChange(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="ff-btn ff-btn-soft"
          style={{ padding: "9px 11px", whiteSpace: "nowrap" }}
          onClick={handleUseGps}
          disabled={gpsLoading}
          title="Use current GPS location"
        >
          {gpsLoading ? <Loader2 size={14} className="ff-spin" /> : <LocateFixed size={14} />}
          Pin GPS
        </button>
      </div>

      {coords && (
        <div style={{ fontSize: 11, color: "#27AE60", fontWeight: 700, marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
          <MapPin size={11} /> Map pin ready ({coords.lat.toFixed(4)}, {coords.lng.toFixed(4)})
        </div>
      )}

      {open && (searching || suggestions.length > 0) && (
        <div className="ff-address-suggestions" role="listbox" aria-label="Suggested places">
          <div style={{ padding: "5px 9px", fontSize: 10.5, fontWeight: 800, color: "var(--ff-gray)", textTransform: "uppercase", letterSpacing: 0.5, display: "flex", justifyContent: "space-between" }}>
            <span>{remote.length > 0 ? "Suggested Places" : "Popular & Nearby Places"}</span>
            {searching && <Loader2 size={12} className="ff-spin" color="#F25C05" />}
          </div>
          {suggestions.map((s) => (
            <button
              key={`${s.label}-${s.lat}-${s.lng}`}
              type="button"
              className="ff-address-option"
              onClick={() => handleSelect(s)}
            >
              <MapPin size={14} color="#F25C05" style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ flex: 1 }}>
                <div>{s.label}</div>
                {s.tag && (
                  <span style={{ fontSize: 10.5, color: "var(--ff-gray)", textTransform: "capitalize" }}>
                    {s.tag}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

