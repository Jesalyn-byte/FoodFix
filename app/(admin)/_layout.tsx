import { Ionicons } from "@expo/vector-icons";
import { Tabs, router, usePathname } from "expo-router";
import { useEffect, useState } from "react";
import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import AppLoader from "../../components/AppLoader";
import { isAdmin, logOut, onAuthChange } from "../../lib/firebase";

const NAV_ITEMS = [
  { name: "index", title: "Dashboard", path: "/(admin)", icon: "grid" },
  { name: "recipes", title: "Orders", path: "/(admin)/recipes", icon: "receipt" },
  { name: "categories", title: "Menu & Stock", path: "/(admin)/categories", icon: "restaurant" },
  { name: "feedback", title: "Support Messages", path: "/(admin)/feedback", icon: "chatbubbles" },
  { name: "banners", title: "Banners", path: "/(admin)/banners", icon: "images" },
  { name: "reviews", title: "Customer Reviews", path: "/(admin)/reviews", icon: "star" },
  { name: "nutrition", title: "Nutrition Manager", path: "/(admin)/nutrition", icon: "nutrition" },
  { name: "users", title: "Staff & Settings", path: "/(admin)/users", icon: "people" },
] as const;

export default function AdminLayout() {
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const { width } = useWindowDimensions();
  const pathname = usePathname();

  const isDesktopWeb = Platform.OS === "web" && width >= 768;

  useEffect(() => {
    const unsubscribe = onAuthChange(async (user) => {
      try {
        if (!user) {
          router.replace("/(auth)/welcome");
          return;
        }
        const ok = await isAdmin(user.uid);
        if (!ok) {
          router.replace("/(tabs)");
          return;
        }
        setAuthorized(true);
      } catch {
        router.replace("/(auth)/welcome");
      } finally {
        setChecking(false);
        unsubscribe();
      }
    });
    return () => unsubscribe();
  }, []);

  if (checking || !authorized) {
    return (
      <View style={{ flex: 1, backgroundColor: "#1A1A2E" }}>
        <AppLoader />
      </View>
    );
  }

  async function handleWebLogout() {
    try {
      await logOut();
    } catch {}
    router.replace("/(auth)/welcome");
  }

  function isNavActive(item: (typeof NAV_ITEMS)[number]) {
    if (item.name === "index") {
      return pathname === "/" || pathname === "/(admin)" || pathname === "/(admin)/index";
    }
    return pathname?.includes(`/${item.name}`);
  }

  const activeItem = NAV_ITEMS.find((i) => isNavActive(i)) || NAV_ITEMS[0];

  if (isDesktopWeb) {
    return (
      <View style={webStyles.shell}>
        {/* Left Navigation Sidebar */}
        <View style={webStyles.sidebar}>
          <View style={webStyles.brandBox}>
            <Image
              source={require("../../logo.jpg")}
              style={webStyles.brandLogo}
              resizeMode="cover"
            />
            <View>
              <Text style={webStyles.brandName}>FOODFIX</Text>
              <Text style={webStyles.brandSub}>ADMIN WEB CONSOLE</Text>
            </View>
          </View>

          <ScrollView style={webStyles.navList} showsVerticalScrollIndicator={false}>
            <Text style={webStyles.navSectionLabel}>MANAGEMENT</Text>
            {NAV_ITEMS.map((item) => {
              const active = isNavActive(item);
              return (
                <TouchableOpacity
                  key={item.name}
                  style={[webStyles.navBtn, active && webStyles.navBtnActive]}
                  onPress={() => router.push(item.path as any)}
                >
                  <Ionicons
                    name={item.icon as any}
                    size={18}
                    color={active ? "#fff" : "#C4B199"}
                  />
                  <Text style={[webStyles.navText, active && webStyles.navTextActive]}>
                    {item.title}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={webStyles.sidebarFooter}>
            <Text style={webStyles.navSectionLabel}>QUICK VIEW</Text>
            <TouchableOpacity
              style={webStyles.footerBtn}
              onPress={() => router.push("/(tabs)" as any)}
            >
              <Ionicons name="storefront-outline" size={16} color="#F39C12" />
              <Text style={webStyles.footerBtnText}>Customer Storefront</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={webStyles.footerBtn}
              onPress={() => router.push("/(staff)" as any)}
            >
              <Ionicons name="bicycle-outline" size={16} color="#3498DB" />
              <Text style={webStyles.footerBtnText}>Staff / Rider Queue</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[webStyles.footerBtn, { marginTop: 6, backgroundColor: "#4A1C17" }]}
              onPress={handleWebLogout}
            >
              <Ionicons name="log-out-outline" size={16} color="#FF7675" />
              <Text style={[webStyles.footerBtnText, { color: "#FF7675" }]}>Log Out</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Main Content Canvas */}
        <View style={webStyles.mainArea}>
          {/* Web Top Header */}
          <View style={webStyles.topHeader}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Ionicons name={activeItem.icon as any} size={20} color="#F25C05" />
              <Text style={webStyles.pageTitle}>{activeItem.title}</Text>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={webStyles.liveBadge}>
                <View style={webStyles.liveDot} />
                <Text style={webStyles.liveText}>Real-Time Firestore Sync</Text>
              </View>
              <View style={webStyles.adminPill}>
                <Ionicons name="shield-checkmark" size={14} color="#fff" />
                <Text style={webStyles.adminPillText}>Owner / Admin</Text>
              </View>
            </View>
          </View>

          {/* Route Viewport */}
          <View style={webStyles.viewport}>
            <Tabs
              screenOptions={{
                headerShown: false,
                tabBarStyle: { display: "none" },
              }}
            >
              <Tabs.Screen name="index" />
              <Tabs.Screen name="recipes" />
              <Tabs.Screen name="categories" />
              <Tabs.Screen name="feedback" />
              <Tabs.Screen name="banners" />
              <Tabs.Screen name="users" />
              <Tabs.Screen name="submissions" />
              <Tabs.Screen name="regions" />
              <Tabs.Screen name="nutrition" />
              <Tabs.Screen name="reviews" />
            </Tabs>
          </View>
        </View>
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#F25C05",
        tabBarInactiveTintColor: "#888",
        tabBarHideOnKeyboard: true,
        tabBarStyle: { backgroundColor: "#fff", borderTopColor: "#eee" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }) => <Ionicons name="grid" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="recipes"
        options={{
          title: "Orders",
          tabBarIcon: ({ color }) => <Ionicons name="receipt" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="categories"
        options={{
          title: "Menu",
          tabBarIcon: ({ color }) => <Ionicons name="restaurant" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="feedback"
        options={{
          title: "Messages",
          tabBarIcon: ({ color }) => <Ionicons name="chatbubbles" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="banners"
        options={{
          title: "Banners",
          tabBarIcon: ({ color }) => <Ionicons name="images" size={22} color={color} />,
        }}
      />
      {/* Hide secondary screens from mobile tab bar */}
      <Tabs.Screen name="users" options={{ href: null }} />
      <Tabs.Screen name="submissions" options={{ href: null }} />
      <Tabs.Screen name="regions" options={{ href: null }} />
      <Tabs.Screen name="nutrition" options={{ href: null }} />
      <Tabs.Screen name="reviews" options={{ href: null }} />
    </Tabs>
  );
}

const webStyles = StyleSheet.create({
  shell: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#F9F0DC",
  },
  sidebar: {
    width: 248,
    backgroundColor: "#2E1A06",
    paddingVertical: 20,
    paddingHorizontal: 14,
    justifyContent: "space-between",
    borderRightWidth: 1,
    borderRightColor: "#462A0F",
  },
  brandBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 8,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#462A0F",
    marginBottom: 16,
  },
  brandLogo: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#F25C05",
  },
  brandName: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  brandSub: {
    color: "#F39C12",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  navList: {
    flex: 1,
  },
  navSectionLabel: {
    color: "#8D7760",
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 1,
    marginBottom: 8,
    paddingHorizontal: 10,
  },
  navBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  navBtnActive: {
    backgroundColor: "#F25C05",
  },
  navText: {
    color: "#D7C6B3",
    fontSize: 13,
    fontWeight: "600",
  },
  navTextActive: {
    color: "#fff",
    fontWeight: "700",
  },
  sidebarFooter: {
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#462A0F",
  },
  footerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#3D240B",
    marginBottom: 6,
  },
  footerBtnText: {
    color: "#E8DDD0",
    fontSize: 12,
    fontWeight: "600",
  },
  mainArea: {
    flex: 1,
    backgroundColor: "#F9F0DC",
  },
  topHeader: {
    height: 60,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E8DFD0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2E1A06",
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#E8F8F5",
    borderColor: "#A3E4D7",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#2ECC71",
  },
  liveText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#196F3D",
  },
  adminPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#2E1A06",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  adminPillText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "bold",
  },
  viewport: {
    flex: 1,
    width: "100%",
  },
});
