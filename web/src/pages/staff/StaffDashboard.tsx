import { CheckCircle2, ChefHat, LogOut, Menu as MenuIcon, Store, Truck, User } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
  ORDER_TYPE_LABELS,
} from "@shared/constants/order";
import OrderBreakdown from "../../components/OrderBreakdown";
import { toast } from "../../components/Toast";
import { logOut, type Profile } from "../../lib/firebase-web";
import { formatTimeAgo, onAllOrdersUpdate, updateOrderStatus, type Order } from "../../lib/store-web";

interface Props {
  profile: Profile;
  onSwitchCustomer?: () => void;
  onBackAdmin?: () => void;
}

export default function StaffDashboard({ profile, onSwitchCustomer, onBackAdmin }: Props) {
  const [tab, setTab] = useState<"orders" | "profile">("orders");
  const [filter, setFilter] = useState<string>("all");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const unsub = onAllOrdersUpdate((data) => {
      setOrders(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") {
      return orders.filter((o) =>
        ["accepted", "preparing", "out_for_delivery", "delivered"].includes(o.status),
      );
    }
    return orders.filter((o) => o.status === filter);
  }, [orders, filter]);

  return (
    <div className="ff-shell">
      <aside className={`ff-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div>
          <div className="ff-brand">
            <img src="/logo.png" alt="FoodFix" />
            <div>
              <div className="ff-brand-title">FOODFIX</div>
              <div className="ff-brand-sub" style={{ color: "#3498DB" }}>STAFF &amp; RIDER QUEUE</div>
            </div>
          </div>

          <div className="ff-nav-section-label">WORKSPACE</div>
          <div className="ff-nav-list">
            <button
              type="button"
              className={`ff-nav-btn ${tab === "orders" ? "active" : ""}`}
              style={tab === "orders" ? { background: "#3498DB" } : undefined}
              onClick={() => {
                setTab("orders");
                setSidebarOpen(false);
              }}
            >
              <span className="ff-nav-btn-left">
                <Truck size={18} /> Kitchen &amp; Delivery Queue
              </span>
              <span className="ff-nav-badge">{filtered.length}</span>
            </button>
            <button
              type="button"
              className={`ff-nav-btn ${tab === "profile" ? "active" : ""}`}
              style={tab === "profile" ? { background: "#3498DB" } : undefined}
              onClick={() => {
                setTab("profile");
                setSidebarOpen(false);
              }}
            >
              <span className="ff-nav-btn-left">
                <User size={18} /> Staff Profile
              </span>
            </button>
          </div>
        </div>

        <div className="ff-sidebar-footer">
          {onBackAdmin && (
            <button type="button" className="ff-btn ff-btn-soft" onClick={onBackAdmin}>
              Back to Admin Console
            </button>
          )}
          {onSwitchCustomer && (
            <button type="button" className="ff-btn ff-btn-outline" onClick={onSwitchCustomer}>
              <Store size={15} /> Customer View
            </button>
          )}
          <button
            type="button"
            className="ff-btn ff-btn-danger-soft"
            onClick={() => logOut()}
          >
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      </aside>

      <div className="ff-main">
        <header className="ff-topbar">
          <div className="ff-topbar-left">
            <button
              type="button"
              className="ff-btn ff-btn-outline ff-mobile-header"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <MenuIcon size={18} />
            </button>
            <div>
              <h2 className="ff-topbar-title">
                {tab === "orders" ? "Kitchen & Delivery Queue" : "Staff Profile"}
              </h2>
              <div className="ff-topbar-sub">Signed in as {profile.username}</div>
            </div>
          </div>
          <span className="ff-live-pill">
            <span className="ff-live-dot" /> Live Order Sync
          </span>
        </header>

        <main className="ff-content">
          {tab === "orders" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div className="ff-card" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[
                  { key: "all", label: "All Active & Delivered" },
                  { key: "accepted", label: "Accepted" },
                  { key: "preparing", label: "Preparing" },
                  { key: "out_for_delivery", label: "Out for Delivery" },
                  { key: "delivered", label: "Delivered" },
                ].map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    className="ff-btn ff-btn-pill"
                    style={{
                      background: filter === f.key ? "#3498DB" : "#FDF5E0",
                      color: filter === f.key ? "#fff" : "#6D4C41",
                    }}
                    onClick={() => setFilter(f.key)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {loading ? (
                <div className="ff-card" style={{ textAlign: "center", padding: 40 }}>Loading queue...</div>
              ) : filtered.length === 0 ? (
                <div className="ff-card" style={{ textAlign: "center", padding: 44, color: "#8C7A6B" }}>
                  No orders in this queue.
                </div>
              ) : (
                <div className="ff-grid-2">
                  {filtered.map((o) => {
                    const color = ORDER_STATUS_COLORS[o.status] || "#888";
                    return (
                      <div key={o.id} className="ff-card" style={{ borderLeft: `4px solid ${color}`, display: "flex", flexDirection: "column", gap: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <strong style={{ fontSize: 16 }}>Order #{o.order_number}</strong>
                            <div style={{ fontSize: 12, color: "#8C7A6B" }}>
                              {formatTimeAgo(o.created_at)} · {ORDER_TYPE_LABELS[o.order_type] || o.order_type}
                            </div>
                          </div>
                          <span className="ff-badge" style={{ background: `${color}20`, color }}>
                            {ORDER_STATUS_LABELS[o.status]}
                          </span>
                        </div>

                        <div style={{ fontSize: 13, color: "#2E1A06" }}>
                          <strong>{o.customer_name}</strong> ({o.customer_phone})
                          <div style={{ color: "#6D4C41" }}>{o.customer_address}</div>
                        </div>

                        <OrderBreakdown showItems items={o.items} subtotal={o.subtotal} deliveryFee={o.delivery_fee} total={o.total} />

                        <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
                          {o.status === "accepted" && (
                            <button
                              type="button"
                              className="ff-btn ff-btn-primary"
                              style={{ flex: 1 }}
                              onClick={async () => {
                                await updateOrderStatus(o.id, "preparing", { prepared_by: profile.username });
                                toast.success(`Cooking started for #${o.order_number}`);
                              }}
                            >
                              <ChefHat size={15} /> Start Preparing
                            </button>
                          )}
                          {(o.status === "accepted" || o.status === "preparing") && (
                            <button
                              type="button"
                              className="ff-btn ff-btn-blue"
                              style={{ flex: 1 }}
                              onClick={async () => {
                                await updateOrderStatus(o.id, "out_for_delivery", {
                                  prepared_by: profile.username,
                                  driver_name: profile.username,
                                  driver_phone: profile.phone || "",
                                });
                                toast.success(`Order #${o.order_number} out for delivery!`);
                              }}
                            >
                              <Truck size={15} /> Out for Delivery
                            </button>
                          )}
                          {o.status === "out_for_delivery" && (
                            <button
                              type="button"
                              className="ff-btn ff-btn-green"
                              style={{ flex: 1 }}
                              onClick={async () => {
                                await updateOrderStatus(o.id, "delivered");
                                toast.success(`Order #${o.order_number} marked delivered!`);
                              }}
                            >
                              <CheckCircle2 size={15} /> Mark Delivered
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="ff-card" style={{ maxWidth: 520 }}>
              <h3 style={{ margin: "0 0 14px" }}>Staff Profile Details</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 14 }}>
                <div><strong>Name:</strong> {profile.username}</div>
                <div><strong>Email:</strong> {profile.email}</div>
                <div><strong>Phone:</strong> {profile.phone || "Not provided"}</div>
                <div><strong>Role:</strong> {profile.role.toUpperCase()}</div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
