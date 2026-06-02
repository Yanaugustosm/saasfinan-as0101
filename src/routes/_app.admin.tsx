import React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useMemo } from "react";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import {
  collection, getDocs, deleteDoc, doc, updateDoc, query, orderBy,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
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

const C = {
  bg:      "#090909",
  surface: "#0f0f13",
  card:    "#13131a",
  border:  "rgba(255,255,255,0.06)",
  gold:    "#C9A96E",
  text:    "#ffffff",
  muted:   "rgba(255,255,255,0.38)",
  dim:     "rgba(255,255,255,0.18)",
  green:   "#74b965",
  red:     "#f87171",
};

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT
// ═══════════════════════════════════════════════════════════════════════════════
function AdminPortal() {
  const [adminReady, setAdminReady] = useState(false);

  useEffect(() => {
    setAdminReady(sessionStorage.getItem(SESSION_KEY) === "1");
  }, []);

  const handleLoginSuccess = () => { sessionStorage.setItem(SESSION_KEY, "1"); setAdminReady(true); };
  const handleLogout = async () => { sessionStorage.removeItem(SESSION_KEY); setAdminReady(false); await signOut(auth); };

  return (
    <div className="fixed inset-0 z-[500] overflow-hidden" style={{ background: C.bg }}>
      {adminReady ? <Dashboard onLogout={handleLogout} /> : <LoginScreen onSuccess={handleLoginSuccess} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOGIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
function LoginScreen({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail]       = useState(MASTER_EMAIL);
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) { setError("Digite a senha."); return; }
    if (email !== MASTER_EMAIL) { setError("Acesso restrito."); return; }
    setLoading(true); setError("");
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      if (cred.user.email !== MASTER_EMAIL) { await signOut(auth); setError("Não autorizado."); return; }
      onSuccess();
    } catch (err: any) {
      const msgs: Record<string, string> = {
        "auth/wrong-password": "Senha incorreta.",
        "auth/invalid-credential": "Credenciais inválidas.",
        "auth/too-many-requests": "Muitas tentativas. Aguarde.",
      };
      setError(msgs[err.code] ?? "Erro de autenticação.");
    } finally { setLoading(false); }
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center px-4 relative"
      style={{ background: `radial-gradient(ellipse 80% 60% at 50% 0%, rgba(201,169,110,0.07) 0%, transparent 60%), ${C.bg}` }}>
      <div className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{ backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)", backgroundSize: "48px 48px" }} />
      <div className="relative w-full max-w-[400px] rounded-2xl border p-8"
        style={{ background: C.card, borderColor: "rgba(201,169,110,0.15)", boxShadow: "0 0 80px rgba(201,169,110,0.05)" }}>
        <div className="flex flex-col items-center mb-8">
          <div className="size-12 rounded-xl flex items-center justify-center mb-4"
            style={{ background: "linear-gradient(135deg,#C9A96E,#8a6030)" }}>
            <i className="ti ti-shield-lock text-[22px]" style={{ color: "#090909" }} />
          </div>
          <div className="text-[20px] font-semibold text-white">Admin Portal</div>
          <div className="text-[12.5px] mt-1" style={{ color: C.muted }}>Sincronia · Acesso Restrito</div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <DField label="E-mail">
            <DInput type="email" value={email} onChange={setEmail} placeholder="admin@sincronia.app" icon="ti-mail" />
          </DField>
          <DField label="Senha">
            <DInput type="password" value={password} onChange={setPassword} placeholder="••••••••••••" icon="ti-lock" />
          </DField>
          {error && (
            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-[12.5px]"
              style={{ background: "rgba(239,68,68,0.08)", color: C.red, border: "1px solid rgba(239,68,68,0.2)" }}>
              <i className="ti ti-alert-circle text-[14px] shrink-0" />{error}
            </div>
          )}
          <button type="submit" disabled={loading}
            className="w-full h-11 rounded-xl text-[14px] font-semibold transition-all disabled:opacity-50 mt-2"
            style={{ background: C.gold, color: "#090909" }}>
            {loading
              ? <span className="flex items-center justify-center gap-2"><i className="ti ti-loader-2 animate-spin" />Verificando…</span>
              : "Entrar no Painel"}
          </button>
        </form>
        <div className="mt-6 pt-5 border-t text-center text-[11.5px]" style={{ borderColor: C.border, color: C.dim }}>
          Acesso monitorado · Sincronia Admin {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [users,   setUsers]   = useState<UserProfile[]>([]);
  const [groups,  setGroups]  = useState<(GroupData & { id: string })[]>([]);
  const [txCount, setTxCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const [tab,         setTab]         = useState<Tab>("overview");
  const [userSearch,  setUserSearch]  = useState("");
  const [groupSearch, setGroupSearch] = useState("");

  // ── Bulk selection ──
  const [selUsers,  setSelUsers]  = useState<Set<string>>(new Set());
  const [selGroups, setSelGroups] = useState<Set<string>>(new Set());

  // ── Side drawers ──
  const [drawerUser,  setDrawerUser]  = useState<UserProfile | null>(null);
  const [drawerGroup, setDrawerGroup] = useState<(GroupData & { id: string }) | null>(null);

  // ── Modals ──
  const [confirmDel,     setConfirmDel]     = useState<{ type: "user"|"group"; id: string; name: string } | null>(null);
  const [confirmBulkDel, setConfirmBulkDel] = useState<"user"|"group"|null>(null);

  // ── Toast ──
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Filtered ──
  const filteredUsers  = useMemo(() => users.filter(u => !userSearch  || `${u.name} ${u.email}`.toLowerCase().includes(userSearch.toLowerCase())),  [users,  userSearch]);
  const filteredGroups = useMemo(() => groups.filter(g => !groupSearch || g.groupName?.toLowerCase().includes(groupSearch.toLowerCase())), [groups, groupSearch]);

  // ── Load data ──
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [us, gs, ts] = await Promise.all([
        getDocs(query(collection(db, "users"),  orderBy("createdAt", "desc"))),
        getDocs(query(collection(db, "groups"), orderBy("createdAt", "desc"))),
        getDocs(collection(db, "transacoes")),
      ]);
      setUsers(us.docs.map(d => d.data() as UserProfile));
      setGroups(gs.docs.map(d => ({ id: d.id, ...(d.data() as GroupData) })));
      setTxCount(ts.size);
    } catch (e: any) {
      showToast(`Erro ao carregar: ${e?.message ?? "Verifique as regras do Firestore"}`, false);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Growth chart ──
  const growthData = useMemo(() => {
    const map = new Map<string, number>();
    for (const u of users) {
      if (!u.createdAt) continue;
      const day = u.createdAt.slice(0, 10);
      map.set(day, (map.get(day) ?? 0) + 1);
    }
    let acc = 0;
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, n]) => {
        acc += n;
        return { date: new Date(date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }), total: acc };
      });
  }, [users]);

  // ── Single delete ──
  const doSingleDelete = async () => {
    if (!confirmDel) return;
    try {
      await deleteDoc(doc(db, confirmDel.type === "user" ? "users" : "groups", confirmDel.id));
      if (confirmDel.type === "user") {
        setUsers(p => p.filter(u => u.uid !== confirmDel.id));
        if (drawerUser?.uid === confirmDel.id) setDrawerUser(null);
      } else {
        setGroups(p => p.filter(g => g.id !== confirmDel.id));
        if (drawerGroup?.id === confirmDel.id) setDrawerGroup(null);
      }
      showToast("Excluído com sucesso.");
    } catch (e: any) { showToast(`Erro: ${e?.message}`, false); }
    finally { setConfirmDel(null); }
  };

  // ── Bulk delete ──
  const doBulkDelete = async () => {
    const type = confirmBulkDel;
    if (!type) return;
    try {
      if (type === "user") {
        const count = selUsers.size;
        await Promise.all([...selUsers].map(id => deleteDoc(doc(db, "users", id))));
        setUsers(p => p.filter(u => !selUsers.has(u.uid)));
        setSelUsers(new Set());
        showToast(`${count} usuário(s) excluído(s).`);
      } else {
        const count = selGroups.size;
        await Promise.all([...selGroups].map(id => deleteDoc(doc(db, "groups", id))));
        setGroups(p => p.filter(g => !selGroups.has(g.id)));
        setSelGroups(new Set());
        showToast(`${count} casal(is) excluído(s).`);
      }
    } catch (e: any) { showToast(`Erro: ${e?.message}`, false); }
    finally { setConfirmBulkDel(null); }
  };

  // ── Selection helpers ──
  const toggleSelUser  = (uid: string) => setSelUsers(p  => { const n = new Set(p); n.has(uid) ? n.delete(uid) : n.add(uid); return n; });
  const toggleSelGroup = (id:  string) => setSelGroups(p => { const n = new Set(p); n.has(id)  ? n.delete(id)  : n.add(id);  return n; });
  const allUsersSelected  = filteredUsers.length  > 0 && filteredUsers.every(u  => selUsers.has(u.uid));
  const allGroupsSelected = filteredGroups.length > 0 && filteredGroups.every(g => selGroups.has(g.id));
  const toggleAllUsers  = () => allUsersSelected  ? setSelUsers(new Set())  : setSelUsers(new Set(filteredUsers.map(u => u.uid)));
  const toggleAllGroups = () => allGroupsSelected ? setSelGroups(new Set()) : setSelGroups(new Set(filteredGroups.map(g => g.id)));

  // ── CSV Export ──
  const exportUsersCSV = () => {
    const rows = [
      ["Nome", "E-mail", "Grupo", "Cadastrado em", "Status"],
      ...filteredUsers.map(u => {
        const g = groups.find(gr => gr.members?.includes(u.uid));
        return [u.name, u.email, g?.groupName ?? "—", u.createdAt?.slice(0, 10) ?? "—", u.suspended ? "Suspenso" : "Ativo"];
      }),
    ];
    downloadCSV(rows, `sincronia-usuarios-${new Date().toISOString().slice(0, 10)}.csv`);
    showToast(`${filteredUsers.length} usuários exportados.`);
  };
  const exportGroupsCSV = () => {
    const rows = [
      ["Grupo", "Emoji", "Membros", "Código", "Criado em"],
      ...filteredGroups.map(g => [g.groupName, g.groupEmoji ?? "", String(g.members?.length ?? 0), g.inviteCode ?? "—", g.createdAt?.slice(0, 10) ?? "—"]),
    ];
    downloadCSV(rows, `sincronia-casais-${new Date().toISOString().slice(0, 10)}.csv`);
    showToast(`${filteredGroups.length} casais exportados.`);
  };

  // ── Suspend / Reactivate ──
  const toggleSuspend = async (user: UserProfile) => {
    const next = !user.suspended;
    try {
      await updateDoc(doc(db, "users", user.uid), { suspended: next });
      setUsers(p => p.map(u => u.uid === user.uid ? { ...u, suspended: next } : u));
      if (drawerUser?.uid === user.uid) setDrawerUser(prev => prev ? { ...prev, suspended: next } : null);
      showToast(next ? `${user.name} suspenso.` : `${user.name} reativado.`);
    } catch (e: any) { showToast(`Erro: ${e?.message}`, false); }
  };

  // ── Save user ──
  const saveUser = async (updated: UserProfile) => {
    try {
      await updateDoc(doc(db, "users", updated.uid), { name: updated.name, email: updated.email, emoji: updated.emoji });
      setUsers(p => p.map(u => u.uid === updated.uid ? updated : u));
      setDrawerUser(updated);
      showToast("Usuário atualizado.");
    } catch (e: any) { showToast(`Erro: ${e?.message}`, false); }
  };

  // ── Save group ──
  const saveGroup = async (updated: GroupData & { id: string }) => {
    try {
      await updateDoc(doc(db, "groups", updated.id), { groupName: updated.groupName, groupEmoji: updated.groupEmoji });
      setGroups(p => p.map(g => g.id === updated.id ? updated : g));
      setDrawerGroup(updated);
      showToast("Grupo atualizado.");
    } catch (e: any) { showToast(`Erro: ${e?.message}`, false); }
  };

  const navItems: { id: Tab; icon: string; label: string }[] = [
    { id: "overview", icon: "ti-layout-dashboard", label: "Dashboard" },
    { id: "users",    icon: "ti-users",            label: `Usuários (${users.length})` },
    { id: "groups",   icon: "ti-heart",            label: `Casais (${groups.length})` },
  ];

  return (
    <div className="w-full h-full flex" style={{ background: C.bg }}>

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-[700] px-4 py-3 rounded-xl border text-[13px] font-medium"
          style={{ background: toast.ok ? "rgba(116,185,101,0.12)" : "rgba(239,68,68,0.12)", borderColor: toast.ok ? "rgba(116,185,101,0.3)" : "rgba(239,68,68,0.3)", color: toast.ok ? C.green : C.red }}>
          {toast.msg}
        </div>
      )}

      {/* Single delete modal */}
      {confirmDel && (
        <Modal>
          <ModalIcon icon="ti-alert-triangle" color={C.red} bg="rgba(239,68,68,0.1)" />
          <div className="mb-4">
            <div className="text-[15px] font-semibold text-white">Confirmar exclusão</div>
            <div className="text-[12px] mt-0.5" style={{ color: C.muted }}>Ação permanente e irreversível</div>
          </div>
          <p className="text-[13px] mb-6" style={{ color: C.muted }}>
            Excluir permanentemente <strong className="text-white">{confirmDel.name}</strong>?
          </p>
          <div className="flex gap-3">
            <ModalBtn label="Cancelar" onClick={() => setConfirmDel(null)} />
            <ModalBtn label="Excluir" onClick={doSingleDelete} danger />
          </div>
        </Modal>
      )}

      {/* Bulk delete modal */}
      {confirmBulkDel && (
        <Modal>
          <ModalIcon icon="ti-trash-x" color={C.red} bg="rgba(239,68,68,0.1)" />
          <div className="mb-4">
            <div className="text-[15px] font-semibold text-white">Exclusão em Massa</div>
            <div className="text-[12px] mt-0.5" style={{ color: C.muted }}>Esta ação não pode ser desfeita</div>
          </div>
          <p className="text-[13px] mb-6" style={{ color: C.muted }}>
            Excluir <strong className="text-white">
              {confirmBulkDel === "user" ? `${selUsers.size} usuário(s)` : `${selGroups.size} casal(is)`}
            </strong> permanentemente?
          </p>
          <div className="flex gap-3">
            <ModalBtn label="Cancelar" onClick={() => setConfirmBulkDel(null)} />
            <ModalBtn label={`Excluir ${confirmBulkDel === "user" ? selUsers.size : selGroups.size}`} onClick={doBulkDelete} danger />
          </div>
        </Modal>
      )}

      {/* User side drawer */}
      <UserSideDrawer
        user={drawerUser}
        groups={groups}
        onClose={() => setDrawerUser(null)}
        onSave={saveUser}
        onToggleSuspend={toggleSuspend}
        onDelete={u => { setDrawerUser(null); setConfirmDel({ type: "user", id: u.uid, name: u.name }); }}
      />

      {/* Group side drawer */}
      <GroupSideDrawer
        group={drawerGroup}
        users={users}
        onClose={() => setDrawerGroup(null)}
        onSave={saveGroup}
        onDelete={g => { setDrawerGroup(null); setConfirmDel({ type: "group", id: g.id, name: g.groupName }); }}
      />

      {/* ── SIDEBAR ── */}
      <aside className="flex-shrink-0 flex flex-col h-full" style={{ width: 256, background: C.surface, borderRight: `1px solid ${C.border}` }}>
        <div className="px-5 pt-6 pb-5" style={{ borderBottom: `1px solid ${C.border}` }}>
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#C9A96E,#8a6030)" }}>
              <i className="ti ti-shield-bolt text-[17px]" style={{ color: "#090909" }} />
            </div>
            <div>
              <div className="text-[14px] font-bold text-white leading-none">Sincronia</div>
              <div className="text-[10.5px] mt-0.5 font-medium tracking-[0.08em]" style={{ color: C.gold }}>Admin Portal</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          <div className="text-[9.5px] uppercase tracking-[0.18em] px-3 pb-2" style={{ color: C.dim }}>Navegação</div>
          {navItems.map(({ id, icon, label }) => {
            const active = tab === id;
            return (
              <button key={id}
                onClick={() => { setTab(id); setSelUsers(new Set()); setSelGroups(new Set()); }}
                className="w-full flex items-center gap-3 h-9 px-3 rounded-xl text-[13px] transition-all"
                style={{ background: active ? "rgba(201,169,110,0.1)" : "transparent", color: active ? C.gold : C.muted, fontWeight: active ? 500 : 400 }}>
                <i className={`ti ${icon} text-[15px]`} />
                {label}
                {active && <span className="ml-auto size-1.5 rounded-full" style={{ background: C.gold }} />}
              </button>
            );
          })}
        </nav>

        <div className="px-3 py-4 space-y-1" style={{ borderTop: `1px solid ${C.border}` }}>
          <SidebarBtn icon="ti-refresh" label="Atualizar dados" onClick={loadData} disabled={loading} spin={loading} />
          <SidebarBtn icon="ti-logout"  label="Sair do painel"  onClick={onLogout} red />
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <div className="flex-shrink-0 flex items-center justify-between px-8 h-14"
          style={{ background: C.surface, borderBottom: `1px solid ${C.border}` }}>
          <div className="flex items-center gap-3">
            <span className="text-[10px] uppercase tracking-[0.14em] px-2.5 py-1 rounded-full border font-medium"
              style={{ color: C.gold, borderColor: "rgba(201,169,110,0.25)", background: "rgba(201,169,110,0.06)" }}>Master</span>
            <span style={{ color: C.dim }}>/</span>
            <span className="text-[13px] capitalize" style={{ color: "rgba(255,255,255,0.55)" }}>
              {tab === "overview" ? "Dashboard" : tab === "users" ? "Usuários" : "Casais"}
            </span>
          </div>
          <div className="text-[11.5px]" style={{ color: C.dim }}>
            {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">

          {/* ── OVERVIEW ── */}
          {tab === "overview" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-[24px] font-bold text-white leading-none">Dashboard</h1>
                <p className="text-[13px] mt-1.5" style={{ color: C.muted }}>Visão em tempo real do Sincronia</p>
              </div>

              {/* Stat cards */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Usuários",    value: users.length,  icon: "ti-users",          color: C.gold,    bg: "rgba(201,169,110,0.08)" },
                  { label: "Casais",      value: groups.length, icon: "ti-heart",           color: C.green,   bg: "rgba(116,185,101,0.08)" },
                  { label: "Lançamentos", value: txCount,       icon: "ti-arrows-exchange", color: "#818cf8", bg: "rgba(129,140,248,0.08)" },
                ].map(({ label, value, icon, color, bg }) => (
                  <div key={label} className="rounded-2xl border p-5" style={{ background: C.card, borderColor: C.border }}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] uppercase tracking-[0.14em]" style={{ color: C.muted }}>{label}</span>
                      <div className="size-9 rounded-xl flex items-center justify-center" style={{ background: bg }}>
                        <i className={`ti ${icon} text-[18px]`} style={{ color }} />
                      </div>
                    </div>
                    <div className="text-[38px] font-bold leading-none" style={{ color }}>
                      {loading ? <span style={{ color: C.dim }}>—</span> : value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Growth chart */}
              <div className="rounded-2xl border p-6" style={{ background: C.card, borderColor: C.border }}>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <div className="text-[14px] font-semibold text-white">Crescimento de Usuários</div>
                    <div className="text-[12px] mt-0.5" style={{ color: C.muted }}>Total acumulado ao longo do tempo</div>
                  </div>
                  <div className="text-[12px] px-3 py-1.5 rounded-lg border"
                    style={{ color: C.gold, borderColor: "rgba(201,169,110,0.2)", background: "rgba(201,169,110,0.06)" }}>
                    {users.length} total
                  </div>
                </div>
                {growthData.length > 1 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={growthData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                      <defs>
                        <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%"   stopColor="#C9A96E" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#C9A96E" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" tick={{ fill: C.dim, fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: C.dim, fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ background: "#1e1e28", border: "1px solid rgba(201,169,110,0.2)", borderRadius: 10, fontSize: 12, color: "#fff" }}
                        itemStyle={{ color: C.gold }}
                        cursor={{ stroke: "rgba(201,169,110,0.25)", strokeWidth: 1 }}
                        formatter={(v: any) => [v, "Usuários"]}
                      />
                      <Area type="monotone" dataKey="total" stroke={C.gold} strokeWidth={2} fill="url(#goldGrad)" dot={false}
                        activeDot={{ r: 4, fill: C.gold, stroke: C.bg, strokeWidth: 2 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-[13px]" style={{ color: C.dim }}>
                    {loading ? "Carregando…" : "Dados insuficientes para o gráfico"}
                  </div>
                )}
              </div>

              {/* Recent users */}
              <div className="rounded-2xl border overflow-hidden" style={{ background: C.card, borderColor: C.border }}>
                <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: C.border }}>
                  <div className="text-[13px] font-semibold text-white">Últimos cadastros</div>
                  <button onClick={() => setTab("users")} className="text-[11.5px]" style={{ color: C.gold }}>Ver todos →</button>
                </div>
                {loading
                  ? <div className="px-6 py-8 text-[13px]" style={{ color: C.dim }}>Carregando…</div>
                  : users.slice(0, 5).map((u, i) => (
                    <div key={u.uid}
                      className="flex items-center gap-4 px-6 py-3.5 cursor-pointer transition hover:bg-white/[0.02]"
                      style={{ borderBottom: i < 4 ? `1px solid ${C.border}` : "none" }}
                      onClick={() => { setTab("users"); setDrawerUser(u); }}>
                      <div className="size-9 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ background: "rgba(255,255,255,0.05)" }}>{u.emoji || "👤"}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] text-white truncate">{u.name}</div>
                        <div className="text-[11px] truncate" style={{ color: C.dim }}>{u.email}</div>
                      </div>
                      {u.suspended && <SuspendBadge />}
                      <div className="text-[11px] shrink-0" style={{ color: C.dim }}>
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString("pt-BR") : "—"}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* ── USERS TAB ── */}
          {tab === "users" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-[24px] font-bold text-white leading-none">Usuários</h1>
                  <p className="text-[13px] mt-1.5" style={{ color: C.muted }}>{users.length} cadastros</p>
                </div>
                <div className="flex items-center gap-2">
                  <ExportBtn onClick={exportUsersCSV} count={filteredUsers.length} />
                  <SearchBar value={userSearch} onChange={setUserSearch} placeholder="Buscar usuário…" />
                </div>
              </div>

              {selUsers.size > 0 && (
                <BulkActionBar count={selUsers.size} onDelete={() => setConfirmBulkDel("user")} onClear={() => setSelUsers(new Set())} />
              )}

              <div className="rounded-2xl border overflow-hidden" style={{ background: C.card, borderColor: C.border }}>
                {/* Table header */}
                <div className="grid items-center px-4 py-3 border-b"
                  style={{ gridTemplateColumns: "36px 2fr 1.8fr 1.2fr 0.8fr 1fr 80px", borderColor: C.border, background: "rgba(255,255,255,0.02)" }}>
                  <Checkbox checked={allUsersSelected} onChange={toggleAllUsers} />
                  {["Usuário", "E-mail", "Casal", "Cadastro", "Status", ""].map(h => (
                    <span key={h} className="text-[10.5px] uppercase tracking-[0.14em]" style={{ color: C.dim }}>{h}</span>
                  ))}
                </div>

                {loading
                  ? <LoadingRow />
                  : filteredUsers.length === 0
                  ? <EmptyRow text="Nenhum usuário encontrado." />
                  : filteredUsers.map((u, i) => {
                    const grp      = groups.find(g => g.members?.includes(u.uid));
                    const isMaster = u.email === MASTER_EMAIL;
                    const selected = selUsers.has(u.uid);
                    return (
                      <div key={u.uid}
                        className="grid items-center px-4 py-3.5 transition cursor-pointer"
                        style={{
                          gridTemplateColumns: "36px 2fr 1.8fr 1.2fr 0.8fr 1fr 80px",
                          borderBottom: i < filteredUsers.length - 1 ? `1px solid ${C.border}` : "none",
                          background: selected ? "rgba(201,169,110,0.04)" : "transparent",
                        }}
                        onMouseEnter={e => { if (!selected) e.currentTarget.style.background = "rgba(255,255,255,0.015)"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = selected ? "rgba(201,169,110,0.04)" : "transparent"; }}>
                        <div onClick={e => e.stopPropagation()}>
                          <Checkbox checked={selected} onChange={() => toggleSelUser(u.uid)} disabled={isMaster} />
                        </div>
                        <div className="flex items-center gap-3 min-w-0" onClick={() => setDrawerUser(u)}>
                          <div className="size-8 rounded-lg flex items-center justify-center text-base shrink-0" style={{ background: "rgba(255,255,255,0.05)" }}>{u.emoji || "👤"}</div>
                          <div className="min-w-0">
                            <div className="text-[13px] text-white truncate">{u.name}</div>
                            {isMaster && <span className="text-[9px] px-1.5 py-0.5 rounded-full border font-semibold" style={{ color: C.gold, borderColor: "rgba(201,169,110,0.3)", background: "rgba(201,169,110,0.08)" }}>MASTER</span>}
                          </div>
                        </div>
                        <span className="text-[12.5px] pr-4 truncate" style={{ color: C.muted }} onClick={() => setDrawerUser(u)}>{u.email}</span>
                        <span className="text-[12px]" style={{ color: C.dim }} onClick={() => setDrawerUser(u)}>{grp ? `${grp.groupEmoji} ${grp.groupName}` : "—"}</span>
                        <span className="text-[12px]" style={{ color: C.dim }} onClick={() => setDrawerUser(u)}>{u.createdAt ? new Date(u.createdAt).toLocaleDateString("pt-BR") : "—"}</span>
                        <div onClick={() => setDrawerUser(u)}>{u.suspended ? <SuspendBadge /> : <ActiveBadge />}</div>
                        <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
                          <ActionBtn icon="ti-pencil" onClick={() => setDrawerUser(u)} />
                          {!isMaster && <ActionBtn icon="ti-trash" danger onClick={() => setConfirmDel({ type: "user", id: u.uid, name: u.name })} />}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* ── GROUPS TAB ── */}
          {tab === "groups" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-[24px] font-bold text-white leading-none">Casais</h1>
                  <p className="text-[13px] mt-1.5" style={{ color: C.muted }}>{groups.length} grupos</p>
                </div>
                <div className="flex items-center gap-2">
                  <ExportBtn onClick={exportGroupsCSV} count={filteredGroups.length} />
                  <SearchBar value={groupSearch} onChange={setGroupSearch} placeholder="Buscar grupo…" />
                </div>
              </div>

              {selGroups.size > 0 && (
                <BulkActionBar count={selGroups.size} onDelete={() => setConfirmBulkDel("group")} onClear={() => setSelGroups(new Set())} />
              )}

              <div className="rounded-2xl border overflow-hidden" style={{ background: C.card, borderColor: C.border }}>
                <div className="grid items-center px-4 py-3 border-b"
                  style={{ gridTemplateColumns: "36px 2fr 1fr 1fr 1fr 60px", borderColor: C.border, background: "rgba(255,255,255,0.02)" }}>
                  <Checkbox checked={allGroupsSelected} onChange={toggleAllGroups} />
                  {["Grupo", "Membros", "Código", "Criado em", ""].map(h => (
                    <span key={h} className="text-[10.5px] uppercase tracking-[0.14em]" style={{ color: C.dim }}>{h}</span>
                  ))}
                </div>

                {loading
                  ? <LoadingRow />
                  : filteredGroups.length === 0
                  ? <EmptyRow text="Nenhum grupo encontrado." />
                  : filteredGroups.map((g, i) => {
                    const selected = selGroups.has(g.id);
                    return (
                      <div key={g.id}
                        className="grid items-center px-4 py-3.5 transition cursor-pointer"
                        style={{
                          gridTemplateColumns: "36px 2fr 1fr 1fr 1fr 60px",
                          borderBottom: i < filteredGroups.length - 1 ? `1px solid ${C.border}` : "none",
                          background: selected ? "rgba(201,169,110,0.04)" : "transparent",
                        }}
                        onMouseEnter={e => { if (!selected) e.currentTarget.style.background = "rgba(255,255,255,0.015)"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = selected ? "rgba(201,169,110,0.04)" : "transparent"; }}>
                        <div onClick={e => e.stopPropagation()}>
                          <Checkbox checked={selected} onChange={() => toggleSelGroup(g.id)} />
                        </div>
                        <div className="flex items-center gap-3 min-w-0" onClick={() => setDrawerGroup(g)}>
                          <div className="size-8 rounded-lg flex items-center justify-center text-base shrink-0" style={{ background: "rgba(255,255,255,0.05)" }}>{g.groupEmoji || "🏠"}</div>
                          <span className="text-[13px] text-white truncate">{g.groupName}</span>
                        </div>
                        <span className="text-[12.5px]" style={{ color: C.muted }} onClick={() => setDrawerGroup(g)}>{g.members?.length ?? 0} membro(s)</span>
                        <span className="text-[11.5px] font-mono px-2 py-0.5 rounded-md" style={{ color: C.gold, background: "rgba(201,169,110,0.08)" }} onClick={() => setDrawerGroup(g)}>{g.inviteCode}</span>
                        <span className="text-[12px]" style={{ color: C.dim }} onClick={() => setDrawerGroup(g)}>{g.createdAt ? new Date(g.createdAt).toLocaleDateString("pt-BR") : "—"}</span>
                        <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
                          <ActionBtn icon="ti-pencil" onClick={() => setDrawerGroup(g)} />
                          <ActionBtn icon="ti-trash" danger onClick={() => setConfirmDel({ type: "group", id: g.id, name: g.groupName })} />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// USER SIDE DRAWER
// ═══════════════════════════════════════════════════════════════════════════════
function UserSideDrawer({ user, groups, onClose, onSave, onToggleSuspend, onDelete }: {
  user: UserProfile | null;
  groups: (GroupData & { id: string })[];
  onClose: () => void;
  onSave: (u: UserProfile) => void;
  onToggleSuspend: (u: UserProfile) => void;
  onDelete: (u: UserProfile) => void;
}) {
  const [local,  setLocal]  = useState<UserProfile | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setLocal(user ? { ...user } : null); }, [user]);

  const grp      = groups.find(g => g.members?.includes(user?.uid ?? ""));
  const isMaster = user?.email === MASTER_EMAIL;

  const handleSave = async () => {
    if (!local) return;
    setSaving(true);
    await onSave(local);
    setSaving(false);
  };

  return (
    <>
      <div className="fixed inset-0 z-[550] transition-opacity"
        style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)", opacity: user ? 1 : 0, pointerEvents: user ? "auto" : "none" }}
        onClick={onClose} />
      <div className="fixed top-0 right-0 h-full z-[560] flex flex-col overflow-y-auto"
        style={{ width: 420, background: "#0f0f15", borderLeft: `1px solid ${C.border}`, transform: user ? "translateX(0)" : "translateX(100%)", transition: "transform 0.32s cubic-bezier(0.32,0.72,0,1)" }}>
        {local && (
          <>
            <div className="flex items-center justify-between px-6 pt-6 pb-5" style={{ borderBottom: `1px solid ${C.border}` }}>
              <div className="text-[15px] font-semibold text-white">Detalhes do Usuário</div>
              <button onClick={onClose} className="size-8 rounded-lg flex items-center justify-center" style={{ color: C.muted, background: "rgba(255,255,255,0.04)" }}>
                <i className="ti ti-x text-[14px]" />
              </button>
            </div>
            <div className="px-6 py-5 flex items-center gap-4" style={{ borderBottom: `1px solid ${C.border}` }}>
              <div className="size-14 rounded-2xl flex items-center justify-center text-[28px]" style={{ background: "rgba(255,255,255,0.05)" }}>{local.emoji || "👤"}</div>
              <div>
                <div className="text-[16px] font-semibold text-white">{local.name}</div>
                <div className="text-[12.5px] mt-0.5" style={{ color: C.muted }}>{local.email}</div>
                <div className="flex items-center gap-2 mt-2">
                  {isMaster && <span className="text-[9px] px-1.5 py-0.5 rounded-full border font-semibold" style={{ color: C.gold, borderColor: "rgba(201,169,110,0.3)", background: "rgba(201,169,110,0.08)" }}>MASTER</span>}
                  {local.suspended ? <SuspendBadge /> : <ActiveBadge />}
                </div>
              </div>
            </div>
            <div className="flex-1 px-6 py-5 space-y-6">
              <div>
                <SectionLabel>Informações</SectionLabel>
                <div className="space-y-3 mt-3">
                  <DField label="Nome"><DInput value={local.name}  onChange={v => setLocal({ ...local, name: v })} /></DField>
                  <DField label="E-mail"><DInput value={local.email} onChange={v => setLocal({ ...local, email: v })} /></DField>
                  <DField label="Emoji"><DInput value={local.emoji}  onChange={v => setLocal({ ...local, emoji: v })} /></DField>
                </div>
                <button onClick={handleSave} disabled={saving}
                  className="mt-4 w-full h-10 rounded-xl text-[13px] font-semibold transition disabled:opacity-50"
                  style={{ background: C.gold, color: "#090909" }}>
                  {saving ? "Salvando…" : "Salvar alterações"}
                </button>
              </div>
              <div>
                <SectionLabel>Casal</SectionLabel>
                <div className="mt-3 rounded-xl border p-3 flex items-center gap-3" style={{ borderColor: C.border, background: "rgba(255,255,255,0.02)" }}>
                  <div className="size-9 rounded-lg flex items-center justify-center text-lg" style={{ background: "rgba(255,255,255,0.05)" }}>{grp?.groupEmoji || "🏠"}</div>
                  <div>
                    <div className="text-[13px] text-white">{grp?.groupName ?? "Sem grupo"}</div>
                    {grp && <div className="text-[11px] font-mono" style={{ color: C.dim }}>{grp.inviteCode}</div>}
                  </div>
                </div>
              </div>
              <div>
                <SectionLabel>Dados do sistema</SectionLabel>
                <div className="mt-3 space-y-2">
                  <MetaRow label="UID"       value={local.uid} mono />
                  <MetaRow label="Cadastro"  value={local.createdAt ? new Date(local.createdAt).toLocaleString("pt-BR") : "—"} />
                </div>
              </div>
              {!isMaster && (
                <div>
                  <SectionLabel>Status da conta</SectionLabel>
                  <div className="mt-3 rounded-xl border p-4 flex items-center justify-between" style={{ borderColor: C.border, background: "rgba(255,255,255,0.02)" }}>
                    <div>
                      <div className="text-[13px] text-white">{local.suspended ? "Conta suspensa" : "Conta ativa"}</div>
                      <div className="text-[11.5px] mt-0.5" style={{ color: C.muted }}>
                        {local.suspended ? "Usuário sem acesso ao app" : "Acesso liberado normalmente"}
                      </div>
                    </div>
                    <Toggle checked={!local.suspended} onChange={() => { onToggleSuspend(local); setLocal(l => l ? { ...l, suspended: !l.suspended } : null); }} />
                  </div>
                </div>
              )}
              {!isMaster && (
                <div>
                  <SectionLabel danger>Zona de perigo</SectionLabel>
                  <button onClick={() => onDelete(local)}
                    className="mt-3 w-full h-10 rounded-xl text-[13px] font-medium border transition"
                    style={{ borderColor: "rgba(239,68,68,0.3)", color: C.red, background: "rgba(239,68,68,0.06)" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(239,68,68,0.12)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "rgba(239,68,68,0.06)")}>
                    <i className="ti ti-trash mr-2" />Excluir conta permanentemente
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP SIDE DRAWER
// ═══════════════════════════════════════════════════════════════════════════════
function GroupSideDrawer({ group, users, onClose, onSave, onDelete }: {
  group: (GroupData & { id: string }) | null;
  users: UserProfile[];
  onClose: () => void;
  onSave: (g: GroupData & { id: string }) => void;
  onDelete: (g: GroupData & { id: string }) => void;
}) {
  const [local,  setLocal]  = useState<(GroupData & { id: string }) | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setLocal(group ? { ...group } : null); }, [group]);

  const members = users.filter(u => group?.members?.includes(u.uid));

  const handleSave = async () => {
    if (!local) return;
    setSaving(true);
    await onSave(local);
    setSaving(false);
  };

  return (
    <>
      <div className="fixed inset-0 z-[550] transition-opacity"
        style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)", opacity: group ? 1 : 0, pointerEvents: group ? "auto" : "none" }}
        onClick={onClose} />
      <div className="fixed top-0 right-0 h-full z-[560] flex flex-col overflow-y-auto"
        style={{ width: 400, background: "#0f0f15", borderLeft: `1px solid ${C.border}`, transform: group ? "translateX(0)" : "translateX(100%)", transition: "transform 0.32s cubic-bezier(0.32,0.72,0,1)" }}>
        {local && (
          <>
            <div className="flex items-center justify-between px-6 pt-6 pb-5" style={{ borderBottom: `1px solid ${C.border}` }}>
              <div className="text-[15px] font-semibold text-white">Detalhes do Casal</div>
              <button onClick={onClose} className="size-8 rounded-lg flex items-center justify-center" style={{ color: C.muted, background: "rgba(255,255,255,0.04)" }}>
                <i className="ti ti-x text-[14px]" />
              </button>
            </div>
            <div className="px-6 py-5 flex items-center gap-4" style={{ borderBottom: `1px solid ${C.border}` }}>
              <div className="size-14 rounded-2xl flex items-center justify-center text-[28px]" style={{ background: "rgba(255,255,255,0.05)" }}>{local.groupEmoji || "🏠"}</div>
              <div>
                <div className="text-[16px] font-semibold text-white">{local.groupName}</div>
                <div className="text-[12.5px] font-mono mt-1" style={{ color: C.gold }}>{local.inviteCode}</div>
              </div>
            </div>
            <div className="flex-1 px-6 py-5 space-y-6">
              <div>
                <SectionLabel>Informações</SectionLabel>
                <div className="space-y-3 mt-3">
                  <DField label="Nome do grupo"><DInput value={local.groupName}   onChange={v => setLocal({ ...local, groupName: v })} /></DField>
                  <DField label="Emoji"><DInput value={local.groupEmoji ?? ""} onChange={v => setLocal({ ...local, groupEmoji: v })} /></DField>
                  <DField label="Código de convite"><DInput value={local.inviteCode ?? ""} onChange={v => setLocal({ ...local, inviteCode: v })} mono /></DField>
                </div>
                <button onClick={handleSave} disabled={saving}
                  className="mt-4 w-full h-10 rounded-xl text-[13px] font-semibold transition disabled:opacity-50"
                  style={{ background: C.gold, color: "#090909" }}>
                  {saving ? "Salvando…" : "Salvar alterações"}
                </button>
              </div>
              <div>
                <SectionLabel>Membros ({members.length})</SectionLabel>
                <div className="mt-3 space-y-2">
                  {members.length === 0
                    ? <div className="text-[13px]" style={{ color: C.dim }}>Sem membros</div>
                    : members.map(u => (
                      <div key={u.uid} className="flex items-center gap-3 rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}` }}>
                        <div className="size-8 rounded-lg flex items-center justify-center text-base" style={{ background: "rgba(255,255,255,0.05)" }}>{u.emoji || "👤"}</div>
                        <div>
                          <div className="text-[13px] text-white">{u.name}</div>
                          <div className="text-[11px]" style={{ color: C.dim }}>{u.email}</div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
              <div>
                <SectionLabel>Dados do sistema</SectionLabel>
                <div className="mt-3 space-y-2">
                  <MetaRow label="ID do grupo" value={local.id} mono />
                  <MetaRow label="Criado em"   value={local.createdAt ? new Date(local.createdAt).toLocaleString("pt-BR") : "—"} />
                </div>
              </div>
              <div>
                <SectionLabel danger>Zona de perigo</SectionLabel>
                <button onClick={() => onDelete(local)}
                  className="mt-3 w-full h-10 rounded-xl text-[13px] font-medium border transition"
                  style={{ borderColor: "rgba(239,68,68,0.3)", color: C.red, background: "rgba(239,68,68,0.06)" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(239,68,68,0.12)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "rgba(239,68,68,0.06)")}>
                  <i className="ti ti-trash mr-2" />Excluir grupo permanentemente
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRIMITIVES
// ═══════════════════════════════════════════════════════════════════════════════
function BulkActionBar({ count, onDelete, onClear }: { count: number; onDelete: () => void; onClear: () => void }) {
  return (
    <div className="flex items-center justify-between px-5 py-3 rounded-2xl border"
      style={{ background: "rgba(201,169,110,0.06)", borderColor: "rgba(201,169,110,0.2)" }}>
      <div className="flex items-center gap-3">
        <div className="size-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(201,169,110,0.15)" }}>
          <i className="ti ti-check text-[14px]" style={{ color: C.gold }} />
        </div>
        <span className="text-[13px] font-medium" style={{ color: C.gold }}>{count} item(s) selecionado(s)</span>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onClear} className="h-8 px-3.5 rounded-lg text-[12.5px] border transition"
          style={{ borderColor: "rgba(255,255,255,0.1)", color: C.muted }}>Limpar seleção</button>
        <button onClick={onDelete}
          className="h-8 px-3.5 rounded-lg text-[12.5px] font-medium border transition"
          style={{ borderColor: "rgba(239,68,68,0.3)", color: C.red, background: "rgba(239,68,68,0.08)" }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(239,68,68,0.15)")}
          onMouseLeave={e => (e.currentTarget.style.background = "rgba(239,68,68,0.08)")}>
          <i className="ti ti-trash mr-1.5" />Excluir {count}
        </button>
      </div>
    </div>
  );
}

function ExportBtn({ onClick, count }: { onClick: () => void; count: number }) {
  return (
    <button onClick={onClick}
      className="h-9 px-3.5 rounded-xl border flex items-center gap-2 text-[12.5px] transition"
      style={{ background: "rgba(116,185,101,0.06)", borderColor: "rgba(116,185,101,0.2)", color: C.green }}
      onMouseEnter={e => (e.currentTarget.style.background = "rgba(116,185,101,0.12)")}
      onMouseLeave={e => (e.currentTarget.style.background = "rgba(116,185,101,0.06)")}>
      <i className="ti ti-download text-[14px]" />Exportar CSV ({count})
    </button>
  );
}

function Checkbox({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); if (!disabled) onChange(); }}
      disabled={disabled}
      className="size-5 rounded-md border flex items-center justify-center shrink-0 transition-all"
      style={{ background: checked ? C.gold : "transparent", borderColor: checked ? C.gold : "rgba(255,255,255,0.2)", opacity: disabled ? 0.3 : 1 }}>
      {checked && <i className="ti ti-check text-[11px]" style={{ color: "#090909", fontWeight: 700 }} />}
    </button>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange}
      className="relative w-11 h-6 rounded-full transition-all shrink-0"
      style={{ background: checked ? C.gold : "rgba(255,255,255,0.1)" }}>
      <div className="absolute top-0.5 size-5 rounded-full transition-transform"
        style={{ background: "#fff", transform: checked ? "translateX(22px)" : "translateX(2px)", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
    </button>
  );
}

function SuspendBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium"
      style={{ color: C.red, borderColor: "rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)" }}>
      <span className="size-1.5 rounded-full" style={{ background: C.red }} />Suspenso
    </span>
  );
}

function ActiveBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium"
      style={{ color: C.green, borderColor: "rgba(116,185,101,0.3)", background: "rgba(116,185,101,0.08)" }}>
      <span className="size-1.5 rounded-full" style={{ background: C.green }} />Ativo
    </span>
  );
}

function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="flex items-center gap-2 h-9 px-3.5 rounded-xl border" style={{ background: C.card, borderColor: "rgba(255,255,255,0.08)" }}>
      <i className="ti ti-search text-[14px]" style={{ color: C.dim }} />
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="bg-transparent outline-none w-44 text-[13px] text-white placeholder:text-[rgba(255,255,255,0.2)]" />
    </div>
  );
}

function ActionBtn({ icon, danger, onClick }: { icon: string; danger?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="size-7 rounded-lg border flex items-center justify-center transition-all"
      style={{ borderColor: danger ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.08)", color: danger ? "rgba(248,113,113,0.6)" : C.dim }}
      onMouseEnter={e => { e.currentTarget.style.background = danger ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.06)"; e.currentTarget.style.color = danger ? C.red : "rgba(255,255,255,0.8)"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = danger ? "rgba(248,113,113,0.6)" : C.dim; }}>
      <i className={`ti ${icon} text-[13px]`} />
    </button>
  );
}

function SidebarBtn({ icon, label, onClick, disabled, spin, red }: { icon: string; label: string; onClick: () => void; disabled?: boolean; spin?: boolean; red?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="w-full flex items-center gap-3 h-9 px-3 rounded-xl text-[13px] transition-all disabled:opacity-40"
      style={{ color: red ? C.red : C.muted }}
      onMouseEnter={e => (e.currentTarget.style.background = red ? "rgba(239,68,68,0.06)" : "rgba(255,255,255,0.04)")}
      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
      <i className={`ti ${icon} text-[15px] ${spin ? "animate-spin" : ""}`} />{label}
    </button>
  );
}

function Modal({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[650] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm rounded-2xl border p-6" style={{ background: "#1a1a22", borderColor: "rgba(255,255,255,0.1)" }}>
        {children}
      </div>
    </div>
  );
}

function ModalIcon({ icon, color, bg }: { icon: string; color: string; bg: string }) {
  return (
    <div className="size-10 rounded-xl flex items-center justify-center mb-4" style={{ background: bg }}>
      <i className={`ti ${icon} text-[20px]`} style={{ color }} />
    </div>
  );
}

function ModalBtn({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick}
      className="flex-1 h-10 rounded-xl text-[13px] font-medium border transition"
      style={danger
        ? { background: "rgba(239,68,68,0.12)", borderColor: "rgba(239,68,68,0.3)", color: C.red }
        : { borderColor: "rgba(255,255,255,0.1)", color: C.muted }}
      onMouseEnter={e => { if (danger) e.currentTarget.style.background = "rgba(239,68,68,0.2)"; }}
      onMouseLeave={e => { if (danger) e.currentTarget.style.background = "rgba(239,68,68,0.12)"; }}>
      {label}
    </button>
  );
}

function LoadingRow() {
  return (
    <div className="px-6 py-10 flex items-center justify-center gap-2 text-[13px]" style={{ color: C.dim }}>
      <i className="ti ti-loader-2 animate-spin text-[16px]" />Carregando…
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return <div className="px-6 py-10 text-[13px] text-center" style={{ color: C.dim }}>{text}</div>;
}

function SectionLabel({ children, danger }: { children: React.ReactNode; danger?: boolean }) {
  return (
    <div className="text-[10.5px] uppercase tracking-[0.18em] font-medium" style={{ color: danger ? "rgba(248,113,113,0.6)" : C.dim }}>
      {children}
    </div>
  );
}

function MetaRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
      <span className="text-[11.5px]" style={{ color: C.muted }}>{label}</span>
      <span className={`text-[11.5px] ${mono ? "font-mono" : ""} truncate max-w-[220px]`} style={{ color: C.dim }}>{value}</span>
    </div>
  );
}

function DField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[10.5px] uppercase tracking-[0.14em] mb-1.5" style={{ color: C.muted }}>{label}</div>
      {children}
    </label>
  );
}

function DInput({ value, onChange, placeholder, type = "text", icon, mono }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; icon?: string; mono?: boolean;
}) {
  const cls = `w-full h-10 rounded-xl border text-[13px] text-white outline-none transition ${mono ? "font-mono" : ""} ${icon ? "pl-10 pr-3" : "px-3"}`;
  const style = { background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)", caretColor: C.gold } as React.CSSProperties;
  const input = (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={cls} style={style}
      onFocus={e => (e.currentTarget.style.borderColor = "rgba(201,169,110,0.5)")}
      onBlur={e  => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")} />
  );
  if (!icon) return input;
  return (
    <div className="relative">
      <i className={`ti ${icon} absolute left-3 top-1/2 -translate-y-1/2 text-[15px]`} style={{ color: C.dim }} />
      {input}
    </div>
  );
}

// ─── CSV download helper ──────────────────────────────────────────────────────
function downloadCSV(rows: string[][], filename: string) {
  const csv  = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement("a"), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}
