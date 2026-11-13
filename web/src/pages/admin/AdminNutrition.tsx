import { BookOpen, Download, Search, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "../../components/Toast";
import {
  formatTimeAgo,
  getLamionAiLogs,
  getLamionRagKnowledge,
  type LamionAiLog,
  type LamionRagKnowledge,
} from "../../lib/store-web";

export default function AdminNutrition() {
  const [tab, setTab] = useState<"knowledge" | "logs">("knowledge");
  const [knowledge, setKnowledge] = useState<LamionRagKnowledge[]>([]);
  const [logs, setLogs] = useState<LamionAiLog[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getLamionRagKnowledge(), getLamionAiLogs()])
      .then(([kb, l]) => {
        setKnowledge(kb);
        setLogs(l);
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredKb = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return knowledge;
    return knowledge.filter(
      (k) =>
        k.name?.toLowerCase().includes(q) ||
        k.region?.toLowerCase().includes(q) ||
        k.category?.toLowerCase().includes(q),
    );
  }, [knowledge, search]);

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return logs;
    return logs.filter(
      (l) =>
        l.user_query?.toLowerCase().includes(q) ||
        l.guardrail_check?.toLowerCase().includes(q),
    );
  }, [logs, search]);

  function exportCsv() {
    const rows =
      tab === "knowledge"
        ? [
            ["Name", "Region", "Category", "Calories", "Protein", "Carbs", "Fat"],
            ...filteredKb.map((k) => [
              k.name,
              k.region || "",
              k.category || "",
              k.nutrition?.calories || "",
              k.nutrition?.protein_g || "",
              k.nutrition?.carbs_g || "",
              k.nutrition?.fat_g || "",
            ]),
          ]
        : [
            ["Query", "Guardrail", "Model", "Latency(ms)"],
            ...filteredLogs.map((l) => [
              l.user_query,
              l.guardrail_check,
              l.model_used,
              l.latency_ms || 0,
            ]),
          ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = tab === "knowledge" ? "lamion-rag-knowledge.csv" : "lamion-ai-logs.csv";
    a.click();
    toast.success("CSV exported!");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div className="ff-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            className="ff-btn ff-btn-pill"
            style={{
              background: tab === "knowledge" ? "#F25C05" : "#FDF5E0",
              color: tab === "knowledge" ? "#fff" : "#6D4C41",
            }}
            onClick={() => setTab("knowledge")}
          >
            <BookOpen size={15} /> RAG Knowledge ({knowledge.length})
          </button>
          <button
            type="button"
            className="ff-btn ff-btn-pill"
            style={{
              background: tab === "logs" ? "#F25C05" : "#FDF5E0",
              color: tab === "logs" ? "#fff" : "#6D4C41",
            }}
            onClick={() => setTab("logs")}
          >
            <ShieldCheck size={15} /> AI Audit Logs ({logs.length})
          </button>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flex: 1, maxWidth: 420 }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search size={15} color="#8C7A6B" style={{ position: "absolute", left: 12, top: 12 }} />
            <input
              className="ff-input"
              style={{ paddingLeft: 36 }}
              placeholder={tab === "knowledge" ? "Search Filipino dishes..." : "Search AI logs..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button type="button" className="ff-btn ff-btn-outline" onClick={exportCsv}>
            <Download size={14} /> CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="ff-card" style={{ textAlign: "center", padding: 40 }}>Loading Lamion AI data...</div>
      ) : tab === "knowledge" ? (
        <div className="ff-grid-3">
          {filteredKb.map((k) => (
            <div key={k.id} className="ff-card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <strong style={{ fontSize: 15 }}>{k.name}</strong>
                {k.region && (
                  <span className="ff-badge" style={{ background: "#FFF0E6", color: "#F25C05" }}>
                    {k.region}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: "#6D4C41" }}>{k.description}</div>
              {k.nutrition && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                  {k.nutrition.calories != null && (
                    <span className="ff-badge" style={{ background: "#FDF5E0" }}>{k.nutrition.calories} kcal</span>
                  )}
                  {k.nutrition.protein_g != null && (
                    <span className="ff-badge" style={{ background: "#EAF9F0", color: "#1E8449" }}>
                      {k.nutrition.protein_g}g protein
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="ff-card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="ff-table-wrap">
            <table className="ff-table">
              <thead>
                <tr>
                  <th>Query</th>
                  <th>Guardrail Verdict</th>
                  <th>Model</th>
                  <th>Latency</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.slice(0, 60).map((l) => {
                  const passed = l.guardrail_check === "PASSED_CULINARY_DOMAIN";
                  return (
                    <tr key={l.id}>
                      <td style={{ maxWidth: 340 }}>
                        <strong>{l.user_query}</strong>
                        <div style={{ fontSize: 11.5, color: "#8C7A6B", marginTop: 2 }}>
                          {(l.ai_response || "").slice(0, 110)}...
                        </div>
                      </td>
                      <td>
                        <span
                          className="ff-badge"
                          style={{
                            background: passed ? "#EAF9F0" : "#FDEDEC",
                            color: passed ? "#1E8449" : "#C0392B",
                          }}
                        >
                          {l.guardrail_check}
                        </span>
                      </td>
                      <td>{l.model_used}</td>
                      <td>{l.latency_ms ? `${l.latency_ms}ms` : "-"}</td>
                      <td style={{ color: "#8C7A6B" }}>{formatTimeAgo(l.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
