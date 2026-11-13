import { Edit3, History, PackagePlus, Plus, Search, Trash2, Upload, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MENU_CATEGORIES, MENU_CATEGORY_COLORS } from "@shared/constants/order";
import { toast } from "../../components/Toast";
import { addCategory, deleteCategory, getCategories, type Category } from "../../lib/firebase-web";
import {
  addInventoryAdjustment,
  addMenuItem,
  deleteMenuItem,
  getInventoryAdjustments,
  onMenuItemsUpdate,
  updateMenuItem,
  uploadToCloudinaryWeb,
  type MenuItem,
} from "../../lib/store-web";

const EMPTY_FORM = {
  name: "",
  description: "",
  price: "",
  category: MENU_CATEGORIES[0] as string,
  image_url: "",
  stock_quantity: "50",
  available: true,
  is_made_to_order: false,
  calories: "",
  protein: "",
  carbs: "",
  fat: "",
};

export default function AdminMenu() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [adjustTarget, setAdjustTarget] = useState<MenuItem | null>(null);
  const [adjustDelta, setAdjustDelta] = useState("10");
  const [adjustReason, setAdjustReason] = useState("restock");
  const [adjustNotes, setAdjustNotes] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  const [catModalOpen, setCatModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState("#F25C05");

  useEffect(() => {
    const unsub = onMenuItemsUpdate(setItems);
    getCategories().then(setCategories).catch(() => {});
    return () => unsub();
  }, []);

  const allCategoryNames = useMemo(() => {
    const set = new Set<string>([...MENU_CATEGORIES, ...categories.map((c) => c.name)]);
    return Array.from(set);
  }, [categories]);

  const filtered = useMemo(() => {
    return items.filter((i) => {
      if (activeCat && i.category !== activeCat) return false;
      if (search.trim()) {
        const s = search.trim().toLowerCase();
        return i.name.toLowerCase().includes(s) || i.description?.toLowerCase().includes(s);
      }
      return true;
    });
  }, [items, activeCat, search]);

  function openAdd() {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setModalOpen(true);
  }

  function openEdit(item: MenuItem) {
    setEditing(item);
    setForm({
      name: item.name,
      description: item.description || "",
      price: String(item.price),
      category: item.category || MENU_CATEGORIES[0],
      image_url: item.image_url || "",
      stock_quantity: String(item.stock_quantity ?? 0),
      available: item.available,
      is_made_to_order: Boolean(item.is_made_to_order),
      calories: item.nutrients?.calories ? String(item.nutrients.calories) : "",
      protein: item.nutrients?.protein ? String(item.nutrients.protein) : "",
      carbs: item.nutrients?.carbs ? String(item.nutrients.carbs) : "",
      fat: item.nutrients?.fat ? String(item.nutrients.fat) : "",
    });
    setModalOpen(true);
  }

  async function handleSaveDish() {
    if (!form.name.trim() || !form.price) {
      toast.error("Dish name and price are required.");
      return;
    }
    setSaving(true);
    try {
      const payload: Omit<MenuItem, "id" | "created_at"> = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: Number(form.price) || 0,
        category: form.category,
        image_url: form.image_url.trim(),
        stock_quantity: form.is_made_to_order ? 999 : Number(form.stock_quantity) || 0,
        available: form.available,
        is_made_to_order: form.is_made_to_order,
        nutrients: {
          calories: form.calories ? Number(form.calories) : undefined,
          protein: form.protein ? Number(form.protein) : undefined,
          carbs: form.carbs ? Number(form.carbs) : undefined,
          fat: form.fat ? Number(form.fat) : undefined,
        },
      };
      if (editing) {
        await updateMenuItem(editing.id, payload);
        toast.success(`Updated ${payload.name}`);
      } else {
        await addMenuItem(payload);
        toast.success(`Added ${payload.name} to menu`);
      }
      setModalOpen(false);
    } catch (e: any) {
      toast.error(e?.message || "Failed to save dish");
    } finally {
      setSaving(false);
    }
  }

  async function handleFileUpload(file?: File) {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadToCloudinaryWeb(file, "foodfix/menu");
      setForm((p) => ({ ...p, image_url: url }));
      toast.success("Dish image uploaded!");
    } catch (e: any) {
      toast.error(e?.message || "Image upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Action Header */}
      <div className="ff-card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ position: "relative", minWidth: 260, flex: 1 }}>
            <Search size={16} color="#8C7A6B" style={{ position: "absolute", left: 13, top: 12 }} />
            <input
              className="ff-input"
              style={{ paddingLeft: 38 }}
              placeholder="Search dishes or descriptions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              className="ff-btn ff-btn-outline"
              onClick={async () => {
                setHistory(await getInventoryAdjustments());
                setHistoryOpen(true);
              }}
            >
              <History size={15} /> Stock Logs
            </button>
            <button type="button" className="ff-btn ff-btn-outline" onClick={() => setCatModalOpen(true)}>
              Categories
            </button>
            <button type="button" className="ff-btn ff-btn-primary" onClick={openAdd}>
              <Plus size={16} /> Add Dish
            </button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            className="ff-btn ff-btn-pill"
            style={{
              padding: "6px 13px",
              fontSize: 12,
              background: !activeCat ? "#F25C05" : "#FDF5E0",
              color: !activeCat ? "#fff" : "#6D4C41",
            }}
            onClick={() => setActiveCat("")}
          >
            All ({items.length})
          </button>
          {allCategoryNames.map((cat) => (
            <button
              key={cat}
              type="button"
              className="ff-btn ff-btn-pill"
              style={{
                padding: "6px 13px",
                fontSize: 12,
                background: activeCat === cat ? "#F25C05" : "#FDF5E0",
                color: activeCat === cat ? "#fff" : "#6D4C41",
              }}
              onClick={() => setActiveCat(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Grid */}
      <div className="ff-grid-3">
        {filtered.map((item) => {
          const catColor = MENU_CATEGORY_COLORS[item.category] || "#F25C05";
          return (
            <div key={item.id} className="ff-card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ position: "relative", borderRadius: 14, overflow: "hidden", height: 170, background: "#FDF5E0" }}>
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#8C7A6B" }}>
                    No Image
                  </div>
                )}
                <span
                  className="ff-badge"
                  style={{
                    position: "absolute",
                    top: 10,
                    left: 10,
                    background: catColor,
                    color: "#fff",
                  }}
                >
                  {item.category}
                </span>
                <span
                  className="ff-badge"
                  style={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    background: item.available ? "#27AE60" : "#E74C3C",
                    color: "#fff",
                  }}
                >
                  {item.available ? "Available" : "Sold Out"}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <strong style={{ fontSize: 16 }}>{item.name}</strong>
                <strong style={{ fontSize: 16, color: "#F25C05" }}>
                  ₱{Number(item.price || 0).toFixed(2)}
                </strong>
              </div>

              <p style={{ margin: 0, fontSize: 12.5, color: "#6D4C41", lineHeight: 1.5, flex: 1 }}>
                {item.description || "No description provided."}
              </p>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#8C7A6B", paddingTop: 6, borderTop: "1px solid #F0E4CE" }}>
                <span>
                  Stock:{" "}
                  <strong style={{ color: item.stock_quantity < 10 && !item.is_made_to_order ? "#E74C3C" : "#2E1A06" }}>
                    {item.is_made_to_order ? "Made to Order" : item.stock_quantity}
                  </strong>
                </span>
                {item.nutrients?.calories ? <span>{item.nutrients.calories} kcal</span> : null}
              </div>

              <div style={{ display: "flex", gap: 6 }}>
                <button
                  type="button"
                  className="ff-btn ff-btn-soft"
                  style={{ flex: 1 }}
                  onClick={() => openEdit(item)}
                >
                  <Edit3 size={14} /> Edit
                </button>
                {!item.is_made_to_order && (
                  <button
                    type="button"
                    className="ff-btn ff-btn-outline"
                    onClick={() => {
                      setAdjustTarget(item);
                      setAdjustDelta("10");
                      setAdjustReason("restock");
                      setAdjustNotes("");
                    }}
                  >
                    <PackagePlus size={14} /> Stock
                  </button>
                )}
                <button
                  type="button"
                  className="ff-btn ff-btn-danger-soft"
                  onClick={async () => {
                    if (window.confirm(`Delete ${item.name}?`)) {
                      await deleteMenuItem(item.id);
                      toast.info(`Deleted ${item.name}`);
                    }
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Dish Modal */}
      {modalOpen && (
        <div className="ff-modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="ff-modal ff-modal-lg" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>{editing ? `Edit ${editing.name}` : "Add New Dish"}</h3>
              <button type="button" onClick={() => setModalOpen(false)} style={{ border: "none", background: "none" }}>
                <X size={20} />
              </button>
            </div>

            <div className="ff-grid-2" style={{ gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700 }}>Dish Name</label>
                <input
                  className="ff-input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700 }}>Price (₱)</label>
                <input
                  type="number"
                  className="ff-input"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700 }}>Category</label>
                <select
                  className="ff-select"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  {allCategoryNames.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700 }}>Stock Quantity</label>
                <input
                  type="number"
                  disabled={form.is_made_to_order}
                  className="ff-input"
                  value={form.is_made_to_order ? "999" : form.stock_quantity}
                  onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })}
                />
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 700 }}>Description</label>
              <textarea
                className="ff-textarea"
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div style={{ marginTop: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 700 }}>Image URL or Upload</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  className="ff-input"
                  placeholder="https://..."
                  value={form.image_url}
                  onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                />
                <label className="ff-btn ff-btn-soft" style={{ whiteSpace: "nowrap" }}>
                  <Upload size={14} /> {uploading ? "Uploading..." : "Upload"}
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => handleFileUpload(e.target.files?.[0])}
                  />
                </label>
              </div>
            </div>

            <div className="ff-grid-4" style={{ marginTop: 12, gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700 }}>Calories (kcal)</label>
                <input type="number" className="ff-input" value={form.calories} onChange={(e) => setForm({ ...form, calories: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700 }}>Protein (g)</label>
                <input type="number" className="ff-input" value={form.protein} onChange={(e) => setForm({ ...form, protein: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700 }}>Carbs (g)</label>
                <input type="number" className="ff-input" value={form.carbs} onChange={(e) => setForm({ ...form, carbs: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700 }}>Fat (g)</label>
                <input type="number" className="ff-input" value={form.fat} onChange={(e) => setForm({ ...form, fat: e.target.value })} />
              </div>
            </div>

            <div style={{ display: "flex", gap: 18, marginTop: 14 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 600 }}>
                <input type="checkbox" checked={form.available} onChange={(e) => setForm({ ...form, available: e.target.checked })} />
                Available on Menu
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 600 }}>
                <input type="checkbox" checked={form.is_made_to_order} onChange={(e) => setForm({ ...form, is_made_to_order: e.target.checked })} />
                Made to Order (unlimited stock)
              </label>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
              <button type="button" className="ff-btn ff-btn-outline" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button type="button" disabled={saving} className="ff-btn ff-btn-primary" onClick={handleSaveDish}>
                {saving ? "Saving..." : editing ? "Save Changes" : "Add Dish"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {adjustTarget && (
        <div className="ff-modal-overlay" onClick={() => setAdjustTarget(null)}>
          <div className="ff-modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 12px" }}>Adjust Stock: {adjustTarget.name}</h3>
            <p style={{ fontSize: 13, color: "#6D4C41", marginTop: 0 }}>
              Current stock: <strong>{adjustTarget.stock_quantity}</strong>
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <label style={{ fontSize: 12, fontWeight: 700 }}>Quantity Change (+/-)</label>
              <input type="number" className="ff-input" value={adjustDelta} onChange={(e) => setAdjustDelta(e.target.value)} />
              <label style={{ fontSize: 12, fontWeight: 700 }}>Reason</label>
              <select className="ff-select" value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)}>
                <option value="restock">Restock (+)</option>
                <option value="spoilage">Spoilage (-)</option>
                <option value="expired">Expired (-)</option>
                <option value="damaged">Damaged (-)</option>
                <option value="returned">Returned (-)</option>
              </select>
              <input className="ff-input" placeholder="Optional notes..." value={adjustNotes} onChange={(e) => setAdjustNotes(e.target.value)} />
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button type="button" className="ff-btn ff-btn-outline" style={{ flex: 1 }} onClick={() => setAdjustTarget(null)}>Cancel</button>
              <button
                type="button"
                className="ff-btn ff-btn-primary"
                style={{ flex: 1 }}
                onClick={async () => {
                  await addInventoryAdjustment({
                    menu_item_id: adjustTarget.id,
                    menu_item_name: adjustTarget.name,
                    delta: Number(adjustDelta) || 0,
                    reason: adjustReason,
                    notes: adjustNotes,
                    staff_name: "Admin Web",
                  });
                  toast.success(`Adjusted stock for ${adjustTarget.name}`);
                  setAdjustTarget(null);
                }}
              >
                Apply Adjustment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inventory History Modal */}
      {historyOpen && (
        <div className="ff-modal-overlay" onClick={() => setHistoryOpen(false)}>
          <div className="ff-modal ff-modal-lg" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Inventory Adjustment Logs</h3>
              <button type="button" onClick={() => setHistoryOpen(false)} style={{ border: "none", background: "none" }}><X size={20} /></button>
            </div>
            <div className="ff-table-wrap">
              <table className="ff-table">
                <thead>
                  <tr>
                    <th>Dish</th>
                    <th>Change</th>
                    <th>Previous -&gt; New</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {history.slice(0, 30).map((h) => (
                    <tr key={h.id}>
                      <td><strong>{h.menu_item_name}</strong></td>
                      <td style={{ color: h.delta >= 0 ? "#27AE60" : "#E74C3C", fontWeight: 700 }}>
                        {h.delta >= 0 ? `+${h.delta}` : h.delta}
                      </td>
                      <td>{h.previous_quantity} -&gt; {h.new_quantity}</td>
                      <td>{h.reason} {h.notes ? `(${h.notes})` : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Category Manager Modal */}
      {catModalOpen && (
        <div className="ff-modal-overlay" onClick={() => setCatModalOpen(false)}>
          <div className="ff-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Manage Custom Categories</h3>
              <button type="button" onClick={() => setCatModalOpen(false)} style={{ border: "none", background: "none" }}><X size={20} /></button>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <input className="ff-input" placeholder="Category name..." value={newCatName} onChange={(e) => setNewCatName(e.target.value)} />
              <input type="color" value={newCatColor} onChange={(e) => setNewCatColor(e.target.value)} style={{ width: 46, height: 42, border: "none", background: "transparent" }} />
              <button
                type="button"
                className="ff-btn ff-btn-primary"
                onClick={async () => {
                  if (!newCatName.trim()) return;
                  await addCategory(newCatName, newCatColor);
                  setCategories(await getCategories());
                  setNewCatName("");
                  toast.success("Category added");
                }}
              >
                Add
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {categories.map((c) => (
                <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 10, borderRadius: 10, background: "#FDF9F2" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 14, height: 14, borderRadius: 4, background: c.color }} />
                    <strong>{c.name}</strong>
                  </div>
                  <button
                    type="button"
                    className="ff-btn ff-btn-danger-soft"
                    onClick={async () => {
                      await deleteCategory(c.id);
                      setCategories(await getCategories());
                    }}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
