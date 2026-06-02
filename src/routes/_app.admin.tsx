import React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
import type { UserProfile, GroupData } from "@/contexts/AuthContext";

export const Route = createFileRoute("/_app/admin")({
  head: () => ({ meta: [{ title: "Admin Portal · Sincronia" }] }),
  component: AdminPortal,
});

// ─── Constants ────────────────────────────────────────────────────────────────
const MASTER_EMAIL = "yandermarssico@gmail.com";
const SESSION_KEY  = "sincronia_admin_session";
type Tab = "overview" | "users" | "groups";

// ─── Colors ──────────────────────────────────────────────────────────────────
const C = {
  bg:       "#090909",
  surface:  "#0f0f13",
  card:     "#13131a",
  border:   "rgba(255,255,255,0.06)",
  gold:     "#C9A96E",
  goldDim:  "rgba(201,169,110,0.12)",
  text:     "#ffffff",
  muted:    "rgba(255,255,255,0.38)",
  dimmer:   "rgba(255,255,255,0.18)",
};

// ─── AdminPortal ──────────────────────────────────────────────────────────────
function AdminPortal() {
  const [adminReady, setAdminReady] = useState(false);

  useEffect(() => {
    const ok = sessionStorage.getItem(SESSION_KEY) === "1";
    setAdminReady(ok);
  }, []);

  const handleLoginSuccess = () => {
    sessionStorage.setItem(SESSION_KEY, "1");
    setAdminReady(true);
  };

  const handleLogout = async () => {
    sessionStorage.removeItem(SESSION_KEY);
    setAdminReady(false);
    // Sign out from Firebase too, so it's a clean session
    await signOut(auth);
  };

  // Render a full-screen takeover — hides the entire app shell behind
  return (
    <div
      className="fixed inset-0 z-[500] overflow-hidden"
      style={{ background: C.bg, fontFamily: "inherit" }}
    >
      {adminReady
        ? <Dashboard onLogout={handleLogout} />
        : <LoginScreen onSuccess={handleLoginSuccess} />
      }
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// LOGIN SCREEN
// ══════════════════════════════════════════════════════════════════════════════
function LoginScreen({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail]       = useState(MASTER_EMAIL);
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const passRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError("Preencha todos os campos."); return; }
    if (email !== MASTER_EMAIL) { setError("Acesso restrito."); return; }
    setLoading(true);
    setError("");
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      if (cred.user.email !== MASTER_EMAIL) {
        await signOut(auth);
        setError("Credenciais não autorizadas.");
        return;
      }
      onSuccess();
    } catch (err: any) {
      const msg: Record<string, string> = {
        "auth/wrong-password":    "Senha incorreta.",
        "auth/invalid-credential":"Credenciais inválidas.",
        "auth/too-many-requests": "Muitas tentativas. Aguarde.",
        "auth/user-not-found":    "Usuário não encontrado.",
      };
      setError(msg[err.code] ?? "Erro de autenticação.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center px-4"
      style={{ background: `radial-gradient(ellipse 80% 60% at 50% 0%, rgba(201,169,110,0.06) 0%, transparent 60%), ${C.bg}` }}
    >
      {/* Grid pattern subtle */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Card */}
      <div
        className="relative w-full max-w-[400px] rounded-2xl border p-8"
        style={{ background: C.card, borderColor: "rgba(201,169,110,0.15)", boxShadow: "0 0 60px rgba(201,169,110,0.04)" }}
      >
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          {/* Icon */}
          <div
            className="size-12 rounded-xl flex items-center justify-center mb-4"
            style={{ background: "linear-gradient(135deg, #C9A96E, #8a6030)" }}
          >
            <i className="ti ti-shield-lock text-[22px]" style={{ color: "#090909" }} />
          </div>
          <div className="text-[20px] font-semibold" style={{ color: C.text }}>
            Admin Portal
          </div>
          <div className="text-[12.5px] mt-1" style={{ color: C.muted }}>
            Sincronia · Acesso Restrito
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <AdminField label="E-mail">
            <AdminInput
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="admin@sincronia.app"
              icon="ti-mail"
              onEnter={() => passRef.current?.focus()}
            />
          </AdminField>

          <AdminField label="Senha">
            <AdminInput
              ref={passRef}
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="••••••••••••"
              icon="ti-lock"
            />
          </AdminField>

          {error && (
            <div
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-[12.5px]"
              style={{ background: "rgba(239,68,68,0.08)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}
            >
              <i className="ti ti-alert-circle text-[14px] shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-xl text-[14px] font-semibold transition-all disabled:opacity-50 mt-2"
            style={{ background: C.gold, color: "#090909" }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <i className="ti ti-loader-2 animate-spin text-[16px]" />
                Verificando…
              </span>
            ) : "Entrar no Painel"}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-6 pt-5 border-t text-center text-[11.5px]" style={{ borderColor: C.border, color: C.dimmer }}>
          Acesso monitorado · Sincronia Admin {new Date().getFullYear()}
        </div>
      </div>

      {/* Watermark */}
      <div className="mt-6 text-[11px] tracking-[0.2em] uppercase" style={{ color: C.dimmer }}>
        Sincronia SaaS
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab]               = useState<Tab>("overview");
  const [users, setUsers]           = useState<UserProfile[]>([]);
  const [groups, setGroups]         = useState<(GroupData & { id: string })[]>([]);
  const [txCount, setTxCount]       = useState(0);
  const [loadingData, setLoadingData] = useState(true);
  const [editingUser, setEditingUser]   = useState<UserProfile | null>(null);
  const [editingGroup, setEditingGroup] = useState<(GroupData & { id: string }) | null>(null);
  const [confirmDel, setConfirmDel] = useState<{ type: "user" | "group"; id: string; name: string } | null>(null);
  const [toast, setToast]           = useState<{ msg: string; ok: boolean } | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [groupSearch, setGroupSearch] = useState("");

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [usersSnap, groupsSnap, txSnap] = await Promise.all([
        getDocs(query(collection(db, "users"), orderBy("createdAt", "desc"))),
        getDocs(query(collection(db, "groups"), orderBy("createdAt", "desc"))),
        getDocs(collection(db, "transacoes")),
      ]);
      setUsers(usersSnap.docs.map((d) => d.data() as UserProfile));
      setGroups(groupsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as GroupData) })));
      setTxCount(txSnap.size);
    } catch (e: any) {
      showToast(`Erro: ${e?.message ?? "Verifique as regras do Firestore"}`, false);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Growth chart
  const growthData = useMemo(() => {
    const map = new Map<string, number>();
    for (const u of users) {
      if (!u.createdAt) continue;
      const day = u.createdAt.slice(0, 10);
      map.set(day, (map.get(day) ?? 0) + 1);
    }
    const sorted = Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
    let acc = 0;
    return sorted.map(([date, count]) => {
      acc += count;
      return {
        date: new Date(date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
        total: acc,
      };
    });
  }, [users]);

  const doDelete = async () => {
    if (!confirmDel) return;
    try {
      await deleteDoc(doc(db, confirmDel.type === "user" ? "users" : "groups", confirmDel.id));
      if (confirmDel.type === "user") setUsers((p) => p.filter((u) => u.uid !== confirmDel.id));
      else setGroups((p) => p.filter((g) => g.id !== confirmDel.id));
      showToast(`${confirmDel.type === "user" ? "Usuário" : "Grupo"} excluído.`);
    } catch (e: any) {
      showToast(`Erro: ${e?.message}`, false);
    } finally { setConfirmDel(null); }
  };

  const saveUser = async () => {
    if (!editingUser) return;
    try {
      await updateDoc(doc(db, "users", editingUser.uid), { name: editingUser.name, email: editingUser.email, emoji: editingUser.emoji });
      setUsers((p) => p.map((u) => (u.uid === editingUser.uid ? editingUser : u)));
      setEditingUser(null);
      showToast("Usuário atualizado.");
    } catch (e: any) { showToast(`Erro: ${e?.message}`, false); }
  };

  const saveGroup = async () => {
    if (!editingGroup) return;
    try {
      await updateDoc(doc(db, "groups", editingGroup.id), { groupName: editingGroup.groupName, groupEmoji: editingGroup.groupEmoji });
      setGroups((p) => p.map((g) => (g.id === editingGroup.id ? editingGroup : g)));
      setEditingGroup(null);
      showToast("Grupo atualizado.");
    } catch (e: any) { showToast(`Erro: ${e?.message}`, false); }
  };

  const filteredUsers  = users.filter((u) =>
    !userSearch || `${u.name} ${u.email}`.toLowerCase().includes(userSearch.toLowerCase())
  );
  const filteredGroups = groups.filter((g) =>
    !groupSearch || g.groupName?.toLowerCase().includes(groupSearch.toLowerCase())
  );

  const navItems: { id: Tab; icon: string; label: string }[] = [
    { id: "overview", icon: "ti-layout-dashboard", label: "Dashboard" },
    { id: "users",    icon: "ti-users",            label: `Usuários (${users.length})` },
    { id: "groups",   icon: "ti-heart",            label: `Casais (${groups.length})` },
  ];

  return (
    <div className="w-full h-full flex" style={{ background: C.bg }}>

      {/* ── Toast ─────────────────────────────────────── */}
      {toast && (
        <div
          className="fixed top-4 right-4 z-[600] px-4 py-3 rounded-xl border text-[13px] font-medium backdrop-blur-sm"
          style={{
            background: toast.ok ? "rgba(116,185,101,0.1)" : "rgba(239,68,68,0.1)",
            borderColor: toast.ok ? "rgba(116,185,101,0.3)" : "rgba(239,68,68,0.3)",
            color: toast.ok ? "#74b965" : "#f87171",
          }}
        >
          {toast.msg}
        </div>
      )}

      {/* ── Confirm Delete ────────────────────────────── */}
      {confirmDel && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-2xl border p-6" style={{ background: "#1a1a22", borderColor: "rgba(255,255,255,0.1)" }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="size-9 rounded-xl bg-red-500/10 flex items-center justify-center">
                <i className="ti ti-alert-triangle text-red-400 text-[18px]" />
              </div>
              <div>
                <div className="text-[15px] font-medium text-white">Confirmar exclusão</div>
                <div className="text-[11.5px]" style={{ color: C.muted }}>Ação permanente e irreversível</div>
              </div>
            </div>
            <p className="text-[13px] mb-6" style={{ color: C.muted }}>
              Excluir <strong className="text-white">{confirmDel.name}</strong> do banco de dados?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDel(null)} className="flex-1 h-10 rounded-xl text-[13px] border transition" style={{ borderColor: "rgba(255,255,255,0.1)", color: C.muted }}>
                Cancelar
              </button>
              <button onClick={doDelete} className="flex-1 h-10 rounded-xl text-[13px] font-medium bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 transition">
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit User Modal ───────────────────────────── */}
      {editingUser && (
        <EditModal title="Editar Usuário" onClose={() => setEditingUser(null)} onSave={saveUser}>
          <AdminField label="Nome">
            <AdminInput value={editingUser.name} onChange={(v) => setEditingUser({ ...editingUser, name: v })} />
          </AdminField>
          <AdminField label="E-mail">
            <AdminInput value={editingUser.email} onChange={(v) => setEditingUser({ ...editingUser, email: v })} />
          </AdminField>
          <AdminField label="Emoji">
            <AdminInput value={editingUser.emoji} onChange={(v) => setEditingUser({ ...editingUser, emoji: v })} />
          </AdminField>
        </EditModal>
      )}

      {/* ── Edit Group Modal ──────────────────────────── */}
      {editingGroup && (
        <EditModal title="Editar Casal" onClose={() => setEditingGroup(null)} onSave={saveGroup}>
          <AdminField label="Nome do Grupo">
            <AdminInput value={editingGroup.groupName} onChange={(v) => setEditingGroup({ ...editingGroup, groupName: v })} />
          </AdminField>
          <AdminField label="Emoji">
            <AdminInput value={editingGroup.groupEmoji} onChange={(v) => setEditingGroup({ ...editingGroup, groupEmoji: v })} />
          </AdminField>
          <AdminField label="Código de Convite">
            <AdminInput value={editingGroup.inviteCode} onChange={(v) => setEditingGroup({ ...editingGroup, inviteCode: v })} mono />
          </AdminField>
        </EditModal>
      )}

      {/* ═══════════════ SIDEBAR ══════════════════════ */}
      <aside
        className="flex-shrink-0 flex flex-col h-full"
        style={{ width: 256, background: C.surface, borderRight: `1px solid ${C.border}` }}
      >
        {/* Brand */}
        <div className="px-5 pt-6 pb-5" style={{ borderBottom: `1px solid ${C.border}` }}>
          <div className="flex items-center gap-3">
            <div
              className="size-9 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #C9A96E, #8a6030)" }}
            >
              <i className="ti ti-shield-bolt text-[17px]" style={{ color: "#090909" }} />
            </div>
            <div>
              <div className="text-[14px] font-bold text-white leading-none">Sincronia</div>
              <div className="text-[10.5px] mt-0.5 font-medium tracking-[0.08em]" style={{ color: C.gold }}>
                Admin Portal
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <div className="text-[9.5px] uppercase tracking-[0.18em] px-3 pb-2" style={{ color: C.dimmer }}>
            Navegação
          </div>
          {navItems.map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className="w-full flex items-center gap-3 h-9 px-3 rounded-xl text-[13px] transition-all"
                style={{
                  background: active ? "rgba(201,169,110,0.1)" : "transparent",
                  color: active ? C.gold : C.muted,
                  fontWeight: active ? 500 : 400,
                }}
              >
                <i className={`ti ${item.icon} text-[15px]`} />
                {item.label}
                {active && (
                  <span className="ml-auto size-1.5 rounded-full" style={{ background: C.gold }} />
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar footer */}
        <div className="px-3 py-4 space-y-1" style={{ borderTop: `1px solid ${C.border}` }}>
          {/* Refresh */}
          <button
            onClick={loadData}
            disabled={loadingData}
            className="w-full flex items-center gap-3 h-9 px-3 rounded-xl text-[13px] transition-all disabled:opacity-40"
            style={{ color: C.muted }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <i className={`ti ti-refresh text-[15px] ${loadingData ? "animate-spin" : ""}`} />
            Atualizar dados
          </button>

          {/* Logout */}
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 h-9 px-3 rounded-xl text-[13px] transition-all"
            style={{ color: "#f87171" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.06)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <i className="ti ti-logout text-[15px]" />
            Sair do painel
          </button>
        </div>
      </aside>

      {/* ═══════════════ MAIN ═════════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <div
          className="flex-shrink-0 flex items-center justify-between px-8 h-14"
          style={{ background: C.surface, borderBottom: `1px solid ${C.border}` }}
        >
          <div className="flex items-center gap-3">
            <span
              className="text-[10px] uppercase tracking-[0.14em] px-2.5 py-1 rounded-full border font-medium"
              style={{ color: C.gold, borderColor: "rgba(201,169,110,0.25)", background: "rgba(201,169,110,0.06)" }}
            >
              Master
            </span>
            <span style={{ color: C.dimmer }}>/</span>
            <span className="text-[13px] capitalize" style={{ color: "rgba(255,255,255,0.55)" }}>
              {tab === "overview" ? "Dashboard" : tab === "users" ? "Usuários" : "Casais"}
            </span>
          </div>
          <div className="text-[11.5px]" style={{ color: C.dimmer }}>
            {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-8">

          {/* ── OVERVIEW ──────────────────────────────── */}
          {tab === "overview" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-[24px] font-bold text-white leading-none">Dashboard</h1>
                <p className="text-[13px] mt-1.5" style={{ color: C.muted }}>Visão em tempo real do Sincronia</p>
              </div>

              {/* Metric Cards */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Usuários", value: users.length, icon: "ti-users", color: C.gold, bg: "rgba(201,169,110,0.08)" },
                  { label: "Casais",   value: groups.length, icon: "ti-heart", color: "#74b965", bg: "rgba(116,185,101,0.08)" },
                  { label: "Lançamentos", value: txCount, icon: "ti-arrows-exchange", color: "#818cf8", bg: "rgba(129,140,248,0.08)" },
                ].map(({ label, value, icon, color, bg }) => (
                  <div
                    key={label}
                    className="rounded-2xl border p-5"
                    style={{ background: C.card, borderColor: C.border }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] uppercase tracking-[0.14em]" style={{ color: C.muted }}>{label}</span>
                      <div className="size-8 rounded-lg flex items-center justify-center" style={{ background: bg }}>
                        <i className={`ti ${icon} text-[15px]`} style={{ color }} />
                      </div>
                    </div>
                    <div className="text-[38px] font-bold leading-none" style={{ color }}>
                      {loadingData ? <span style={{ color: C.dimmer }}>—</span> : value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Growth Chart */}
              <div className="rounded-2xl border p-6" style={{ background: C.card, borderColor: C.border }}>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <div className="text-[14px] font-semibold text-white">Crescimento de Usuários</div>
                    <div className="text-[12px] mt-0.5" style={{ color: C.muted }}>Total acumulado ao longo do tempo</div>
                  </div>
                  <div
                    className="text-[12px] px-3 py-1.5 rounded-lg border"
                    style={{ color: C.gold, borderColor: "rgba(201,169,110,0.2)", background: "rgba(201,169,110,0.06)" }}
                  >
                    {users.length} total
                  </div>
                </div>

                {growthData.length > 1 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={growthData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                      <defs>
                        <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%"   stopColor="#C9A96E" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#C9A96E" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" tick={{ fill: C.dimmer, fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: C.dimmer, fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ background: "#1e1e28", border: `1px solid rgba(201,169,110,0.2)`, borderRadius: 10, fontSize: 12, color: "#fff" }}
                        itemStyle={{ color: C.gold }}
                        cursor={{ stroke: "rgba(201,169,110,0.25)", strokeWidth: 1 }}
                        formatter={(v: any) => [v, "Usuários"]}
                      />
                      <Area type="monotone" dataKey="total" stroke={C.gold} strokeWidth={2} fill="url(#goldGrad)" dot={false} activeDot={{ r: 4, fill: C.gold, stroke: C.bg, strokeWidth: 2 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-[13px]" style={{ color: C.dimmer }}>
                    {loadingData ? "Carregando…" : "Dados insuficientes para o gráfico"}
                  </div>
                )}
              </div>

              {/* Recent Users mini-list */}
              <div className="rounded-2xl border overflow-hidden" style={{ background: C.card, borderColor: C.border }}>
                <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: C.border }}>
                  <div className="text-[13px] font-semibold text-white">Últimos cadastros</div>
                  <button onClick={() => setTab("users")} className="text-[11.5px] transition" style={{ color: C.gold }}>Ver todos →</button>
                </div>
                {loadingData ? (
                  <div className="px-6 py-8 text-[13px]" style={{ color: C.dimmer }}>Carregando…</div>
                ) : users.slice(0, 5).map((u, i) => (
                  <div
                    key={u.uid}
                    className="flex items-center gap-4 px-6 py-3.5"
                    style={{ borderBottom: i < 4 ? `1px solid ${C.border}` : "none" }}
                  >
                    <div className="size-9 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ background: "rgba(255,255,255,0.05)" }}>
                      {u.emoji || "👤"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] text-white truncate">{u.name}</div>
                      <div className="text-[11px] truncate" style={{ color: C.dimmer }}>{u.email}</div>
                    </div>
                    <div className="text-[11px] shrink-0" style={{ color: C.dimmer }}>
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString("pt-BR") : "—"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── USERS ─────────────────────────────────── */}
          {tab === "users" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-[24px] font-bold text-white leading-none">Usuários</h1>
                  <p className="text-[13px] mt-1.5" style={{ color: C.muted }}>{users.length} cadastros</p>
                </div>
                <SearchBar value={userSearch} onChange={setUserSearch} placeholder="Buscar usuário…" />
              </div>
              <DataTable
                headers={["Usuário", "E-mail", "Casal", "Cadastro", ""]}
                cols="2fr 2fr 1.5fr 1fr auto"
                loadingData={loadingData}
                emptyMsg="Nenhum usuário encontrado."
              >
                {filteredUsers.map((u, i) => {
                  const groupOf = groups.find((g) => g.members?.includes(u.uid));
                  const isMaster = u.email === MASTER_EMAIL;
                  return (
                    <TableRow key={u.uid} cols="2fr 2fr 1.5fr 1fr auto" last={i === filteredUsers.length - 1}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="size-8 rounded-lg flex items-center justify-center text-base shrink-0" style={{ background: "rgba(255,255,255,0.05)" }}>
                          {u.emoji || "👤"}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[13px] text-white truncate">{u.name}</div>
                          {isMaster && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full border font-semibold" style={{ color: C.gold, borderColor: "rgba(201,169,110,0.3)", background: "rgba(201,169,110,0.08)" }}>
                              MASTER
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-[12.5px] pr-4 truncate" style={{ color: C.muted }}>{u.email}</span>
                      <span className="text-[12px]" style={{ color: C.dimmer }}>
                        {groupOf ? `${groupOf.groupEmoji} ${groupOf.groupName}` : "—"}
                      </span>
                      <span className="text-[12px]" style={{ color: C.dimmer }}>
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString("pt-BR") : "—"}
                      </span>
                      <div className="flex gap-1.5">
                        <ActionBtn icon="ti-pencil" onClick={() => setEditingUser(u)} />
                        {!isMaster && <ActionBtn icon="ti-trash" danger onClick={() => setConfirmDel({ type: "user", id: u.uid, name: u.name })} />}
                      </div>
                    </TableRow>
                  );
                })}
              </DataTable>
            </div>
          )}

          {/* ── GROUPS ────────────────────────────────── */}
          {tab === "groups" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-[24px] font-bold text-white leading-none">Casais</h1>
                  <p className="text-[13px] mt-1.5" style={{ color: C.muted }}>{groups.length} grupos</p>
                </div>
                <SearchBar value={groupSearch} onChange={setGroupSearch} placeholder="Buscar grupo…" />
              </div>
              <DataTable
                headers={["Grupo", "Membros", "Código", "Criado em", ""]}
                cols="2fr 1fr 1fr 1fr auto"
                loadingData={loadingData}
                emptyMsg="Nenhum grupo encontrado."
              >
                {filteredGroups.map((g, i) => (
                  <TableRow key={g.id} cols="2fr 1fr 1fr 1fr auto" last={i === filteredGroups.length - 1}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="size-8 rounded-lg flex items-center justify-center text-base shrink-0" style={{ background: "rgba(255,255,255,0.05)" }}>
                        {g.groupEmoji || "🏠"}
                      </div>
                      <span className="text-[13px] text-white truncate">{g.groupName}</span>
                    </div>
                    <span className="text-[12.5px]" style={{ color: C.muted }}>{g.members?.length ?? 0} membro(s)</span>
                    <span className="text-[11.5px] font-mono px-2 py-0.5 rounded-md w-fit" style={{ color: C.gold, background: "rgba(201,169,110,0.08)" }}>
                      {g.inviteCode}
                    </span>
                    <span className="text-[12px]" style={{ color: C.dimmer }}>
                      {g.createdAt ? new Date(g.createdAt).toLocaleDateString("pt-BR") : "—"}
                    </span>
                    <div className="flex gap-1.5">
                      <ActionBtn icon="ti-pencil" onClick={() => setEditingGroup(g)} />
                      <ActionBtn icon="ti-trash" danger onClick={() => setConfirmDel({ type: "group", id: g.id, name: g.groupName })} />
                    </div>
                  </TableRow>
                ))}
              </DataTable>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SHARED PRIMITIVES
// ══════════════════════════════════════════════════════════════════════════════
function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="flex items-center gap-2 h-9 px-3.5 rounded-xl border text-[13px]" style={{ background: C.card, borderColor: "rgba(255,255,255,0.08)" }}>
      <i className="ti ti-search text-[14px]" style={{ color: C.dimmer }} />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="bg-transparent outline-none w-44 text-white placeholder:text-[rgba(255,255,255,0.2)]" />
    </div>
  );
}

function DataTable({
  headers, cols, loadingData, emptyMsg, children,
}: {
  headers: string[];
  cols: string;
  loadingData: boolean;
  emptyMsg: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border overflow-hidden" style={{ background: C.card, borderColor: C.border }}>
      <div className="grid px-6 py-3 border-b" style={{ gridTemplateColumns: cols, borderColor: C.border, background: "rgba(255,255,255,0.02)" }}>
        {headers.map((h) => (
          <span key={h} className="text-[10.5px] uppercase tracking-[0.14em]" style={{ color: C.dimmer }}>{h}</span>
        ))}
      </div>
      {loadingData ? (
        <div className="px-6 py-10 flex items-center justify-center gap-2 text-[13px]" style={{ color: C.dimmer }}>
          <i className="ti ti-loader-2 animate-spin text-[16px]" /> Carregando…
        </div>
      ) : children}
    </div>
  );
}

function TableRow({ cols, last, children }: { cols: string; last: boolean; children: React.ReactNode }) {
  return (
    <div
      className="grid items-center px-6 py-3.5 transition"
      style={{ gridTemplateColumns: cols, borderBottom: last ? "none" : `1px solid ${C.border}` }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.015)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {children}
    </div>
  );
}

function ActionBtn({ icon, danger, onClick }: { icon: string; danger?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="size-7 rounded-lg border flex items-center justify-center transition-all"
      style={{ borderColor: danger ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.08)", color: danger ? "rgba(248,113,113,0.5)" : C.dimmer }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = danger ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.05)";
        e.currentTarget.style.color = danger ? "#f87171" : "rgba(255,255,255,0.7)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = danger ? "rgba(248,113,113,0.5)" : C.dimmer;
      }}
    >
      <i className={`ti ${icon} text-[13px]`} />
    </button>
  );
}

function EditModal({ title, onClose, onSave, children }: { title: string; onClose: () => void; onSave: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm rounded-2xl border p-6" style={{ background: "#1a1a22", borderColor: "rgba(255,255,255,0.1)" }}>
        <div className="flex items-center justify-between mb-5">
          <div className="text-[16px] font-semibold text-white">{title}</div>
          <button onClick={onClose} className="size-7 rounded-lg flex items-center justify-center" style={{ color: C.muted, background: "rgba(255,255,255,0.04)" }}>
            <i className="ti ti-x text-[13px]" />
          </button>
        </div>
        <div className="space-y-4">{children}</div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 h-10 rounded-xl border text-[13px] transition" style={{ borderColor: "rgba(255,255,255,0.1)", color: C.muted }}>
            Cancelar
          </button>
          <button onClick={onSave} className="flex-1 h-10 rounded-xl text-[13px] font-semibold transition" style={{ background: C.gold, color: "#090909" }}>
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[10.5px] uppercase tracking-[0.14em] mb-1.5" style={{ color: C.muted }}>{label}</div>
      {children}
    </label>
  );
}

const AdminInput = React.forwardRef<
  HTMLInputElement,
  {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    type?: string;
    icon?: string;
    mono?: boolean;
    onEnter?: () => void;
  }
>(function AdminInput({ value, onChange, placeholder, type = "text", icon, mono, onEnter }, ref) {
  const inner = (
    <input
      ref={ref}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      onKeyDown={(e) => { if (e.key === "Enter" && onEnter) onEnter(); }}
      className={`w-full h-10 rounded-xl border text-[13px] text-white outline-none transition ${mono ? "font-mono" : ""} ${icon ? "pl-10 pr-3" : "px-3"}`}
      style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)", caretColor: C.gold }}
      onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(201,169,110,0.5)")}
      onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
    />
  );
  if (!icon) return inner;
  return (
    <div className="relative">
      <i className={`ti ${icon} absolute left-3 top-1/2 -translate-y-1/2 text-[15px]`} style={{ color: C.dimmer }} />
      {inner}
    </div>
  );
});


