import AsyncStorage from "@react-native-async-storage/async-storage";

export type LamionMessage = {
  role: "user" | "ai";
  text: string;
  /** epoch ms — used as a stable key for flagging a specific AI reply */
  at?: number;
};

const STORAGE_KEY = "@lamion_chat";
const MAX_MESSAGES = 40;

export const LAMION_GREETING: LamionMessage = {
  role: "ai",
  text: "Mabuhay! I am Lamion AI, your dedicated Filipino culinary expert. Ask me anything about Filipino foods, traditional cooking techniques, authentic recipes, or regional specialties!",
};

let messages: LamionMessage[] = [LAMION_GREETING];
let hydrated = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

function persist() {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(messages)).catch(() => {});
}

/** Subscribe to store changes; returns the unsubscribe function. */
export function subscribeLamionChat(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Load the persisted conversation once per app session. */
export async function hydrateLamionChat(): Promise<void> {
  if (hydrated) return;
  hydrated = true;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        messages = parsed as LamionMessage[];
      }
    }
  } catch {
    // keep the greeting-only conversation
  }
  notify();
}

export function getLamionMessages(): LamionMessage[] {
  return messages;
}

export function appendLamionMessage(msg: LamionMessage): void {
  messages = [...messages, msg].slice(-MAX_MESSAGES);
  notify();
  persist();
}

export async function resetLamionChat(): Promise<void> {
  messages = [LAMION_GREETING];
  notify();
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
