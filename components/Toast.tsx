import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type ToastType = "success" | "error" | "info";

type ToastPayload = {
  message: string;
  type: ToastType;
  duration: number;
};

type ToastState = (ToastPayload & { id: number }) | null;

let currentToast: ToastState = null;
let toastId = 0;
let dismissTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<(t: ToastState) => void>();

function emit() {
  listeners.forEach((l) => l(currentToast));
}

/**
 * Show a non-blocking toast banner at the top of the screen.
 * Works on native and web; safe to call from anywhere (no context needed).
 */
export function showToast(message: string, type: ToastType = "success", duration = 2200) {
  if (dismissTimer) clearTimeout(dismissTimer);
  toastId += 1;
  currentToast = { id: toastId, message, type, duration };
  emit();
  dismissTimer = setTimeout(() => {
    currentToast = null;
    emit();
  }, duration);
}

export const toast = {
  success: (message: string) => showToast(message, "success"),
  error: (message: string) => showToast(message, "error"),
  info: (message: string) => showToast(message, "info"),
};

const TYPE_CONFIG: Record<ToastType, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  success: { icon: "checkmark-circle", color: "#27AE60" },
  error: { icon: "alert-circle", color: "#E74C3C" },
  info: { icon: "information-circle", color: "#F25C05" },
};

/** Mount once in the root layout to render toasts. */
export default function ToastHost() {
  const [current, setCurrent] = useState<ToastState>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-24)).current;
  const prevId = useRef(0);

  useEffect(() => {
    const listener = (t: ToastState) => setCurrent(t);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    if (!current || current.id === prevId.current) return;
    prevId.current = current.id;
    opacity.setValue(0);
    translateY.setValue(-24);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, friction: 8, useNativeDriver: true }),
    ]).start();
  }, [current, opacity, translateY]);

  if (!current) return null;
  const config = TYPE_CONFIG[current.type];

  return (
    <View style={styles.host} pointerEvents="box-none">
      <Animated.View style={[styles.toast, { opacity, transform: [{ translateY }] }]}>
        <Ionicons name={config.icon} size={18} color={config.color} />
        <Text style={styles.message} numberOfLines={2}>
          {current.message}
        </Text>
        <TouchableOpacity
          accessibilityLabel="Dismiss"
          onPress={() => {
            currentToast = null;
            emit();
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={16} color="#8A7B67" />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    top: Platform.OS === "web" ? 12 : 52,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 9999,
    elevation: 9999,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    maxWidth: "92%",
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: "#F0E4CE",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  message: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#2E1A06",
  },
});
