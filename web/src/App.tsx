import { useEffect, useState } from "react";
import { ToastHost } from "./components/Toast";
import { getProfile, onAuthChange, type Profile } from "./lib/firebase-web";
import AdminDashboardShell from "./pages/admin/AdminDashboardShell";
import AuthPage from "./pages/AuthPage";
import CustomerPortal from "./pages/customer/CustomerPortal";
import StaffDashboard from "./pages/staff/StaffDashboard";

export default function App() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [portalView, setPortalView] = useState<"admin" | "staff" | "customer">("customer");

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
          setPortalView(prof.role === "admin" ? "admin" : prof.role === "staff" ? "staff" : "customer");
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
      } catch {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#F9F0DC",
          gap: 12,
        }}
      >
        <img src="/logo.png" alt="FoodFix" style={{ width: 64, height: 64, borderRadius: 16 }} />
        <strong style={{ color: "#F25C05", fontSize: 16 }}>Loading FoodFix Web Console...</strong>
      </div>
    );
  }

  return (
    <>
      {!profile ? (
        <AuthPage />
      ) : portalView === "admin" && profile.is_admin ? (
        <AdminDashboardShell
          profile={profile}
          onSwitchCustomer={() => setPortalView("customer")}
          onSwitchStaff={() => setPortalView("staff")}
        />
      ) : portalView === "staff" && (profile.role === "staff" || profile.is_admin) ? (
        <StaffDashboard
          profile={profile}
          onSwitchCustomer={() => setPortalView("customer")}
          onBackAdmin={profile.is_admin ? () => setPortalView("admin") : undefined}
        />
      ) : (
        <CustomerPortal
          profile={profile}
          onBackAdmin={profile.is_admin ? () => setPortalView("admin") : undefined}
        />
      )}
      <ToastHost />
    </>
  );
}
