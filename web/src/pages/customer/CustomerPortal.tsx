import {
  Camera,
  ChevronRight,
  Clock,
  Copy,
  ExternalLink,
  Flag,
  Heart,
  Home,
  LogOut,
  MapPin,
  Menu as MenuIcon,
  MessageCircle,
  MessageSquare,
  Minus,
  Navigation,
  Plus,
  Receipt,
  Search,
  Send,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Star,
  Trash2,
  User as UserIcon,
  Utensils,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  MENU_CATEGORIES,
  MENU_CATEGORY_COLORS,
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
  ORDER_TYPE_LABELS,
  type OrderType,
  type PaymentMethod,
} from "@shared/constants/order";
import AddressAutocomplete from "../../components/AddressAutocomplete";
import ConfirmModal from "../../components/ConfirmModal";
import { LiveTrackingModal } from "../../components/LiveTrackingModal";
import OrderBreakdown from "../../components/OrderBreakdown";
import {
  FaqSection,
  FloatingUtilities,
  GlobalSearchModal,
  NewsletterSignup,
  ThemeToggleButton,
  withUtm,
  type SearchEntry,
} from "../../components/SiteChrome";
import { toast } from "../../components/Toast";
import { logOut, updateProfileDoc, type Profile } from "../../lib/firebase-web";
import {
  analyzeImageWithLamionWeb,
  chatWithLamionWeb,
  flagLamionAiMessage,
} from "../../lib/lamion-web";
import {
  addReview,
  createOrder,
  formatTimeAgo,
  getBanners,
  getSettings,
  notifyGcashPayment,
  onFavoritesUpdate,
  onLocationUpdate,
  onMenuItemsUpdate,
  onMessagesUpdate,
  onOrdersByUserUpdate,
  requestRefund,
  sendMessage,
  submitDishSuggestionWeb,
  toggleFavoriteWeb,
  type AppSettings,
  type Banner,
  type FavoriteRecord,
  type LiveLocation,
  type MenuItem,
  type Message,
  type Order,
} from "../../lib/store-web";

type CustomerTab = "home" | "menu" | "cart" | "orders" | "lamion" | "scanner" | "chat" | "profile";

interface CartItem {
  menu_item_id: string;
  name: string;
  price: number;
  quantity: number;
  stock_quantity: number;
  is_made_to_order?: boolean;
  image_url?: string;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const LAMION_WELCOME =
  "Mabuhay! I am Lamion AI, your Filipino culinary expert! Ask me anything about Filipino cuisine, recipes, cooking tips, regional specialties, or ingredients — from Luzon to Mindanao. Kain po tayo!";

const LAMION_SUGGESTIONS = [
  "How to cook Chicken Adobo?",
  "What makes Sinigang sour?",
  "Origin of Pork Sisig",
  "Crispy Lechon Kawali tips",
  "Substitute for Calamansi?",
  "Popular Filipino street foods",
];

interface Props {
  profile: Profile;
  dark: boolean;
  onToggleDark: () => void;
  onBackAdmin?: () => void;
}

export default function CustomerPortal({ profile, dark, onToggleDark, onBackAdmin }: Props) {
  const [tab, setTab] = useState<CustomerTab>("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const [banners, setBanners] = useState<Banner[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [supportMsgs, setSupportMsgs] = useState<Message[]>([]);

  // Menu search, category & favorites & per-item quantity selector
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState("");
  const [favorites, setFavorites] = useState<FavoriteRecord[]>([]);
  const [menuQty, setMenuQty] = useState<Record<string, number>>({});

  // Cart & Checkout
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem("@foodfix_web_cart");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [orderType, setOrderType] = useState<OrderType>("delivery_now");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [phone, setPhone] = useState(profile.phone || "");
  const [address, setAddress] = useState(profile.address || "");
  const [deliveryCoords, setDeliveryCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [orderNote, setOrderNote] = useState("");
  const [placing, setPlacing] = useState(false);
  const [gcashPrompt, setGcashPrompt] = useState<{ orderId: string; orderNumber: string; amount: number } | null>(null);
  const [qrZoomOpen, setQrZoomOpen] = useState(false);
  const [removeCartItem, setRemoveCartItem] = useState<CartItem | null>(null);

  // Lamion AI Chat
  const [aiMessages, setAiMessages] = useState<{ role: "ai" | "user"; text: string; at: number }[]>([
    { role: "ai", text: LAMION_WELCOME, at: Date.now() },
  ]);
  const [aiInput, setAiInput] = useState("");
  const [aiThinking, setAiThinking] = useState(false);

  // AI Scanner
  const [scanMode, setScanMode] = useState<"dish" | "ingredients">("dish");
  const [scanPreview, setScanPreview] = useState("");
  const [scanLoading, setScanLoading] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);

  // Live Chat with FoodFix Store
  const [supportInput, setSupportInput] = useState("");

  // Review, Refund, Tracking, Submit Dish & Ask FOFI Delivery Modals
  const [reviewOrder, setReviewOrder] = useState<Order | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [refundOrder, setRefundOrder] = useState<Order | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [trackOrder, setTrackOrder] = useState<Order | null>(null);

  // Submit a Dish modal
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [submitDishName, setSubmitDishName] = useState("");
  const [submitDishNotes, setSubmitDishNotes] = useState("");
  const [submittingDish, setSubmittingDish] = useState(false);

  // Ask FOFI about Delivery modal
  const [fofiOpen, setFofiOpen] = useState(false);
  const [fofiOrder, setFofiOrder] = useState<Order | null>(null);
  const [fofiDriverLoc, setFofiDriverLoc] = useState<LiveLocation | null>(null);
  const [fofiMessages, setFofiMessages] = useState<{ role: "ai" | "user"; text: string }[]>([]);
  const [fofiInput, setFofiInput] = useState("");
  const fofiUnsubRef = useRef<(() => void) | null>(null);

  // Profile Editor
  const [editName, setEditName] = useState(profile.username || "");
  const [editPhone, setEditPhone] = useState(profile.phone || "");
  const [editAddress, setEditAddress] = useState(profile.address || "");

  useEffect(() => {
    localStorage.setItem("@foodfix_web_cart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    getBanners().then((b) => setBanners(b.filter((x) => x.active))).catch(() => {});
    getSettings().then(setSettings).catch(() => {});
    const unsubMenu = onMenuItemsUpdate(setMenuItems);
    const unsubFavs = onFavoritesUpdate(profile.id, setFavorites);
    const unsubOrders = onOrdersByUserUpdate(profile.id, setOrders);
    const unsubMsgs = onMessagesUpdate(profile.id, setSupportMsgs);
    return () => {
      unsubMenu();
      unsubFavs();
      unsubOrders();
      unsubMsgs();
      fofiUnsubRef.current?.();
    };
  }, [profile.id]);

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const activeOrdersCount = orders.filter((o) =>
    ["pending", "accepted", "preparing", "out_for_delivery"].includes(o.status),
  ).length;
  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const deliveryFee =
    orderType === "delivery_now" || orderType === "delivery_later"
      ? settings?.delivery_fee ?? 35
      : 0;
  const grandTotal = subtotal + deliveryFee;

  const favoriteMap = useMemo(() => {
    const map = new Map<string, string>();
    favorites.forEach((f) => map.set(f.menu_item_id, f.id));
    return map;
  }, [favorites]);

  const menuCategories = useMemo(() => {
    const set = new Set<string>([
      ...MENU_CATEGORIES,
      ...menuItems.map((m) => m.category).filter(Boolean),
    ]);
    return Array.from(set);
  }, [menuItems]);

  const filteredMenu = useMemo(() => {
    return menuItems.filter((item) => {
      if (activeCat === "__favorites__") {
        if (!favoriteMap.has(item.id)) return false;
      } else if (activeCat === "Made to Order") {
        if (item.category !== "Made to Order" && !item.is_made_to_order) return false;
      } else if (activeCat && item.category !== activeCat) {
        return false;
      }
      if (search.trim()) {
        const s = search.trim().toLowerCase();
        return item.name.toLowerCase().includes(s) || item.description?.toLowerCase().includes(s);
      }
      return true;
    });
  }, [menuItems, activeCat, search, favoriteMap]);

  function getSelectedQty(item: MenuItem): number {
    const raw = menuQty[item.id] ?? 1;
    const isMto = Boolean(item.is_made_to_order || item.category === "Made to Order");
    const max = isMto ? 99 : Math.max(1, Number(item.stock_quantity || 1));
    return Math.min(max, Math.max(1, raw));
  }

  function stepSelectedQty(item: MenuItem, delta: number) {
    const isMto = Boolean(item.is_made_to_order || item.category === "Made to Order");
    const max = isMto ? 99 : Math.max(1, Number(item.stock_quantity || 1));
    const current = getSelectedQty(item);
    const next = Math.min(max, Math.max(1, current + delta));
    setMenuQty((prev) => ({ ...prev, [item.id]: next }));
  }

  function addToCart(item: MenuItem, qty = 1) {
    const isMto = Boolean(item.is_made_to_order || item.category === "Made to Order");
    if (!item.available || (!isMto && item.stock_quantity <= 0)) {
      toast.error(`${item.name} is sold out.`);
      return;
    }
    const maxAllowed = isMto ? 999 : Number(item.stock_quantity || 0);
    setCart((prev) => {
      const existing = prev.find((c) => c.menu_item_id === item.id);
      if (existing) {
        const nextQty = Math.min(maxAllowed, existing.quantity + qty);
        return prev.map((c) =>
          c.menu_item_id === item.id ? { ...c, quantity: nextQty, is_made_to_order: isMto } : c,
        );
      }
      return [
        ...prev,
        {
          menu_item_id: item.id,
          name: item.name,
          price: item.price,
          quantity: Math.min(maxAllowed, Math.max(1, qty)),
          stock_quantity: item.stock_quantity,
          is_made_to_order: isMto,
          image_url: item.image_url,
        },
      ];
    });
    setMenuQty((prev) => ({ ...prev, [item.id]: 1 }));
    toast.success(`Added ${qty > 1 ? `${qty}× ` : ""}${item.name} to cart`);
  }

  async function handleCheckout(e: FormEvent) {
    e.preventDefault();
    if (cart.length === 0) return;
    if (!phone.trim() || !address.trim()) {
      toast.error("Phone number and address are required.");
      return;
    }
    setPlacing(true);
    try {
      let coords = deliveryCoords;
      if (!coords && (orderType === "delivery_now" || orderType === "delivery_later")) {
        try {
          const geoRes = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address.trim())}&format=json&limit=1&countrycodes=ph`,
          );
          if (geoRes.ok) {
            const rows = (await geoRes.json()) as any[];
            if (rows?.[0]?.lat && rows?.[0]?.lon) {
              coords = { lat: Number(rows[0].lat), lng: Number(rows[0].lon) };
            }
          }
        } catch {
          // Optional geocode fallback
        }
      }
      const { id, order_number } = await createOrder({
        customer_id: profile.id,
        customer_name: profile.username,
        customer_phone: phone.trim(),
        customer_address: address.trim(),
        ...(coords ? { customer_lat: coords.lat, customer_lng: coords.lng } : {}),
        order_note: orderNote.trim(),
        items: cart.map((c) => ({
          menu_item_id: c.menu_item_id,
          name: c.name,
          price: c.price,
          quantity: c.quantity,
          image_url: c.image_url,
        })),
        subtotal,
        delivery_fee: deliveryFee,
        total: grandTotal,
        order_type: orderType,
        payment_method: paymentMethod,
      });
      setCart([]);
      setOrderNote("");
      toast.success(`Order #${order_number} placed!`);
      if (paymentMethod === "gcash") {
        setGcashPrompt({ orderId: id, orderNumber: order_number, amount: grandTotal });
      } else {
        setTab("orders");
      }
    } catch (err: any) {
      toast.error(err?.message || "Order failed");
    } finally {
      setPlacing(false);
    }
  }

  function openAskFofiDelivery() {
    const active = orders.find((o) =>
      ["pending", "accepted", "preparing", "out_for_delivery"].includes(o.status),
    );
    fofiUnsubRef.current?.();
    fofiUnsubRef.current = null;
    setFofiDriverLoc(null);
    setFofiOrder(active || null);
    if (!active) {
      setFofiMessages([
        {
          role: "ai",
          text: "Hi! I'm FOFI, your delivery assistant. You don't have an active order in progress right now. Place an order anytime and I'll track your rider's distance and ETA!",
        },
      ]);
    } else {
      setFofiMessages([
        {
          role: "ai",
          text: `Hi! I'm FOFI, your delivery assistant for Order #${active.order_number} (${ORDER_STATUS_LABELS[active.status]}). Ask me where your rider is or how long delivery will take!`,
        },
      ]);
      fofiUnsubRef.current = onLocationUpdate(active.id, "staff", setFofiDriverLoc);
    }
    setFofiOpen(true);
  }

  function answerFofiDelivery(question: string) {
    const q = question.trim();
    if (!q) return;
    setFofiInput("");
    setFofiMessages((prev) => [...prev, { role: "user", text: q }]);

    let reply = "You currently have no active order.";
    if (fofiOrder) {
      const ql = q.toLowerCase();
      if (!fofiDriverLoc) {
        reply = `Order #${fofiOrder.order_number} is currently ${ORDER_STATUS_LABELS[fofiOrder.status]}. Waiting for your rider to share live GPS — once they head out, I will calculate exact distance & ETA!`;
      } else {
        const destLat = fofiOrder.customer_lat ?? settings?.store_lat ?? 14.031902;
        const destLng = fofiOrder.customer_lng ?? settings?.store_lng ?? 121.206633;
        const dist = haversineKm(fofiDriverLoc.lat, fofiDriverLoc.lng, destLat, destLng);
        const speed = fofiDriverLoc.speed && fofiDriverLoc.speed > 2 ? fofiDriverLoc.speed : 25;
        const mins = Math.max(1, Math.round((dist / speed) * 60));
        const distLabel = dist < 1 ? `${Math.round(dist * 1000)} m` : `${dist.toFixed(1)} km`;
        if (ql.includes("where") || ql.includes("driver") || ql.includes("rider") || ql.includes("location")) {
          reply = dist < 0.3
            ? `Your rider is less than 300 meters away from ${fofiOrder.customer_address}!`
            : `Your rider is ${distLabel} away, moving at ~${speed} km/h (~${mins} min ETA).`;
        } else if (ql.includes("long") || ql.includes("eta") || ql.includes("when") || ql.includes("time")) {
          reply = `Estimated arrival for Order #${fofiOrder.order_number} is ~${mins} min (${distLabel} remaining).`;
        } else {
          reply = `Order #${fofiOrder.order_number} (${ORDER_STATUS_LABELS[fofiOrder.status]}): rider is ${distLabel} away, ETA ~${mins} min.`;
        }
      }
    }
    setTimeout(() => {
      setFofiMessages((prev) => [...prev, { role: "ai", text: reply }]);
    }, 180);
  }

  async function askLamion(question: string) {
    const q = question.trim();
    if (!q || aiThinking) return;
    setAiInput("");
    setAiMessages((prev) => [...prev, { role: "user", text: q, at: Date.now() }]);
    setAiThinking(true);
    try {
      const history = aiMessages.map((m) => ({
        role: (m.role === "ai" ? "assistant" : "user") as "assistant" | "user",
        content: m.text,
      }));
      const res = await chatWithLamionWeb(q, history);
      setAiMessages((prev) => [...prev, { role: "ai", text: res.reply, at: Date.now() }]);
    } catch {
      setAiMessages((prev) => [
        ...prev,
        { role: "ai", text: "Pasensya na, Lamion AI encountered a connection issue.", at: Date.now() },
      ]);
    } finally {
      setAiThinking(false);
    }
  }

  async function handleScanImage(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result || "");
      setScanPreview(dataUrl);
      setScanLoading(true);
      setScanResult(null);
      try {
        const result = await analyzeImageWithLamionWeb(dataUrl, scanMode);
        setScanResult(result);
      } catch (e: any) {
        toast.error(e?.message || "Failed to analyze dish image");
      } finally {
        setScanLoading(false);
      }
    };
    reader.readAsDataURL(file);
  }

  const NAV_LIST: { key: CustomerTab; label: string; icon: any; badge?: number }[] = [
    { key: "home", label: "Home", icon: Home },
    { key: "menu", label: "Menu", icon: Utensils },
    { key: "cart", label: "Cart", icon: ShoppingCart, badge: cartCount },
    { key: "orders", label: "My Orders", icon: Receipt, badge: activeOrdersCount },
    { key: "lamion", label: "Lamion AI", icon: Sparkles },
    { key: "scanner", label: "Dish Scanner", icon: Camera },
    { key: "chat", label: "Chat", icon: MessageSquare },
    { key: "profile", label: "Profile", icon: UserIcon },
  ];

  const searchEntries: SearchEntry[] = useMemo(
    () => [
      ...NAV_LIST.map((n) => ({
        id: `nav_${n.key}`,
        category: "Section",
        title: n.label,
        subtitle: `Open ${n.label}`,
        onSelect: () => setTab(n.key),
      })),
      ...menuItems.slice(0, 20).map((m) => ({
        id: `dish_${m.id}`,
        category: m.category || "Dish",
        title: m.name,
        subtitle: `₱${m.price.toFixed(2)} · ${m.description?.slice(0, 60) || "Filipino dish"}`,
        onSelect: () => {
          setActiveCat("");
          setSearch(m.name);
          setTab("menu");
        },
      })),
      ...orders.slice(0, 8).map((o) => ({
        id: `ord_${o.id}`,
        category: ORDER_STATUS_LABELS[o.status] || o.status,
        title: `Order #${o.order_number}`,
        subtitle: `₱${o.total.toFixed(2)} · ${formatTimeAgo(o.created_at)}`,
        onSelect: () => setTab("orders"),
      })),
    ],
    [menuItems, orders],
  );

  return (
    <div className="ff-shell">
      <div
        className={`ff-sidebar-backdrop ${sidebarOpen ? "open" : ""}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />
      <aside className={`ff-sidebar ff-no-print ${sidebarOpen ? "open" : ""}`}>
        <div>
          <div className="ff-brand">
            <img src="/logo.png" alt="FoodFix" />
            <div>
              <div className="ff-brand-title">FOODFIX</div>
              <div className="ff-brand-sub">DERICK&apos;S FOOD HOUSE</div>
            </div>
          </div>

          <div className="ff-nav-section-label">STOREFRONT &amp; AI</div>
          <div className="ff-nav-list">
            {NAV_LIST.map((n) => {
              const Icon = n.icon;
              return (
                <button
                  key={n.key}
                  type="button"
                  className={`ff-nav-btn ${tab === n.key ? "active" : ""}`}
                  onClick={() => {
                    setTab(n.key);
                    setSidebarOpen(false);
                  }}
                >
                  <span className="ff-nav-btn-left">
                    <Icon size={18} />
                    {n.label}
                  </span>
                  {n.badge ? <span className="ff-nav-badge">{n.badge}</span> : null}
                </button>
              );
            })}
          </div>
        </div>

        <div className="ff-sidebar-footer">
          {onBackAdmin && (
            <button type="button" className="ff-btn ff-btn-soft" onClick={onBackAdmin}>
              <ShieldCheck size={15} /> Back to Admin Console
            </button>
          )}
          <a
            href={withUtm("https://github.com/Jesalyn-byte/FoodFix", "customer_sidebar")}
            target="_blank"
            rel="noreferrer"
            className="ff-btn ff-btn-outline"
            style={{ fontSize: 12 }}
          >
            <ExternalLink size={14} /> About FoodFix
          </a>
          <button type="button" className="ff-btn ff-btn-danger-soft" onClick={() => logOut()}>
            <LogOut size={15} /> Log Out
          </button>
        </div>
      </aside>

      <div className="ff-main">
        <header className="ff-topbar">
          <div className="ff-topbar-left">
            <button
              type="button"
              className="ff-btn ff-btn-outline ff-mobile-header ff-no-print"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle navigation menu"
            >
              <MenuIcon size={18} />
            </button>
            <div>
              <h2 className="ff-topbar-title">
                {NAV_LIST.find((n) => n.key === tab)?.label}
              </h2>
              <div className="ff-topbar-sub">Welcome back, {profile.username}</div>
            </div>
          </div>

          <div className="ff-topbar-right">
            <button
              type="button"
              className="ff-btn ff-btn-outline ff-no-print"
              style={{ padding: "7px 12px", fontSize: 12.5 }}
              onClick={() => setSearchOpen(true)}
            >
              <Search size={14} /> Search
            </button>
            <ThemeToggleButton dark={dark} onToggle={onToggleDark} />
            <button type="button" className="ff-btn ff-btn-soft ff-no-print" onClick={() => setTab("lamion")}>
              <Sparkles size={15} /> Ask Lamion AI
            </button>
            <button type="button" className="ff-btn ff-btn-primary ff-no-print" onClick={() => setTab("cart")}>
              <ShoppingCart size={15} /> Cart ({cartCount})
            </button>
          </div>
        </header>

        <main id="main-content" className="ff-content">
          {/* HOME */}
          {tab === "home" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
              <div
                style={{
                  background: "linear-gradient(125deg, #F25C05 0%, #D9480F 100%)",
                  color: "#fff",
                  borderRadius: 24,
                  padding: "30px 32px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 20,
                  boxShadow: "0 12px 28px rgba(242,92,5,0.22)",
                }}
              >
                <div>
                  <h1 style={{ margin: "0 0 8px", fontSize: 28, fontWeight: 800 }}>
                    Hello, {profile.username}! Welcome to FoodFix
                  </h1>
                  <p style={{ margin: 0, fontSize: 15, opacity: 0.92 }}>
                    Fresh Daily Filipino Favorites · Authentic Home-Cooked Comfort Dishes
                  </p>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    type="button"
                    className="ff-btn ff-btn-pill"
                    style={{ background: "#fff", color: "#F25C05", padding: "11px 20px" }}
                    onClick={() => setTab("menu")}
                  >
                    Order Now
                  </button>
                  <button
                    type="button"
                    className="ff-btn ff-btn-pill"
                    style={{ background: "#2E1A06", color: "#fff", padding: "11px 20px" }}
                    onClick={() => setTab("lamion")}
                  >
                    <Sparkles size={15} /> Lamion AI
                  </button>
                </div>
              </div>

              {banners.length > 0 && (
                <div>
                  <h3 style={{ margin: "0 0 12px" }}>Featured Offers</h3>
                  <div className="ff-grid-2">
                    {banners.map((b) => (
                      <div
                        key={b.id}
                        className="ff-card"
                        style={{ padding: 0, overflow: "hidden", position: "relative", height: 220, cursor: "pointer" }}
                        onClick={() => setTab("menu")}
                      >
                        <img src={b.imageUrl} alt={b.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            background: "linear-gradient(to top, rgba(46,26,6,0.82), transparent)",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "flex-end",
                            padding: 20,
                            color: "#fff",
                          }}
                        >
                          <strong style={{ fontSize: 19 }}>{b.name}</strong>
                          <span style={{ fontSize: 12.5, color: "#FFE6CC" }}>Tap to explore menu -&gt;</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 style={{ margin: "0 0 12px" }}>Quick Access</h3>
                <div className="ff-grid-4">
                  {[
                    { label: "Browse Menu", sub: "Order fresh Pinoy dishes", tab: "menu" as CustomerTab, color: "#F25C05", icon: Utensils },
                    { label: "Lamion AI Chef", sub: "Filipino culinary Q&A", tab: "lamion" as CustomerTab, color: "#9B59B6", icon: Sparkles },
                    { label: "Dish Scanner", sub: "Identify food & macros", tab: "scanner" as CustomerTab, color: "#27AE60", icon: Camera },
                    { label: "Track Orders", sub: `${activeOrdersCount} active orders`, tab: "orders" as CustomerTab, color: "#3498DB", icon: Receipt },
                  ].map((q) => {
                    const Icon = q.icon;
                    return (
                      <button
                        key={q.label}
                        type="button"
                        onClick={() => setTab(q.tab)}
                        className="ff-card ff-card-hover"
                        style={{ textAlign: "left", cursor: "pointer" }}
                      >
                        <div style={{ width: 42, height: 42, borderRadius: 12, background: `${q.color}1F`, color: q.color, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
                          <Icon size={20} />
                        </div>
                        <strong style={{ fontSize: 15, display: "block" }}>{q.label}</strong>
                        <span style={{ fontSize: 12.5, color: "var(--ff-espresso-muted)" }}>{q.sub}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20, alignItems: "start" }}>
                <FaqSection />
                <NewsletterSignup />
              </div>
            </div>
          )}

          {/* MENU */}
          {tab === "menu" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div className="ff-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ position: "relative" }}>
                  <Search size={16} color="#8C7A6B" style={{ position: "absolute", left: 13, top: 12 }} />
                  <input
                    className="ff-input"
                    style={{ paddingLeft: 38 }}
                    placeholder="Search Adobo, Sinigang, Silog, Halo-Halo..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="ff-btn ff-btn-pill"
                    style={{ background: !activeCat ? "#F25C05" : "#FDF5E0", color: !activeCat ? "#fff" : "#6D4C41" }}
                    onClick={() => setActiveCat("")}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    className="ff-btn ff-btn-pill"
                    style={{
                      background: activeCat === "__favorites__" ? "#E74C3C" : "#FFF0F2",
                      color: activeCat === "__favorites__" ? "#fff" : "#C0392B",
                    }}
                    onClick={() => setActiveCat("__favorites__")}
                  >
                    <Heart size={13} fill={activeCat === "__favorites__" ? "#fff" : "#E74C3C"} /> Favorites ({favorites.length})
                  </button>
                  {menuCategories.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className="ff-btn ff-btn-pill"
                      style={{ background: activeCat === c ? "#F25C05" : "#FDF5E0", color: activeCat === c ? "#fff" : "#6D4C41" }}
                      onClick={() => setActiveCat(c)}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {filteredMenu.length === 0 ? (
                <div className="ff-card" style={{ textAlign: "center", padding: 38, color: "var(--ff-espresso-muted)" }}>
                  {activeCat === "__favorites__"
                    ? "You have no favorite dishes yet. Tap the heart icon on any dish to save it here!"
                    : "No dishes match your filter."}
                </div>
              ) : (
                <div className="ff-grid-3">
                  {filteredMenu.map((item) => {
                    const catColor = MENU_CATEGORY_COLORS[item.category] || "#F25C05";
                    const isMto = Boolean(item.is_made_to_order || item.category === "Made to Order");
                    const soldOut = !item.available || (!isMto && item.stock_quantity <= 0);
                    const favId = favoriteMap.get(item.id);
                    const inCartQty = cart.find((c) => c.menu_item_id === item.id)?.quantity || 0;
                    const qty = getSelectedQty(item);

                    return (
                      <div key={item.id} className="ff-card ff-card-hover ff-menu-card" style={{ opacity: soldOut ? 0.65 : 1 }}>
                        <div className="ff-menu-img-wrap">
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.name} className="ff-menu-img" />
                          ) : (
                            <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ff-gray)" }}>
                              No Image
                            </div>
                          )}
                          <span className="ff-badge" style={{ position: "absolute", top: 10, left: 10, background: catColor, color: "#fff", zIndex: 2 }}>
                            {item.category}
                          </span>
                          <button
                            type="button"
                            className="ff-menu-fav-btn"
                            aria-label={favId ? `Remove ${item.name} from favorites` : `Save ${item.name} to favorites`}
                            onClick={async () => {
                              try {
                                const added = await toggleFavoriteWeb(profile.id, item.id, favId);
                                toast.info(added ? `Added ${item.name} to Favorites` : `Removed ${item.name} from Favorites`);
                              } catch (err: any) {
                                toast.error(err?.message || "Could not update favorite");
                              }
                            }}
                          >
                            <Heart size={16} color="#E74C3C" fill={favId ? "#E74C3C" : "transparent"} />
                          </button>
                          {isMto && (
                            <span
                              className="ff-badge"
                              style={{ position: "absolute", bottom: 10, left: 10, background: "#8B4513", color: "#fff", zIndex: 2 }}
                            >
                              Made to Order
                            </span>
                          )}
                          {inCartQty > 0 && (
                            <span
                              className="ff-badge"
                              style={{ position: "absolute", bottom: 10, right: 10, background: "#27AE60", color: "#fff", zIndex: 2 }}
                            >
                              {inCartQty} in cart
                            </span>
                          )}
                          {!soldOut && (
                            <div className="ff-menu-hover-overlay">
                              <span style={{ color: "#fff", fontSize: 11.5, fontWeight: 700 }}>
                                {isMto ? "Cooked Fresh to Order" : `${item.stock_quantity} left in stock`}
                              </span>
                            </div>
                          )}
                          {soldOut && (
                            <div
                              style={{
                                position: "absolute",
                                inset: 0,
                                background: "rgba(20,10,2,0.52)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                zIndex: 2,
                              }}
                            >
                              <span className="ff-badge" style={{ background: "#E74C3C", color: "#fff", fontSize: 12 }}>
                                SOLD OUT
                              </span>
                            </div>
                          )}
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                          <strong style={{ fontSize: 16 }}>{item.name}</strong>
                          <strong style={{ fontSize: 16, color: "#F25C05" }}>₱{item.price.toFixed(2)}</strong>
                        </div>
                        <p style={{ margin: 0, fontSize: 12.5, color: "var(--ff-espresso-muted)", flex: 1 }}>
                          {item.description}
                        </p>
                        <div className="ff-timestamp">
                          <Clock size={11} /> Updated {formatTimeAgo(item.updated_at || item.created_at)}
                        </div>

                        {soldOut ? (
                          <button type="button" disabled className="ff-btn ff-btn-outline ff-btn-pill">
                            Sold Out
                          </button>
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                padding: "3px 6px",
                                borderRadius: 999,
                                border: "1px solid var(--ff-border-warm)",
                                background: "var(--ff-cream-soft)",
                              }}
                            >
                              <button
                                type="button"
                                className="ff-icon-btn"
                                style={{ width: 28, height: 28, borderRadius: 999 }}
                                aria-label={`Decrease ${item.name} quantity`}
                                onClick={() => stepSelectedQty(item, -1)}
                              >
                                <Minus size={13} />
                              </button>
                              <strong style={{ minWidth: 20, textAlign: "center", fontSize: 13 }}>{qty}</strong>
                              <button
                                type="button"
                                className="ff-icon-btn"
                                style={{ width: 28, height: 28, borderRadius: 999 }}
                                aria-label={`Increase ${item.name} quantity`}
                                onClick={() => stepSelectedQty(item, 1)}
                              >
                                <Plus size={13} />
                              </button>
                            </div>
                            <button
                              type="button"
                              className="ff-btn ff-btn-primary ff-btn-pill"
                              style={{ flex: 1 }}
                              onClick={() => addToCart(item, qty)}
                            >
                              <ShoppingCart size={15} /> Add {qty > 1 ? `(${qty})` : "to Cart"}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* CART & CHECKOUT */}
          {tab === "cart" && (
            <div className="ff-workspace-2">
              <div className="ff-card">
                <h3 style={{ margin: "0 0 14px" }}>Your Cart ({cartCount} items)</h3>
                {cart.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 36, color: "#8C7A6B" }}>
                    Your cart is empty. <button type="button" className="ff-btn ff-btn-soft" onClick={() => setTab("menu")}>Browse Menu</button>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {cart.map((c) => (
                      <div key={c.menu_item_id} style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, borderRadius: 14, background: "#FDF9F2", border: "1px solid #F0E4CE" }}>
                        {c.image_url && <img src={c.image_url} alt={c.name} style={{ width: 58, height: 58, borderRadius: 10, objectFit: "cover" }} />}
                        <div style={{ flex: 1 }}>
                          <strong>{c.name}</strong>
                          <div style={{ fontSize: 12.5, color: "#F25C05", fontWeight: 700 }}>
                            ₱{c.price.toFixed(2)} each
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <button
                            type="button"
                            className="ff-btn ff-btn-outline"
                            style={{ padding: 6 }}
                            onClick={() => {
                              if (c.quantity <= 1) {
                                setRemoveCartItem(c);
                                return;
                              }
                              setCart((prev) =>
                                prev.map((x) => (x.menu_item_id === c.menu_item_id ? { ...x, quantity: x.quantity - 1 } : x)),
                              );
                            }}
                          >
                            <Minus size={14} />
                          </button>
                          <strong>{c.quantity}</strong>
                          <button
                            type="button"
                            className="ff-btn ff-btn-outline"
                            style={{ padding: 6 }}
                            onClick={() => {
                              const cap = c.is_made_to_order ? 999 : c.stock_quantity || 999;
                              if (c.quantity >= cap) {
                                toast.info(`Maximum available stock reached (${cap}).`);
                                return;
                              }
                              setCart((prev) =>
                                prev.map((x) => (x.menu_item_id === c.menu_item_id ? { ...x, quantity: x.quantity + 1 } : x)),
                              );
                            }}
                          >
                            <Plus size={14} />
                          </button>
                          <button
                            type="button"
                            className="ff-btn ff-btn-danger-soft"
                            style={{ padding: 6 }}
                            onClick={() => setRemoveCartItem(c)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <form onSubmit={handleCheckout} className="ff-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <h3 style={{ margin: 0 }}>Checkout Details</h3>
                <OrderBreakdown items={cart} showItems subtotal={subtotal} deliveryFee={deliveryFee} total={grandTotal} />

                <label style={{ fontSize: 12, fontWeight: 700 }}>Order Type</label>
                <select className="ff-select" value={orderType} onChange={(e) => setOrderType(e.target.value as OrderType)}>
                  {Object.entries(ORDER_TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>

                <label style={{ fontSize: 12, fontWeight: 700 }}>Payment Method</label>
                <select className="ff-select" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}>
                  <option value="cod">Cash on Delivery</option>
                  <option value="gcash">GCash</option>
                </select>

                <input className="ff-input" placeholder="Contact Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                <AddressAutocomplete
                  value={address}
                  coords={deliveryCoords}
                  placeholder="Search delivery place or street..."
                  onChange={(nextAddr, nextCoords) => {
                    setAddress(nextAddr);
                    setDeliveryCoords(nextCoords ?? null);
                  }}
                />
                <input className="ff-input" placeholder="Order note (optional)" value={orderNote} onChange={(e) => setOrderNote(e.target.value)} />

                <button type="submit" disabled={placing || cart.length === 0} className="ff-btn ff-btn-primary ff-btn-pill" style={{ height: 46 }}>
                  {placing ? "Placing Order..." : `Place Order · ₱${grandTotal.toFixed(2)}`}
                </button>
              </form>
            </div>
          )}

          {/* MY ORDERS */}
          {tab === "orders" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {orders.length === 0 ? (
                <div className="ff-card" style={{ textAlign: "center", padding: 40, color: "#8C7A6B" }}>
                  You haven&apos;t placed any orders yet.
                </div>
              ) : (
                <div className="ff-grid-2">
                  {orders.map((o) => {
                    const color = ORDER_STATUS_COLORS[o.status] || "#888";
                    const isActiveOrder = ["pending", "accepted", "preparing", "out_for_delivery"].includes(o.status);
                    const queueIdx = isActiveOrder
                      ? [...orders]
                          .filter((x) => ["pending", "accepted", "preparing", "out_for_delivery"].includes(x.status))
                          .reverse()
                          .findIndex((x) => x.id === o.id) + 1
                      : 0;
                    return (
                      <div key={o.id} className="ff-card ff-card-hover" style={{ borderLeft: `4px solid ${color}`, display: "flex", flexDirection: "column", gap: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                          <div>
                            <strong>Order #{o.order_number}</strong>
                            <div className="ff-timestamp">
                              <Clock size={11} /> Updated {formatTimeAgo(o.updated_at || o.created_at)}
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                            {queueIdx > 0 && (
                              <span className="ff-badge" style={{ background: "#FFF0E6", color: "#F25C05" }}>
                                Queue #{queueIdx}
                              </span>
                            )}
                            <span className="ff-badge" style={{ background: `${color}20`, color }}>
                              {ORDER_STATUS_LABELS[o.status]}
                            </span>
                          </div>
                        </div>
                        <OrderBreakdown showItems items={o.items} subtotal={o.subtotal} deliveryFee={o.delivery_fee} total={o.total} />
                        {(o.order_type === "delivery_now" || o.order_type === "delivery_later") &&
                          ["pending", "accepted", "preparing", "out_for_delivery"].includes(o.status) && (
                            <button
                              type="button"
                              className="ff-btn ff-btn-blue"
                              onClick={() => setTrackOrder(o)}
                            >
                              <MapPin size={14} /> Track Live Delivery Map
                            </button>
                          )}
                        {o.status === "delivered" && (
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              type="button"
                              className="ff-btn ff-btn-soft"
                              style={{ flex: 1 }}
                              onClick={() => {
                                setReviewOrder(o);
                                setReviewRating(5);
                                setReviewComment("");
                              }}
                            >
                              <Star size={14} /> Write Review
                            </button>
                            {!o.refund_status && (
                              <button
                                type="button"
                                className="ff-btn ff-btn-outline"
                                onClick={() => {
                                  setRefundOrder(o);
                                  setRefundReason("");
                                }}
                              >
                                Request Refund
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* LAMION AI CHAT */}
          {tab === "lamion" && (
            <div className="ff-card" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column", height: 640 }}>
              <div style={{ background: "#F25C05", color: "#fff", padding: "16px 22px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Sparkles size={20} />
                  <div>
                    <strong style={{ fontSize: 16 }}>Lamion AI · Filipino Culinary Assistant</strong>
                    <div style={{ fontSize: 11.5, opacity: 0.9 }}>Protected by strict Filipino Culinary Guardrails</div>
                  </div>
                </div>
              </div>

              <div style={{ padding: "10px 18px", borderBottom: "1px solid #F0E4CE", background: "#FDF9F2", display: "flex", gap: 6, flexWrap: "wrap" }}>
                {LAMION_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="ff-btn ff-btn-soft ff-btn-pill"
                    style={{ fontSize: 11.5, padding: "5px 12px" }}
                    onClick={() => askLamion(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>

              <div style={{ flex: 1, padding: 20, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
                {aiMessages.map((m, idx) => (
                  <div
                    key={`${m.at}-${idx}`}
                    style={{
                      alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                      maxWidth: "74%",
                      background: m.role === "user" ? "#F25C05" : "#FDF5E0",
                      color: m.role === "user" ? "#fff" : "#2E1A06",
                      borderRadius: 16,
                      padding: "12px 15px",
                      fontSize: 13.5,
                      lineHeight: 1.55,
                    }}
                  >
                    <div>{m.text}</div>
                    {m.role === "ai" && idx > 0 && (
                      <button
                        type="button"
                        onClick={async () => {
                          await flagLamionAiMessage(m.text);
                          toast.info("Reply flagged for research team review.");
                        }}
                        style={{ border: "none", background: "none", color: "#8C7A6B", fontSize: 11, marginTop: 6, display: "inline-flex", alignItems: "center", gap: 4, padding: 0 }}
                      >
                        <Flag size={11} /> Flag reply
                      </button>
                    )}
                  </div>
                ))}
                {aiThinking && <div style={{ fontSize: 13, color: "#F25C05", fontWeight: 700 }}>Lamion AI is thinking...</div>}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  askLamion(aiInput);
                }}
                style={{ padding: 14, borderTop: "1px solid #F0E4CE", display: "flex", gap: 10 }}
              >
                <input
                  className="ff-input"
                  placeholder="Ask about Filipino recipes, ingredients, or cooking tips..."
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                />
                <button type="submit" disabled={aiThinking} className="ff-btn ff-btn-primary">
                  <Send size={15} /> Ask
                </button>
              </form>
            </div>
          )}

          {/* AI DISH SCANNER */}
          {tab === "scanner" && (
            <div className="ff-workspace-2">
              <div className="ff-card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <h3 style={{ margin: 0 }}>Lamion AI Dish &amp; Ingredient Scanner</h3>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    className="ff-btn ff-btn-pill"
                    style={{ flex: 1, background: scanMode === "dish" ? "#F25C05" : "#FDF5E0", color: scanMode === "dish" ? "#fff" : "#6D4C41" }}
                    onClick={() => setScanMode("dish")}
                  >
                    Identify Dish
                  </button>
                  <button
                    type="button"
                    className="ff-btn ff-btn-pill"
                    style={{ flex: 1, background: scanMode === "ingredients" ? "#F25C05" : "#FDF5E0", color: scanMode === "ingredients" ? "#fff" : "#6D4C41" }}
                    onClick={() => setScanMode("ingredients")}
                  >
                    Scan Ingredients
                  </button>
                </div>

                <label
                  style={{
                    border: "2px dashed #E8D9C0",
                    borderRadius: 18,
                    padding: 28,
                    textAlign: "center",
                    background: "#FDF9F2",
                    cursor: "pointer",
                  }}
                >
                  <Camera size={32} color="#F25C05" />
                  <div style={{ fontWeight: 700, marginTop: 8 }}>Upload a Food / Ingredient Photo</div>
                  <div style={{ fontSize: 12, color: "#8C7A6B" }}>Supports JPG / PNG</div>
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => handleScanImage(e.target.files?.[0])} />
                </label>

                {scanPreview && (
                  <img src={scanPreview} alt="Scan preview" style={{ width: "100%", maxHeight: 280, objectFit: "cover", borderRadius: 14 }} />
                )}
              </div>

              <div className="ff-card">
                <h3 style={{ margin: "0 0 12px" }}>Scan Analysis Results</h3>
                {scanLoading ? (
                  <div style={{ color: "#F25C05", padding: 24, textAlign: "center" }}>Analyzing food photo with Lamion AI Vision...</div>
                ) : !scanResult ? (
                  <div style={{ color: "#8C7A6B", padding: 24, textAlign: "center" }}>Upload a photo to identify Filipino dishes &amp; nutritional breakdown.</div>
                ) : scanResult.type === "dish" ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <strong style={{ fontSize: 20, color: "#F25C05" }}>{scanResult.dishName}</strong>
                    <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55 }}>{scanResult.description}</p>
                    {scanResult.nutrition && (
                      <div className="ff-grid-3" style={{ gap: 8 }}>
                        {Object.entries(scanResult.nutrition).map(([k, v]) => (
                          <div key={String(k)} style={{ background: "#FDF5E0", padding: 8, borderRadius: 10 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "#8C7A6B" }}>{String(k)}</div>
                            <strong style={{ fontSize: 13 }}>{String(v)}</strong>
                          </div>
                        ))}
                      </div>
                    )}
                    {scanResult.cookingTips && (
                      <div style={{ background: "#FFF0E6", padding: 12, borderRadius: 12, fontSize: 12.5 }}>
                        <strong>Chef Tip:</strong> {scanResult.cookingTips}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <strong>Identified Ingredients: {(scanResult.ingredients || []).join(", ")}</strong>
                    {(scanResult.suggestedRecipes || []).map((r: any, idx: number) => (
                      <div key={idx} style={{ background: "#FDF9F2", padding: 12, borderRadius: 12, border: "1px solid #F0E4CE" }}>
                        <strong style={{ color: "#F25C05" }}>{r.name}</strong>
                        <p style={{ margin: "4px 0 0", fontSize: 12.5 }}>{r.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* LIVE CHAT WITH FOODFIX STORE */}
          {tab === "chat" && (
            <div className="ff-card" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column", height: 580 }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--ff-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>FoodFix Store · Live Chat</div>
                  <div style={{ fontSize: 11.5, color: "var(--ff-espresso-muted)" }}>
                    Direct live chat with store admin
                  </div>
                </div>
                <span className="ff-live-pill">
                  <span className="ff-live-dot" /> Online
                </span>
              </div>
              <div style={{ flex: 1, padding: 18, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
                {supportMsgs.length === 0 ? (
                  <div style={{ color: "var(--ff-gray)", textAlign: "center", marginTop: 40 }}>
                    Send a message below to chat live with FoodFix Store!
                  </div>
                ) : (
                  supportMsgs.map((m) => {
                    const mine = m.sender_role === "customer";
                    return (
                      <div
                        key={m.id}
                        style={{
                          alignSelf: mine ? "flex-end" : "flex-start",
                          background: mine ? "#F25C05" : "#FDF5E0",
                          color: mine ? "#fff" : "#2E1A06",
                          borderRadius: 14,
                          padding: "10px 14px",
                          maxWidth: "70%",
                        }}
                      >
                        <div>{m.content}</div>
                        <div style={{ fontSize: 10.5, opacity: 0.78, marginTop: 3 }}>
                          {mine ? m.sender_name : "FoodFix Store"}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!supportInput.trim()) return;
                  await sendMessage({
                    conversation_id: profile.id,
                    sender_id: profile.id,
                    sender_name: profile.username,
                    sender_role: "customer",
                    content: supportInput.trim(),
                  });
                  setSupportInput("");
                }}
                style={{ padding: 14, borderTop: "1px solid var(--ff-border)", display: "flex", gap: 10 }}
              >
                <input className="ff-input" placeholder="Message FoodFix Store..." value={supportInput} onChange={(e) => setSupportInput(e.target.value)} />
                <button type="submit" className="ff-btn ff-btn-primary"><Send size={15} /> Send</button>
              </form>
            </div>
          )}

          {/* PROFILE */}
          {tab === "profile" && (
            <div className="ff-workspace-2">
              <div className="ff-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, paddingBottom: 12, borderBottom: "1px solid var(--ff-border)" }}>
                  <div
                    style={{
                      width: 54,
                      height: 54,
                      borderRadius: 999,
                      background: "var(--ff-orange)",
                      color: "#fff",
                      display: "grid",
                      placeItems: "center",
                      fontSize: 22,
                      fontWeight: 800,
                      flexShrink: 0,
                    }}
                  >
                    {(profile.username || "C").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 style={{ margin: 0 }}>{profile.username}</h3>
                    <div style={{ fontSize: 12.5, color: "var(--ff-espresso-muted)" }}>{profile.email}</div>
                    <span className="ff-badge" style={{ marginTop: 4, background: "var(--ff-orange-tint)", color: "var(--ff-orange)" }}>
                      Customer
                    </span>
                  </div>
                </div>

                <label style={{ fontSize: 12, fontWeight: 700 }}>Full Name</label>
                <input className="ff-input" placeholder="Full Name" value={editName} onChange={(e) => setEditName(e.target.value)} />
                <label style={{ fontSize: 12, fontWeight: 700 }}>Phone Number</label>
                <input className="ff-input" placeholder="Phone Number" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
                <label style={{ fontSize: 12, fontWeight: 700 }}>Default Delivery Address</label>
                <AddressAutocomplete
                  value={editAddress}
                  placeholder="Default Delivery Address"
                  onChange={(nextAddr, nextCoords) => {
                    setEditAddress(nextAddr);
                    setAddress(nextAddr);
                    if (nextCoords) setDeliveryCoords(nextCoords);
                  }}
                />
                <button
                  type="button"
                  className="ff-btn ff-btn-primary ff-btn-pill"
                  onClick={async () => {
                    await updateProfileDoc(profile.id, {
                      username: editName.trim(),
                      phone: editPhone.trim(),
                      address: editAddress.trim(),
                    });
                    toast.success("Profile updated!");
                  }}
                >
                  Save Profile
                </button>
              </div>

              <div className="ff-card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <h3 style={{ margin: "0 0 4px" }}>Explore &amp; Shortcuts</h3>
                {[
                  {
                    label: "My Favorites",
                    sub: `${favorites.length} saved dish${favorites.length === 1 ? "" : "es"}`,
                    icon: Heart,
                    color: "#E91E63",
                    action: () => {
                      setActiveCat("__favorites__");
                      setTab("menu");
                    },
                  },
                  {
                    label: "AI Food Scan",
                    sub: "Upload a dish photo for calories & ingredients",
                    icon: Camera,
                    color: "#27AE60",
                    action: () => setTab("scanner"),
                  },
                  {
                    label: "Submit a Dish",
                    sub: "Suggest a Filipino dish to FoodFix Store",
                    icon: UtensilsCrossed,
                    color: "#F25C05",
                    action: () => {
                      setSubmitDishName("");
                      setSubmitDishNotes("");
                      setSubmitModalOpen(true);
                    },
                  },
                  {
                    label: "Live Delivery Tracker",
                    sub: "Track your active order's real-time map",
                    icon: Navigation,
                    color: "#3498DB",
                    action: () => {
                      const activeDelivery = orders.find(
                        (o) =>
                          (o.order_type === "delivery_now" || o.order_type === "delivery_later") &&
                          ["pending", "accepted", "preparing", "out_for_delivery"].includes(o.status),
                      );
                      if (activeDelivery) {
                        setTrackOrder(activeDelivery);
                      } else {
                        setTab("orders");
                        toast.info("No active delivery right now — showing your orders.");
                      }
                    },
                  },
                  {
                    label: "Ask Lamion AI",
                    sub: "Filipino culinary Q&A, recipes & cooking tips",
                    icon: Sparkles,
                    color: "#F39C12",
                    action: () => setTab("lamion"),
                  },
                  {
                    label: "Ask FOFI about Delivery",
                    sub: "Ask FOFI about your rider's distance & ETA",
                    icon: MessageCircle,
                    color: "#9B59B6",
                    action: openAskFofiDelivery,
                  },
                ].map((sc) => {
                  const Icon = sc.icon;
                  return (
                    <button
                      key={sc.label}
                      type="button"
                      onClick={sc.action}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        width: "100%",
                        padding: "11px 12px",
                        borderRadius: 14,
                        border: "1px solid var(--ff-border)",
                        background: "var(--ff-cream-card)",
                        color: "var(--ff-espresso)",
                        textAlign: "left",
                      }}
                    >
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 12,
                          background: `${sc.color}1F`,
                          color: sc.color,
                          display: "grid",
                          placeItems: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Icon size={19} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <strong style={{ fontSize: 13.5, display: "block" }}>{sc.label}</strong>
                        <span style={{ fontSize: 11.5, color: "var(--ff-espresso-muted)" }}>{sc.sub}</span>
                      </div>
                      <ChevronRight size={16} color="var(--ff-gray)" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* GCash Prompt Modal (Enlarged QR + Copy Number) */}
      {gcashPrompt && (
        <div className="ff-modal-overlay" onClick={() => setGcashPrompt(null)}>
          <div className="ff-modal" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 8px" }}>GCash Payment · Order #{gcashPrompt.orderNumber}</h3>
            <p style={{ fontSize: 13.5, color: "var(--ff-espresso-muted)" }}>
              Amount to Pay: <strong style={{ color: "#F25C05" }}>₱{gcashPrompt.amount.toFixed(2)}</strong>
              <br />
              Store GCash: <strong>{settings?.gcash_number || "0917-FOODFIX"}</strong>
            </p>
            <button
              type="button"
              className="ff-btn ff-btn-soft"
              style={{ width: "100%", marginBottom: 10 }}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(settings?.gcash_number || "0917-FOODFIX");
                  toast.success("GCash number copied!");
                } catch {
                  toast.error("Could not copy number.");
                }
              }}
            >
              <Copy size={14} /> Copy GCash Number
            </button>
            {settings?.gcash_qr_image && (
              <div style={{ textAlign: "center" }}>
                <img
                  src={settings.gcash_qr_image}
                  alt="GCash QR"
                  onClick={() => setQrZoomOpen(true)}
                  style={{ width: 250, height: 250, objectFit: "contain", display: "block", margin: "8px auto", borderRadius: 14, cursor: "zoom-in", border: "1px solid var(--ff-border)", background: "#fff" }}
                />
                <span style={{ fontSize: 11.5, color: "var(--ff-gray)" }}>Click QR code to enlarge</span>
              </div>
            )}
            <button
              type="button"
              className="ff-btn ff-btn-green ff-btn-pill"
              style={{ width: "100%", marginTop: 12 }}
              onClick={async () => {
                await notifyGcashPayment(gcashPrompt.orderId, profile.username, phone, gcashPrompt.amount, {
                  customerId: profile.id,
                  orderNumber: gcashPrompt.orderNumber,
                });
                toast.success("GCash notification sent to store!");
                setGcashPrompt(null);
                setTab("orders");
              }}
            >
              I Have Sent Payment
            </button>
          </div>
        </div>
      )}

      {qrZoomOpen && settings?.gcash_qr_image && (
        <div className="ff-modal-overlay" onClick={() => setQrZoomOpen(false)}>
          <div className="ff-modal" style={{ maxWidth: 480, textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <strong>Scan Store GCash QR</strong>
              <button type="button" className="ff-icon-btn" onClick={() => setQrZoomOpen(false)}>
                <X size={16} />
              </button>
            </div>
            <img
              src={settings.gcash_qr_image}
              alt="Enlarged GCash QR"
              style={{ width: "100%", maxWidth: 360, height: "auto", borderRadius: 16, background: "#fff", padding: 8 }}
            />
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!removeCartItem}
        title={`Remove "${removeCartItem?.name || ""}"?`}
        description="Remove this dish from your cart?"
        confirmLabel="Remove"
        onCancel={() => setRemoveCartItem(null)}
        onConfirm={() => {
          if (!removeCartItem) return;
          setCart((prev) => prev.filter((x) => x.menu_item_id !== removeCartItem.menu_item_id));
          toast.info(`Removed ${removeCartItem.name} from cart`);
          setRemoveCartItem(null);
        }}
      />

      {/* Submit a Dish Modal */}
      {submitModalOpen && (
        <div className="ff-modal-overlay" onClick={() => setSubmitModalOpen(false)}>
          <div className="ff-modal" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Submit a Dish Suggestion</h3>
              <button type="button" className="ff-icon-btn" onClick={() => setSubmitModalOpen(false)}>
                <X size={16} />
              </button>
            </div>
            <p style={{ marginTop: 0, fontSize: 13, color: "var(--ff-espresso-muted)" }}>
              Suggest a Filipino dish you would like to see added to FoodFix!
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input
                className="ff-input"
                placeholder="Dish name (e.g. Chicken Inasal, Kare-Kare)"
                value={submitDishName}
                onChange={(e) => setSubmitDishName(e.target.value)}
              />
              <textarea
                className="ff-textarea"
                rows={3}
                placeholder="Optional notes or recipe preference..."
                value={submitDishNotes}
                onChange={(e) => setSubmitDishNotes(e.target.value)}
              />
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button type="button" className="ff-btn ff-btn-outline" style={{ flex: 1 }} onClick={() => setSubmitModalOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingDish}
                className="ff-btn ff-btn-primary"
                style={{ flex: 1 }}
                onClick={async () => {
                  if (!submitDishName.trim()) {
                    toast.error("Please enter a dish name.");
                    return;
                  }
                  setSubmittingDish(true);
                  try {
                    await submitDishSuggestionWeb({
                      name: submitDishName,
                      description: submitDishNotes,
                      user_id: profile.id,
                      user_email: profile.email,
                      user_name: profile.username,
                    });
                    toast.success("Dish suggestion submitted to FoodFix!");
                    setSubmitModalOpen(false);
                  } catch (err: any) {
                    toast.error(err?.message || "Failed to submit dish suggestion");
                  } finally {
                    setSubmittingDish(false);
                  }
                }}
              >
                {submittingDish ? "Submitting..." : "Submit Dish"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ask FOFI about Delivery Modal */}
      {fofiOpen && (
        <div
          className="ff-modal-overlay"
          onClick={() => {
            setFofiOpen(false);
            fofiUnsubRef.current?.();
            fofiUnsubRef.current = null;
          }}
        >
          <div className="ff-modal" style={{ maxWidth: 480, display: "flex", flexDirection: "column", gap: 12 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ margin: 0 }}>Ask FOFI · Delivery Assistant</h3>
                <div style={{ fontSize: 12, color: "var(--ff-espresso-muted)" }}>
                  {fofiOrder ? `Tracking Order #${fofiOrder.order_number}` : "No active order"}
                </div>
              </div>
              <button
                type="button"
                className="ff-icon-btn"
                onClick={() => {
                  setFofiOpen(false);
                  fofiUnsubRef.current?.();
                  fofiUnsubRef.current = null;
                }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {["Where is my driver?", "How long until delivery?", "Order status"].map((q) => (
                <button
                  key={q}
                  type="button"
                  className="ff-btn ff-btn-soft ff-btn-pill"
                  style={{ fontSize: 11.5, padding: "5px 11px" }}
                  onClick={() => answerFofiDelivery(q)}
                >
                  {q}
                </button>
              ))}
            </div>

            <div style={{ maxHeight: 260, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, padding: "4px 2px" }}>
              {fofiMessages.map((m, i) => (
                <div
                  key={i}
                  style={{
                    alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                    background: m.role === "user" ? "#F25C05" : "#FDF5E0",
                    color: m.role === "user" ? "#fff" : "#2E1A06",
                    borderRadius: 14,
                    padding: "9px 12px",
                    fontSize: 13,
                    maxWidth: "82%",
                  }}
                >
                  {m.text}
                </div>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                answerFofiDelivery(fofiInput);
              }}
              style={{ display: "flex", gap: 8 }}
            >
              <input
                className="ff-input"
                placeholder="Ask FOFI about your delivery..."
                value={fofiInput}
                onChange={(e) => setFofiInput(e.target.value)}
              />
              <button type="submit" className="ff-btn ff-btn-primary">
                <Send size={14} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewOrder && (
        <div className="ff-modal-overlay" onClick={() => setReviewOrder(null)}>
          <div className="ff-modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 12px" }}>Review Order #{reviewOrder.order_number}</h3>
            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setReviewRating(n)} style={{ border: "none", background: "none" }}>
                  <Star size={26} color="#F39C12" fill={n <= reviewRating ? "#F39C12" : "transparent"} />
                </button>
              ))}
            </div>
            <textarea className="ff-textarea" rows={3} placeholder="Share how the food was..." value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} />
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button type="button" className="ff-btn ff-btn-outline" style={{ flex: 1 }} onClick={() => setReviewOrder(null)}>Cancel</button>
              <button
                type="button"
                className="ff-btn ff-btn-primary"
                style={{ flex: 1 }}
                onClick={async () => {
                  const first = reviewOrder.items[0];
                  await addReview({
                    user_id: profile.id,
                    username: profile.username,
                    order_id: reviewOrder.id,
                    menu_item_id: first?.menu_item_id || "",
                    menu_item_name: first?.name || `Order #${reviewOrder.order_number}`,
                    rating: reviewRating,
                    comment: reviewComment.trim() || "Great food!",
                  });
                  toast.success("Thank you for your review!");
                  setReviewOrder(null);
                }}
              >
                Submit Review
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refund Request Modal */}
      {refundOrder && (
        <div className="ff-modal-overlay" onClick={() => setRefundOrder(null)}>
          <div className="ff-modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 10px" }}>Request Refund · #{refundOrder.order_number}</h3>
            <textarea className="ff-textarea" rows={3} placeholder="Reason for refund..." value={refundReason} onChange={(e) => setRefundReason(e.target.value)} />
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button type="button" className="ff-btn ff-btn-outline" style={{ flex: 1 }} onClick={() => setRefundOrder(null)}>Cancel</button>
              <button
                type="button"
                className="ff-btn ff-btn-red"
                style={{ flex: 1 }}
                onClick={async () => {
                  if (!refundReason.trim()) {
                    toast.error("Please enter a reason.");
                    return;
                  }
                  await requestRefund(refundOrder.id, refundReason.trim());
                  toast.info("Refund request sent to store admin.");
                  setRefundOrder(null);
                }}
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}

      <GlobalSearchModal open={searchOpen} onClose={() => setSearchOpen(false)} entries={searchEntries} />
      {trackOrder && (
        <LiveTrackingModal
          order={trackOrder}
          role="customer"
          viewerId={profile.id}
          onClose={() => setTrackOrder(null)}
        />
      )}
      <FloatingUtilities
        onOpenContact={() => setTab("chat")}
        onOpenSearch={() => setSearchOpen(true)}
      />
    </div>
  );
}
