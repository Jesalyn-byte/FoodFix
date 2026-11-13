export interface OrderBreakdownItem {
  name: string;
  quantity: number;
  price: number;
}

interface Props {
  items?: OrderBreakdownItem[] | null;
  subtotal?: number | null;
  deliveryFee?: number | null;
  total?: number | null;
  compact?: boolean;
  showItems?: boolean;
  title?: string;
}

export default function OrderBreakdown({
  items,
  subtotal,
  deliveryFee,
  total,
  compact = false,
  showItems = false,
  title,
}: Props) {
  if (
    total == null &&
    subtotal == null &&
    deliveryFee == null &&
    (!items || items.length === 0)
  ) {
    return null;
  }

  const fontSize = compact ? 12 : 13;

  return (
    <div
      style={{
        background: "#FDF9F2",
        border: "1px solid #F0E4CE",
        borderRadius: 12,
        padding: compact ? "10px 12px" : "12px 14px",
        fontSize,
      }}
    >
      {title && (
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            color: "#6D4C41",
            textTransform: "uppercase",
            letterSpacing: 0.5,
            marginBottom: 8,
          }}
        >
          {title}
        </div>
      )}

      {showItems && items && items.length > 0 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 5,
            marginBottom: 8,
            paddingBottom: 8,
            borderBottom: "1px dashed #E8D9C0",
          }}
        >
          {items.map((item, idx) => (
            <div
              key={`${item.name}-${idx}`}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
                color: "#2E1A06",
              }}
            >
              <span>
                <strong>{item.quantity}×</strong> {item.name}
              </span>
              <span style={{ fontWeight: 600 }}>
                ₱{(Number(item.price || 0) * Number(item.quantity || 1)).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}

      {subtotal != null && (
        <div style={{ display: "flex", justifyContent: "space-between", color: "#6D4C41", marginBottom: 4 }}>
          <span>Subtotal</span>
          <span>₱{Number(subtotal).toFixed(2)}</span>
        </div>
      )}

      {deliveryFee != null && (
        <div style={{ display: "flex", justifyContent: "space-between", color: "#6D4C41", marginBottom: 4 }}>
          <span>Delivery Fee</span>
          <span>{Number(deliveryFee) === 0 ? "Free" : `₱${Number(deliveryFee).toFixed(2)}`}</span>
        </div>
      )}

      {total != null && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontWeight: 800,
            color: "#2E1A06",
            fontSize: compact ? 13 : 14.5,
            paddingTop: subtotal != null || deliveryFee != null ? 6 : 0,
            borderTop: subtotal != null || deliveryFee != null ? "1px solid #F0E4CE" : "none",
          }}
        >
          <span>Total</span>
          <span style={{ color: "#F25C05" }}>₱{Number(total).toFixed(2)}</span>
        </div>
      )}
    </div>
  );
}

