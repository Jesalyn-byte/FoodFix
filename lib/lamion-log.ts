import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db, handleSdkBlocked, RestApi, shouldUseRest } from "./firebase";
import type { GuardrailVerdict } from "./lamion-guardrails";
import { createLogger } from "./logger";

const log = createLogger("LamionLog");

const MAX_STORED_CHARS = 2000;

export interface LamionEventInput {
  userQuery: string;
  aiResponse: string;
  guardrailCheck: GuardrailVerdict;
  modelUsed: string;
  latencyMs: number;
}

function clip(text: string): string {
  const value = (text || "").trim();
  return value.length > MAX_STORED_CHARS ? value.slice(0, MAX_STORED_CHARS) + "…" : value;
}

function estimateTokens(text: string): number {
  return Math.max(0, Math.round((text || "").length / 4));
}

export function buildLamionLogDoc(event: LamionEventInput) {
  const userQuery = clip(event.userQuery);
  const aiResponse = clip(event.aiResponse);
  return {
    query_id: `lam_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    user_query: userQuery,
    retrieved_chunk_ids: [] as string[],
    cosine_similarity_scores: {} as Record<string, number>,
    top_similarity_score: 0,
    retrieved_context_preview: "",
    guardrail_check: event.guardrailCheck,
    model_used: event.modelUsed,
    ai_response: aiResponse,
    latency_ms: Math.max(0, Math.round(event.latencyMs)),
    prompt_tokens: estimateTokens(userQuery),
    completion_tokens: estimateTokens(aiResponse),
    total_tokens: estimateTokens(userQuery) + estimateTokens(aiResponse),
    created_at: serverTimestamp(),
  };
}

export async function logLamionAiEvent(event: LamionEventInput): Promise<void> {
  if (process.env.NODE_ENV === "test") return;
  const doc = buildLamionLogDoc(event);
  try {
    if (shouldUseRest()) {
      await RestApi.createDocument("lamion_ai_logs", doc);
      return;
    }
    await addDoc(collection(db, "lamion_ai_logs"), doc);
  } catch (error) {
    try {
      handleSdkBlocked(error);
      await RestApi.createDocument("lamion_ai_logs", doc);
    } catch (restError) {
      log.warn("Failed to write lamion_ai_logs entry", restError);
    }
  }
}

export function flagLamionMessage(message: string, reason = "user reported"): Promise<void> {
  return logLamionAiEvent({
    userQuery: `FLAGGED: ${reason}`,
    aiResponse: message,
    guardrailCheck: "USER_FLAGGED",
    modelUsed: "user-flag",
    latencyMs: 0,
  });
}
