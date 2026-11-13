import {
  ArrowLeft,
  ArrowUp,
  Check,
  ChevronDown,
  Clock,
  Cookie,
  Copy,
  ExternalLink,
  HelpCircle,
  Loader2,
  Mail,
  MessageCircle,
  Moon,
  Printer,
  Search,
  Send,
  Sun,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "./Toast";

/* ==================== OUTBOUND UTM HELPER ==================== */

export function withUtm(url: string, content = "web_portal"): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set("utm_source", "foodfix_web");
    parsed.searchParams.set("utm_medium", "referral");
    parsed.searchParams.set("utm_campaign", "thesis_defense");
    parsed.searchParams.set("utm_content", content);
    return parsed.toString();
  } catch {
    return url;
  }
}

/* ==================== SKIP LINK & SCROLL BAR ==================== */

export function SkipToContentLink() {
  return (
    <a href="#main-content" className="ff-skip-link">
      Skip to main content
    </a>
  );
}

export function ScrollProgressBar() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    function onScroll() {
      const doc = document.documentElement;
      const scrollTop = window.scrollY || doc.scrollTop;
      const max = Math.max(1, doc.scrollHeight - window.innerHeight);
      setProgress(Math.min(100, Math.round((scrollTop / max) * 100)));
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return <div className="ff-scroll-progress" style={{ width: `${progress}%` }} aria-hidden="true" />;
}

/* ==================== THEME & PRINT TOOLBAR CONTROLS ==================== */

export function ThemeToggleButton({
  dark,
  onToggle,
}: {
  dark: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className="ff-icon-btn ff-no-print"
      onClick={onToggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Switch to Light Mode" : "Switch to Dark Mode"}
    >
      {dark ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}

export function PrintButton({ label = "Print" }: { label?: string }) {
  return (
    <button
      type="button"
      className="ff-btn ff-btn-outline ff-no-print"
      onClick={() => window.print()}
      title="Print current view"
    >
      <Printer size={15} /> {label}
    </button>
  );
}

/* ==================== SVG LOADING ANIMATION ==================== */

export function SvgLoader({ text = "Loading..." }: { text?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 36, gap: 10 }}>
      <Loader2 size={28} color="#F25C05" className="ff-spin" />
      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ff-espresso-muted)" }}>{text}</span>
    </div>
  );
}

/* ==================== COPY-TO-CLIPBOARD CODE SNIPPET ==================== */

export function CodeSnippetBox({ title, code }: { title?: string; code: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("Copied snippet to clipboard");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Clipboard access unavailable");
    }
  }

  return (
    <div
      style={{
        background: "#1B130C",
        color: "#F9F0DC",
        borderRadius: 14,
        border: "1px solid #3A2A1E",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 12px",
          background: "#261B12",
          borderBottom: "1px solid #3A2A1E",
          fontSize: 11.5,
          fontWeight: 700,
          color: "#F39C12",
        }}
      >
        <span>{title || "Snippet"}</span>
        <button
          type="button"
          onClick={handleCopy}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            border: "1px solid #4B3728",
            background: copied ? "#27AE60" : "transparent",
            color: "#fff",
            borderRadius: 8,
            padding: "4px 9px",
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre
        style={{
          margin: 0,
          padding: 12,
          fontSize: 12,
          lineHeight: 1.5,
          overflowX: "auto",
          fontFamily: "Consolas, Monaco, monospace",
        }}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}

/* ==================== EXPANDABLE FAQ SECTION ==================== */

export const FOODFIX_FAQS = [
  {
    q: "How does Lamion AI stay focused on Filipino food?",
    a: "Lamion AI enforces pre-flight domain filtering, rate limiting, and post-generation output sanitization so off-topic or prompt-injection attempts are rejected while authentic culinary answers return safely.",
    updatedAt: "Updated Nov 13, 2026",
  },
  {
    q: "Are web orders synced with the Android mobile app?",
    a: "Yes. Both apps read and write to the exact same Cloud Firestore collections and atomic order counter (counters/order_number), producing identical sequential order numbers and real-time kitchen updates.",
    updatedAt: "Updated Nov 13, 2026",
  },
  {
    q: "How does GCash payment verification work?",
    a: "After a customer confirms GCash checkout, the Admin Overview displays a Verify Paid alert backed by real-time notifications and support chat fallback.",
    updatedAt: "Updated Nov 12, 2026",
  },
  {
    q: "How can we inspect AI telemetry or export logs for defense?",
    a: "Open Admin Console -> Lamion AI & Nutrition -> AI Audit Logs to inspect latency, guardrail verdicts, and download CSV reports.",
    updatedAt: "Updated Nov 12, 2026",
  },
];

export function FaqSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section className="ff-card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <HelpCircle size={18} color="#F25C05" />
          <h3 style={{ margin: 0, fontSize: 16 }}>Frequently Asked Questions</h3>
        </div>
        <span className="ff-timestamp">
          <Clock size={12} /> Updated Nov 13, 2026
        </span>
      </div>

      {FOODFIX_FAQS.map((item, idx) => {
        const isOpen = openIdx === idx;
        return (
          <div
            key={item.q}
            style={{
              border: "1px solid var(--ff-border)",
              borderRadius: 14,
              background: "var(--ff-cream-card)",
              overflow: "hidden",
            }}
          >
            <button
              type="button"
              onClick={() => setOpenIdx(isOpen ? null : idx)}
              style={{
                width: "100%",
                padding: "12px 14px",
                border: "none",
                background: "transparent",
                color: "var(--ff-espresso)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                textAlign: "left",
                fontWeight: 700,
                fontSize: 13.5,
                gap: 10,
              }}
            >
              <span>{item.q}</span>
              <ChevronDown
                size={16}
                style={{
                  transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.18s ease",
                  flexShrink: 0,
                }}
              />
            </button>
            {isOpen && (
              <div style={{ padding: "0 14px 14px", fontSize: 13, color: "var(--ff-espresso-muted)", lineHeight: 1.55 }}>
                <p style={{ margin: "0 0 6px" }}>{item.a}</p>
                <span className="ff-timestamp">
                  <Clock size={11} /> {item.updatedAt}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}

/* ==================== NEWSLETTER SIGNUP WITH SUCCESS STATE ==================== */

export function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  function handleSubscribe(e: FormEvent) {
    e.preventDefault();
    if (!/\S+@\S+\.\S+/.test(email.trim())) {
      toast.error("Please enter a valid email address.");
      return;
    }
    setSubscribed(true);
    toast.success("Subscribed to FoodFix weekly specials!");
  }

  return (
    <div className="ff-card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Mail size={18} color="#F25C05" />
          <strong style={{ fontSize: 15 }}>Daily Specials &amp; Lamion Recipe Updates</strong>
        </div>
        <span className="ff-timestamp">
          <Clock size={12} /> Updated Nov 13, 2026
        </span>
      </div>

      {subscribed ? (
        <div
          style={{
            background: "rgba(39, 174, 96, 0.12)",
            border: "1px solid rgba(39, 174, 96, 0.35)",
            borderRadius: 12,
            padding: "12px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            color: "#27AE60",
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <Check size={16} /> Confirmed! Weekly menu highlights will be sent to {email}.
          </span>
          <button
            type="button"
            className="ff-btn ff-btn-outline"
            style={{ padding: "5px 10px", fontSize: 12 }}
            onClick={() => {
              setSubscribed(false);
              setEmail("");
            }}
          >
            Update
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubscribe} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            type="email"
            className="ff-input"
            style={{ flex: 1, minWidth: 220 }}
            placeholder="Enter your email for Filipino menu promos..."
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="submit" className="ff-btn ff-btn-primary ff-btn-pill">
            Subscribe
          </button>
        </form>
      )}
    </div>
  );
}

/* ==================== GLOBAL SITE SEARCH MODAL ==================== */

export interface SearchEntry {
  id: string;
  category: string;
  title: string;
  subtitle: string;
  onSelect: () => void;
}

export function GlobalSearchModal({
  open,
  onClose,
  entries,
}: {
  open: boolean;
  onClose: () => void;
  entries: SearchEntry[];
}) {
  const [queryText, setQueryText] = useState("");

  useEffect(() => {
    if (!open) setQueryText("");
  }, [open]);

  if (!open) return null;

  const q = queryText.trim().toLowerCase();
  const matches = q
    ? entries.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.subtitle.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q),
      )
    : entries.slice(0, 8);

  return (
    <div className="ff-modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="ff-modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <Search size={18} color="#F25C05" />
          <input
            autoFocus
            className="ff-input"
            placeholder="Search pages, orders, dishes, FAQs..."
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
          />
          <button type="button" className="ff-icon-btn" onClick={onClose} aria-label="Close search">
            <X size={16} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 360, overflowY: "auto" }}>
          {matches.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--ff-gray)", fontSize: 13 }}>
              No matching pages, orders, or menu items.
            </div>
          ) : (
            matches.slice(0, 14).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  item.onSelect();
                  onClose();
                }}
                className="ff-btn ff-btn-outline"
                style={{ justifyContent: "space-between", textAlign: "left", padding: "10px 14px" }}
              >
                <div>
                  <strong style={{ display: "block", fontSize: 13.5 }}>{item.title}</strong>
                  <span style={{ fontSize: 11.5, color: "var(--ff-gray)" }}>{item.subtitle}</span>
                </div>
                <span className="ff-badge" style={{ background: "var(--ff-orange-tint)", color: "var(--ff-orange)" }}>
                  {item.category}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* ==================== FLOATING CONTACT + SCROLL TOP + COOKIE BANNER ==================== */

export function FloatingUtilities({
  onOpenContact,
  onOpenSearch,
}: {
  onOpenContact?: () => void;
  onOpenSearch?: () => void;
}) {
  const [showTop, setShowTop] = useState(false);
  const [cookieChoice, setCookieChoice] = useState<string | null>(() => {
    try {
      return localStorage.getItem("@foodfix_cookie_consent");
    } catch {
      return null;
    }
  });
  const [contactOpen, setContactOpen] = useState(false);
  const [contactMsg, setContactMsg] = useState("");
  const [contactSent, setContactSent] = useState(false);

  useEffect(() => {
    function onScroll() {
      setShowTop(window.scrollY > 220);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <div className="ff-floating-dock ff-no-print">
        {showTop && (
          <button
            type="button"
            className="ff-btn ff-btn-outline ff-btn-pill"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label="Scroll back to top"
          >
            <ArrowUp size={16} /> Top
          </button>
        )}

        <button
          type="button"
          className="ff-btn ff-btn-primary ff-btn-pill"
          style={{ boxShadow: "0 8px 22px rgba(242,92,5,0.34)" }}
          onClick={() => {
            if (onOpenContact) {
              onOpenContact();
            } else {
              setContactSent(false);
              setContactOpen(true);
            }
          }}
        >
          <MessageCircle size={17} /> Contact Support
        </button>
      </div>

      {!cookieChoice && (
        <div className="ff-cookie-banner ff-no-print" role="region" aria-label="Cookie preference">
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
            <Cookie size={20} color="#F25C05" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong style={{ fontSize: 13.5 }}>Essential Cookies &amp; Session Storage</strong>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--ff-espresso-muted)", lineHeight: 1.45 }}>
                FoodFix uses local storage for your cart, dark mode theme, and Firebase session.
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              type="button"
              className="ff-btn ff-btn-outline"
              style={{ fontSize: 12, padding: "6px 12px" }}
              onClick={() => {
                localStorage.setItem("@foodfix_cookie_consent", "essential");
                setCookieChoice("essential");
              }}
            >
              Essential Only
            </button>
            <button
              type="button"
              className="ff-btn ff-btn-primary"
              style={{ fontSize: 12, padding: "6px 12px" }}
              onClick={() => {
                localStorage.setItem("@foodfix_cookie_consent", "accepted");
                setCookieChoice("accepted");
              }}
            >
              Accept
            </button>
          </div>
        </div>
      )}

      {contactOpen && (
        <div className="ff-modal-overlay" onClick={() => setContactOpen(false)}>
          <div className="ff-modal" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <strong style={{ fontSize: 17 }}>Derick&apos;s Food House Support</strong>
              <button type="button" className="ff-icon-btn" onClick={() => setContactOpen(false)}>
                <X size={16} />
              </button>
            </div>

            {contactSent ? (
              <div style={{ textAlign: "center", padding: "18px 8px" }}>
                <Check size={36} color="#27AE60" />
                <p style={{ fontWeight: 700, marginTop: 8 }}>Inquiry logged! Sign in to chat live with store support.</p>
                <button type="button" className="ff-btn ff-btn-primary ff-btn-pill" onClick={() => setContactOpen(false)}>
                  Close
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!contactMsg.trim()) return;
                  setContactSent(true);
                  toast.success("Message received!");
                }}
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                <p style={{ margin: 0, fontSize: 13, color: "var(--ff-espresso-muted)" }}>
                  Need assistance with an order, GCash verification, or technical demo?
                </p>
                <textarea
                  className="ff-textarea"
                  rows={3}
                  placeholder="Write your question..."
                  value={contactMsg}
                  onChange={(e) => setContactMsg(e.target.value)}
                />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <a
                    href={withUtm("https://github.com/Jesalyn-byte/FoodFix", "contact_modal")}
                    target="_blank"
                    rel="noreferrer"
                    className="ff-btn ff-btn-outline"
                    style={{ fontSize: 12 }}
                  >
                    <ExternalLink size={14} /> Project Docs
                  </a>
                  {onOpenSearch && (
                    <button
                      type="button"
                      className="ff-btn ff-btn-soft"
                      style={{ fontSize: 12 }}
                      onClick={() => {
                        setContactOpen(false);
                        onOpenSearch();
                      }}
                    >
                      <Search size={14} /> Search Site
                    </button>
                  )}
                  <button type="submit" className="ff-btn ff-btn-primary">
                    <Send size={14} /> Send
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/* ==================== 404 PAGE THAT DOESN'T LOOK ABANDONED ==================== */

export function NotFoundPage({
  onGoHome,
  onOpenSearch,
}: {
  onGoHome: () => void;
  onOpenSearch?: () => void;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--ff-cream)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div className="ff-card" style={{ maxWidth: 540, width: "100%", textAlign: "center", padding: 36 }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 22,
            background: "var(--ff-orange-tint)",
            color: "var(--ff-orange)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          <UtensilsCrossed size={34} />
        </div>
        <div style={{ fontSize: 13, fontWeight: 800, color: "var(--ff-orange)", letterSpacing: 1 }}>
          ERROR 404
        </div>
        <h1 style={{ margin: "6px 0 10px", fontSize: 26 }}>We could not find that table</h1>
        <p style={{ margin: "0 0 22px", fontSize: 14, color: "var(--ff-espresso-muted)", lineHeight: 1.6 }}>
          The route you requested is missing or was moved. Jump back to the FoodFix Web Portal or
          search for a dish, order, or help section below.
        </p>

        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginBottom: 20 }}>
          <button type="button" className="ff-btn ff-btn-primary ff-btn-pill" onClick={onGoHome}>
            <ArrowLeft size={16} /> Return to FoodFix Home
          </button>
          {onOpenSearch && (
            <button type="button" className="ff-btn ff-btn-outline ff-btn-pill" onClick={onOpenSearch}>
              <Search size={16} /> Search Site
            </button>
          )}
        </div>

        <FaqSection />
      </div>
    </div>
  );
}

