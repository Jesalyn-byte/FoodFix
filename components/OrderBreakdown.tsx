import React from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

export interface OrderBreakdownItem {
  name: string;
  quantity: number;
  price: number;
}

type Props = {
  items?: OrderBreakdownItem[] | null;
  subtotal?: number | null;
  deliveryFee?: number | null;
  total?: number | null;
  /** When true, rows render at a smaller size (for dense list cards). */
  compact?: boolean;
  showItems?: boolean;
  title?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Subtotal / Delivery Fee / Total breakdown list with optional itemized receipt view.
 * Falls back to a single Total row for legacy orders that predate the breakdown fields.
 */
export default function OrderBreakdown({
  items,
  subtotal,
  deliveryFee,
  total,
  compact,
  showItems = false,
  title,
  style,
}: Props) {
  if (total == null && subtotal == null && deliveryFee == null && (!items || items.length === 0)) return null;
  const hasBreakdown = subtotal != null || deliveryFee != null || (showItems && items && items.length > 0);
  const labelSize = compact ? 11 : 13;
  const valueSize = compact ? 11 : 13;

  if (!hasBreakdown) {
    return (
      <View style={[styles.row, style]}>
        <Text style={[styles.label, { fontSize: labelSize, fontWeight: "700" }]}>Total</Text>
        <Text style={[styles.value, { fontSize: valueSize, fontWeight: "700" }]}>
          P{total?.toFixed(2)}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.box, style]}>
      {title ? (
        <View style={styles.titleRow}>
          <Text style={[styles.titleText, { fontSize: compact ? 11 : 12 }]}>{title}</Text>
        </View>
      ) : null}

      {showItems && items && items.length > 0 && (
        <View style={styles.itemsBlock}>
          {items.map((it, idx) => (
            <View key={idx} style={styles.row}>
              <Text style={[styles.itemName, { fontSize: labelSize }]} numberOfLines={1}>
                {it.name} <Text style={styles.itemQty}>× {it.quantity}</Text>
              </Text>
              <Text style={[styles.itemPrice, { fontSize: valueSize }]}>
                P{(it.price * it.quantity).toFixed(2)}
              </Text>
            </View>
          ))}
          <View style={styles.dashedDivider} />
        </View>
      )}

      {subtotal != null && (
        <View style={styles.row}>
          <Text style={[styles.label, { fontSize: labelSize }]}>Subtotal</Text>
          <Text style={[styles.value, { fontSize: valueSize }]}>P{subtotal.toFixed(2)}</Text>
        </View>
      )}
      {deliveryFee != null && (
        <View style={styles.row}>
          <Text style={[styles.label, { fontSize: labelSize }]}>Delivery Fee</Text>
          <Text style={[styles.value, { fontSize: valueSize }]}>
            {deliveryFee > 0 ? `P${deliveryFee.toFixed(2)}` : "Free"}
          </Text>
        </View>
      )}
      <View style={[styles.row, styles.totalRow]}>
        <Text style={[styles.label, { fontSize: labelSize, fontWeight: "700" }]}>Total</Text>
        <Text style={[styles.value, { fontSize: valueSize, fontWeight: "700", color: "#F25C05" }]}>
          P{(total ?? 0).toFixed(2)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: 3,
    marginTop: 8,
    backgroundColor: "#FAF6EE",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: "#EFE6D4",
    paddingTop: 5,
    marginTop: 2,
  },
  label: {
    color: "#8A7B67",
  },
  value: {
    color: "#2E1A06",
    fontWeight: "600",
  },
  titleRow: {
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#EFE6D4",
    marginBottom: 4,
  },
  titleText: {
    fontWeight: "800",
    color: "#8A7B67",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  itemsBlock: {
    gap: 4,
    marginBottom: 4,
  },
  itemName: {
    color: "#2E1A06",
    fontWeight: "600",
    flex: 1,
    marginRight: 8,
  },
  itemQty: {
    color: "#F25C05",
    fontWeight: "700",
  },
  itemPrice: {
    color: "#2E1A06",
    fontWeight: "600",
  },
  dashedDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "#E2D7C3",
    borderStyle: "dashed",
    marginVertical: 4,
  },
});
