import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
    Alert, FlatList, KeyboardAvoidingView, Platform,
    ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppLoader from "../../components/AppLoader";
import { flagLamionMessage } from "../../lib/lamion-log";
import {
    appendLamionMessage, getLamionMessages, hydrateLamionChat,
    subscribeLamionChat, type LamionMessage,
} from "../../lib/lamion-chat-store";
import { rateLimiter } from "../../lib/lamion-guardrails";
import { chatWithLamionAI } from "../../lib/lamion-ai";

const SUGGESTIONS = [
  "How to cook Chicken Adobo?",
  "What makes Sinigang sour?",
  "Origin of Pork Sisig",
  "Crispy Lechon Kawali tips",
  "Substitute for Calamansi?",
  "Popular Filipino street foods",
];

export default function LamionChatScreen() {
  const [messages, setMessages] = useState<LamionMessage[]>(getLamionMessages());
  const [hydrated, setHydrated] = useState(false);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let mounted = true;
    hydrateLamionChat().then(() => { if (mounted) setHydrated(true); });
    const unsub = subscribeLamionChat(() => setMessages(getLamionMessages()));
    rateLimiter.getCooldownRemaining().then((ms) => { if (mounted && ms > 0) setCooldown(ms); });
    return () => { mounted = false; unsub(); };
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((prev) => Math.max(0, prev - 1000)), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function handleSend(raw: string) {
    const question = raw.trim();
    if (!question || thinking || cooldown > 0) return;
    setInput("");
    appendLamionMessage({ role: "user", text: question, at: Date.now() });
    setThinking(true);
    try {
      const history = getLamionMessages().map((m) => ({
        role: (m.role === "ai" ? "assistant" : "user") as "assistant" | "user",
        content: m.text,
      }));
      const response = await chatWithLamionAI(question, history);
      appendLamionMessage({ role: "ai", text: response, at: Date.now() });
    } catch {
      appendLamionMessage({
        role: "ai",
        text: "Pasensya na, I encountered an error connecting to Lamion AI. Please try again in a moment.",
        at: Date.now(),
      });
    } finally {
      setThinking(false);
      setCooldown(await rateLimiter.getCooldownRemaining());
    }
  }

  function handleFlag(msg: LamionMessage) {
    const key = String(msg.at ?? "greeting");
    if (flagged[key]) return;
    Alert.alert(
      "Flag this message?",
      "Send this AI reply to the research team for review?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Flag",
          style: "destructive",
          onPress: async () => {
            await flagLamionMessage(msg.text);
            setFlagged((prev) => ({ ...prev, [key]: true }));
          },
        },
      ],
    );
  }

  function handleBack() {
    try {
      if (router.canGoBack()) router.back();
      else router.replace("/(tabs)");
    } catch {
      router.replace("/(tabs)");
    }
  }

  // Newest first, so the inverted FlatList anchors at the latest message.
  const data = [...messages].reverse();
  const busy = thinking || cooldown > 0;

  const renderMessage = ({ item }: { item: LamionMessage }) => {
    const isUser = item.role === "user";
    const flagKey = String(item.at ?? "greeting");
    return (
      <View style={[styles.bubble, isUser ? styles.myBubble : styles.theirBubble]}>
        <View style={[styles.msgContent, isUser ? styles.myContent : styles.theirContent]}>
          <Text style={[styles.msgText, isUser && { color: "#fff" }]}>{item.text}</Text>
          {!isUser && (
            <TouchableOpacity
              delayLongPress={400}
              onLongPress={() => handleFlag(item)}
              style={styles.flagRow}
              accessibilityLabel="Flag this AI message">
              <Ionicons name={flagged[flagKey] ? "flag" : "flag-outline"} size={11}
                color={flagged[flagKey] ? "#E74C3C" : "#bbb"} />
              <Text style={[styles.flagText, flagged[flagKey] && { color: "#E74C3C" }]}>
                {flagged[flagKey] ? "Reported" : "Flag"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (!hydrated) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <AppLoader />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.headerBtn} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={20} color="#2E1A06" />
        </TouchableOpacity>
        <View style={styles.headerLeft}>
          <View style={styles.headerAvatar}>
            <Ionicons name="sparkles" size={20} color="#FF9800" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>Lamion AI</Text>
            <Text style={styles.headerSub} numberOfLines={1}>
              {thinking ? "Thinking…" : "Filipino Food Expert • Recipes & tips"}
            </Text>
          </View>
        </View>
      </View>

      {/* Suggestion chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={styles.chipsScroll} contentContainerStyle={styles.chipsRow}>
        {SUGGESTIONS.map((q) => (
          <TouchableOpacity
            key={q}
            style={[styles.chip, busy && { opacity: 0.5 }]}
            onPress={() => handleSend(q)}
            disabled={busy}>
            <Text style={styles.chipText}>{q}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}>
        <FlatList
          data={data}
          inverted
          style={{ flex: 1 }}
          renderItem={renderMessage}
          keyExtractor={(m, i) => `${m.at ?? "g"}-${i}`}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        />

        {thinking && (
          <View style={styles.thinkingRow}>
            <View style={styles.thinkingBubble}>
              <Ionicons name="sparkles" size={13} color="#FF9800" />
              <Text style={styles.thinkingText}>Lamion is cooking up an answer…</Text>
            </View>
          </View>
        )}

        {/* Input row */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask about Filipino foods, recipes, tips..."
            placeholderTextColor="#aaa"
            editable={cooldown === 0}
            maxLength={600}
            returnKeyType="send"
            onSubmitEditing={() => handleSend(input)}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || busy) && { opacity: 0.4 }]}
            onPress={() => handleSend(input)}
            disabled={!input.trim() || busy}
            accessibilityLabel="Send message">
            <Ionicons name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
        {cooldown > 0 && (
          <Text style={styles.cooldownText}>
            Please wait {Math.ceil(cooldown / 1000)}s before sending another message.
          </Text>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9F0DC" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F0E4CE",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  headerBtn: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: "#F7F2E7",
    alignItems: "center", justifyContent: "center",
  },
  headerAvatar: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: "#FFF3E0",
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: 16, fontWeight: "800", color: "#2E1A06" },
  headerSub: { fontSize: 11, color: "#FF9800", fontWeight: "600" },
  chipsScroll: { flexGrow: 0, backgroundColor: "#fff" },
  chipsRow: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  chip: {
    backgroundColor: "#FFF8E1", borderWidth: 1, borderColor: "#FF980040",
    borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6,
  },
  chipText: { fontSize: 12, color: "#F25C05", fontWeight: "600" },
  list: { padding: 16 },
  bubble: { marginBottom: 10, maxWidth: "85%" },
  myBubble: { alignSelf: "flex-end" },
  theirBubble: { alignSelf: "flex-start" },
  msgContent: {
    padding: 12, paddingHorizontal: 14, borderRadius: 16,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  myContent: { backgroundColor: "#F25C05", borderBottomRightRadius: 4 },
  theirContent: { backgroundColor: "#fff", borderBottomLeftRadius: 4 },
  msgText: { fontSize: 14, lineHeight: 20, color: "#2E1A06" },
  flagRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  flagText: { fontSize: 10, color: "#bbb" },
  thinkingRow: { paddingHorizontal: 16, paddingBottom: 4 },
  thinkingBubble: {
    alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#FFF8E1", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: "#FF980030",
  },
  thinkingText: { fontSize: 12, color: "#B07820", fontWeight: "600" },
  inputRow: {
    flexDirection: "row", alignItems: "flex-end", gap: 10,
    padding: 12, paddingHorizontal: 16,
    backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#F0E4CE",
  },
  input: {
    flex: 1, minHeight: 44, maxHeight: 100,
    backgroundColor: "#F9F5EF", borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 14, color: "#2E1A06",
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: "#FF9800",
    alignItems: "center", justifyContent: "center",
  },
  cooldownText: { fontSize: 11, color: "#E67E22", textAlign: "center", paddingBottom: 8, backgroundColor: "#fff" },
});
