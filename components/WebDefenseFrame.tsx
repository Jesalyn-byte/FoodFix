import { Ionicons } from "@expo/vector-icons";
import { router, usePathname } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { getCurrentUser, logOut, signIn } from "../lib/firebase";
import { toast } from "./Toast";

interface WebDefenseFrameProps {
  children: React.ReactNode;
}

export default function WebDefenseFrame({ children }: WebDefenseFrameProps) {
  const { width } = useWindowDimensions();
  const [viewMode, setViewMode] = useState<"mobile" | "wide">("mobile");
  const [switching, setSwitching] = useState(false);
  const pathname = usePathname();

  // On native mobile devices or small screens (smartphones), render 100% full screen
  if (Platform.OS !== "web" || width < 768) {
    return <>{children}</>;
  }

  async function handleQuickSwitchRole(role: "admin" | "staff" | "customer") {
    if (switching) return;
    setSwitching(true);
    try {
      if (role === "admin") {
        await signIn("admin@foodfix.com", "admin12345");
        toast.success("Switched to Admin Account (FoodFix Admin)");
        router.replace("/(admin)");
      } else if (role === "staff") {
        await signIn("staff@foodfix.com", "staff12345");
        toast.success("Switched to Staff Account (Kuya Rider Staff)");
        router.replace("/(staff)" as any);
      } else {
        await signIn("customer@foodfix.com", "password123");
        toast.success("Switched to Customer Account (Juan Dela Cruz)");
        router.replace("/(tabs)");
      }
    } catch (e: any) {
      toast.error(`Role switch failed: ${e.message || "Auth error"}`);
    } finally {
      setSwitching(false);
    }
  }

  const isAdminRoute = pathname?.startsWith("/(admin)");
  const isStaffRoute = pathname?.startsWith("/(staff)");
  const isCustomerRoute = pathname?.startsWith("/(tabs)");

  return (
    <View style={styles.webBackdrop}>
      {/* Top Defense Presentation Bar */}
      <View style={styles.defenseBar}>
        <View style={styles.brandRow}>
          <View style={styles.brandBadge}>
            <Ionicons name="fast-food" size={16} color="#fff" />
          </View>
          <View>
            <Text style={styles.brandTitle}>FOODFIX / LAMION AI</Text>
            <Text style={styles.brandSub}>Thesis Defense Live Demonstration Console</Text>
          </View>
        </View>

        {/* Quick Role Switcher for seamless defense demonstration */}
        <View style={styles.roleSwitcher}>
          <TouchableOpacity
            style={[styles.roleBtn, isAdminRoute && styles.roleBtnActive]}
            onPress={() => handleQuickSwitchRole("admin")}
            disabled={switching}
          >
            <Ionicons
              name="shield-checkmark"
              size={14}
              color={isAdminRoute ? "#fff" : "#F25C05"}
            />
            <Text style={[styles.roleBtnText, isAdminRoute && styles.roleBtnTextActive]}>
              Admin
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.roleBtn, isStaffRoute && styles.roleBtnActive]}
            onPress={() => handleQuickSwitchRole("staff")}
            disabled={switching}
          >
            <Ionicons
              name="bicycle"
              size={14}
              color={isStaffRoute ? "#fff" : "#F25C05"}
            />
            <Text style={[styles.roleBtnText, isStaffRoute && styles.roleBtnTextActive]}>
              Staff/Rider
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.roleBtn, isCustomerRoute && styles.roleBtnActive]}
            onPress={() => handleQuickSwitchRole("customer")}
            disabled={switching}
          >
            <Ionicons
              name="person"
              size={14}
              color={isCustomerRoute ? "#fff" : "#F25C05"}
            />
            <Text style={[styles.roleBtnText, isCustomerRoute && styles.roleBtnTextActive]}>
              Customer
            </Text>
          </TouchableOpacity>
        </View>

        {/* View Toggle & Status */}
        <View style={styles.viewControls}>
          <View style={styles.ratioToggleGroup}>
            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === "mobile" && styles.toggleBtnActive]}
              onPress={() => setViewMode("mobile")}
            >
              <Ionicons
                name="phone-portrait-outline"
                size={14}
                color={viewMode === "mobile" ? "#fff" : "#888"}
              />
              <Text
                style={[
                  styles.toggleBtnText,
                  viewMode === "mobile" && styles.toggleBtnTextActive,
                ]}
              >
                1:1 App Ratio
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === "wide" && styles.toggleBtnActive]}
              onPress={() => setViewMode("wide")}
            >
              <Ionicons
                name="desktop-outline"
                size={14}
                color={viewMode === "wide" ? "#fff" : "#888"}
              />
              <Text
                style={[
                  styles.toggleBtnText,
                  viewMode === "wide" && styles.toggleBtnTextActive,
                ]}
              >
                Wide
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statusPill}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Localhost Active</Text>
          </View>
        </View>
      </View>

      {/* Main Container Area */}
      <View style={styles.contentArea}>
        {viewMode === "mobile" ? (
          <View style={styles.phoneSimulatorFrame}>
            {/* Realistic Smartphone Speaker & Dynamic Island Notch */}
            <View style={styles.phoneIsland}>
              <View style={styles.islandCamera} />
            </View>

            {/* App Render Container (1:1 Ratio) */}
            <View style={styles.phoneScreen}>{children}</View>

            {/* Phone Home Bar Indicator */}
            <View style={styles.phoneHomeBar} />
          </View>
        ) : (
          <View style={styles.wideContainer}>
            <View style={styles.wideScreen}>{children}</View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  webBackdrop: {
    flex: 1,
    backgroundColor: "#100B07",
    width: "100%",
    height: "100%",
  },
  defenseBar: {
    height: 56,
    backgroundColor: "#1A1008",
    borderBottomWidth: 1,
    borderBottomColor: "#2E1A06",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    zIndex: 1000,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  brandBadge: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#F25C05",
    justifyContent: "center",
    alignItems: "center",
  },
  brandTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  brandSub: {
    color: "#F39C12",
    fontSize: 10,
    fontWeight: "500",
  },
  roleSwitcher: {
    flexDirection: "row",
    backgroundColor: "#261507",
    padding: 3,
    borderRadius: 20,
    gap: 4,
    borderWidth: 1,
    borderColor: "#3D230E",
  },
  roleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
  },
  roleBtnActive: {
    backgroundColor: "#F25C05",
  },
  roleBtnText: {
    color: "#bbb",
    fontSize: 12,
    fontWeight: "600",
  },
  roleBtnTextActive: {
    color: "#fff",
  },
  viewControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  ratioToggleGroup: {
    flexDirection: "row",
    backgroundColor: "#261507",
    padding: 3,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#3D230E",
  },
  toggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  toggleBtnActive: {
    backgroundColor: "#442813",
  },
  toggleBtnText: {
    color: "#888",
    fontSize: 11,
    fontWeight: "600",
  },
  toggleBtnTextActive: {
    color: "#fff",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#162817",
    borderColor: "#27AE60",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#2ECC71",
  },
  statusText: {
    color: "#2ECC71",
    fontSize: 11,
    fontWeight: "600",
  },
  contentArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
  },
  phoneSimulatorFrame: {
    width: 420,
    height: "100%",
    maxHeight: 880,
    backgroundColor: "#000",
    borderRadius: 46,
    paddingTop: 10,
    paddingBottom: 8,
    paddingHorizontal: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.65,
    shadowRadius: 35,
    elevation: 25,
    borderWidth: 4,
    borderColor: "#3E2714",
    position: "relative",
  },
  phoneIsland: {
    position: "absolute",
    top: 14,
    left: "50%",
    transform: [{ translateX: -45 }],
    width: 90,
    height: 18,
    backgroundColor: "#000",
    borderRadius: 10,
    zIndex: 9999,
    justifyContent: "center",
    alignItems: "flex-end",
    paddingRight: 8,
  },
  islandCamera: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#1a1a2e",
  },
  phoneScreen: {
    flex: 1,
    borderRadius: 36,
    overflow: "hidden",
    backgroundColor: "#F9F0DC",
  },
  phoneHomeBar: {
    width: 120,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.4)",
    alignSelf: "center",
    marginTop: 6,
  },
  wideContainer: {
    width: "100%",
    maxWidth: 1200,
    height: "100%",
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#F9F0DC",
    borderWidth: 1,
    borderColor: "#3D230E",
  },
  wideScreen: {
    flex: 1,
  },
});
