import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { useEffect, useState } from "react";

type ToastTone = "success" | "error" | "info";
interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
}

type Listener = (item: ToastItem) => void;
let nextId = 1;
const listeners = new Set<Listener>();

function emit(tone: ToastTone, message: string) {
  const item: ToastItem = { id: nextId++, tone, message };
  listeners.forEach((fn) => fn(item));
}

export const toast = {
  success: (msg: string) => emit("success", msg),
  error: (msg: string) => emit("error", msg),
  info: (msg: string) => emit("info", msg),
};

export function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handler: Listener = (item) => {
      setItems((prev) => [...prev.slice(-3), item]);
      setTimeout(() => {
        setItems((prev) => prev.filter((x) => x.id !== item.id));
      }, 3600);
    };
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 22,
        right: 22,
        zIndex: 200,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        maxWidth: 380,
      }}
    >
      {items.map((t) => {
        const bg =
          t.tone === "success" ? "#1E8449" : t.tone === "error" ? "#C0392B" : "#2E1A06";
        const Icon =
          t.tone === "success" ? CheckCircle2 : t.tone === "error" ? AlertCircle : Info;
        return (
          <div
            key={t.id}
            style={{
              background: bg,
              color: "#fff",
              borderRadius: 14,
              padding: "12px 14px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              boxShadow: "0 10px 26px rgba(0,0,0,0.22)",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <Icon size={18} style={{ flexShrink: 0 }} />
            <span style={{ flex: 1 }}>{t.message}</span>
            <button
              onClick={() => setItems((prev) => prev.filter((x) => x.id !== t.id))}
              style={{
                border: "none",
                background: "transparent",
                color: "rgba(255,255,255,0.8)",
                padding: 2,
                display: "flex",
              }}
            >
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

