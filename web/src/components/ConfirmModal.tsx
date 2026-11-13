import { AlertTriangle, X } from "lucide-react";

interface Props {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export default function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  danger = true,
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null;

  return (
    <div className="ff-modal-overlay" role="dialog" aria-modal="true" onClick={onCancel}>
      <div className="ff-modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: danger ? "rgba(231,76,60,0.14)" : "var(--ff-orange-tint)",
                color: danger ? "#E74C3C" : "var(--ff-orange)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AlertTriangle size={20} />
            </div>
            <h3 style={{ margin: 0, fontSize: 17 }}>{title}</h3>
          </div>
          <button type="button" className="ff-icon-btn" onClick={onCancel} aria-label="Close modal">
            <X size={16} />
          </button>
        </div>

        <p style={{ margin: "0 0 18px", fontSize: 13.5, color: "var(--ff-espresso-muted)", lineHeight: 1.55 }}>
          {description}
        </p>

        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" className="ff-btn ff-btn-outline" style={{ flex: 1 }} onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className={`ff-btn ${danger ? "ff-btn-red" : "ff-btn-primary"}`}
            style={{ flex: 1 }}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

