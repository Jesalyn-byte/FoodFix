import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

type Props = {
  label?: string;
  sub?: string;
  color?: string;
  /** Fill the parent (use when replacing a full-screen loading branch). */
  full?: boolean;
};

/** Centered, padded loading indicator used across the app. */
export default function AppLoader({ label, sub, color = "#F25C05", full = true }: Props) {
  return (
    <View style={[styles.container, full && styles.full]}>
      <ActivityIndicator size="large" color={color} />
      {label ? <Text style={styles.label}>{label}</Text> : null}
      {sub ? <Text style={styles.sub}>{sub}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 10,
  },
  full: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    color: "#8A7B67",
    fontWeight: "500",
  },
  sub: {
    fontSize: 11,
    color: "#B0A490",
  },
});
