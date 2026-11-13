import { Clock, Edit3, Plus, Trash2, Upload, X } from "lucide-react";
import { useEffect, useState } from "react";
import ConfirmModal from "../../components/ConfirmModal";
import { SvgLoader } from "../../components/SiteChrome";
import { toast } from "../../components/Toast";
import {
  deleteBanner,
  formatTimeAgo,
  getBanners,
  saveBanner,
  uploadToCloudinaryWeb,
  type Banner,
} from "../../lib/store-web";

export default function AdminBanners() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", imageUrl: "", active: true });
  const [uploading, setUploading] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Banner | null>(null);

  async function load() {
    setLoading(true);
    try {
      setBanners(await getBanners());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div className="ff-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h3 style={{ margin: 0 }}>Promotional Banners ({banners.length})</h3>
          <div style={{ fontSize: 12.5, color: "#8C7A6B" }}>
            Banners appear live on the Customer Storefront carousel
          </div>
        </div>
        <button
          type="button"
          className="ff-btn ff-btn-primary"
          onClick={() => {
            setEditId(null);
            setForm({ name: "", imageUrl: "", active: true });
            setModalOpen(true);
          }}
        >
          <Plus size={16} /> Add Banner
        </button>
      </div>

      {loading ? (
        <div className="ff-card"><SvgLoader text="Loading promotional banners..." /></div>
      ) : (
        <div className="ff-grid-2">
          {banners.map((b) => (
            <div key={b.id} className="ff-card ff-card-hover" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ height: 190, borderRadius: 14, overflow: "hidden", background: "var(--ff-cream-card)", position: "relative" }}>
                <img src={b.imageUrl} alt={b.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <span
                  className="ff-badge"
                  style={{
                    position: "absolute",
                    top: 12,
                    right: 12,
                    background: b.active ? "#27AE60" : "#95A5A6",
                    color: "#fff",
                  }}
                >
                  {b.active ? "Active" : "Hidden"}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <strong style={{ fontSize: 16 }}>{b.name}</strong>
                  <div className="ff-timestamp">
                    <Clock size={11} /> Updated {formatTimeAgo((b as any).updated_at || (b as any).created_at)}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    type="button"
                    className="ff-btn ff-btn-soft"
                    onClick={() => {
                      setEditId(b.id);
                      setForm({ name: b.name, imageUrl: b.imageUrl, active: b.active });
                      setModalOpen(true);
                    }}
                  >
                    <Edit3 size={14} /> Edit
                  </button>
                  <button
                    type="button"
                    className="ff-btn ff-btn-danger-soft"
                    onClick={() => setPendingDelete(b)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        open={!!pendingDelete}
        title="Delete Promotional Banner?"
        description={`Remove "${pendingDelete?.name || ""}" from the Customer Storefront carousel?`}
        confirmLabel="Delete Banner"
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (!pendingDelete) return;
          await deleteBanner(pendingDelete.id);
          toast.info("Banner deleted");
          setPendingDelete(null);
          load();
        }}
      />

      {modalOpen && (
        <div className="ff-modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="ff-modal" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
              <h3 style={{ margin: 0 }}>{editId ? "Edit Banner" : "New Promotional Banner"}</h3>
              <button type="button" onClick={() => setModalOpen(false)} style={{ border: "none", background: "none" }}><X size={20} /></button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input
                className="ff-input"
                placeholder="Banner headline (e.g., Weekend Adobo Combo)"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  className="ff-input"
                  placeholder="Image URL"
                  value={form.imageUrl}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                />
                <label className="ff-btn ff-btn-soft" style={{ whiteSpace: "nowrap" }}>
                  <Upload size={14} /> {uploading ? "..." : "Upload"}
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      setUploading(true);
                      try {
                        const url = await uploadToCloudinaryWeb(f, "foodfix/banners");
                        setForm((p) => ({ ...p, imageUrl: url }));
                        toast.success("Banner image uploaded");
                      } finally {
                        setUploading(false);
                      }
                    }}
                  />
                </label>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                />
                Active on Customer Home
              </label>
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
              <button type="button" className="ff-btn ff-btn-outline" style={{ flex: 1 }} onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="ff-btn ff-btn-primary"
                style={{ flex: 1 }}
                onClick={async () => {
                  if (!form.name.trim() || !form.imageUrl.trim()) {
                    toast.error("Banner title and image URL are required.");
                    return;
                  }
                  await saveBanner(form, editId);
                  toast.success("Banner saved!");
                  setModalOpen(false);
                  load();
                }}
              >
                Save Banner
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

