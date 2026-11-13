import {
  BookOpen,
  ExternalLink,
  Images,
  LayoutDashboard,
  LogOut,
  Menu as MenuIcon,
  MessageSquare,
  Receipt,
  Search,
  Settings,
  ShieldCheck,
  Star,
  Store,
  Truck,
  Utensils,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  FloatingUtilities,
  GlobalSearchModal,
  PrintButton,
  ThemeToggleButton,
  withUtm,
  type SearchEntry,
} from "../../components/SiteChrome";
import { logOut, type Profile } from "../../lib/firebase-web";
import AdminBanners from "./AdminBanners";
import AdminMenu from "./AdminMenu";
import AdminMessages from "./AdminMessages";
import AdminNutrition from "./AdminNutrition";
import AdminOrders from "./AdminOrders";
import AdminOverview from "./AdminOverview";
import AdminReviews from "./AdminReviews";
import AdminSettingsUsers from "./AdminSettingsUsers";

const ADMIN_TABS = [
  { key: "overview", label: "Dashboard", icon: LayoutDashboard },
  { key: "orders", label: "Orders", icon: Receipt },
  { key: "menu", label: "Menu & Stock", icon: Utensils },
  { key: "messages", label: "Support Messages", icon: MessageSquare },
  { key: "banners", label: "Banners", icon: Images },
  { key: "reviews", label: "Customer Reviews", icon: Star },
  { key: "nutrition", label: "Lamion AI & Nutrition", icon: BookOpen },
  { key: "users", label: "Users & Settings", icon: Settings },
] as const;

type AdminTabKey = (typeof ADMIN_TABS)[number]["key"];

interface Props {
  profile: Profile;
  dark: boolean;
  onToggleDark: () => void;
  onSwitchCustomer: () => void;
  onSwitchStaff: () => void;
  onTrigger404?: () => void;
}

export default function AdminDashboardShell({
  profile,
  dark,
  onToggleDark,
  onSwitchCustomer,
  onSwitchStaff,
  onTrigger404,
}: Props) {
  const [activeTab, setActiveTab] = useState<AdminTabKey>("overview");
  const [ordersFilter, setOrdersFilter] = useState<string>("all");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const currentTabMeta = ADMIN_TABS.find((t) => t.key === activeTab) || ADMIN_TABS[0];

  function handleNavigate(tab: string, filter?: string) {
    if (tab === "orders" && filter) {
      setOrdersFilter(filter);
    }
    setActiveTab(tab as AdminTabKey);
    setSidebarOpen(false);
  }

  const searchEntries: SearchEntry[] = useMemo(
    () => [
      ...ADMIN_TABS.map((t) => ({
        id: `tab_${t.key}`,
        category: "Admin Page",
        title: t.label,
        subtitle: `Open ${t.label} section`,
        onSelect: () => handleNavigate(t.key),
      })),
      {
        id: "filter_gcash",
        category: "Action",
        title: "Verify Pending GCash Payments",
        subtitle: "Jump to Orders awaiting verification",
        onSelect: () => handleNavigate("orders", "placed"),
      },
      {
        id: "switch_staff",
        category: "Portal",
        title: "Staff & Rider Queue",
        subtitle: "Switch into the active kitchen & delivery workflow",
        onSelect: onSwitchStaff,
      },
      {
        id: "switch_customer",
        category: "Portal",
        title: "Customer Storefront",
        subtitle: "Preview how customers order and chat with Lamion AI",
        onSelect: onSwitchCustomer,
      },
    ],
    [onSwitchCustomer, onSwitchStaff],
  );

  return (
    <div className="ff-shell">
      <div
        className={`ff-sidebar-backdrop ${sidebarOpen ? "open" : ""}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* Left White FoodFix Sidebar */}
      <aside className={`ff-sidebar ff-no-print ${sidebarOpen ? "open" : ""}`}>
        <div>
          <div className="ff-brand">
            <img src="/logo.png" alt="FoodFix" />
            <div>
              <div className="ff-brand-title">FOODFIX</div>
              <div className="ff-brand-sub">ADMIN WEB CONSOLE</div>
            </div>
          </div>

          <div className="ff-nav-section-label">MANAGEMENT</div>
          <div className="ff-nav-list">
            {ADMIN_TABS.map((t) => {
              const Icon = t.icon;
              const isActive = activeTab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  className={`ff-nav-btn ${isActive ? "active" : ""}`}
                  onClick={() => handleNavigate(t.key, t.key === "orders" ? "all" : undefined)}
                >
                  <span className="ff-nav-btn-left">
                    <Icon size={18} />
                    {t.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="ff-sidebar-footer">
          <div className="ff-nav-section-label" style={{ paddingTop: 4 }}>
            QUICK VIEW PORTALS
          </div>
          <button type="button" className="ff-btn ff-btn-soft" onClick={onSwitchCustomer}>
            <Store size={15} /> Customer Storefront
          </button>
          <button
            type="button"
            className="ff-btn ff-btn-outline"
            style={{ color: "#2980B9" }}
            onClick={onSwitchStaff}
          >
            <Truck size={15} /> Staff / Rider Queue
          </button>
          {onTrigger404 && (
            <button
              type="button"
              className="ff-btn ff-btn-outline"
              style={{ fontSize: 12 }}
              onClick={onTrigger404}
            >
              Test 404 Fallback
            </button>
          )}
          <a
            href={withUtm("https://console.firebase.google.com/", "admin_sidebar")}
            target="_blank"
            rel="noreferrer"
            className="ff-btn ff-btn-outline"
            style={{ fontSize: 12 }}
          >
            <ExternalLink size={14} /> Firebase Console
          </a>
          <button type="button" className="ff-btn ff-btn-danger-soft" onClick={() => logOut()}>
            <LogOut size={15} /> Log Out
          </button>
        </div>
      </aside>

      {/* Main Responsive Content Area */}
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
              <h2 className="ff-topbar-title">{currentTabMeta.label}</h2>
              <div className="ff-topbar-sub">
                Derick&apos;s Food House · {profile.username} ({profile.email})
              </div>
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
            <PrintButton />
            <ThemeToggleButton dark={dark} onToggle={onToggleDark} />
            <span className="ff-live-pill ff-no-print">
              <span className="ff-live-dot" /> Real-Time Sync
            </span>
            <span className="ff-badge ff-no-print" style={{ background: "#2E1A06", color: "#fff", padding: "7px 12px" }}>
              <ShieldCheck size={14} color="#F39C12" /> Owner / Admin
            </span>
          </div>
        </header>

        <main id="main-content" className="ff-content">
          {activeTab === "overview" && <AdminOverview onNavigate={handleNavigate} />}
          {activeTab === "orders" && <AdminOrders initialFilter={ordersFilter} />}
          {activeTab === "menu" && <AdminMenu />}
          {activeTab === "messages" && <AdminMessages />}
          {activeTab === "banners" && <AdminBanners />}
          {activeTab === "reviews" && <AdminReviews />}
          {activeTab === "nutrition" && <AdminNutrition />}
          {activeTab === "users" && <AdminSettingsUsers />}
        </main>
      </div>

      <GlobalSearchModal open={searchOpen} onClose={() => setSearchOpen(false)} entries={searchEntries} />
      <FloatingUtilities
        onOpenContact={() => handleNavigate("messages")}
        onOpenSearch={() => setSearchOpen(true)}
      />
    </div>
  );
}

