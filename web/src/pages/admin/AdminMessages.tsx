import { Archive, MessageSquare, Send, Trash2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import ConfirmModal from "../../components/ConfirmModal";
import { toast } from "../../components/Toast";
import { getCurrentUser } from "../../lib/firebase-web";
import {
  archiveConversation,
  deleteConversation,
  formatTimeAgo,
  getConversations,
  markMessagesRead,
  onMessagesUpdate,
  sendMessage,
  type Message,
} from "../../lib/store-web";

export default function AdminMessages() {
  const [showArchived, setShowArchived] = useState(false);
  const [convos, setConvos] = useState<
    { customer_id: string; customer_name: string; last_message: string; unread: number }[]
  >([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  async function refreshConvos() {
    const list = await getConversations(showArchived);
    setConvos(list);
    if (!selectedId && list.length > 0) {
      setSelectedId(list[0].customer_id);
    }
  }

  useEffect(() => {
    refreshConvos();
    const timer = setInterval(refreshConvos, 8000);
    return () => clearInterval(timer);
  }, [showArchived]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    markMessagesRead(selectedId, "admin").catch(() => {});
    const unsub = onMessagesUpdate(selectedId, (msgs) => {
      setMessages(msgs);
      markMessagesRead(selectedId, "admin").catch(() => {});
    });
    return () => unsub();
  }, [selectedId]);

  const activeConvo = convos.find((c) => c.customer_id === selectedId);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!selectedId || !reply.trim()) return;
    setSending(true);
    try {
      const user = getCurrentUser();
      await sendMessage({
        conversation_id: selectedId,
        sender_id: user?.uid || "admin",
        sender_name: "FoodFix Support",
        sender_role: "admin",
        content: reply.trim(),
      });
      setReply("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to send reply");
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className="ff-card"
      style={{
        padding: 0,
        overflow: "hidden",
        display: "grid",
        gridTemplateColumns: "310px 1fr",
        minHeight: 560,
      }}
    >
      {/* Left Conversation Thread List */}
      <div style={{ borderRight: "1px solid #F0E4CE", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: 14, borderBottom: "1px solid #F0E4CE", display: "flex", gap: 6 }}>
          <button
            type="button"
            className="ff-btn"
            style={{
              flex: 1,
              fontSize: 12,
              background: !showArchived ? "#F25C05" : "#FDF5E0",
              color: !showArchived ? "#fff" : "#6D4C41",
            }}
            onClick={() => {
              setSelectedId(null);
              setShowArchived(false);
            }}
          >
            Inbox
          </button>
          <button
            type="button"
            className="ff-btn"
            style={{
              flex: 1,
              fontSize: 12,
              background: showArchived ? "#F25C05" : "#FDF5E0",
              color: showArchived ? "#fff" : "#6D4C41",
            }}
            onClick={() => {
              setSelectedId(null);
              setShowArchived(true);
            }}
          >
            Archived
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {convos.length === 0 ? (
            <div style={{ padding: 28, textAlign: "center", fontSize: 13, color: "#8C7A6B" }}>
              No conversations in {showArchived ? "archive" : "inbox"}.
            </div>
          ) : (
            convos.map((c) => {
              const active = c.customer_id === selectedId;
              return (
                <button
                  key={c.customer_id}
                  type="button"
                  onClick={() => setSelectedId(c.customer_id)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "13px 16px",
                    border: "none",
                    borderBottom: "1px solid #F0E4CE",
                    background: active ? "#FFF0E6" : "#fff",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong style={{ fontSize: 13.5, color: "#2E1A06" }}>{c.customer_name}</strong>
                    {c.unread > 0 && (
                      <span className="ff-badge" style={{ background: "#F25C05", color: "#fff" }}>
                        {c.unread}
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#8C7A6B",
                      marginTop: 4,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {c.last_message}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right Active Conversation Stream */}
      <div style={{ display: "flex", flexDirection: "column", background: "#FFFDF9" }}>
        {activeConvo ? (
          <>
            <div
              style={{
                padding: "14px 18px",
                borderBottom: "1px solid #F0E4CE",
                background: "#fff",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <strong style={{ fontSize: 15 }}>{activeConvo.customer_name}</strong>
                <div style={{ fontSize: 11.5, color: "#8C7A6B" }}>
                  Customer ID: {activeConvo.customer_id}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  className="ff-btn ff-btn-outline"
                  onClick={async () => {
                    await archiveConversation(activeConvo.customer_id, !showArchived);
                    toast.info(showArchived ? "Restored to inbox" : "Archived conversation");
                    setSelectedId(null);
                    refreshConvos();
                  }}
                >
                  <Archive size={14} /> {showArchived ? "Unarchive" : "Archive"}
                </button>
                <button
                  type="button"
                  className="ff-btn ff-btn-danger-soft"
                  onClick={() =>
                    setConfirmDelete({
                      id: activeConvo.customer_id,
                      name: activeConvo.customer_name,
                    })
                  }
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <div style={{ flex: 1, padding: 18, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, maxHeight: 430 }}>
              {messages.map((m) => {
                const isAdmin = m.sender_role === "admin" || m.sender_role === "staff";
                return (
                  <div
                    key={m.id}
                    style={{
                      alignSelf: isAdmin ? "flex-end" : "flex-start",
                      maxWidth: "72%",
                      background: isAdmin ? "#F25C05" : "#fff",
                      color: isAdmin ? "#fff" : "#2E1A06",
                      border: isAdmin ? "none" : "1px solid #F0E4CE",
                      borderRadius: 16,
                      padding: "10px 14px",
                    }}
                  >
                    <div style={{ fontSize: 13.5, lineHeight: 1.45 }}>{m.content}</div>
                    <div
                      style={{
                        fontSize: 10.5,
                        marginTop: 4,
                        opacity: 0.78,
                        textAlign: isAdmin ? "right" : "left",
                      }}
                    >
                      {m.sender_name} · {formatTimeAgo(m.created_at)}
                    </div>
                  </div>
                );
              })}
            </div>

            <form
              onSubmit={handleSend}
              style={{
                padding: 14,
                borderTop: "1px solid #F0E4CE",
                background: "#fff",
                display: "flex",
                gap: 10,
              }}
            >
              <input
                className="ff-input"
                placeholder="Type a reply to customer..."
                value={reply}
                onChange={(e) => setReply(e.target.value)}
              />
              <button type="submit" disabled={sending} className="ff-btn ff-btn-primary">
                <Send size={15} /> Send
              </button>
            </form>
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--ff-gray)" }}>
            <MessageSquare size={34} />
            <p>Select a customer conversation to view messages.</p>
          </div>
        )}
      </div>

      <ConfirmModal
        open={!!confirmDelete}
        title="Delete Support Conversation?"
        description={`Permanently delete all support chat messages with ${confirmDelete?.name || "this customer"}?`}
        confirmLabel="Delete Thread"
        onCancel={() => setConfirmDelete(null)}
        onConfirm={async () => {
          if (!confirmDelete) return;
          await deleteConversation(confirmDelete.id);
          toast.info("Conversation deleted");
          setSelectedId(null);
          setConfirmDelete(null);
          refreshConvos();
        }}
      />
    </div>
  );
}

