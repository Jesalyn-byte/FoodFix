import { Eye, EyeOff, KeyRound, Lock, Mail, ShieldCheck, Sparkles, Store, Truck, User } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "../components/Toast";
import { resetPassword, signIn, signUp } from "../lib/firebase-web";

interface Props {
  onSuccess?: () => void;
}

export default function AuthPage({ onSuccess }: Props) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const [forgotOpen, setForgotOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("Please enter both email and password.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signin") {
        await signIn(email, password);
        toast.success("Welcome back to FoodFix!");
      } else {
        if (!username.trim()) {
          toast.error("Please enter your full name or username.");
          setLoading(false);
          return;
        }
        await signUp(email, password, username);
        toast.success("Account created! Welcome to FoodFix!");
      }
      onSuccess?.();
    } catch (err: any) {
      toast.error(err?.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  async function quickLogin(demoEmail: string, demoPassword: string, label: string) {
    setLoading(true);
    try {
      await signIn(demoEmail, demoPassword);
      toast.success(`Signed in as ${label}`);
      onSuccess?.();
    } catch (err: any) {
      toast.error(err?.message || `Failed to sign in as ${label}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e: FormEvent) {
    e.preventDefault();
    if (!resetEmail.trim()) {
      toast.error("Enter your email address.");
      return;
    }
    setResetLoading(true);
    try {
      await resetPassword(resetEmail);
      setResetSent(true);
    } catch (err: any) {
      toast.error(err?.message || "Failed to send reset link.");
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #F9F0DC 0%, #FDF5E0 55%, #FFE8D1 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "28px 20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 980,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 28,
          alignItems: "center",
        }}
      >
        {/* Left Branding Showcase matching Mobile App Identity */}
        <div style={{ padding: "10px 8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 18 }}>
            <img
              src="/logo.png"
              alt="FoodFix Logo"
              style={{
                width: 82,
                height: 82,
                borderRadius: 20,
                objectFit: "contain",
                background: "#fff",
                padding: 6,
                boxShadow: "0 8px 20px rgba(46,26,6,0.1)",
              }}
            />
            <div>
              <div
                style={{
                  fontSize: 34,
                  fontWeight: 800,
                  color: "#F25C05",
                  letterSpacing: 0.5,
                  lineHeight: 1.05,
                }}
              >
                FOODFIX
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#6D4C41",
                  letterSpacing: 1.4,
                  marginTop: 4,
                }}
              >
                DERICK&apos;S FOOD HOUSE · WEB PORTAL
              </div>
            </div>
          </div>

          <h1
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: "#2E1A06",
              lineHeight: 1.25,
              margin: "0 0 12px",
            }}
          >
            Authentic Filipino Food Ordering &amp; Lamion AI Culinary Console
          </h1>
          <p style={{ fontSize: 14.5, color: "#6D4C41", lineHeight: 1.65, marginBottom: 22 }}>
            Manage real-time kitchen &amp; delivery workflows, GCash payment verifications, inventory
            adjustments, and interact with Lamion AI — seamlessly synced with the FoodFix mobile
            app via Cloud Firestore.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div
              className="ff-card"
              style={{ padding: 14, borderRadius: 16, background: "rgba(255,255,255,0.85)" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <Sparkles size={16} color="#F25C05" />
                <strong style={{ fontSize: 13 }}>Lamion AI 70B</strong>
              </div>
              <div style={{ fontSize: 12, color: "#6D4C41" }}>
                Filipino gastronomy assistant with domain &amp; prompt-injection guardrails
              </div>
            </div>
            <div
              className="ff-card"
              style={{ padding: 14, borderRadius: 16, background: "rgba(255,255,255,0.85)" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <ShieldCheck size={16} color="#27AE60" />
                <strong style={{ fontSize: 13 }}>1:1 Real-Time Sync</strong>
              </div>
              <div style={{ fontSize: 12, color: "#6D4C41" }}>
                Identical orders, menu, chat &amp; sequential receipts as the Android app
              </div>
            </div>
          </div>
        </div>

        {/* Right Sign-In / Sign-Up Card */}
        <div className="ff-card" style={{ borderRadius: 26, padding: 30 }}>
          <div
            style={{
              display: "flex",
              background: "#FDF5E0",
              borderRadius: 14,
              padding: 4,
              marginBottom: 22,
            }}
          >
            <button
              type="button"
              onClick={() => setMode("signin")}
              className="ff-btn"
              style={{
                flex: 1,
                borderRadius: 11,
                background: mode === "signin" ? "#F25C05" : "transparent",
                color: mode === "signin" ? "#fff" : "#6D4C41",
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className="ff-btn"
              style={{
                flex: 1,
                borderRadius: 11,
                background: mode === "signup" ? "#F25C05" : "transparent",
                color: mode === "signup" ? "#fff" : "#6D4C41",
              }}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {mode === "signup" && (
              <div>
                <label style={{ fontSize: 12.5, fontWeight: 700, color: "#555", display: "block", marginBottom: 6 }}>
                  Full Name
                </label>
                <div style={{ position: "relative" }}>
                  <User size={16} color="#8C7A6B" style={{ position: "absolute", left: 13, top: 13 }} />
                  <input
                    className="ff-input"
                    style={{ paddingLeft: 38 }}
                    placeholder="Juan Dela Cruz"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div>
              <label style={{ fontSize: 12.5, fontWeight: 700, color: "#555", display: "block", marginBottom: 6 }}>
                Email Address
              </label>
              <div style={{ position: "relative" }}>
                <Mail size={16} color="#8C7A6B" style={{ position: "absolute", left: 13, top: 13 }} />
                <input
                  type="email"
                  className="ff-input"
                  style={{ paddingLeft: 38 }}
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12.5, fontWeight: 700, color: "#555", display: "block", marginBottom: 6 }}>
                Password
              </label>
              <div style={{ position: "relative" }}>
                <Lock size={16} color="#8C7A6B" style={{ position: "absolute", left: 13, top: 13 }} />
                <input
                  type={showPass ? "text" : "password"}
                  className="ff-input"
                  style={{ paddingLeft: 38, paddingRight: 42 }}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{
                    position: "absolute",
                    right: 10,
                    top: 10,
                    background: "transparent",
                    border: "none",
                    color: "#8C7A6B",
                  }}
                >
                  {showPass ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
              </div>
            </div>

            {mode === "signin" && (
              <div style={{ textAlign: "right" }}>
                <button
                  type="button"
                  onClick={() => {
                    setResetEmail(email);
                    setResetSent(false);
                    setForgotOpen(true);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#F25C05",
                    fontSize: 12.5,
                    fontWeight: 700,
                  }}
                >
                  Forgot password?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="ff-btn ff-btn-primary ff-btn-pill"
              style={{ height: 48, fontSize: 15, marginTop: 4 }}
            >
              {loading ? "Signing in..." : mode === "signin" ? "Sign In" : "Create Account"}
            </button>
          </form>

          {/* Thesis Defense 1-Click Demo Role Access */}
          <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px dashed #E8D9C0" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#8C7A6B", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 10, textAlign: "center" }}>
              Quick Demo Access (Defense Mode)
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              <button
                type="button"
                disabled={loading}
                onClick={() => quickLogin("admin@foodfix.com", "admin12345", "Admin Owner")}
                className="ff-btn ff-btn-soft"
                style={{ fontSize: 12, padding: "8px 6px" }}
              >
                <ShieldCheck size={14} /> Admin
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => quickLogin("staff@foodfix.com", "staff12345", "Staff / Rider")}
                className="ff-btn ff-btn-outline"
                style={{ fontSize: 12, padding: "8px 6px", color: "#2980B9" }}
              >
                <Truck size={14} /> Staff
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => quickLogin("customer@foodfix.com", "password123", "Customer")}
                className="ff-btn ff-btn-outline"
                style={{ fontSize: 12, padding: "8px 6px", color: "#27AE60" }}
              >
                <Store size={14} /> Customer
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {forgotOpen && (
        <div className="ff-modal-overlay" onClick={() => setForgotOpen(false)}>
          <div className="ff-modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <div
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: 18,
                  background: "#FFF0E6",
                  color: "#F25C05",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 12,
                }}
              >
                <KeyRound size={28} />
              </div>
              <h3 style={{ margin: "0 0 6px", fontSize: 20 }}>
                {resetSent ? "Check Your Email" : "Forgot Password?"}
              </h3>
              <p style={{ margin: 0, fontSize: 13, color: "#6D4C41" }}>
                {resetSent
                  ? `Password reset link sent to ${resetEmail}`
                  : "Enter your email and we will send a password reset link."}
              </p>
            </div>

            {!resetSent ? (
              <form onSubmit={handleReset} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <input
                  type="email"
                  className="ff-input"
                  placeholder="your@email.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                />
                <button type="submit" disabled={resetLoading} className="ff-btn ff-btn-primary ff-btn-pill">
                  {resetLoading ? "Sending..." : "Send Reset Link"}
                </button>
                <button type="button" onClick={() => setForgotOpen(false)} className="ff-btn ff-btn-outline">
                  Cancel
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setForgotOpen(false)}
                className="ff-btn ff-btn-primary ff-btn-pill"
                style={{ width: "100%" }}
              >
                Back to Sign In
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
