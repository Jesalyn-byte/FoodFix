import { useEffect, useState } from "react";
import {
  GlobalSearchModal,
  NotFoundPage,
  ScrollProgressBar,
  SkipToContentLink,
  SvgLoader,
  type SearchEntry,
} from "./components/SiteChrome";
import { toast, ToastHost } from "./components/Toast";
import { getProfile, onAuthChange, type Profile } from "./lib/firebase-web";
import AdminDashboardShell from "./pages/admin/AdminDashboardShell";
import AuthPage from "./pages/AuthPage";
import CustomerPortal from "./pages/customer/CustomerPortal";
import StaffDashboard from "./pages/staff/StaffDashboard";

const VALID_PATHS = new Set(["/", "/index.html", "/admin", "/staff", "/customer", "/login"]);

export default function App() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [portalView, setPortalView] = useState<"admin" | "staff" | "customer">("customer");
  const [dark, setDark] = useState<boolean>(() => {
    try {
      return localStorage.getItem("@foodfix_theme") === "dark";
    } catch {
      return false;
    }
  });
  const [route404, setRoute404] = useState<boolean>(() => {
    try {
      return !VALID_PATHS.has(window.location.pathname.toLowerCase());
    } catch {
      return false;
    }
  });
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    try {
      localStorage.setItem("@foodfix_theme", dark ? "dark" : "light");
    } catch {
      // ignore storage errors
    }
  }, [dark]);

  useEffect(() => {
    const unsub = onAuthChange(async (user) => {
      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }
      try {
        const prof = await getProfile(user.uid);
        if (prof) {
          setProfile(prof);
          setPortalView(
            prof.role === "admin" ? "admin" : prof.role === "staff" ? "staff" : "customer",
          );
        } else {
          setProfile({
            id: user.uid,
            email: user.email || "",
            username: user.displayName || "User",
            is_admin: false,
            role: "customer",
          });
          setPortalView("customer");
        }
      } catch (err: any) {
        toast.error(err?.message || "Loaded basic session (profile lookup warning).");
        setProfile({
          id: user.uid,
          email: user.email || "",
          username: user.displayName || "User",
          is_admin: false,
          role: "customer",
        });
        setPortalView("customer");
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const guestSearchEntries: SearchEntry[] = [
    {
      id: "home",
      category: "Portal",
      title: "Sign In / Create Account",
      subtitle: "Access Admin Console, Staff Queue, or Customer Storefront",
      onSelect: () => {
        window.history.replaceState(null, "", "/");
        setRoute404(false);
      },
    },
    {
      id: "faq",
      category: "Help",
      title: "Frequently Asked Questions",
      subtitle: "Lamion AI guardrails, Firestore sync, and GCash workflow",
      onSelect: () => {
        window.history.replaceState(null, "", "/");
        setRoute404(false);
        setTimeout(() => document.getElementById("foodfix-faq")?.scrollIntoView({ behavior: "smooth" }), 80);
      },
    },
  ];

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--ff-cream)",
          gap: 8,
        }}
      >
        <img src="/logo.png" alt="FoodFix" style={{ width: 64, height: 64, borderRadius: 16 }} />
        <SvgLoader text="Loading FoodFix Web Console..." />
      </div>
    );
  }

  return (
    <>
      <SkipToContentLink />
      <ScrollProgressBar />

      {route404 ? (
        <NotFoundPage
          onGoHome={() => {
            window.history.replaceState(null, "", "/");
            setRoute404(false);
          }}
          onOpenSearch={() => setGlobalSearchOpen(true)}
        />
      ) : !profile ? (
        <AuthPage
          dark={dark}
          onToggleDark={() => setDark((d) => !d)}
          onOpenSearch={() => setGlobalSearchOpen(true)}
          onTrigger404={() => setRoute404(true)}
        />
      ) : portalView === "admin" && profile.is_admin ? (
        <AdminDashboardShell
          profile={profile}
          dark={dark}
          onToggleDark={() => setDark((d) => !d)}
          onSwitchCustomer={() => setPortalView("customer")}
          onSwitchStaff={() => setPortalView("staff")}
          onTrigger404={() => setRoute404(true)}
        />
      ) : portalView === "staff" && (profile.role === "staff" || profile.is_admin) ? (
        <StaffDashboard
          profile={profile}
          dark={dark}
          onToggleDark={() => setDark((d) => !d)}
          onSwitchCustomer={() => setPortalView("customer")}
          onBackAdmin={profile.is_admin ? () => setPortalView("admin") : undefined}
        />
      ) : (
        <CustomerPortal
          profile={profile}
          dark={dark}
          onToggleDark={() => setDark((d) => !d)}
          onBackAdmin={profile.is_admin ? () => setPortalView("admin") : undefined}
        />
      )}

      <GlobalSearchModal
        open={globalSearchOpen}
        onClose={() => setGlobalSearchOpen(false)}
        entries={guestSearchEntries}
      />
      <ToastHost />
    </>
  );
}

