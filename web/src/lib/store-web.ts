import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
  type Timestamp,
} from "firebase/firestore";
import type { OrderStatus, OrderType, PaymentMethod } from "@shared/constants/order";
import { db } from "./firebase-web";

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
  stock_quantity: number;
  available: boolean;
  is_made_to_order?: boolean;
  nutrients?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    fiber?: number;
    sodium?: number;
  };
  batch_date?: string;
  created_at?: Timestamp | { seconds: number };
  updated_at?: Timestamp | { seconds: number } | Date;
}

export interface OrderItem {
  menu_item_id: string;
  name: string;
  price: number;
  quantity: number;
  image_url?: string;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_lat?: number;
  customer_lng?: number;
  order_note?: string;
  items: OrderItem[];
  subtotal: number;
  delivery_fee: number;
  total: number;
  status: OrderStatus;
  order_type: OrderType;
  payment_method: PaymentMethod;
  scheduled_date?: string;
  scheduled_time?: string;
  reject_reason?: string;
  issue_reason?: string;
  prepared_by?: string;
  driver_name?: string;
  driver_phone?: string;
  refund_status?: "none" | "pending" | "approved" | "completed" | "rejected";
  refund_amount?: number;
  refund_reason?: string;
  refund_image_url?: string;
  refund_rejection_reason?: string;
  refund_account_name?: string;
  refund_account_number?: string;
  refund_method?: string;
  created_at?: Timestamp | { seconds: number } | Date;
  updated_at?: Timestamp | { seconds: number } | Date;
}

export interface Banner {
  id: string;
  name: string;
  imageUrl: string;
  active: boolean;
  createdAt?: any;
}

export interface Review {
  id: string;
  user_id: string;
  username: string;
  order_id: string;
  menu_item_id: string;
  menu_item_name: string;
  rating: number;
  comment: string;
  image_url?: string;
  created_at?: any;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  content: string;
  read: boolean;
  archived?: boolean;
  created_at?: any;
}

export interface AppSettings {
  delivery_fee: number;
  delivery_radius_km: number;
  gcash_enabled: boolean;
  gcash_number?: string;
  gcash_qr_image?: string;
  store_name: string;
  store_address: string;
  store_phone: string;
  store_lat: number;
  store_lng: number;
}

export interface LamionRagKnowledge {
  id: string;
  name: string;
  region?: string;
  category?: string;
  cooking_method?: string;
  description?: string;
  ingredients?: string[];
  nutrition?: {
    calories?: number;
    protein_g?: number;
    carbs_g?: number;
    fat_g?: number;
  };
  cultural_note?: string;
}

export interface LamionAiLog {
  id: string;
  user_query: string;
  ai_response?: string;
  guardrail_check: string;
  model_used: string;
  latency_ms?: number;
  flagged?: boolean;
  created_at?: any;
}

export function toEpochSeconds(value: any): number {
  if (!value) return 0;
  if (typeof value === "number") return value > 1e11 ? Math.floor(value / 1000) : value;
  if (typeof value?.seconds === "number") return value.seconds;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? 0 : Math.floor(ms / 1000);
}

export function formatTimeAgo(value: any): string {
  const sec = toEpochSeconds(value);
  if (!sec) return "";
  const d = new Date(sec * 1000);
  return d.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function sortNewestFirst<T extends { created_at?: any }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => toEpochSeconds(b.created_at) - toEpochSeconds(a.created_at));
}

function sortOldestFirst<T extends { created_at?: any }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => toEpochSeconds(a.created_at) - toEpochSeconds(b.created_at));
}

async function generateOrderNumber(): Promise<string> {
  const counterRef = doc(db, "counters", "order_number");
  const next = await runTransaction(db, async (tx) => {
    const snap = await tx.get(counterRef);
    const current = snap.exists() ? Number((snap.data() as any).value) || 0 : 0;
    const value = current + 1;
    tx.set(counterRef, { value, updated_at: new Date() });
    return value;
  });
  return String(next);
}

function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)) as unknown as T;
  }
  if (value && typeof value === "object" && !(value instanceof Date)) {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value as Record<string, any>)) {
      if (v === undefined) continue;
      out[k] = stripUndefined(v);
    }
    return out as T;
  }
  return value;
}

// ==================== MENU ITEMS ====================

export async function getMenuItems(): Promise<MenuItem[]> {
  const snap = await getDocs(query(collection(db, "menu_items"), orderBy("name")));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as MenuItem[];
}

export function onMenuItemsUpdate(cb: (items: MenuItem[]) => void) {
  const q = query(collection(db, "menu_items"), orderBy("name"));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as MenuItem[]);
  });
}

export async function addMenuItem(data: Omit<MenuItem, "id" | "created_at">) {
  const now = new Date();
  const ref = await addDoc(collection(db, "menu_items"), {
    ...stripUndefined(data),
    created_at: now,
    updated_at: now,
  });
  return { id: ref.id };
}

export async function updateMenuItem(id: string, data: Partial<MenuItem>) {
  await updateDoc(doc(db, "menu_items", id), {
    ...stripUndefined(data),
    updated_at: new Date(),
  } as any);
}

export async function deleteMenuItem(id: string) {
  await deleteDoc(doc(db, "menu_items", id));
}

export interface NormalizedAdjustment {
  id: string;
  menu_item_id: string;
  menu_item_name: string;
  delta: number;
  previous_quantity: number | string;
  new_quantity: number | string;
  reason: string;
  notes?: string;
  staff_name?: string;
  created_at?: any;
}

export async function addInventoryAdjustment(data: {
  menu_item_id: string;
  menu_item_name: string;
  delta: number;
  reason: string;
  notes?: string;
  staff_name?: string;
}) {
  const itemRef = doc(db, "menu_items", data.menu_item_id);
  const snap = await getDoc(itemRef);
  const prevQty = snap.exists() ? Number((snap.data() as any).stock_quantity || 0) : 0;
  const nextQty = Math.max(0, prevQty + data.delta);
  await updateDoc(itemRef, {
    stock_quantity: nextQty,
    available: nextQty > 0,
    updated_at: new Date(),
  });
  await addDoc(collection(db, "inventory_adjustments"), {
    menu_item_id: data.menu_item_id,
    menu_item_name: data.menu_item_name,
    item_id: data.menu_item_id,
    item_name: data.menu_item_name,
    delta: data.delta,
    adjustment: data.delta,
    previous_quantity: prevQty,
    previous_qty: prevQty,
    new_quantity: nextQty,
    reason: data.reason,
    ...(data.notes ? { notes: data.notes } : {}),
    staff_name: data.staff_name || "Admin Web",
    created_at: new Date(),
  });
  return { previous_quantity: prevQty, new_quantity: nextQty };
}

export async function logMenuAdjustmentWeb(data: {
  menu_item_id: string;
  menu_item_name: string;
  delta: number;
  previous_quantity: number | string;
  new_quantity: number | string;
  reason: string;
  notes?: string;
  staff_name?: string;
}) {
  await addDoc(collection(db, "inventory_adjustments"), {
    menu_item_id: data.menu_item_id,
    menu_item_name: data.menu_item_name,
    item_id: data.menu_item_id,
    item_name: data.menu_item_name,
    delta: data.delta,
    adjustment: data.delta,
    previous_quantity: data.previous_quantity,
    previous_qty: typeof data.previous_quantity === "number" ? data.previous_quantity : 0,
    new_quantity: data.new_quantity,
    reason: data.reason,
    ...(data.notes ? { notes: data.notes } : {}),
    staff_name: data.staff_name || "Admin Web",
    created_at: new Date(),
  });
}

export async function getInventoryAdjustments(): Promise<NormalizedAdjustment[]> {
  const snap = await getDocs(collection(db, "inventory_adjustments"));
  const rows = snap.docs.map((d) => {
    const raw = d.data() as any;
    const prev = raw.previous_quantity ?? raw.previous_qty ?? 0;
    const delta = raw.delta ?? raw.adjustment ?? 0;
    const nextVal =
      raw.new_quantity ?? (typeof prev === "number" && typeof delta === "number" ? Math.max(0, prev + delta) : "");
    return {
      id: d.id,
      menu_item_id: raw.menu_item_id || raw.item_id || "",
      menu_item_name: raw.menu_item_name || raw.item_name || "Menu Item",
      delta: Number(delta || 0),
      previous_quantity: prev,
      new_quantity: nextVal,
      reason: raw.reason || "adjustment",
      notes: raw.notes || "",
      staff_name: raw.staff_name || raw.admin_id || "Admin",
      created_at: raw.created_at,
    } as NormalizedAdjustment;
  });
  return sortNewestFirst(rows);
}

// ==================== FAVORITES & DISH SUGGESTIONS ====================

export interface FavoriteRecord {
  id: string;
  user_id: string;
  menu_item_id: string;
  created_at?: any;
}

export function onFavoritesUpdate(userId: string, cb: (favs: FavoriteRecord[]) => void) {
  const q = query(collection(db, "favorites"), where("user_id", "==", userId));
  return onSnapshot(
    q,
    (snap) => {
      cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as FavoriteRecord[]);
    },
    () => cb([]),
  );
}

export async function toggleFavoriteWeb(
  userId: string,
  menuItemId: string,
  existingFavId?: string,
): Promise<boolean> {
  if (existingFavId) {
    await deleteDoc(doc(db, "favorites", existingFavId));
    return false;
  }
  await addDoc(collection(db, "favorites"), {
    user_id: userId,
    menu_item_id: menuItemId,
    created_at: new Date(),
  });
  return true;
}

export async function submitDishSuggestionWeb(data: {
  name: string;
  description?: string;
  user_id: string;
  user_email?: string;
  user_name?: string;
  nutrition?: any;
}) {
  await addDoc(collection(db, "menu_suggestions"), {
    name: data.name.trim(),
    description: (data.description || "").trim(),
    category: "suggestion",
    user_id: data.user_id,
    user_email: data.user_email || "",
    user_name: data.user_name || "",
    status: "pending",
    nutrition: stripUndefined(data.nutrition || {}),
    created_at: new Date(),
  });
}

// ==================== ORDERS ====================

export async function validateStockAndDeduct(
  items: { menu_item_id: string; name: string; quantity: number }[],
) {
  const isMtoItem = (d: any) => Boolean(d?.is_made_to_order || d?.category === "Made to Order");
  for (const item of items) {
    const itemRef = doc(db, "menu_items", item.menu_item_id);
    const snap = await getDoc(itemRef);
    if (!snap.exists()) throw new Error(`${item.name} is no longer available.`);
    const data = snap.data() as any;
    if (!data.available) throw new Error(`${item.name} is currently marked sold out.`);
    if (!isMtoItem(data) && Number(data.stock_quantity || 0) < item.quantity) {
      throw new Error(`Insufficient stock for ${item.name} (${data.stock_quantity} left).`);
    }
  }
  for (const item of items) {
    const itemRef = doc(db, "menu_items", item.menu_item_id);
    const snap = await getDoc(itemRef);
    if (snap.exists() && !isMtoItem(snap.data())) {
      const next = Math.max(0, Number(snap.data()?.stock_quantity || 0) - item.quantity);
      await updateDoc(itemRef, { stock_quantity: next, available: next > 0 });
    }
  }
}

export async function createOrder(data: {
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_lat?: number;
  customer_lng?: number;
  order_note?: string;
  items: OrderItem[];
  subtotal: number;
  delivery_fee: number;
  total: number;
  order_type: OrderType;
  payment_method: PaymentMethod;
  scheduled_date?: string;
  scheduled_time?: string;
}) {
  await validateStockAndDeduct(data.items);
  const order_number = await generateOrderNumber();
  const ref = await addDoc(collection(db, "orders"), {
    ...stripUndefined(data),
    order_number,
    status: "pending" as OrderStatus,
    created_at: new Date(),
    updated_at: new Date(),
  });
  return { id: ref.id, order_number };
}

export async function getOrders(): Promise<Order[]> {
  const snap = await getDocs(query(collection(db, "orders"), orderBy("created_at", "desc")));
  return sortOldestFirst(
    snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Order[],
  );
}

export function onAllOrdersUpdate(cb: (orders: Order[]) => void) {
  const q = query(collection(db, "orders"), orderBy("created_at", "desc"));
  return onSnapshot(q, (snap) => {
    cb(
      sortNewestFirst(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Order[],
      ),
    );
  });
}

export function onOrdersByUserUpdate(userId: string, cb: (orders: Order[]) => void) {
  const q = query(collection(db, "orders"), where("customer_id", "==", userId));
  return onSnapshot(q, (snap) => {
    cb(
      sortNewestFirst(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Order[],
      ),
    );
  });
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  extra?: {
    reject_reason?: string;
    issue_reason?: string;
    prepared_by?: string;
    driver_name?: string;
    driver_phone?: string;
  },
) {
  if (status === "cancelled" || status === "unable_to_fulfill") {
    const snap = await getDoc(doc(db, "orders", orderId));
    if (snap.exists()) {
      const existing = snap.data() as Order;
      if (existing.status !== "cancelled" && existing.status !== "unable_to_fulfill") {
        for (const item of existing.items || []) {
          if (!item.menu_item_id) continue;
          const mRef = doc(db, "menu_items", item.menu_item_id);
          const mSnap = await getDoc(mRef);
          if (mSnap.exists() && !mSnap.data()?.is_made_to_order) {
            await updateDoc(mRef, {
              stock_quantity: increment(item.quantity),
              available: true,
            });
          }
        }
      }
    }
  }
  await updateDoc(doc(db, "orders", orderId), {
    status,
    updated_at: new Date(),
    ...extra,
  });
}

// ==================== GCASH & REFUNDS ====================

export async function getPendingGcashNotifications() {
  const snap = await getDocs(
    query(collection(db, "notifications"), where("type", "==", "gcash_payment")),
  );
  return sortNewestFirst(
    snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as any) }))
      .filter((n) => !n.paid),
  );
}

export async function notifyGcashPayment(
  orderId: string,
  customerName: string,
  customerPhone: string,
  amount: number,
  opts?: { customerId?: string; orderNumber?: string },
) {
  const orderLabel = opts?.orderNumber || orderId;
  await addDoc(collection(db, "notifications"), {
    type: "gcash_payment",
    order_id: orderId,
    order_number: orderLabel,
    customer_id: opts?.customerId || null,
    customer_name: customerName,
    customer_phone: customerPhone,
    amount,
    paid: false,
    created_at: new Date(),
  });
  if (opts?.customerId) {
    await sendMessage({
      conversation_id: opts.customerId,
      sender_id: opts.customerId,
      sender_name: customerName,
      sender_role: "customer",
      content: `GCash payment sent: ₱${Number(amount).toFixed(2)} for order #${orderLabel}. Please verify. Thank you!`,
    });
  }
}

export async function markGcashPaid(notificationId: string) {
  await updateDoc(doc(db, "notifications", notificationId), {
    paid: true,
    paid_at: new Date(),
  });
}

export async function requestRefund(orderId: string, reason: string, imageUrl?: string) {
  await updateDoc(doc(db, "orders", orderId), {
    refund_status: "pending",
    refund_reason: reason,
    refund_image_url: imageUrl || null,
    updated_at: new Date(),
  });
  await addDoc(collection(db, "notifications"), {
    type: "refund_request",
    order_id: orderId,
    reason,
    created_at: new Date(),
  });
}

export async function processRefund(
  orderId: string,
  status: "approved" | "completed" | "rejected",
  extra?: { refund_rejection_reason?: string },
) {
  await updateDoc(doc(db, "orders", orderId), {
    refund_status: status,
    updated_at: new Date(),
    ...extra,
  });
}

// ==================== CHAT / SUPPORT MESSAGES ====================

export async function getConversations(archived = false) {
  const snap = await getDocs(collection(db, "messages"));
  const convMap = new Map<
    string,
    { customer_id: string; customer_name: string; last_message: string; unread: number; lastSec: number }
  >();

  snap.docs.forEach((d) => {
    const m = d.data() as Message;
    const isArch = Boolean(m.archived);
    if (archived !== isArch) return;
    const cid = m.conversation_id;
    const sec = toEpochSeconds(m.created_at);
    const prev = convMap.get(cid);
    const unreadInc = m.sender_role === "customer" && !m.read ? 1 : 0;
    if (!prev) {
      convMap.set(cid, {
        customer_id: cid,
        customer_name: m.sender_role === "customer" ? m.sender_name : "Customer",
        last_message: m.content,
        unread: unreadInc,
        lastSec: sec,
      });
    } else {
      if (m.sender_role === "customer" && m.sender_name) {
        prev.customer_name = m.sender_name;
      }
      if (sec >= prev.lastSec) {
        prev.last_message = m.content;
        prev.lastSec = sec;
      }
      prev.unread += unreadInc;
    }
  });

  return Array.from(convMap.values()).sort((a, b) => b.lastSec - a.lastSec);
}

export function onMessagesUpdate(conversationId: string, cb: (msgs: Message[]) => void) {
  const q = query(
    collection(db, "messages"),
    where("conversation_id", "==", conversationId),
  );
  return onSnapshot(q, (snap) => {
    const msgs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Message[];
    cb(
      msgs.sort((a, b) => toEpochSeconds(a.created_at) - toEpochSeconds(b.created_at)),
    );
  });
}

export async function sendMessage(data: {
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  content: string;
}) {
  await addDoc(collection(db, "messages"), {
    ...data,
    read: false,
    archived: false,
    created_at: new Date(),
  });
}

export async function markMessagesRead(conversationId: string, readerRole: string) {
  const q = query(
    collection(db, "messages"),
    where("conversation_id", "==", conversationId),
  );
  const snap = await getDocs(q);
  await Promise.all(
    snap.docs
      .filter((d) => !d.data().read && d.data().sender_role !== readerRole)
      .map((d) => updateDoc(doc(db, "messages", d.id), { read: true })),
  );
}

export async function archiveConversation(conversationId: string, archived: boolean) {
  const q = query(
    collection(db, "messages"),
    where("conversation_id", "==", conversationId),
  );
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map((d) => updateDoc(doc(db, "messages", d.id), { archived })));
}

export async function deleteConversation(conversationId: string) {
  const q = query(
    collection(db, "messages"),
    where("conversation_id", "==", conversationId),
  );
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map((d) => deleteDoc(doc(db, "messages", d.id))));
}

// ==================== BANNERS & REVIEWS ====================

export async function getBanners(): Promise<Banner[]> {
  const snap = await getDocs(collection(db, "banners"));
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as any) }) as Banner)
    .sort((a, b) => toEpochSeconds(b.createdAt) - toEpochSeconds(a.createdAt));
}

export async function saveBanner(
  data: { name: string; imageUrl: string; active: boolean },
  editId?: string | null,
) {
  if (editId) {
    await updateDoc(doc(db, "banners", editId), data);
  } else {
    await addDoc(collection(db, "banners"), { ...data, createdAt: new Date() });
  }
}

export async function deleteBanner(id: string) {
  await deleteDoc(doc(db, "banners", id));
}

export async function getReviews(): Promise<Review[]> {
  const snap = await getDocs(collection(db, "reviews"));
  return sortNewestFirst(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Review[]);
}

export async function addReview(data: Omit<Review, "id" | "created_at">) {
  await addDoc(collection(db, "reviews"), { ...data, created_at: new Date() });
}

export async function deleteReview(id: string) {
  await deleteDoc(doc(db, "reviews", id));
}

export interface LiveLocation {
  order_id: string;
  user_id: string;
  role: "customer" | "staff";
  lat: number;
  lng: number;
  accuracy?: number;
  speed?: number;
  updated_at?: any;
}

export function onLocationUpdate(
  orderId: string,
  role: "customer" | "staff",
  cb: (loc: LiveLocation | null) => void,
) {
  const ref = doc(db, "locations", `${orderId}_${role}`);
  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        cb(null);
        return;
      }
      cb(snap.data() as LiveLocation);
    },
    () => cb(null),
  );
}

export async function upsertLocationWeb(
  orderId: string,
  userId: string,
  role: "customer" | "staff",
  coords: { lat: number; lng: number; accuracy?: number; speed?: number },
) {
  await setDoc(
    doc(db, "locations", `${orderId}_${role}`),
    {
      order_id: orderId,
      user_id: userId,
      role,
      lat: coords.lat,
      lng: coords.lng,
      ...(coords.accuracy != null ? { accuracy: coords.accuracy } : {}),
      ...(coords.speed != null ? { speed: coords.speed } : {}),
      updated_at: new Date(),
    },
    { merge: true },
  );
}

// ==================== SETTINGS & LAMION RAG / LOGS ====================

export async function getSettings(): Promise<AppSettings> {
  const snap = await getDoc(doc(db, "settings", "app_settings"));
  const data = snap.exists() ? (snap.data() as Partial<AppSettings>) : {};
  return {
    delivery_fee: data.delivery_fee ?? 50,
    delivery_radius_km: data.delivery_radius_km ?? 10,
    gcash_enabled: data.gcash_enabled ?? false,
    gcash_number: data.gcash_number ?? "",
    gcash_qr_image: data.gcash_qr_image ?? "",
    store_name: data.store_name ?? "FoodFix",
    store_address: data.store_address ?? "P. Herrera St, Batangas City, 4200 Batangas",
    store_phone: data.store_phone ?? "",
    store_lat: data.store_lat ?? 14.031902,
    store_lng: data.store_lng ?? 121.206633,
  };
}

export async function updateSettings(data: Partial<AppSettings>) {
  await setDoc(doc(db, "settings", "app_settings"), data, { merge: true });
}

export async function getLamionRagKnowledge(): Promise<LamionRagKnowledge[]> {
  const snap = await getDocs(collection(db, "lamion_rag_knowledge"));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as LamionRagKnowledge[];
}

export async function getLamionAiLogs(): Promise<LamionAiLog[]> {
  const snap = await getDocs(query(collection(db, "lamion_ai_logs"), orderBy("created_at", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as LamionAiLog[];
}

// ==================== CLOUDINARY WEB UPLOAD ====================

export async function uploadToCloudinaryWeb(file: File, folder = "foodfix/web"): Promise<string> {
  const cloud = import.meta.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const preset = import.meta.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  if (!cloud || !preset) {
    throw new Error("Cloudinary env configuration missing.");
  }
  const body = new FormData();
  body.append("file", file);
  body.append("upload_preset", preset);
  body.append("folder", folder);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, {
    method: "POST",
    body,
  });
  const json = await res.json();
  if (!res.ok || !json.secure_url) {
    throw new Error(json?.error?.message || "Cloudinary upload failed");
  }
  return json.secure_url as string;
}

