import { Clock, Edit3, History, PackagePlus, Plus, Search, Trash2, Upload, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MENU_CATEGORIES, MENU_CATEGORY_COLORS } from "@shared/constants/order";
import ConfirmModal from "../../components/ConfirmModal";
import { toast } from "../../components/Toast";
import { addCategory, deleteCategory, getCategories, type Category } from "../../lib/firebase-web";
import {
  addInventoryAdjustment,
  addMenuItem,
  deleteMenuItem,
  formatTimeAgo,
  getInventoryAdjustments,
  logMenuAdjustmentWeb,
  onMenuItemsUpdate,
  updateMenuItem,
  uploadToCloudinaryWeb,
  type MenuItem,
  type NormalizedAdjustment,
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
  const [history, setHistory] = useState<NormalizedAdjustment[]>([]);
  const [historyFilterItem, setHistoryFilterItem] = useState<string>("");

  const [catModalOpen, setCatModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState("#F25C05");
  const [confirmTarget, setConfirmTarget] = useState<
    | { kind: "dish"; item: MenuItem }
    | { kind: "category"; cat: Category }
    | null
  >(null);

  useEffect(() => {
    const unsub = onMenuItemsUpdate(setItems);
    getCategories().then(setCategories).catch(() => {});
    return () => unsub();
  }, []);

  const allCategoryNames = useMemo(() => {
    const set = new Set<string>([
      ...MENU_CATEGORIES,
      ...categories.map((c) => c.name),
      ...items.map((i) => i.category).filter(Boolean),
    ]);
    return Array.from(set);
  }, [categories, items]);

  const filtered = useMemo(() => {
    return items.filter((i) => {
      if (activeCat === "Made to Order") {
        if (i.category !== "Made to Order" && !i.is_made_to_order) return false;
      } else if (activeCat && i.category !== activeCat) {
        return false;
      }
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
      const isMadeToOrder = Boolean(form.is_made_to_order || form.category === "Made to Order");
      const nutrients: Record<string, number> = {};
      if (form.calories !== "" && Number.isFinite(Number(form.calories))) nutrients.calories = Number(form.calories);
      if (form.protein !== "" && Number.isFinite(Number(form.protein))) nutrients.protein = Number(form.protein);
      if (form.carbs !== "" && Number.isFinite(Number(form.carbs))) nutrients.carbs = Number(form.carbs);
      if (form.fat !== "" && Number.isFinite(Number(form.fat))) nutrients.fat = Number(form.fat);

      const payload: Partial<MenuItem> = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: Number(form.price) || 0,
        category: form.category,
        image_url: form.image_url.trim(),
        stock_quantity: isMadeToOrder ? 999 : Number(form.stock_quantity) || 0,
        available: form.available,
        is_made_to_order: isMadeToOrder,
        ...(Object.keys(nutrients).length > 0 ? { nutrients } : {}),
      };
      if (editing) {
        await updateMenuItem(editing.id, payload);
        const changes: string[] = [];
        if (Number(editing.price) !== payload.price) {
          changes.push(`Price ₱${Number(editing.price).toFixed(2)} -> ₱${Number(payload.price).toFixed(2)}`);
        }
        if (Boolean(editing.available) !== Boolean(payload.available)) {
          changes.push(payload.available ? "Marked Available" : "Marked Sold Out");
        }
        if (Boolean(editing.is_made_to_order) !== isMadeToOrder) {
          changes.push(isMadeToOrder ? "Enabled Made to Order" : "Disabled Made to Order");
        }
        const prevStock = Number(editing.stock_quantity ?? 0);
        const nextStock = Number(payload.stock_quantity ?? 0);
        if (prevStock !== nextStock || changes.length > 0) {
          await logMenuAdjustmentWeb({
            menu_item_id: editing.id,
            menu_item_name: payload.name || editing.name,
            delta: nextStock - prevStock,
            previous_quantity: prevStock,
            new_quantity: nextStock,
            reason: prevStock !== nextStock ? "menu_stock_edit" : "menu_edit",
            notes: changes.join(" · ") || "Menu details updated",
            staff_name: "Admin Web",
          });
        }
        toast.success(`Updated ${payload.name}`);
      } else {
        const created = await addMenuItem(payload as Omit<MenuItem, "id" | "created_at">);
        await logMenuAdjustmentWeb({
          menu_item_id: created.id,
          menu_item_name: payload.name || "New Dish",
          delta: Number(payload.stock_quantity || 0),
          previous_quantity: 0,
          new_quantity: Number(payload.stock_quantity || 0),
          reason: "menu_added",
          notes: `Added ₱${Number(payload.price || 0).toFixed(2)}${isMadeToOrder ? " (Made to Order)" : ""}`,
          staff_name: "Admin Web",
        });
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
                setHistoryFilterItem("");
                setHistory(await getInventoryAdjustments());
                setHistoryOpen(true);
              }}
            >
              <History size={15} /> Adjustment History
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
                {(item.is_made_to_order || item.category === "Made to Order") && (
                  <span
                    className="ff-badge"
                    style={{
                      position: "absolute",
                      bottom: 10,
                      left: 10,
                      background: "#8B4513",
                      color: "#fff",
                    }}
                  >
                    Made to Order
                  </span>
                )}
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

              <div className="ff-timestamp">
                <Clock size={11} /> Updated {formatTimeAgo(item.updated_at || item.created_at)}
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
                {!item.is_made_to_order && item.category !== "Made to Order" && (
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
                  className="ff-btn ff-btn-outline"
                  title="View item adjustment history"
                  onClick={async () => {
                    setHistoryFilterItem(item.id);
                    setHistory(await getInventoryAdjustments());
                    setHistoryOpen(true);
                  }}
                >
                  <History size={14} />
                </button>
                <button
                  type="button"
                  className="ff-btn ff-btn-danger-soft"
                  onClick={() => setConfirmTarget({ kind: "dish", item })}
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
                  onChange={(e) => {
                    const nextCat = e.target.value;
                    setForm({
                      ...form,
                      category: nextCat,
                      is_made_to_order: nextCat === "Made to Order" ? true : form.is_made_to_order,
                    });
                  }}
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

      {/* Inventory & Menu Adjustment History Modal */}
      {historyOpen && (
        <div className="ff-modal-overlay" onClick={() => setHistoryOpen(false)}>
          <div className="ff-modal ff-modal-lg" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 10, flexWrap: "wrap" }}>
              <div>
                <h3 style={{ margin: 0 }}>Menu &amp; Stock Adjustment History</h3>
                <div style={{ fontSize: 12, color: "var(--ff-espresso-muted)" }}>
                  Tracks restocks, spoilage, price updates, availability changes, and Made to Order toggles
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {historyFilterItem && (
                  <button
                    type="button"
                    className="ff-btn ff-btn-soft"
                    style={{ fontSize: 12, padding: "5px 10px" }}
                    onClick={() => setHistoryFilterItem("")}
                  >
                    Show All Items
                  </button>
                )}
                <button type="button" className="ff-icon-btn" onClick={() => setHistoryOpen(false)}>
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="ff-table-wrap">
              <table className="ff-table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Dish</th>
                    <th>Change</th>
                    <th>Previous -&gt; New</th>
                    <th>Reason / Details</th>
                    <th>By</th>
                  </tr>
                </thead>
                <tbody>
                  {history
                    .filter((h) => !historyFilterItem || h.menu_item_id === historyFilterItem)
                    .slice(0, 50)
                    .map((h) => (
                      <tr key={h.id}>
                        <td style={{ whiteSpace: "nowrap", fontSize: 12, color: "var(--ff-espresso-muted)" }}>
                          {formatTimeAgo(h.created_at) || "Recent"}
                        </td>
                        <td><strong>{h.menu_item_name}</strong></td>
                        <td style={{ color: h.delta > 0 ? "#27AE60" : h.delta < 0 ? "#E74C3C" : "var(--ff-espresso-muted)", fontWeight: 700 }}>
                          {h.delta > 0 ? `+${h.delta}` : h.delta === 0 ? "Edited" : h.delta}
                        </td>
                        <td>{h.previous_quantity} -&gt; {h.new_quantity}</td>
                        <td>
                          <span style={{ textTransform: "capitalize", fontWeight: 600 }}>{String(h.reason || "").replace(/_/g, " ")}</span>
                          {h.notes ? ` · ${h.notes}` : ""}
                        </td>
                        <td style={{ fontSize: 12, color: "var(--ff-espresso-muted)" }}>{h.staff_name || "Admin"}</td>
                      </tr>
                    ))}
                  {history.filter((h) => !historyFilterItem || h.menu_item_id === historyFilterItem).length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", padding: 24, color: "var(--ff-gray)" }}>
                        No adjustment logs recorded yet.
                      </td>
                    </tr>
                  )}
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
                    onClick={() => setConfirmTarget({ kind: "category", cat: c })}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!confirmTarget}
        title={
          confirmTarget?.kind === "dish"
            ? `Delete "${confirmTarget.item.name}"?`
            : `Delete category "${confirmTarget?.cat.name || ""}"?`
        }
        description="This permanently removes the selected entry from Firestore."
        confirmLabel="Delete"
        onCancel={() => setConfirmTarget(null)}
        onConfirm={async () => {
          if (!confirmTarget) return;
          if (confirmTarget.kind === "dish") {
            await deleteMenuItem(confirmTarget.item.id);
            toast.info(`Deleted ${confirmTarget.item.name}`);
          } else {
            await deleteCategory(confirmTarget.cat.id);
            setCategories(await getCategories());
            toast.info(`Deleted category ${confirmTarget.cat.name}`);
          }
          setConfirmTarget(null);
        }}
      />
    </div>
  );
}

