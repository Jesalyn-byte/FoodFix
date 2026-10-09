export type GuardrailCode =
  | "EMPTY"
  | "TOO_LONG"
  | "INJECTION"
  | "HARM"
  | "ABUSE"
  | "NON_FOOD"
  | "RATE_LIMIT"
  | "COOLDOWN"
  | "DUPLICATE";

export type GuardrailVerdict =
  | "PASSED_CULINARY_DOMAIN"
  | "NON_FOOD_REFUSAL"
  | "INJECTION_BLOCKED"
  | "HARM_BLOCKED"
  | "ABUSE_BLOCKED"
  | "TOO_LONG_REFUSAL"
  | "RATE_LIMITED"
  | "DUPLICATE_REQUEST"
  | "OUTPUT_SANITIZED"
  | "OUTPUT_REFUSED"
  | "USER_FLAGGED"
  | "ERROR";

export const MAX_INPUT_CHARS = 600;
export const MAX_OUTPUT_CHARS = 1500;
export const MAX_HISTORY_MESSAGES = 6;
export const MAX_HISTORY_CHARS = 1500;

export const UNTRUSTED_OPEN = "<untrusted_user_input>";
export const UNTRUSTED_CLOSE = "</untrusted_user_input>";

const REFUSAL_MESSAGES: Record<GuardrailCode, string> = {
  EMPTY: "Mabuhay! Type your question about Filipino food, recipes, or cooking and I'll be happy to help.",
  TOO_LONG: `Pasensya na, that message is too long. Please keep it under ${MAX_INPUT_CHARS} characters so I can answer it properly. How can I help you in the kitchen today?`,
  INJECTION:
    "I am Lamion AI, your dedicated Filipino culinary expert! I only follow the culinary instructions I was trained with. Ask me anything about Filipino cuisine, recipes, ingredients, or cooking techniques.",
  HARM: "I am Lamion AI, your dedicated Filipino culinary expert! I cannot help with anything dangerous or harmful. I can only assist with Filipino cuisine, recipes, ingredients, and cooking techniques. How can I help you in the kitchen today?",
  ABUSE:
    "Let's keep our kitchen talk friendly and respectful, po! I am Lamion AI, your dedicated Filipino culinary expert. How can I help you with cooking today?",
  NON_FOOD:
    "I am Lamion AI, your dedicated Filipino culinary expert! I am exclusively trained by the research team to assist with Filipino cuisine, recipes, ingredients, and cooking techniques. How can I help you in the kitchen today?",
  RATE_LIMIT:
    "Lamion AI is receiving a lot of questions right now. Please wait a moment before asking again. Kain po tayo!",
  COOLDOWN: "Please wait a moment before sending another message. Kain po tayo!",
  DUPLICATE: "I already answered that one! Try rephrasing your question or ask me something new about Filipino food.",
};

const CODE_VERDICTS: Record<GuardrailCode, GuardrailVerdict> = {
  EMPTY: "NON_FOOD_REFUSAL",
  TOO_LONG: "TOO_LONG_REFUSAL",
  INJECTION: "INJECTION_BLOCKED",
  HARM: "HARM_BLOCKED",
  ABUSE: "ABUSE_BLOCKED",
  NON_FOOD: "NON_FOOD_REFUSAL",
  RATE_LIMIT: "RATE_LIMITED",
  COOLDOWN: "RATE_LIMITED",
  DUPLICATE: "DUPLICATE_REQUEST",
};

const FOOD_WORDS = [
  "adobo", "sinigang", "lechon", "sisig", "kare-kare", "kare kare", "kansi", "inasal",
  "kinilaw", "humba", "pastil", "tiulah itum", "pyanggang", "kakanin", "pancit", "lumpia",
  "lumpiang", "longsilog", "tapsilog", "tocilog", "silog", "menudo", "afritada", "mechado",
  "caldereta", "nilaga", "bulalo", "dinuguan", "batchoy", "laing", "bicol express",
  "pinakbet", "pakbet", "ginataang", "gata", "maja blanca", "leche flan", "lechon kawali",
  "bibingka", "puto", "kutsinta", "suman", "halo-halo", "halo halo", "turon", "banana cue",
  "kwek-kwek", "tokneneng", "isaw", "balut", "empanada", "bagnet", "pares", "goto",
  "arroz caldo", "champorado", "palabok", "sotanghon", "bihon", "canton", "guisado",
  "tinola", "sinampalukan", "sigsig", "dinakdakan", "kilawin", "sisig", "bulaklak",
  "kwek", "impluwensya", "kamote cue", "squid ball", "fish ball", "kikiam", "siomai",
  "filipino", "pinoy", "puso", "tagalog", "bisaya", "visayan", "ilocano", "kapampangan",
  "bicolano", "ilocano", "waray", "hiligaynon", "maranao", "tausug", "meranao",
  "ulam", "kanin", "sawsawan", "pagkain", "lutong", "luto", "kain", "kainin", "namit",
  "napakasarap", "masarap", "sarap", "linamnam", "asim", "alat", "tamis", "anghang",
  "maanghang", "merienda", "almusal", "hapunan", "pananghalian", "barkada", "boodle",
  "recipe", "recipes", "cook", "cooks", "cooking", "cooked", "bake", "baking", "baked",
  "fry", "frying", "fried", "sauté", "saute", "simmer", "boil", "boiling", "grill",
  "grilled", "roast", "roasted", "steam", "steamed", "chop", "chopped", "slice", "sliced",
  "marinate", "marinated", "knead", "kneading", "prep", "prepping", "season", "seasoning",
  "kitchen", "ingredient", "ingredients", "sauce", "broth", "stock", "soup", "stew",
  "rice", "viand", "dish", "dishes", "food", "foods", "cuisine", "culinary", "flavor",
  "flavour", "taste", "tasty", "spice", "spices", "herb", "herbs", "vinegar", "soy sauce",
  "patis", "bagoong", "achuete", "annatto", "calamansi", "kalamansi", "sampalok", "tamarind",
  "malunggay", "kangkong", "upo", "patola", "talong", "eggplant", "sitaw", "bitter gourd",
  "ampalaya", "labanos", "carrot", "potato", "kamote", "garlic", "onion", "tomato", "ginger",
  "luya", "sibuyas", "bawang", "kamatis", "lemon grass", "lemongrass", "pandan", "coconut",
  "niyog", "banana", "saging", "mango", "mangga", "papaya", "calamansi", "ube", "taro",
  "gabi", "corn", "mais", "egg", "eggs", "itlog", "chicken", "manok", "pork", "baboy",
  "beef", "baka", "fish", "isda", "shrimp", "hipon", "squid", "pusit", "crab", "alimango",
  "mussels", "tahong", "clams", "halaan", "oyster", "talong", "tofu", "tokwa", "noodles",
  "noodle", "pasta", "bread", "tinapay", "cheese", "keso", "butter", "margarine", "sugar",
  "asukal", "salt", "asin", "pepper", "paminta", "flour", "harina", "oil", "mantika",
  "lard", "calamansi", "nutrition", "nutritional", "calorie", "calories", "protein",
  "carbs", "carbohydrate", "fiber", "sodium", "cholesterol", "serving", "portion",
  "meal", "meals", "breakfast", "lunch", "dinner", "snack", "snacks", "dessert",
  "beverage", "drink", "drinks", "coffee", "kape", "tea", "juice", "smoothie", "shake",
  "beer", "wine", "cocktail", "chef", "bakery", "oven", "stove", "kalan", "pan",
  "pot", "knife", "kutsilyo", "chopping board", "grater", "blender", "cookware",
  "restaurant", "carinderia", "eatery", "dining", "menu", "foodie", "grocery", "groceries",
  "market", "palengke", "supermarket", "baon", "packed lunch", "diet", "keto", "vegan",
  "vegetarian", "halal", "allergen", "allergy", "appetizer",
  "entree", "main course", "side dish", "condiment", "dipping",
  "how to cook", "lutong bahay", "panlasang pinoy", "yummy", "delicious", "savory",
  "sour", "spicy", "sweet", "bitter", "umami", "creamy", "crispy", "crunchy", "tender",
  "juicy", "steamed", "whisk", "stir", "toss", "fold", "garnish", "plate", "serve",
  "leftover", "leftovers", "batch", "portion", "substitute", "alternative", "replace",
  "instead of", "swap", "measure", "measurement", "cup", "tablespoon", "teaspoon",
  "grams", "kilogram", "minutes", "hours", "recipe", "instruction", "instructions",
  "step", "steps", "tutorial", "guide", "tip", "tips", "trick", "tricks",
];

const NON_FOOD_WORDS = [
  "politics", "political", "politician", "president", "presidential", "senator",
  "congress", "election", "elections", "governor", "mayor", "barangay captain",
  "government", "corruption", "war", "military", "army", "weapon", "weapons",
  "religion", "religious", "bible", "quran", "koran", "church", "mosque", "pastor",
  "priest", "imam", "prayer", "pray to", "god says", "program", "programming",
  "programmer", "code", "coding", "coder", "javascript", "typescript", "python",
  "react native", "reactjs", "html", "css", "sql", "query", "database", "hacker",
  "hacking", "hack", "malware", "ransomware", "virus", "exploit", "homework",
  "assignment", "essay", "thesis", "dissertation", "school project", "report writing",
  "math", "mathematics", "algebra", "geometry", "calculus", "equation", "arithmetic",
  "multiplication", "division", "solve for", "finance", "financial", "stocks",
  "crypto", "bitcoin", "ethereum", "trading", "investment", "invest", "investing", "loan", "debt",
  "stock market", "stock price", "shares", "mutual funds", "retirement", "index funds",
  "tax", "taxes", "bank", "insurance", "gaming", "game", "games", "fortnite",
  "valorant", "mobile legends", "mlbb", "roblox", "minecraft", "dota", "lol",
  "playstation", "xbox", "nintendo", "esports", "sports", "sport", "basketball", "nba",
  "pba", "boxing", "mma", "ufc", "football", "soccer", "volleyball", "athletics",
  "olympics", "athlete", "lebron", "messi", "ronaldo", "celebrity", "celebrities",
  "hollywood", "korean drama", "kpop", "k-pop", "bollywood", "movie", "movies", "film",
  "series", "netflix", "youtube", "tiktok", "instagram", "vlogger", "influencer",
  "song", "songs", "lyrics", "singer", "album", "concert", "horoscope", "zodiac",
  "astrology", "fortune telling", "psychic", "tarot", "weather", "forecast", "typhoon",
  "earthquake", "pandemic", "vaccine", "medicine", "medication", "prescription",
  "doctor", "clinic", "hospital", "disease", "cancer", "diabetes", "infection",
  "symptom", "symptoms", "diagnosis", "therapy", "psychologist", "mental health",
  "depression", "anxiety", "legal", "lawyer", "attorney", "lawsuit", "court", "visa",
  "immigration", "passport", "resume", "cv", "job application", "interview tips",
  "career", "salary", "employer", "boyfriend", "girlfriend", "dating", "romance",
  "love life", "crush", "breakup", "divorce", "sex", "sexual", "nude", "naked",
  "porn", "explicit", "girlfriend", "flirt", "pick up lines", "police", "arrest",
  "drug", "drugs", "marijuana", "shabu", "cocaine", "weed", "alcohol abuse",
  "suicide", "kill myself", "self harm", "depression", "gun", "guns", "rifle",
  "pistol", "bullet", "bomb", "explosive", "knife attack", "poison", "arsenic",
  "cyanide", "unboxing", "tech", "gadget",
  "smartphone", "laptop", "computer", "software", "hardware", "ai model", "chatgpt",
  "prompt", "prompts", "essay writing", "translation", "translate", "grammar",
  "spelling", "dictionary", "synonym", "weather update", "news", "headline",
  "current events", "world war", "geography", "planet", "physics",
  "chemistry", "biology", "science", "scientific", "experiment", "laboratory",
  "engineering", "architecture", "mechanic", "car repair", "engine oil",
  "hairstyle", "makeup", "fashion", "outfit", "clothing", "shoes", "perfume",
  "pet care", "dog", "cat", "puppy", "kitten", "aquarium", "plant care", "gardening",
  "furniture", "interior design", "real estate", "apartment", "rent",
  "travel", "hotel", "airline", "flight", "tourist", "passport size", "military",
];

const INJECTION_PATTERNS: RegExp[] = [
  /\b(ignore|disregard|forget|bypass|override|drop)\b[^.!?]{0,60}\b(instructions?|prompts?|rules?|guardrails?|guidelines?|restrictions?)\b/i,
  /ignore\s+(all|any|previous|prior|above|earlier)\s+(instructions?|prompts?|rules?|guidelines?)/i,
  /(disregard|forget|drop)\s+(the\s+)?(all|previous|prior|above|system)\s+(instructions?|rules?|prompts?|messages?)/i,
  /\b(system\s+prompt|system\s+message|system\s+instructions?)\b/i,
  /\b(developer\s+mode|dan\s+mode|jailbreak|sudo\s+mode|opposite\s+mode|evil\s+mode)\b/i,
  /\byou\s+are\s+now\s+(a|an|the|not)\b/i,
  /\bact\s+as\s+(a|an|the)\b/i,
  /\bpretend\s+(to\s+be|you\s+are)\b/i,
  /\broleplay\s+(as|like)?/i,
  /\bnew\s+instructions?\b/i,
  /\boverride\s+(your|the|these)\b/i,
  /\breveal\s+(your|the)\s+(instructions?|prompt|rules?|system)\b/i,
  /\b(your|the)\s+(instructions?|prompt|rules?)\s+are\b/i,
  /\bprint\s+(your|the)\s+(system|instructions?|prompt)\b/i,
  /\brepeat\s+(your|the)\s+(instructions?|prompt|rules?)\b/i,
  /\bwhat\s+are\s+your\s+(instructions?|rules?|prompt)\b/i,
  /\bwithout\s+(any\s+)?(restrictions?|filters?|limits?|rules?)\b/i,
  /\bno\s+(restrictions?|filters?|limits?|rules?|boundaries)\b/i,
  /\bunrestricted\s+(mode|ai|assistant)\b/i,
  /\bas\s+an\s+unrestricted\b/i,
  /\bpretend\s+there\s+are\s+no\s+(rules?|limits?)\b/i,
  /\bfrom\s+now\s+on\s+you\s+(will|must|are)\b/i,
  /\byou\s+(must|will|should)\s+obey\s+(me|my)\b/i,
  /\bbreak\s+(your|out\s+of)\s+(rules?|character|guardrails?)\b/i,
  /\bdo\s+anything\s+now\b/i,
  /\bjail\s*broke\b/i,
  /\brespond\s+only\s+with\s+(the\s+)?(code|json)\b/i,
  /\boutput\s+(your|the)\s+(raw|full)\b/i,
  /\bhidden\s+(prompt|instructions?)\b/i,
  /\bpretend\s+to\s+be\s+an?\s+(unrestricted|different)\b/i,
  /\bthis\s+is\s+a\s+(test|roleplay)\s+so\s+(ignore|forget)\b/i,
  /^\s*[A-Za-z0-9+/=]{120,}\s*$/,
];

const HARM_PATTERNS: RegExp[] = [
  /\bhow\s+to\s+make\s+a\s+(bomb|explosive|grenade|pipe\s+bomb|weapon|gun|rifle|pistol|silencer)\b/i,
  /\b(build|make|create|assemble)\s+a\s+(bomb|explosive|gun|rifle|firearm|weapon)\b/i,
  /\b(make|cook|produce|manufacture|buy|deal)\s+(meth|shabu|cocaine|heroin|ecstasy|marijuana|weed|methamphetamine|drugs)\b/i,
  /\bhow\s+to\s+(kill|murder|harm|hurt|attack)\s+(someone|anyone|a\s+person|him|her|them|myself|yourself)\b/i,
  /\bkill\s+(myself|yourself|themselves|himself|herself)\b/i,
  /\bsuicide\s+(method|methods|plan|note|ways?)\b/i,
  /\bself[-\s]?harm\s+(methods?|ways?)\b/i,
  /\bpoison\s+(someone|anyone|a\s+person|him|her|them)\b/i,
  /\b(make|create|mix)\s+(poison|cyanide|arsenic|ricin|nerve\s+gas)\b/i,
  /\bdrinking\s+(bleach|poison|antifreeze|drain\s+cleaner)\b/i,
  /\beat\s+(glass| nails?|metal|objects?)\b/i,
  /\bboil\s+(a\s+)?(cat|dog|kitten|puppy|baby|human)\b/i,
  /\btorture\b/i,
  /\bmaim\b/i,
  /\bcar\s+bomb\b/i,
  /\bied\b/i,
  /\bnapalm\b/i,
  /\bmolotov\b/i,
  /\b3d\s+printed\s+(gun|rifle|weapon)\b/i,
  /\bghost\s+gun\b/i,
];

const ABUSE_WORDS = [
  "fuck", "fucking", "fucker", "shit", "bullshit", "bitch", "asshole", "bastard",
  "dickhead", "motherfucker", "cunt", "wanker", "idiot", "moron", "stupid", "dumb",
  "retard", "loser", "pathetic", "shut up", "screw you", "damn you", "hate you",
  "puta", "putang", "gago", "gagu", "tangina", "tanga", "boboo", "bobo", "ulol",
  "peste", "punyeta", "leche", "hayop", "unggoy", "wlang hiya", "walang hiya",
  "bullshit", "kupal", "tarantado", "ginago", "bugok", "duwag",
];

const OUTPUT_HARM_PATTERNS = HARM_PATTERNS;

const THIRD_PARTY_NAMES =
  /\b(NVIDIA\s*NIM|NVIDIA|OpenAI|ChatGPT|GPT-?\d|GPT|Meta\s+AI|Meta|Llama|LLaMA|Gemini|Google\s+Gemini|Google|Qwen|Alibaba|DashScope|Anthropic|Claude|DeepSeek|Mistral|Copilot|Grok|Ollama|Hugging\s+Face|Azure|AWS\s+Bedrock|Bedrock)\b/g;

const URL_PATTERN = /\b(?:https?:\/\/|www\.)[^\s]+/gi;
const BARE_DOMAIN_PATTERN = /\b[a-z0-9-]+\.(?:com|net|org|io|ph|co|ai|app|dev|xyz|info|edu|gov)(?:\/[^\s]*)?/gi;
const EMAIL_PATTERN = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

const SYSTEM_LEAK_PATTERNS: RegExp[] = [
  /IDENTITY\s*&\s*ORIGIN/i,
  /STRICT\s+FOOD\s+GUARDRAILS/i,
  /untrusted_user_input/i,
  /you\s+are\s+"?Lamion\s+AI"?\s+\(derived/i,
  /custom-trained,\s+specialized\s+culinary\s+AI\s+model/i,
  /NEVER\s+break\s+these\s+guardrails/i,
];

const CODE_FENCE_PATTERN = /^```[a-zA-Z]*\n([\s\S]*?)\n?```$/;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function wordTest(text: string, word: string): boolean {
  if (word.includes(" ")) return text.includes(word);
  const pattern = new RegExp(`(^|[^a-z0-9])${escapeRegExp(word)}([^a-z0-9]|$)`, "i");
  return pattern.test(text);
}

function matchesAnyWord(text: string, words: string[]): boolean {
  const lower = text.toLowerCase();
  for (const word of words) {
    if (wordTest(lower, word)) return true;
  }
  return false;
}

function countFoodSignals(text: string): number {
  const lower = text.toLowerCase();
  let count = 0;
  for (const word of FOOD_WORDS) {
    if (wordTest(lower, word)) count += 1;
  }
  return count;
}

export interface InputCheck {
  ok: boolean;
  code?: GuardrailCode;
  message?: string;
  verdict?: GuardrailVerdict;
  text?: string;
}

export function wrapUserInput(text: string): string {
  return `${UNTRUSTED_OPEN}\n${text}\n${UNTRUSTED_CLOSE}`;
}

export function checkUserInput(raw: string): InputCheck {
  const text = (raw || "").trim();
  if (!text) {
    return { ok: false, code: "EMPTY", message: REFUSAL_MESSAGES.EMPTY, verdict: CODE_VERDICTS.EMPTY };
  }
  if (text.length > MAX_INPUT_CHARS) {
    return { ok: false, code: "TOO_LONG", message: REFUSAL_MESSAGES.TOO_LONG, verdict: CODE_VERDICTS.TOO_LONG };
  }
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(text)) {
      return { ok: false, code: "INJECTION", message: REFUSAL_MESSAGES.INJECTION, verdict: CODE_VERDICTS.INJECTION };
    }
  }
  for (const pattern of HARM_PATTERNS) {
    if (pattern.test(text)) {
      return { ok: false, code: "HARM", message: REFUSAL_MESSAGES.HARM, verdict: CODE_VERDICTS.HARM };
    }
  }
  if (matchesAnyWord(text, ABUSE_WORDS)) {
    return { ok: false, code: "ABUSE", message: REFUSAL_MESSAGES.ABUSE, verdict: CODE_VERDICTS.ABUSE };
  }
  if (matchesAnyWord(text, NON_FOOD_WORDS)) {
    return { ok: false, code: "NON_FOOD", message: REFUSAL_MESSAGES.NON_FOOD, verdict: CODE_VERDICTS.NON_FOOD };
  }
  if (countFoodSignals(text) === 0) {
    return { ok: false, code: "NON_FOOD", message: REFUSAL_MESSAGES.NON_FOOD, verdict: CODE_VERDICTS.NON_FOOD };
  }
  return { ok: true, text };
}

export interface OutputFilterResult {
  text: string;
  verdict: GuardrailVerdict;
  changed: boolean;
}

function truncateAtWord(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd() + "…";
}

function containsCodeFence(text: string): boolean {
  return text.includes("```") || CODE_FENCE_PATTERN.test(text.trim());
}

export function filterModelOutput(raw: string): OutputFilterResult {
  const original = (raw || "").trim();
  if (!original) {
    return { text: "", verdict: "OUTPUT_REFUSED", changed: true };
  }

  for (const pattern of OUTPUT_HARM_PATTERNS) {
    if (pattern.test(original)) {
      return { text: REFUSAL_MESSAGES.HARM, verdict: "OUTPUT_REFUSED", changed: true };
    }
  }
  for (const pattern of SYSTEM_LEAK_PATTERNS) {
    if (pattern.test(original)) {
      return { text: REFUSAL_MESSAGES.NON_FOOD, verdict: "OUTPUT_REFUSED", changed: true };
    }
  }

  const hasFoodSignal = countFoodSignals(original) > 0;
  const hasNonFoodSignal = matchesAnyWord(original, NON_FOOD_WORDS);
  if (!hasFoodSignal && hasNonFoodSignal) {
    return { text: REFUSAL_MESSAGES.NON_FOOD, verdict: "OUTPUT_REFUSED", changed: true };
  }

  let text = original;
  const hadCodeFence = containsCodeFence(text);
  const fenceMatch = text.match(CODE_FENCE_PATTERN);
  if (fenceMatch) text = fenceMatch[1].trim();

  text = text.replace(THIRD_PARTY_NAMES, "Lamion AI");
  text = text.replace(/\b(Lamion AI)(?:\s+\1)+\b/g, "$1");
  text = text.replace(EMAIL_PATTERN, " ");
  text = text.replace(URL_PATTERN, " ");
  text = text.replace(BARE_DOMAIN_PATTERN, " ");
  text = text.replace(/\n{3,}/g, "\n\n");
  text = text.replace(/[ \t]{2,}/g, " ");
  text = truncateAtWord(text, MAX_OUTPUT_CHARS);
  text = text.trim();

  if (!text) {
    return { text: REFUSAL_MESSAGES.NON_FOOD, verdict: "OUTPUT_REFUSED", changed: true };
  }

  const changed = hadCodeFence || text !== original;
  return { text, verdict: changed ? "OUTPUT_SANITIZED" : "PASSED_CULINARY_DOMAIN", changed };
}

export function truncateHistory<T extends { role: string; content: any }>(history: T[]): T[] {
  if (!Array.isArray(history) || history.length === 0) return [];
  const trimmed = history.slice(-MAX_HISTORY_MESSAGES);
  const result: T[] = [];
  let budget = MAX_HISTORY_CHARS;
  for (let i = trimmed.length - 1; i >= 0; i--) {
    const entry = trimmed[i];
    const cost = String(entry.content ?? "").length;
    if (cost > budget && result.length > 0) break;
    result.unshift(entry);
    budget -= cost;
  }
  return result;
}

export interface QuotaLimits {
  perMinute: number;
  perDay: number;
  dedupMs: number;
  cooldownMs: number;
}

export const DEFAULT_QUOTA_LIMITS: QuotaLimits = {
  perMinute: 8,
  perDay: 60,
  dedupMs: 15000,
  cooldownMs: 30000,
};

export interface QuotaState {
  minuteKey: number;
  minuteCount: number;
  dayKey: number;
  dayCount: number;
  lastText: string;
  lastAt: number;
  cooldownUntil: number;
}

export interface QuotaStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export type QuotaDecision =
  | { ok: true }
  | { ok: false; code: GuardrailCode; message: string; retryAfterMs: number };

const QUOTA_STORAGE_KEY = "@lamion_quota";
const EMPTY_STATE: QuotaState = {
  minuteKey: -1,
  minuteCount: 0,
  dayKey: -1,
  dayCount: 0,
  lastText: "",
  lastAt: 0,
  cooldownUntil: 0,
};

const memoryStorage: QuotaStorage = {
  async getItem() {
    return null;
  },
  async setItem() {},
};

function getPersistentStorage(): QuotaStorage {
  if (process.env.NODE_ENV === "test") return memoryStorage;
  try {
    const mod = require("@react-native-async-storage/async-storage");
    const storage = mod?.default || mod;
    if (storage && typeof storage.getItem === "function") return storage as QuotaStorage;
  } catch {
    return memoryStorage;
  }
  return memoryStorage;
}

export interface RateLimiterOptions {
  storage?: QuotaStorage;
  now?: () => number;
  limits?: QuotaLimits;
  enabled?: boolean;
}

export class RateLimiter {
  private storage: QuotaStorage;
  private now: () => number;
  private limits: QuotaLimits;
  private enabled: boolean;
  private state: QuotaState = { ...EMPTY_STATE };
  private loaded = false;

  constructor(options: RateLimiterOptions = {}) {
    this.storage = options.storage || getPersistentStorage();
    this.now = options.now || (() => Date.now());
    this.limits = options.limits || DEFAULT_QUOTA_LIMITS;
    this.enabled = options.enabled ?? process.env.NODE_ENV !== "test";
  }

  private async load(): Promise<void> {
    if (this.loaded) return;
    this.loaded = true;
    if (!this.enabled) return;
    try {
      const raw = await this.storage.getItem(QUOTA_STORAGE_KEY);
      if (raw) this.state = { ...EMPTY_STATE, ...JSON.parse(raw) };
    } catch {
      this.state = { ...EMPTY_STATE };
    }
  }

  private async persist(): Promise<void> {
    if (!this.enabled) return;
    try {
      await this.storage.setItem(QUOTA_STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // persistence failure must never break chat
    }
  }

  private rollBuckets(): void {
    const now = this.now();
    const minuteKey = Math.floor(now / 60000);
    const dayKey = Math.floor(now / 86400000);
    if (this.state.minuteKey !== minuteKey) {
      this.state.minuteKey = minuteKey;
      this.state.minuteCount = 0;
    }
    if (this.state.dayKey !== dayKey) {
      this.state.dayKey = dayKey;
      this.state.dayCount = 0;
    }
  }

  async check(text: string): Promise<QuotaDecision> {
    if (!this.enabled) return { ok: true };
    await this.load();
    this.rollBuckets();
    const now = this.now();

    if (this.state.cooldownUntil > now) {
      const retryAfterMs = this.state.cooldownUntil - now;
      return { ok: false, code: "COOLDOWN", message: REFUSAL_MESSAGES.COOLDOWN, retryAfterMs };
    }
    if (
      this.state.lastText &&
      this.state.lastText === text &&
      now - this.state.lastAt < this.limits.dedupMs
    ) {
      return { ok: false, code: "DUPLICATE", message: REFUSAL_MESSAGES.DUPLICATE, retryAfterMs: 0 };
    }
    if (this.state.minuteCount >= this.limits.perMinute) {
      return { ok: false, code: "RATE_LIMIT", message: REFUSAL_MESSAGES.RATE_LIMIT, retryAfterMs: 60000 - (now % 60000) };
    }
    if (this.state.dayCount >= this.limits.perDay) {
      return { ok: false, code: "RATE_LIMIT", message: REFUSAL_MESSAGES.RATE_LIMIT, retryAfterMs: 3600000 };
    }
    return { ok: true };
  }

  async commit(text: string): Promise<void> {
    if (!this.enabled) return;
    await this.load();
    this.rollBuckets();
    this.state.minuteCount += 1;
    this.state.dayCount += 1;
    this.state.lastText = text;
    this.state.lastAt = this.now();
    await this.persist();
  }

  async penalize(ms?: number): Promise<void> {
    if (!this.enabled) return;
    await this.load();
    this.state.cooldownUntil = this.now() + (ms ?? this.limits.cooldownMs);
    await this.persist();
  }

  async getCooldownRemaining(): Promise<number> {
    if (!this.enabled) return 0;
    await this.load();
    const remaining = this.state.cooldownUntil - this.now();
    return remaining > 0 ? remaining : 0;
  }

  async reset(): Promise<void> {
    this.state = { ...EMPTY_STATE };
    this.loaded = true;
    await this.persist();
  }
}

export const rateLimiter = new RateLimiter();
