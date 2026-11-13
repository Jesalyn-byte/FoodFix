import { deleteApp, getApp, getApps, initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  orderBy,
  query,
  setDoc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.EXPO_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.EXPO_PUBLIC_FIREBASE_APP_ID || "",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const databaseId = import.meta.env.EXPO_PUBLIC_FIREBASE_DATABASE_ID;

export const auth = getAuth(app);
export const db =
  databaseId && databaseId !== "(default)" ? getFirestore(app, databaseId) : getFirestore(app);

export interface Profile {
  id: string;
  email: string;
  username: string;
  is_admin: boolean;
  role: "admin" | "staff" | "customer";
  phone?: string;
  address?: string;
  email_verified?: boolean;
  created_at?: Timestamp | { seconds: number } | Date;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  created_at?: Timestamp | { seconds: number };
}

export function onAuthChange(cb: (user: User | null) => void) {
  return onAuthStateChanged(auth, cb);
}

export function getCurrentUser(): User | null {
  return auth.currentUser;
}

export async function signIn(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function signUp(email: string, password: string, username: string) {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  await setDoc(doc(db, "users", cred.user.uid), {
    id: cred.user.uid,
    email: email.trim(),
    username: username.trim() || email.split("@")[0],
    role: "customer",
    is_admin: false,
    email_verified: true,
    created_at: new Date(),
  });
  return cred;
}

export async function resetPassword(email: string) {
  return sendPasswordResetEmail(auth, email.trim());
}

export async function logOut() {
  return signOut(auth);
}

export async function getProfile(uid: string): Promise<Profile | null> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  const data = snap.data() as any;
  return {
    id: snap.id,
    ...data,
    role: data.role || (data.is_admin ? "admin" : "customer"),
    is_admin: Boolean(data.is_admin || data.role === "admin"),
  };
}

export async function updateProfileDoc(uid: string, patch: Partial<Profile>) {
  await updateDoc(doc(db, "users", uid), patch as any);
}

export async function getAllUsers(): Promise<Profile[]> {
  const snap = await getDocs(collection(db, "users"));
  return snap.docs.map((d) => {
    const data = d.data() as any;
    return {
      id: d.id,
      ...data,
      role: data.role || (data.is_admin ? "admin" : "customer"),
      is_admin: Boolean(data.is_admin || data.role === "admin"),
    };
  });
}

export async function updateUserByAdmin(
  uid: string,
  data: { username?: string; phone?: string; address?: string; role?: Profile["role"] },
) {
  const payload: any = { ...data };
  if (data.role) {
    payload.is_admin = data.role === "admin";
  }
  await updateDoc(doc(db, "users", uid), payload);
}

export async function deleteUser(uid: string) {
  await deleteDoc(doc(db, "users", uid));
}

export async function createStaffAccount(input: {
  email: string;
  password: string;
  username: string;
  phone?: string;
}) {
  const secondaryApp = initializeApp(firebaseConfig, `staffCreator_${Date.now()}`);
  try {
    const secondaryAuth = getAuth(secondaryApp);
    const cred = await createUserWithEmailAndPassword(
      secondaryAuth,
      input.email.trim(),
      input.password,
    );
    await setDoc(doc(db, "users", cred.user.uid), {
      id: cred.user.uid,
      email: input.email.trim(),
      username: input.username.trim(),
      phone: input.phone?.trim() || "",
      role: "staff",
      is_admin: false,
      email_verified: true,
      created_at: new Date(),
    });
    await signOut(secondaryAuth);
    return cred.user.uid;
  } finally {
    await deleteApp(secondaryApp);
  }
}

export async function getCategories(): Promise<Category[]> {
  const snap = await getDocs(query(collection(db, "categories"), orderBy("name")));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}

export async function addCategory(name: string, color: string) {
  const ref = await addDoc(collection(db, "categories"), {
    name: name.trim(),
    color,
    created_at: new Date(),
  });
  return ref.id;
}

export async function updateCategory(id: string, name: string, color: string) {
  await updateDoc(doc(db, "categories", id), { name: name.trim(), color });
}

export async function deleteCategory(id: string) {
  await deleteDoc(doc(db, "categories", id));
}
