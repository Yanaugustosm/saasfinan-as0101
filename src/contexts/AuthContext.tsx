import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

// ─── Types ───────────────────────────────────────────────────────────────────
export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  emoji: string;
  paletteId: string;
  groupId: string | null;
  createdAt: string;
  suspended?: boolean;
  deletedAt?: string | null;
  isMaster?: boolean;
}

export interface GroupData {
  id: string;
  groupName: string;
  groupEmoji: string;
  createdBy: string;
  members: string[];
  memberProfiles: Record<string, UserProfile>;
  inviteCode: string;
  createdAt: string;
}

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  group: GroupData | null;
  loading: boolean;
  isMasterAdmin: boolean;
  register: (data: {
    email: string;
    password: string;
    name: string;
    emoji: string;
    paletteId: string;
  }) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  createGroup: (data: { groupName: string; groupEmoji: string }) => Promise<void>;
  joinGroup: (code: string) => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
  updateGroup: (data: Partial<GroupData>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const MASTER_EMAIL = "yandermarssico@gmail.com";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [group, setGroup] = useState<GroupData | null>(null);
  const [loading, setLoading] = useState(true);
  const groupUnsubRef = useRef<(() => void) | null>(null);
  const isMasterAdmin = user?.email === MASTER_EMAIL;

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        await loadProfile(firebaseUser.uid);
      } else {
        setUser(null);
        setProfile(null);
        setGroup(null);
        if (groupUnsubRef.current) groupUnsubRef.current();
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  async function loadProfile(uid: string) {
    const firebaseUser = auth.currentUser;
    const userEmail    = firebaseUser?.email ?? "";
    const isMaster     = userEmail === MASTER_EMAIL;
    const userRef      = doc(db, "users", uid);
    const snap         = await getDoc(userRef);

    // ── Profile exists ───────────────────────────────────────────────────────
    if (snap.exists()) {
      const p = snap.data() as UserProfile;

      // Soft-delete: verificar se está marcado como deletado
      if (p.deletedAt) {
        const deletedAt  = new Date(p.deletedAt);
        const diffDays   = (Date.now() - deletedAt.getTime()) / (1000 * 60 * 60 * 24);

        if (diffDays <= 7) {
          // ✅ Dentro de 7 dias → RESTAURAR a conta completamente
          const restored = { ...p, deletedAt: null, suspended: false };
          await updateDoc(userRef, { deletedAt: null, suspended: false });
          setProfile(restored);
          if (restored.groupId) subscribeToGroup(restored.groupId);
          return;
        } else {
          // ❌ Passou de 7 dias → recriar do zero
          const fresh = buildFreshProfile(uid, userEmail, isMaster);
          await setDoc(userRef, fresh);
          setProfile(fresh);
          return;
        }
      }

      // Perfil normal sem deleção
      setProfile(p);
      if (p.groupId) subscribeToGroup(p.groupId);
      return;
    }

    // ── Profile NÃO existe → recriar automaticamente ─────────────────────────
    const fresh = buildFreshProfile(uid, userEmail, isMaster);
    await setDoc(userRef, fresh);
    setProfile(fresh);
  }

  function buildFreshProfile(uid: string, email: string, isMaster: boolean): UserProfile {
    return {
      uid,
      email,
      name:      isMaster ? "Master Admin" : (auth.currentUser?.displayName ?? email.split("@")[0]),
      emoji:     isMaster ? "🛡️" : "😊",
      paletteId: "violet",
      groupId:   null,
      createdAt: new Date().toISOString(),
      isMaster,
      suspended: false,
      deletedAt: null,
    };
  }

  function subscribeToGroup(gid: string) {
    if (groupUnsubRef.current) groupUnsubRef.current();
    const unsub = onSnapshot(doc(db, "groups", gid), (snap) => {
      if (snap.exists()) setGroup({ id: snap.id, ...(snap.data() as Omit<GroupData, "id">) });
    });
    groupUnsubRef.current = unsub;
  }

  async function register({
    email,
    password,
    name,
    emoji,
    paletteId,
  }: {
    email: string;
    password: string;
    name: string;
    emoji: string;
    paletteId: string;
  }) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    const p: UserProfile = {
      uid: cred.user.uid,
      email,
      name,
      emoji: emoji || "😊",
      paletteId: paletteId || "violet",
      groupId: null,
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, "users", cred.user.uid), p);
    setProfile(p);
  }

  async function login(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function logout() {
    if (groupUnsubRef.current) groupUnsubRef.current();
    await signOut(auth);
  }

  async function createGroup({ groupName, groupEmoji }: { groupName: string; groupEmoji: string }) {
    if (!user || !profile) return;
    const ref = doc(collection(db, "groups"));
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const data = {
      groupName,
      groupEmoji: groupEmoji || "🏠",
      createdBy: user.uid,
      members: [user.uid],
      memberProfiles: {
        [user.uid]: {
          uid: user.uid,
          name: profile.name,
          emoji: profile.emoji,
          paletteId: profile.paletteId,
          email: profile.email,
        },
      },
      inviteCode,
      createdAt: new Date().toISOString(),
    };
    await setDoc(ref, data);
    await updateDoc(doc(db, "users", user.uid), { groupId: ref.id });
    setProfile((p) => p && { ...p, groupId: ref.id });
    subscribeToGroup(ref.id);
  }

  async function joinGroup(code: string) {
    if (!user || !profile) return;
    const q = query(collection(db, "groups"), where("inviteCode", "==", code.toUpperCase()));
    const snap = await getDocs(q);
    if (snap.empty) throw new Error("Código inválido.");
    const gDoc = snap.docs[0];
    const gData = gDoc.data() as GroupData;
    if (gData.members.includes(user.uid)) throw new Error("Você já é membro.");
    await updateDoc(doc(db, "groups", gDoc.id), {
      members: [...gData.members, user.uid],
      [`memberProfiles.${user.uid}`]: {
        uid: user.uid,
        name: profile.name,
        emoji: profile.emoji,
        paletteId: profile.paletteId,
        email: profile.email,
      },
    });
    await updateDoc(doc(db, "users", user.uid), { groupId: gDoc.id });
    setProfile((p) => p && { ...p, groupId: gDoc.id });
    subscribeToGroup(gDoc.id);
  }

  async function updateUserProfile(data: Partial<UserProfile>) {
    if (!user) return;
    await updateDoc(doc(db, "users", user.uid), data);
    if (profile?.groupId) {
      const updates: Record<string, unknown> = {};
      Object.keys(data).forEach((k) => {
        updates[`memberProfiles.${user.uid}.${k}`] = (data as Record<string, unknown>)[k];
      });
      await updateDoc(doc(db, "groups", profile.groupId), updates);
    }
    setProfile((p) => p && { ...p, ...data });
  }

  async function updateGroup(data: Partial<GroupData>) {
    if (!profile?.groupId) return;
    await updateDoc(doc(db, "groups", profile.groupId), data);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        group,
        loading,
        isMasterAdmin,
        register,
        login,
        logout,
        createGroup,
        joinGroup,
        updateUserProfile,
        updateGroup,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
