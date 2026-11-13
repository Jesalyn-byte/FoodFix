import { AlertTriangle, CheckCircle2, Clock, MapPin, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  ORDER_STATUSES,
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
  ORDER_TYPE_LABELS,
  type OrderStatus,
} from "@shared/constants/order";
import { LiveTrackingModal } from "../../components/LiveTrackingModal";
import OrderBreakdown from "../../components/OrderBreakdown";
import { SvgLoader } from "../../components/SiteChrome";
import { toast } from "../../components/Toast";
import {
  formatTimeAgo,
  onAllOrdersUpdate,
  processRefund,
  toEpochSeconds,
  updateOrderStatus,
  type Order,
} from "../../lib/store-web";

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: "accepted",
  accepted: "preparing",
  preparing: "out_for_delivery",
  issue_encountered: "out_for_delivery",
  out_for_delivery: "delivered",
};

interface Props {
  initialFilter?: string;
}

export default function AdminOrders({ initialFilter = "all" }: Props) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<string>(initialFilter || "all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [rejectOrder, setRejectOrder] = useState<Order | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [issueOrder, setIssueOrder] = useState<Order | null>(null);
  const [issueReason, setIssueReason] = useState("");
  const [trackOrder, setTrackOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (initialFilter) setFilter(initialFilter);
  }, [initialFilter]);

  useEffect(() => {
    const unsub = onAllOrdersUpdate((data) => {
      setOrders(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return orders.filter((o) => {
      if (filter === "today") {
        const sec = toEpochSeconds(o.created_at);
        if (!sec || new Date(sec * 1000).toISOString().slice(0, 10) !== todayStr) return false;
      } else if (filter === "refunds") {
        if (o.refund_status !== "pending") return false;
      } else if (filter !== "all") {
        if (o.status !== filter) return false;
      }

      if (search.trim()) {
        const s = search.trim().toLowerCase();
        return (
          o.order_number?.toLowerCase().includes(s) ||
          o.customer_name?.toLowerCase().includes(s) ||
          o.customer_phone?.toLowerCase().includes(s)
        );
      }
      return true;
    });
  }, [orders, filter, search]);

  async function handleAdvance(order: Order) {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    try {
      await updateOrderStatus(order.id, next);
      toast.success(`Order #${order.order_number} -> ${ORDER_STATUS_LABELS[next]}`);
    } catch (e: any) {
      toast.error(e?.message || "Failed to advance order");
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Filter Bar */}
      <div className="ff-card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ position: "relative", minWidth: 280, flex: 1 }}>
            <Search size={16} color="#8C7A6B" style={{ position: "absolute", left: 13, top: 12 }} />
            <input
              className="ff-input"
              style={{ paddingLeft: 38 }}
              placeholder="Search order #, customer name, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#6D4C41" }}>
            Showing {filtered.length} of {orders.length} orders
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[
            { key: "all", label: "All Orders" },
            { key: "today", label: "Today" },
            { key: "refunds", label: "Pending Refunds" },
            ...ORDER_STATUSES.map((s) => ({ key: s, label: ORDER_STATUS_LABELS[s] })),
          ].map((tab) => {
            const active = filter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilter(tab.key)}
                className="ff-btn ff-btn-pill"
                style={{
                  padding: "6px 13px",
                  fontSize: 12,
                  background: active ? "#F25C05" : "#FDF5E0",
                  color: active ? "#fff" : "#6D4C41",
                  border: active ? "1px solid #F25C05" : "1px solid #E8D9C0",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Orders Grid */}
      {loading ? (
        <div className="ff-card"><SvgLoader text="Loading real-time orders..." /></div>
      ) : filtered.length === 0 ? (
        <div className="ff-card" style={{ textAlign: "center", padding: 48, color: "var(--ff-gray)" }}>
          No orders match this filter.
        </div>
      ) : (
        <div className="ff-grid-2">
          {filtered.map((order) => {
            const color = ORDER_STATUS_COLORS[order.status] || "#888";
            const next = NEXT_STATUS[order.status];
            return (
              <div
                key={order.id}
                className="ff-card ff-card-hover"
                style={{ borderTop: `4px solid ${color}`, display: "flex", flexDirection: "column", gap: 12 }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 16.5, fontWeight: 800 }}>Order #{order.order_number}</div>
                    <div className="ff-timestamp" style={{ marginTop: 2 }}>
                      <Clock size={11} /> Updated {formatTimeAgo(order.updated_at || order.created_at)} · {ORDER_TYPE_LABELS[order.order_type] || order.order_type}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    <span className="ff-badge" style={{ background: "#FDF5E0", color: "#2E1A06" }}>
                      {order.payment_method?.toUpperCase()}
                    </span>
                    <span className="ff-badge" style={{ background: `${color}20`, color }}>
                      {ORDER_STATUS_LABELS[order.status]}
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    background: "#FDF9F2",
                    borderRadius: 12,
                    padding: "10px 12px",
                    fontSize: 12.5,
                    color: "#2E1A06",
                    border: "1px solid #F0E4CE",
                  }}
                >
                  <div>
                    <strong>{order.customer_name}</strong> · {order.customer_phone}
                  </div>
                  <div style={{ color: "#6D4C41", marginTop: 3 }}>{order.customer_address}</div>
                  {order.order_note && (
                    <div style={{ color: "#F25C05", marginTop: 4, fontWeight: 600 }}>
                      Note: {order.order_note}
                    </div>
                  )}
                </div>

                <OrderBreakdown
                  showItems
                  items={order.items}
                  subtotal={order.subtotal}
                  deliveryFee={order.delivery_fee}
                  total={order.total}
                />

                {order.refund_status === "pending" && (
                  <div
                    style={{
                      background: "#FFF5F5",
                      border: "1px solid #FADBD8",
                      borderRadius: 12,
                      padding: 12,
                    }}
                  >
                    <div style={{ fontSize: 12.5, fontWeight: 800, color: "#C0392B", marginBottom: 4 }}>
                      Refund Requested: {order.refund_reason}
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <button
                        type="button"
                        className="ff-btn ff-btn-green"
                        style={{ flex: 1 }}
                        onClick={async () => {
                          await processRefund(order.id, "completed");
                          toast.success(`Refund approved for #${order.order_number}`);
                        }}
                      >
                        Approve Refund
                      </button>
                      <button
                        type="button"
                        className="ff-btn ff-btn-red"
                        style={{ flex: 1 }}
                        onClick={async () => {
                          await processRefund(order.id, "rejected", {
                            refund_rejection_reason: "Declined by store admin",
                          });
                          toast.info(`Refund rejected for #${order.order_number}`);
                        }}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: "auto" }}>
                  {next && (
                    <button
                      type="button"
                      className="ff-btn ff-btn-primary"
                      style={{ flex: 1 }}
                      onClick={() => handleAdvance(order)}
                    >
                      <CheckCircle2 size={15} /> Move to {ORDER_STATUS_LABELS[next]}
                    </button>
                  )}
                  {["pending", "accepted", "preparing"].includes(order.status) && (
                    <button
                      type="button"
                      className="ff-btn ff-btn-danger-soft"
                      onClick={() => {
                        setRejectOrder(order);
                        setRejectReason("");
                      }}
                    >
                      Unable to Fulfill
                    </button>
                  )}
                  {order.status === "out_for_delivery" && (
                    <>
                      <button
                        type="button"
                        className="ff-btn ff-btn-blue"
                        onClick={() => setTrackOrder(order)}
                      >
                        <MapPin size={14} /> Live Map
                      </button>
                      <button
                        type="button"
                        className="ff-btn ff-btn-outline"
                        onClick={() => {
                          setIssueOrder(order);
                          setIssueReason("");
                        }}
                      >
                        <AlertTriangle size={14} /> Flag Issue
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectOrder && (
        <div className="ff-modal-overlay" onClick={() => setRejectOrder(null)}>
          <div className="ff-modal" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Mark #{rejectOrder.order_number} Unable to Fulfill</h3>
              <button type="button" onClick={() => setRejectOrder(null)} style={{ border: "none", background: "none" }}>
                <X size={20} />
              </button>
            </div>
            <textarea
              className="ff-textarea"
              rows={3}
              placeholder="Enter reason (e.g., Ingredient unavailable)..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button type="button" onClick={() => setRejectOrder(null)} className="ff-btn ff-btn-outline" style={{ flex: 1 }}>
                Cancel
              </button>
              <button
                type="button"
                className="ff-btn ff-btn-red"
                style={{ flex: 1 }}
                onClick={async () => {
                  await updateOrderStatus(rejectOrder.id, "unable_to_fulfill", {
                    reject_reason: rejectReason.trim() || "Unable to fulfill",
                  });
                  toast.info(`Order #${rejectOrder.order_number} marked unable to fulfill`);
                  setRejectOrder(null);
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Issue Modal */}
      {issueOrder && (
        <div className="ff-modal-overlay" onClick={() => setIssueOrder(null)}>
          <div className="ff-modal" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Flag Issue on #{issueOrder.order_number}</h3>
              <button type="button" onClick={() => setIssueOrder(null)} style={{ border: "none", background: "none" }}>
                <X size={20} />
              </button>
            </div>
            <textarea
              className="ff-textarea"
              rows={3}
              placeholder="Describe delivery issue..."
              value={issueReason}
              onChange={(e) => setIssueReason(e.target.value)}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button type="button" onClick={() => setIssueOrder(null)} className="ff-btn ff-btn-outline" style={{ flex: 1 }}>
                Cancel
              </button>
              <button
                type="button"
                className="ff-btn ff-btn-primary"
                style={{ flex: 1 }}
                onClick={async () => {
                  await updateOrderStatus(issueOrder.id, "issue_encountered", {
                    issue_reason: issueReason.trim() || "Delivery issue encountered",
                  });
                  toast.info(`Issue logged on #${issueOrder.order_number}`);
                  setIssueOrder(null);
                }}
              >
                Save Issue
              </button>
            </div>
          </div>
        </div>
      )}

      {trackOrder && (
        <LiveTrackingModal
          order={trackOrder}
          role="admin"
          onClose={() => setTrackOrder(null)}
        />
      )}
    </div>
  );
}

