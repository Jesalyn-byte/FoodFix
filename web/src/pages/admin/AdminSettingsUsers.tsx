import { Eye, EyeOff, Save, Shield, Trash2, Upload, UserPlus, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { USER_ROLES, USER_ROLE_LABELS } from "@shared/constants/order";
import ConfirmModal from "../../components/ConfirmModal";
import { SvgLoader } from "../../components/SiteChrome";
import { toast } from "../../components/Toast";
import {
  createStaffAccount,
  deleteUser,
  getAllUsers,
  updateUserByAdmin,
  type Profile,
} from "../../lib/firebase-web";
import { getSettings, updateSettings, uploadToCloudinaryWeb } from "../../lib/store-web";

export default function AdminSettingsUsers() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const [deliveryFee, setDeliveryFee] = useState("35");
  const [deliveryRadius, setDeliveryRadius] = useState("10");
  const [gcashNumber, setGcashNumber] = useState("");
  const [gcashEnabled, setGcashEnabled] = useState(true);
  const [gcashQr, setGcashQr] = useState("");
  const [storeName, setStoreName] = useState("");
  const [storeAddress, setStoreAddress] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  const [staffModal, setStaffModal] = useState(false);
  const [staffForm, setStaffForm] = useState({ name: "", email: "", password: "", phone: "" });
  const [staffPassVisible, setStaffPassVisible] = useState(false);
  const [creatingStaff, setCreatingStaff] = useState(false);
  const [pendingDeleteUser, setPendingDeleteUser] = useState<Profile | null>(null);

  const [editUser, setEditUser] = useState<Profile | null>(null);
  const [editForm, setEditForm] = useState({ username: "", phone: "", address: "", role: "customer" as Profile["role"] });

  async function loadAll() {
    setLoading(true);
    try {
      const [u, s] = await Promise.all([getAllUsers(), getSettings()]);
      setUsers(u);
      setDeliveryFee(String(s.delivery_fee));
      setDeliveryRadius(String(s.delivery_radius_km));
      setGcashNumber(s.gcash_number || "");
      setGcashEnabled(s.gcash_enabled);
      setGcashQr(s.gcash_qr_image || "");
      setStoreName(s.store_name || "");
      setStoreAddress(s.store_address || "");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function handleSaveSettings() {
    setSavingSettings(true);
    try {
      await updateSettings({
        delivery_fee: Number(deliveryFee) || 0,
        delivery_radius_km: Number(deliveryRadius) || 10,
        gcash_enabled: gcashEnabled,
        gcash_number: gcashNumber.trim(),
        gcash_qr_image: gcashQr.trim(),
        store_name: storeName.trim(),
        store_address: storeAddress.trim(),
      });
      toast.success("Store settings saved!");
    } catch (e: any) {
      toast.error(e?.message || "Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  }

  if (loading) {
    return <div className="ff-card"><SvgLoader text="Loading settings & users..." /></div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Store & Payment Settings */}
      <div className="ff-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0 }}>Store &amp; Payment Configuration</h3>
            <div style={{ fontSize: 12.5, color: "#8C7A6B" }}>
              Synced in real-time to checkout and delivery calculation across Web &amp; Mobile
            </div>
          </div>
          <button type="button" disabled={savingSettings} className="ff-btn ff-btn-primary" onClick={handleSaveSettings}>
            <Save size={15} /> {savingSettings ? "Saving..." : "Save Settings"}
          </button>
        </div>

        <div className="ff-grid-3" style={{ gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700 }}>Store Name</label>
            <input className="ff-input" value={storeName} onChange={(e) => setStoreName(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700 }}>Delivery Fee (₱)</label>
            <input type="number" className="ff-input" value={deliveryFee} onChange={(e) => setDeliveryFee(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700 }}>Delivery Radius (km)</label>
            <input type="number" className="ff-input" value={deliveryRadius} onChange={(e) => setDeliveryRadius(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700 }}>Store Address</label>
            <input className="ff-input" value={storeAddress} onChange={(e) => setStoreAddress(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700 }}>GCash Mobile Number</label>
            <input className="ff-input" value={gcashNumber} onChange={(e) => setGcashNumber(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700 }}>GCash QR Image</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input className="ff-input" value={gcashQr} onChange={(e) => setGcashQr(e.target.value)} placeholder="URL or upload" />
              <label className="ff-btn ff-btn-soft" style={{ whiteSpace: "nowrap" }}>
                <Upload size={14} /> Upload
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const url = await uploadToCloudinaryWeb(f, "foodfix/settings");
                    setGcashQr(url);
                    toast.success("GCash QR uploaded");
                  }}
                />
              </label>
            </div>
          </div>
        </div>

        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 14, fontSize: 13, fontWeight: 600 }}>
          <input type="checkbox" checked={gcashEnabled} onChange={(e) => setGcashEnabled(e.target.checked)} />
          Enable GCash Payment Option at Checkout
        </label>
      </div>

      {/* Staff & Registered Users Table */}
      <div className="ff-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "18px 20px", borderBottom: "1px solid #F0E4CE", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Users size={20} color="#F25C05" />
            <div>
              <h3 style={{ margin: 0 }}>Staff &amp; Customer Directory ({users.length})</h3>
              <div style={{ fontSize: 12, color: "#8C7A6B" }}>Manage roles and kitchen / rider accounts</div>
            </div>
          </div>
          <button
            type="button"
            className="ff-btn ff-btn-primary"
            onClick={() => {
              setStaffForm({ name: "", email: "", password: "", phone: "" });
              setStaffModal(true);
            }}
          >
            <UserPlus size={15} /> Create Staff Account
          </button>
        </div>

        <div className="ff-table-wrap">
          <table className="ff-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const roleColor = u.role === "admin" ? "#F25C05" : u.role === "staff" ? "#3498DB" : "#27AE60";
                return (
                  <tr key={u.id}>
                    <td><strong>{u.username}</strong></td>
                    <td>{u.email}</td>
                    <td>{u.phone || "-"}</td>
                    <td>
                      <span className="ff-badge" style={{ background: `${roleColor}1F`, color: roleColor }}>
                        <Shield size={12} /> {USER_ROLE_LABELS[u.role] || u.role}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          type="button"
                          className="ff-btn ff-btn-soft"
                          style={{ padding: "5px 10px", fontSize: 12 }}
                          onClick={() => {
                            setEditUser(u);
                            setEditForm({
                              username: u.username || "",
                              phone: u.phone || "",
                              address: u.address || "",
                              role: u.role || "customer",
                            });
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="ff-btn ff-btn-danger-soft"
                          style={{ padding: "5px 9px" }}
                          onClick={() => setPendingDeleteUser(u)}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Staff Modal */}
      {staffModal && (
        <div className="ff-modal-overlay" onClick={() => setStaffModal(false)}>
          <div className="ff-modal" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
              <h3 style={{ margin: 0 }}>Create Staff / Rider Account</h3>
              <button type="button" onClick={() => setStaffModal(false)} style={{ border: "none", background: "none" }}><X size={20} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input className="ff-input" placeholder="Full Name" value={staffForm.name} onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })} />
              <input className="ff-input" placeholder="Email" value={staffForm.email} onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })} />
              <div style={{ position: "relative" }}>
                <input
                  type={staffPassVisible ? "text" : "password"}
                  className="ff-input"
                  style={{ paddingRight: 40 }}
                  placeholder="Password (min 6 chars)"
                  value={staffForm.password}
                  onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setStaffPassVisible((v) => !v)}
                  style={{ position: "absolute", right: 10, top: 10, border: "none", background: "transparent", color: "var(--ff-gray)" }}
                  aria-label="Toggle staff password visibility"
                >
                  {staffPassVisible ? <Eye size={17} /> : <EyeOff size={17} />}
                </button>
              </div>
              <input className="ff-input" placeholder="Phone Number" value={staffForm.phone} onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })} />
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button type="button" className="ff-btn ff-btn-outline" style={{ flex: 1 }} onClick={() => setStaffModal(false)}>Cancel</button>
              <button
                type="button"
                disabled={creatingStaff}
                className="ff-btn ff-btn-primary"
                style={{ flex: 1 }}
                onClick={async () => {
                  if (!staffForm.name || !staffForm.email || staffForm.password.length < 6) {
                    toast.error("Name, email, and 6+ char password required.");
                    return;
                  }
                  setCreatingStaff(true);
                  try {
                    await createStaffAccount({
                      username: staffForm.name,
                      email: staffForm.email,
                      password: staffForm.password,
                      phone: staffForm.phone,
                    });
                    toast.success("Staff account created!");
                    setStaffModal(false);
                    loadAll();
                  } catch (e: any) {
                    toast.error(e?.message || "Failed to create staff");
                  } finally {
                    setCreatingStaff(false);
                  }
                }}
              >
                {creatingStaff ? "Creating..." : "Create Staff"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editUser && (
        <div className="ff-modal-overlay" onClick={() => setEditUser(null)}>
          <div className="ff-modal" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 12px" }}>Edit User: {editUser.email}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input className="ff-input" placeholder="Username" value={editForm.username} onChange={(e) => setEditForm({ ...editForm, username: e.target.value })} />
              <input className="ff-input" placeholder="Phone" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
              <input className="ff-input" placeholder="Address" value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} />
              <select className="ff-select" value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value as Profile["role"] })}>
                {USER_ROLES.map((r) => (
                  <option key={r} value={r}>{USER_ROLE_LABELS[r]}</option>
                ))}
              </select>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button type="button" className="ff-btn ff-btn-outline" style={{ flex: 1 }} onClick={() => setEditUser(null)}>Cancel</button>
              <button
                type="button"
                className="ff-btn ff-btn-primary"
                style={{ flex: 1 }}
                onClick={async () => {
                  await updateUserByAdmin(editUser.id, editForm);
                  toast.success("User updated");
                  setEditUser(null);
                  loadAll();
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
      <ConfirmModal
        open={!!pendingDeleteUser}
        title="Delete User Account?"
        description={`Remove profile for ${pendingDeleteUser?.email || ""}? This action cannot be undone.`}
        confirmLabel="Delete User"
        onCancel={() => setPendingDeleteUser(null)}
        onConfirm={async () => {
          if (!pendingDeleteUser) return;
          await deleteUser(pendingDeleteUser.id);
          setUsers((prev) => prev.filter((x) => x.id !== pendingDeleteUser.id));
          toast.info("User removed");
          setPendingDeleteUser(null);
        }}
      />
    </div>
  );
}

