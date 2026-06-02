import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useMemo } from "react";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useAuth, type UserProfile, type GroupData } from "@/contexts/AuthContext";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/admin")({
  head: () => ({ meta: [{ title: "Master Admin · Sincronia" }] }),
  component: AdminPage,
});

// ─── Constants ────────────────────────────────────────────────────────────────
type Tab = "overview" | "users" | "groups";

// ─── AdminPage ────────────────────────────────────────────────────────────────
function AdminPage() {
  const { isMasterAdmin, loading, user, profile } = useAuth();
  const navigate = useNavigate();

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

  /* ── Guards ── */
  useEffect(() => {
    if (!loading && !isMasterAdmin) navigate({ to: "/" });
  }, [loading, isMasterAdmin, navigate]);

  /* ── Toast ── */
  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  /* ── Fetch all data ── */
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

  useEffect(() => { if (isMasterAdmin) loadData(); }, [isMasterAdmin, loadData]);

  /* ── Curva de crescimento de usuários ── */
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

  /* ── Delete ── */
  const doDelete = async () => {
    if (!confirmDel) return;
    try {
      await deleteDoc(doc(db, confirmDel.type === "user" ? "users" : "groups", confirmDel.id));
      if (confirmDel.type === "user") setUsers((p) => p.filter((u) => u.uid !== confirmDel.id));
      else setGroups((p) => p.filter((g) => g.id !== confirmDel.id));
      showToast(`${confirmDel.type === "user" ? "Usuário" : "Grupo"} excluído com sucesso.`);
    } catch (e: any) {
      showToast(`Erro ao excluir: ${e?.message}`, false);
    } finally {
      setConfirmDel(null);
    }
  };

  /* ── Save user ── */
  const saveUser = async () => {
    if (!editingUser) return;
    try {
      await updateDoc(doc(db, "users", editingUser.uid), { name: editingUser.name, email: editingUser.email, emoji: editingUser.emoji });
      setUsers((p) => p.map((u) => (u.uid === editingUser.uid ? editingUser : u)));
      setEditingUser(null);
      showToast("Usuário atualizado.");
    } catch (e: any) { showToast(`Erro: ${e?.message}`, false); }
  };

  /* ── Save group ── */
  const saveGroup = async () => {
    if (!editingGroup) return;
    try {
      await updateDoc(doc(db, "groups", editingGroup.id), { groupName: editingGroup.groupName, groupEmoji: editingGroup.groupEmoji });
      setGroups((p) => p.map((g) => (g.id === editingGroup.id ? editingGroup : g)));
      setEditingGroup(null);
      showToast("Grupo atualizado.");
    } catch (e: any) { showToast(`Erro: ${e?.message}`, false); }
  };

  if (loading || !isMasterAdmin) return null;

  const filteredUsers  = users.filter((u) =>
    !userSearch || `${u.name} ${u.email}`.toLowerCase().includes(userSearch.toLowerCase())
  );
  const filteredGroups = groups.filter((g) =>
    !groupSearch || g.groupName?.toLowerCase().includes(groupSearch.toLowerCase())
  );

  return (
    /* Full-screen overlay que cobre o layout do casal por completo */
    <div className="fixed inset-0 z-[200] flex" style={{ background: "#0a0a0b", fontFamily: "inherit" }}>

      {/* ══════════════════ SIDEBAR ══════════════════ */}
      <aside
        className="flex-shrink-0 flex flex-col border-r h-full"
        style={{ width: 260, borderColor: "rgba(255,255,255,0.06)", background: "#0f0f12" }}
      >
        {/* Logo */}
        <div className="px-6 pt-7 pb-6 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-3">
            <div
              className="size-8 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#C9A96E,#a07940)" }}
            >
              <i className="ti ti-shield-bolt text-[15px] text-[#0a0a0b]" />
            </div>
            <div>
              <div className="text-[13px] font-semibold text-white leading-none">Sincronia</div>
              <div className="text-[10px] mt-0.5" style={{ color: "#C9A96E" }}>Master Control</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {([
            { id: "overview", icon: "ti-layout-dashboard", label: "Dashboard" },
            { id: "users",    icon: "ti-users",            label: `Usuários (${users.length})` },
            { id: "groups",   icon: "ti-heart",            label: `Casais (${groups.length})` },
          ] as { id: Tab; icon: string; label: string }[]).map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`w-full flex items-center gap-3 h-9 px-3 rounded-lg text-[13px] transition-all ${
                tab === item.id
                  ? "text-white font-medium"
                  : "text-white/40 hover:text-white/70"
              }`}
              style={tab === item.id ? { background: "rgba(201,169,110,0.12)", color: "#C9A96E" } : {}}
            >
              <i className={`ti ${item.icon} text-[15px]`} />
              {item.label}
            </button>
          ))}
        </nav>

        {/* Footer sidebar */}
        <div className="px-4 py-5 border-t space-y-3" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          {/* Usuário logado */}
          <div className="flex items-center gap-2.5 px-1">
            <div
              className="size-7 rounded-full flex items-center justify-center text-[13px]"
              style={{ background: "rgba(201,169,110,0.15)", color: "#C9A96E" }}
            >
              {profile?.emoji ?? "👑"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] text-white leading-none truncate">{profile?.name ?? "Admin"}</div>
              <div className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                {user?.email}
              </div>
            </div>
          </div>

          {/* Botões */}
          <Link
            to="/"
            className="w-full flex items-center gap-2 h-8 px-3 rounded-lg text-[12px] transition-all text-white/40 hover:text-white/70"
          >
            <i className="ti ti-arrow-left text-[14px]" />
            Voltar ao app
          </Link>

          <button
            onClick={loadData}
            disabled={loadingData}
            className="w-full flex items-center gap-2 h-8 px-3 rounded-lg text-[12px] transition-all text-white/40 hover:text-white/70 disabled:opacity-40"
          >
            <i className={`ti ti-refresh text-[14px] ${loadingData ? "animate-spin" : ""}`} />
            Atualizar dados
          </button>
        </div>
      </aside>

      {/* ══════════════════ MAIN AREA ══════════════════ */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">

        {/* Topbar */}
        <div
          className="flex-shrink-0 flex items-center justify-between px-8 h-14 border-b"
          style={{ borderColor: "rgba(255,255,255,0.06)", background: "#0f0f12" }}
        >
          <div className="flex items-center gap-3">
            <span
              className="text-[10px] uppercase tracking-[0.16em] px-2.5 py-1 rounded-full border font-medium"
              style={{ color: "#C9A96E", borderColor: "rgba(201,169,110,0.25)", background: "rgba(201,169,110,0.06)" }}
            >
              Master Admin
            </span>
            <span className="text-[13px] text-white/30">/</span>
            <span className="text-[13px] text-white/60 capitalize">
              {tab === "overview" ? "Dashboard" : tab === "users" ? "Usuários" : "Casais"}
            </span>
          </div>
          <div className="text-[11.5px]" style={{ color: "rgba(255,255,255,0.25)" }}>
            {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
          </div>
        </div>

        {/* Page content */}
        <div className="flex-1 p-8">

          {/* ─── TOAST ─── */}
          {toast && (
            <div
              className={`fixed top-5 right-5 z-[300] px-5 py-3 rounded-xl text-[13px] font-medium border backdrop-blur-sm transition-all`}
              style={{
                background: toast.ok ? "rgba(116,185,101,0.1)" : "rgba(239,68,68,0.1)",
                borderColor: toast.ok ? "rgba(116,185,101,0.3)" : "rgba(239,68,68,0.3)",
                color: toast.ok ? "#74b965" : "#f87171",
              }}
            >
              {toast.msg}
            </div>
          )}

          {/* ─── CONFIRM DELETE MODAL ─── */}
          {confirmDel && (
            <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
              <div
                className="w-full max-w-sm rounded-2xl border p-6"
                style={{ background: "#16161a", borderColor: "rgba(255,255,255,0.08)" }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="size-9 rounded-xl bg-red-500/10 flex items-center justify-center">
                    <i className="ti ti-alert-triangle text-red-400 text-[18px]" />
                  </div>
                  <div>
                    <div className="text-[15px] font-medium text-white">Confirmar exclusão</div>
                    <div className="text-[11.5px]" style={{ color: "rgba(255,255,255,0.4)" }}>Ação irreversível</div>
                  </div>
                </div>
                <p className="text-[13px] mb-6" style={{ color: "rgba(255,255,255,0.5)" }}>
                  Excluir permanentemente <strong className="text-white">{confirmDel.name}</strong> do banco de dados?
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setConfirmDel(null)}
                    className="flex-1 h-10 rounded-xl text-[13px] border transition"
                    style={{ borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={doDelete}
                    className="flex-1 h-10 rounded-xl text-[13px] font-medium bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 transition"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ─── EDIT USER MODAL ─── */}
          {editingUser && (
            <EditModal title="Editar Usuário" onClose={() => setEditingUser(null)} onSave={saveUser}>
              <AdminField label="Nome">
                <AdminInput value={editingUser.name} onChange={(v) => setEditingUser({ ...editingUser, name: v })} />
              </AdminField>
              <AdminField label="E-mail">
                <AdminInput value={editingUser.email} onChange={(v) => setEditingUser({ ...editingUser, email: v })} />
              </AdminField>
              <AdminField label="Emoji / Avatar">
                <AdminInput value={editingUser.emoji} onChange={(v) => setEditingUser({ ...editingUser, emoji: v })} />
              </AdminField>
            </EditModal>
          )}

          {/* ─── EDIT GROUP MODAL ─── */}
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

          {/* ══ TAB: DASHBOARD ══ */}
          {tab === "overview" && (
            <div className="space-y-6">
              {/* Título */}
              <div>
                <h1 className="text-[26px] font-semibold text-white leading-none">Dashboard</h1>
                <p className="text-[13px] mt-1.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                  Visão em tempo real do Sincronia
                </p>
              </div>

              {/* Metric Cards */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Usuários", value: users.length, icon: "ti-users", color: "#C9A96E", bg: "rgba(201,169,110,0.08)" },
                  { label: "Casais",   value: groups.length, icon: "ti-heart", color: "#74b965", bg: "rgba(116,185,101,0.08)" },
                  { label: "Lançamentos", value: txCount, icon: "ti-arrows-exchange", color: "#7c8cf8", bg: "rgba(124,140,248,0.08)" },
                ].map(({ label, value, icon, color, bg }) => (
                  <div
                    key={label}
                    className="rounded-2xl border p-5 flex flex-col gap-3"
                    style={{ background: "#16161a", borderColor: "rgba(255,255,255,0.06)" }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] uppercase tracking-[0.14em]" style={{ color: "rgba(255,255,255,0.35)" }}>
                        {label}
                      </span>
                      <div className="size-8 rounded-lg flex items-center justify-center" style={{ background: bg }}>
                        <i className={`ti ${icon} text-[15px]`} style={{ color }} />
                      </div>
                    </div>
                    <div className="text-[36px] font-semibold leading-none" style={{ color }}>
                      {loadingData ? "—" : value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Growth Chart */}
              <div
                className="rounded-2xl border p-6"
                style={{ background: "#16161a", borderColor: "rgba(255,255,255,0.06)" }}
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <div className="text-[14px] font-medium text-white">Crescimento de Usuários</div>
                    <div className="text-[12px] mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                      Acumulado ao longo do tempo
                    </div>
                  </div>
                  <div
                    className="text-[12px] px-3 py-1.5 rounded-lg border"
                    style={{ color: "#C9A96E", borderColor: "rgba(201,169,110,0.2)", background: "rgba(201,169,110,0.06)" }}
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
                      <XAxis
                        dataKey="date"
                        tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "#1c1c22",
                          border: "1px solid rgba(201,169,110,0.2)",
                          borderRadius: 10,
                          fontSize: 12,
                          color: "#fff",
                        }}
                        itemStyle={{ color: "#C9A96E" }}
                        cursor={{ stroke: "rgba(201,169,110,0.3)", strokeWidth: 1 }}
                      />
                      <Area
                        type="monotone"
                        dataKey="total"
                        stroke="#C9A96E"
                        strokeWidth={2}
                        fill="url(#goldGrad)"
                        dot={false}
                        activeDot={{ r: 4, fill: "#C9A96E", stroke: "#0a0a0b", strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div
                    className="h-[200px] flex items-center justify-center text-[13px]"
                    style={{ color: "rgba(255,255,255,0.25)" }}
                  >
                    {loadingData ? "Carregando dados…" : "Dados insuficientes para exibir o gráfico"}
                  </div>
                )}
              </div>

              {/* Recent Users */}
              <div
                className="rounded-2xl border overflow-hidden"
                style={{ background: "#16161a", borderColor: "rgba(255,255,255,0.06)" }}
              >
                <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                  <div className="text-[13px] font-medium text-white">Últimos cadastros</div>
                  <button
                    onClick={() => setTab("users")}
                    className="text-[11.5px] transition"
                    style={{ color: "#C9A96E" }}
                  >
                    Ver todos →
                  </button>
                </div>
                {loadingData ? (
                  <div className="px-6 py-8 text-[13px]" style={{ color: "rgba(255,255,255,0.3)" }}>Carregando…</div>
                ) : users.slice(0, 6).map((u, i) => (
                  <div
                    key={u.uid}
                    className="flex items-center gap-4 px-6 py-3.5 transition"
                    style={{
                      borderBottom: i < 5 ? "1px solid rgba(255,255,255,0.04)" : "none",
                    }}
                  >
                    <div
                      className="size-9 rounded-xl flex items-center justify-center text-lg shrink-0"
                      style={{ background: "rgba(255,255,255,0.05)" }}
                    >
                      {u.emoji || "👤"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] text-white truncate">{u.name}</div>
                      <div className="text-[11px] truncate" style={{ color: "rgba(255,255,255,0.3)" }}>{u.email}</div>
                    </div>
                    <div className="text-[11px] shrink-0" style={{ color: "rgba(255,255,255,0.25)" }}>
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString("pt-BR") : "—"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══ TAB: USERS ══ */}
          {tab === "users" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-[26px] font-semibold text-white leading-none">Usuários</h1>
                  <p className="text-[13px] mt-1.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                    {users.length} cadastros no banco de dados
                  </p>
                </div>
                {/* Search */}
                <div
                  className="flex items-center gap-2 h-9 px-3.5 rounded-xl border text-[13px]"
                  style={{ background: "#16161a", borderColor: "rgba(255,255,255,0.08)" }}
                >
                  <i className="ti ti-search text-[14px]" style={{ color: "rgba(255,255,255,0.3)" }} />
                  <input
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Buscar usuário…"
                    className="bg-transparent outline-none w-44 text-white"
                    style={{ caretColor: "#C9A96E", "::placeholder": { color: "rgba(255,255,255,0.25)" } } as any}
                  />
                </div>
              </div>

              <div
                className="rounded-2xl border overflow-hidden"
                style={{ background: "#16161a", borderColor: "rgba(255,255,255,0.06)" }}
              >
                {/* Header */}
                <div
                  className="grid px-6 py-3 border-b"
                  style={{
                    gridTemplateColumns: "2fr 2fr 1fr 1fr auto",
                    borderColor: "rgba(255,255,255,0.06)",
                    background: "rgba(255,255,255,0.02)",
                  }}
                >
                  {["Usuário", "E-mail", "Casal", "Cadastro", ""].map((h) => (
                    <span key={h} className="text-[10.5px] uppercase tracking-[0.14em]" style={{ color: "rgba(255,255,255,0.25)" }}>
                      {h}
                    </span>
                  ))}
                </div>

                {loadingData ? (
                  <div className="px-6 py-8 text-[13px]" style={{ color: "rgba(255,255,255,0.3)" }}>Carregando usuários…</div>
                ) : filteredUsers.length === 0 ? (
                  <div className="px-6 py-8 text-[13px]" style={{ color: "rgba(255,255,255,0.3)" }}>Nenhum usuário encontrado.</div>
                ) : filteredUsers.map((u, i) => {
                  const groupOf = groups.find((g) => g.members?.includes(u.uid));
                  const isMaster = u.email === "yandermarssico@gmail.com";
                  return (
                    <div
                      key={u.uid}
                      className="grid items-center px-6 py-3.5 transition hover:bg-white/[0.02]"
                      style={{
                        gridTemplateColumns: "2fr 2fr 1fr 1fr auto",
                        borderBottom: i < filteredUsers.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                      }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="size-8 rounded-lg flex items-center justify-center text-base shrink-0"
                          style={{ background: "rgba(255,255,255,0.05)" }}
                        >
                          {u.emoji || "👤"}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[13px] text-white truncate">{u.name}</div>
                          {isMaster && (
                            <span
                              className="text-[9px] px-1.5 py-0.5 rounded-full border font-medium"
                              style={{ color: "#C9A96E", borderColor: "rgba(201,169,110,0.3)", background: "rgba(201,169,110,0.08)" }}
                            >
                              MASTER
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-[12.5px] truncate pr-4" style={{ color: "rgba(255,255,255,0.45)" }}>
                        {u.email}
                      </span>
                      <span className="text-[12px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                        {groupOf ? `${groupOf.groupEmoji} ${groupOf.groupName}` : "—"}
                      </span>
                      <span className="text-[12px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString("pt-BR") : "—"}
                      </span>
                      <div className="flex gap-1.5">
                        <ActionBtn icon="ti-pencil" onClick={() => setEditingUser(u)} />
                        {!isMaster && (
                          <ActionBtn
                            icon="ti-trash"
                            danger
                            onClick={() => setConfirmDel({ type: "user", id: u.uid, name: u.name })}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ══ TAB: GROUPS ══ */}
          {tab === "groups" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-[26px] font-semibold text-white leading-none">Casais</h1>
                  <p className="text-[13px] mt-1.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                    {groups.length} grupos no banco de dados
                  </p>
                </div>
                <div
                  className="flex items-center gap-2 h-9 px-3.5 rounded-xl border text-[13px]"
                  style={{ background: "#16161a", borderColor: "rgba(255,255,255,0.08)" }}
                >
                  <i className="ti ti-search text-[14px]" style={{ color: "rgba(255,255,255,0.3)" }} />
                  <input
                    value={groupSearch}
                    onChange={(e) => setGroupSearch(e.target.value)}
                    placeholder="Buscar grupo…"
                    className="bg-transparent outline-none w-44 text-white"
                  />
                </div>
              </div>

              <div
                className="rounded-2xl border overflow-hidden"
                style={{ background: "#16161a", borderColor: "rgba(255,255,255,0.06)" }}
              >
                <div
                  className="grid px-6 py-3 border-b"
                  style={{
                    gridTemplateColumns: "2fr 1fr 1fr 1fr auto",
                    borderColor: "rgba(255,255,255,0.06)",
                    background: "rgba(255,255,255,0.02)",
                  }}
                >
                  {["Grupo", "Membros", "Código", "Criado em", ""].map((h) => (
                    <span key={h} className="text-[10.5px] uppercase tracking-[0.14em]" style={{ color: "rgba(255,255,255,0.25)" }}>
                      {h}
                    </span>
                  ))}
                </div>

                {loadingData ? (
                  <div className="px-6 py-8 text-[13px]" style={{ color: "rgba(255,255,255,0.3)" }}>Carregando grupos…</div>
                ) : filteredGroups.length === 0 ? (
                  <div className="px-6 py-8 text-[13px]" style={{ color: "rgba(255,255,255,0.3)" }}>Nenhum grupo encontrado.</div>
                ) : filteredGroups.map((g, i) => (
                  <div
                    key={g.id}
                    className="grid items-center px-6 py-3.5 transition hover:bg-white/[0.02]"
                    style={{
                      gridTemplateColumns: "2fr 1fr 1fr 1fr auto",
                      borderBottom: i < filteredGroups.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="size-8 rounded-lg flex items-center justify-center text-base shrink-0"
                        style={{ background: "rgba(255,255,255,0.05)" }}
                      >
                        {g.groupEmoji || "🏠"}
                      </div>
                      <span className="text-[13px] text-white truncate">{g.groupName}</span>
                    </div>
                    <span className="text-[12.5px]" style={{ color: "rgba(255,255,255,0.45)" }}>
                      {g.members?.length ?? 0} membro{(g.members?.length ?? 0) !== 1 ? "s" : ""}
                    </span>
                    <span
                      className="text-[11.5px] font-mono px-2 py-0.5 rounded-md w-fit"
                      style={{ color: "#C9A96E", background: "rgba(201,169,110,0.08)" }}
                    >
                      {g.inviteCode}
                    </span>
                    <span className="text-[12px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                      {g.createdAt ? new Date(g.createdAt).toLocaleDateString("pt-BR") : "—"}
                    </span>
                    <div className="flex gap-1.5">
                      <ActionBtn icon="ti-pencil" onClick={() => setEditingGroup(g)} />
                      <ActionBtn
                        icon="ti-trash"
                        danger
                        onClick={() => setConfirmDel({ type: "group", id: g.id, name: g.groupName })}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────
function ActionBtn({
  icon,
  danger,
  onClick,
}: {
  icon: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="size-7 rounded-lg border flex items-center justify-center transition"
      style={{
        borderColor: danger ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.08)",
        color: danger ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.35)",
        background: "transparent",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = danger
          ? "rgba(239,68,68,0.1)"
          : "rgba(255,255,255,0.05)";
        (e.currentTarget as HTMLButtonElement).style.color = danger ? "#f87171" : "rgba(255,255,255,0.7)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "transparent";
        (e.currentTarget as HTMLButtonElement).style.color = danger
          ? "rgba(239,68,68,0.5)"
          : "rgba(255,255,255,0.35)";
      }}
    >
      <i className={`ti ${icon} text-[13px]`} />
    </button>
  );
}

function EditModal({
  title,
  onClose,
  onSave,
  children,
}: {
  title: string;
  onClose: () => void;
  onSave: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div
        className="w-full max-w-sm rounded-2xl border p-6"
        style={{ background: "#1c1c22", borderColor: "rgba(255,255,255,0.1)" }}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="text-[16px] font-medium text-white">{title}</div>
          <button
            onClick={onClose}
            className="size-7 rounded-lg flex items-center justify-center transition"
            style={{ color: "rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.04)" }}
          >
            <i className="ti ti-x text-[13px]" />
          </button>
        </div>
        <div className="space-y-4">{children}</div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 h-10 rounded-xl border text-[13px] transition"
            style={{ borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.45)" }}
          >
            Cancelar
          </button>
          <button
            onClick={onSave}
            className="flex-1 h-10 rounded-xl text-[13px] font-medium transition"
            style={{ background: "#C9A96E", color: "#0a0a0b" }}
          >
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
      <div
        className="text-[10.5px] uppercase tracking-[0.14em] mb-1.5"
        style={{ color: "rgba(255,255,255,0.3)" }}
      >
        {label}
      </div>
      {children}
    </label>
  );
}

function AdminInput({
  value,
  onChange,
  mono = false,
}: {
  value: string;
  onChange: (v: string) => void;
  mono?: boolean;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full h-10 px-3 rounded-xl border text-[13px] text-white outline-none transition ${mono ? "font-mono" : ""}`}
      style={{
        background: "rgba(255,255,255,0.04)",
        borderColor: "rgba(255,255,255,0.1)",
        caretColor: "#C9A96E",
      }}
      onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(201,169,110,0.5)"; }}
      onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
    />
  );
}
