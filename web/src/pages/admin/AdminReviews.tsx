import { Clock, Star, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import ConfirmModal from "../../components/ConfirmModal";
import { SvgLoader } from "../../components/SiteChrome";
import { toast } from "../../components/Toast";
import { deleteReview, formatTimeAgo, getReviews, type Review } from "../../lib/store-web";

export default function AdminReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<Review | null>(null);

  async function load() {
    setLoading(true);
    try {
      setReviews(await getReviews());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const avg =
    reviews.length > 0
      ? (reviews.reduce((s, r) => s + Number(r.rating || 0), 0) / reviews.length).toFixed(1)
      : "0.0";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div className="ff-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h3 style={{ margin: 0 }}>Customer Reviews ({reviews.length})</h3>
          <div style={{ fontSize: 12.5, color: "var(--ff-gray)" }}>
            Verified order ratings submitted across web &amp; mobile
          </div>
        </div>
        <div className="ff-badge" style={{ background: "#FFF8E1", color: "#D35400", fontSize: 15, padding: "8px 14px" }}>
          <Star size={16} fill="#F39C12" color="#F39C12" /> {avg} / 5.0
        </div>
      </div>

      {loading ? (
        <div className="ff-card"><SvgLoader text="Loading customer reviews..." /></div>
      ) : reviews.length === 0 ? (
        <div className="ff-card" style={{ textAlign: "center", padding: 40, color: "var(--ff-gray)" }}>
          No customer reviews submitted yet.
        </div>
      ) : (
        <div className="ff-grid-2">
          {reviews.map((r) => (
            <div key={r.id} className="ff-card ff-card-hover" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <strong style={{ fontSize: 15 }}>{r.menu_item_name}</strong>
                  <div className="ff-timestamp">
                    <Clock size={11} /> by {r.username} · Updated {formatTimeAgo((r as any).updated_at || r.created_at)}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <Star
                      key={idx}
                      size={15}
                      color="#F39C12"
                      fill={idx < r.rating ? "#F39C12" : "transparent"}
                    />
                  ))}
                </div>
              </div>

              <p style={{ margin: 0, fontSize: 13.5, color: "var(--ff-espresso)", lineHeight: 1.5 }}>{r.comment}</p>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="ff-btn ff-btn-danger-soft"
                  onClick={() => setPendingDelete(r)}
                >
                  <Trash2 size={14} /> Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        open={!!pendingDelete}
        title="Remove Customer Review?"
        description={`Permanently delete ${pendingDelete?.username || "this customer"}'s review of "${pendingDelete?.menu_item_name || ""}"?`}
        confirmLabel="Remove Review"
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (!pendingDelete) return;
          await deleteReview(pendingDelete.id);
          toast.info("Review deleted");
          setReviews((prev) => prev.filter((x) => x.id !== pendingDelete.id));
          setPendingDelete(null);
        }}
      />
    </div>
  );
}

