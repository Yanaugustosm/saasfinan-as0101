import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
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
import { useAuth, type UserProfile, type GroupData } from "@/contexts/AuthContext";

export const Route = createFileRoute("/_app/admin")({
  head: () => ({
    meta: [{ title: "Master Admin · Sincronia" }],
  }),
  component: AdminPage,
});

// ─── Types ────────────────────────────────────────────────────────────────────
interface AdminStats {
  totalUsers: number;
  totalGroups: number;
  totalTransactions: number;
}

// ─── AdminPage ────────────────────────────────────────────────────────────────
function AdminPage() {
  const { isMasterAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"overview" | "users" | "groups">("overview");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [groups, setGroups] = useState<(GroupData & { id: string })[]>([]);
  const [stats, setStats] = useState<AdminStats>({ totalUsers: 0, totalGroups: 0, totalTransactions: 0 });
  const [loadingData, setLoadingData] = useState(true);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editingGroup, setEditingGroup] = useState<(GroupData & { id: string }) | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ type: "user" | "group"; id: string; name: string } | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  // Proteção de rota — só o mestre acessa
  useEffect(() => {
    if (!loading && !isMasterAdmin) {
      navigate({ to: "/" });
    }
  }, [loading, isMasterAdmin, navigate]);

  const showToast = (msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [usersSnap, groupsSnap] = await Promise.all([
        getDocs(query(collection(db, "users"), orderBy("createdAt", "desc"))),
        getDocs(query(collection(db, "groups"), orderBy("createdAt", "desc"))),
      ]);

      const usersData = usersSnap.docs.map((d) => d.data() as UserProfile);
      const groupsData = groupsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as GroupData) }));

      // Conta transações totais no sistema (na coleção raiz)
      const txSnap = await getDocs(collection(db, "transacoes"));
      const txCount = txSnap.size;

      setUsers(usersData);
      setGroups(groupsData);
      setStats({ totalUsers: usersData.length, totalGroups: groupsData.length, totalTransactions: txCount });
    } catch (e: any) {
      console.error(e);
      showToast(`Erro: ${e.message}`, "err");
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (isMasterAdmin) loadData();
  }, [isMasterAdmin, loadData]);

  const handleDeleteUser = async (uid: string) => {
    try {
      await deleteDoc(doc(db, "users", uid));
      setUsers((prev) => prev.filter((u) => u.uid !== uid));
      setStats((s) => ({ ...s, totalUsers: s.totalUsers - 1 }));
      showToast("Usuário excluído com sucesso.");
    } catch {
      showToast("Erro ao excluir usuário.", "err");
    } finally {
      setConfirmDelete(null);
    }
  };

  const handleDeleteGroup = async (id: string) => {
    try {
      await deleteDoc(doc(db, "groups", id));
      setGroups((prev) => prev.filter((g) => g.id !== id));
      setStats((s) => ({ ...s, totalGroups: s.totalGroups - 1 }));
      showToast("Grupo excluído com sucesso.");
    } catch {
      showToast("Erro ao excluir grupo.", "err");
    } finally {
      setConfirmDelete(null);
    }
  };

  const handleSaveUser = async (u: UserProfile) => {
    try {
      await updateDoc(doc(db, "users", u.uid), { name: u.name, email: u.email });
      setUsers((prev) => prev.map((x) => (x.uid === u.uid ? u : x)));
      setEditingUser(null);
      showToast("Usuário atualizado com sucesso.");
    } catch {
      showToast("Erro ao salvar usuário.", "err");
    }
  };

  const handleSaveGroup = async (g: GroupData & { id: string }) => {
    try {
      await updateDoc(doc(db, "groups", g.id), { groupName: g.groupName, groupEmoji: g.groupEmoji });
      setGroups((prev) => prev.map((x) => (x.id === g.id ? g : x)));
      setEditingGroup(null);
      showToast("Grupo atualizado com sucesso.");
    } catch {
      showToast("Erro ao salvar grupo.", "err");
    }
  };

  if (loading || !isMasterAdmin) return null;

  return (
    <div className="hero-bg min-h-screen">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-[100] px-5 py-3 rounded-xl text-[13px] font-medium shadow-lg backdrop-blur-sm border transition-all ${
            toast.type === "ok"
              ? "bg-[oklch(0.74_0.12_145/0.15)] border-[oklch(0.74_0.12_145/0.3)] text-[oklch(0.74_0.12_145)]"
              : "bg-red-500/10 border-red-500/30 text-red-400"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="glass rounded-2xl p-6 w-full max-w-sm">
            <div className="text-[22px] font-serif mb-2">Confirmar exclusão</div>
            <p className="text-[13px] text-muted-foreground mb-6">
              Você está prestes a excluir permanentemente <strong className="text-foreground">{confirmDelete.name}</strong>.
              Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 h-10 rounded-xl border border-border text-[13px] text-muted-foreground hover:text-foreground transition"
              >
                Cancelar
              </button>
              <button
                onClick={() =>
                  confirmDelete.type === "user"
                    ? handleDeleteUser(confirmDelete.id)
                    : handleDeleteGroup(confirmDelete.id)
                }
                className="flex-1 h-10 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400 text-[13px] font-medium hover:bg-red-500/30 transition"
              >
                Excluir definitivamente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Usuário */}
      {editingUser && (
        <EditModal
          title="Editar Usuário"
          onClose={() => setEditingUser(null)}
          onSave={() => handleSaveUser(editingUser)}
        >
          <Field label="Nome">
            <input
              value={editingUser.name}
              onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
              className="w-full bg-transparent border border-border rounded-xl h-10 px-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </Field>
          <Field label="E-mail">
            <input
              value={editingUser.email}
              onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
              className="w-full bg-transparent border border-border rounded-xl h-10 px-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </Field>
          <Field label="Emoji">
            <input
              value={editingUser.emoji}
              onChange={(e) => setEditingUser({ ...editingUser, emoji: e.target.value })}
              className="w-full bg-transparent border border-border rounded-xl h-10 px-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </Field>
        </EditModal>
      )}

      {/* Modal Editar Grupo */}
      {editingGroup && (
        <EditModal
          title="Editar Grupo"
          onClose={() => setEditingGroup(null)}
          onSave={() => handleSaveGroup(editingGroup)}
        >
          <Field label="Nome do Grupo">
            <input
              value={editingGroup.groupName}
              onChange={(e) => setEditingGroup({ ...editingGroup, groupName: e.target.value })}
              className="w-full bg-transparent border border-border rounded-xl h-10 px-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </Field>
          <Field label="Emoji do Grupo">
            <input
              value={editingGroup.groupEmoji}
              onChange={(e) => setEditingGroup({ ...editingGroup, groupEmoji: e.target.value })}
              className="w-full bg-transparent border border-border rounded-xl h-10 px-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </Field>
          <Field label="Código de Convite">
            <input
              value={editingGroup.inviteCode}
              onChange={(e) => setEditingGroup({ ...editingGroup, inviteCode: e.target.value })}
              className="w-full bg-transparent border border-border rounded-xl h-10 px-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-ring font-mono"
            />
          </Field>
        </EditModal>
      )}

      <div className="mx-auto max-w-[1200px] px-5 lg:px-8 pt-10 lg:pt-14 pb-20">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase tracking-[0.2em] text-champagne/70 px-2 py-0.5 rounded-full border border-champagne/20 bg-champagne/5">
                Master Admin
              </span>
            </div>
            <h1 className="font-serif text-[36px] leading-[1.1]">Painel de Controle</h1>
            <p className="text-[13px] text-muted-foreground mt-1">
              Visão total do sistema — usuários, grupos e lançamentos.
            </p>
          </div>
          <button
            onClick={loadData}
            disabled={loadingData}
            className="h-9 px-4 rounded-full border border-border text-[12.5px] text-muted-foreground hover:text-foreground transition flex items-center gap-2 disabled:opacity-40"
          >
            <i className={`ti ti-refresh text-[14px] ${loadingData ? "animate-spin" : ""}`} />
            Atualizar
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { icon: "ti-users", label: "Usuários", value: stats.totalUsers, color: "text-[oklch(0.74_0.12_145)]" },
            { icon: "ti-heart", label: "Casais", value: stats.totalGroups, color: "text-champagne" },
            { icon: "ti-arrows-exchange", label: "Lançamentos", value: stats.totalTransactions, color: "text-[oklch(0.8_0.1_280)]" },
          ].map(({ icon, label, value, color }) => (
            <div key={label} className="glass rounded-2xl px-6 py-5">
              <div className="flex items-center gap-2 mb-3">
                <i className={`ti ${icon} text-[18px] ${color}`} />
                <span className="text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
              </div>
              <div className={`text-[32px] font-semibold tabular ${color}`}>
                {loadingData ? "—" : value}
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-white/[0.03] rounded-xl border border-border mb-6 w-fit">
          {(["overview", "users", "groups"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex items-center gap-2 h-8 px-4 rounded-lg text-[12px] font-medium transition-all ${
                tab === t ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "overview" && <i className="ti ti-layout-dashboard text-[13px]" />}
              {t === "users" && <i className="ti ti-users text-[13px]" />}
              {t === "groups" && <i className="ti ti-heart text-[13px]" />}
              {t === "overview" ? "Visão Geral" : t === "users" ? `Usuários (${stats.totalUsers})` : `Casais (${stats.totalGroups})`}
            </button>
          ))}
        </div>

        {/* Tab: Visão Geral */}
        {tab === "overview" && (
          <div className="space-y-4">
            {/* Regras do Firestore */}
            <div className="glass rounded-2xl p-6 border border-champagne/20">
              <div className="flex items-center gap-3 mb-4">
                <i className="ti ti-shield-lock text-[20px] text-champagne" />
                <div>
                  <div className="text-[14px] font-medium">Regras de Segurança do Firestore</div>
                  <div className="text-[12px] text-muted-foreground">Você precisa colar isto no Console do Firebase para o Admin funcionar</div>
                </div>
              </div>
              <pre className="bg-black/40 rounded-xl p-4 text-[11.5px] text-green-400/80 font-mono overflow-x-auto leading-relaxed border border-white/5">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ── Helper: verifica se o usuário é membro do grupo ──────────────────────
    function isMember(groupId) {
      return request.auth != null
        && exists(/databases/$(database)/documents/groups/$(groupId))
        && request.auth.uid in get(/databases/$(database)/documents/groups/$(groupId)).data.members;
    }

    // ── Helper: verifica se o usuário é o DONO SOBERANO (Email Master) ───────
    function isMaster() {
      return request.auth != null && request.auth.token.email == "yandermarssico@gmail.com";
    }

    // ── Perfis de usuário ─────────────────────────────────────────────────────
    match /users/{uid} {
      allow read, write, delete: if (request.auth != null && request.auth.uid == uid) || isMaster();
    }

    // ── Convites (NOVA COLEÇÃO) ───────────────────────────────────────────────
    match /invites/{code} {
      allow read   : if request.auth != null || isMaster();
      allow create : if request.auth != null || isMaster();
      allow update : if isMaster();
      allow delete : if request.auth != null || isMaster();
    }

    // ── Grupos (casais/famílias) ──────────────────────────────────────────────
    match /groups/{groupId} {
      allow read, delete: if (request.auth != null && request.auth.uid in resource.data.members) || isMaster();
      allow create : if request.auth != null || isMaster();

      allow update : if isMaster() || (request.auth != null && (
        request.auth.uid in resource.data.members
        ||
        (
          request.resource.data.diff(resource.data).affectedKeys()
            .hasOnly(['members', 'memberProfiles'])
          && request.auth.uid in request.resource.data.members
          && !(request.auth.uid in resource.data.members)
        )
      ));
    }

    // ── Coleções do Grupo (Lançamentos, Notas, Sonhos) ────────────────────────
    match /transacoes/{id} {
      allow read, update, delete : if isMember(resource.data.groupId) || isMaster();
      allow create               : if isMember(request.resource.data.groupId) || isMaster();
    }

    match /notas/{id} {
      allow read, update, delete : if isMember(resource.data.groupId) || isMaster();
      allow create               : if isMember(request.resource.data.groupId) || isMaster();
    }

    match /metas/{id} {
      allow read, update, delete : if isMember(resource.data.groupId) || isMaster();
      allow create               : if isMember(request.resource.data.groupId) || isMaster();
    }
  }
}`}
              </pre>
              <p className="mt-3 text-[11.5px] text-muted-foreground">
                Acesse: <span className="text-champagne">console.firebase.google.com</span> → Seu projeto → Firestore → Regras → Cole o código acima → Publicar.
              </p>
            </div>

            {/* Últimos usuários */}
            <div className="glass rounded-2xl p-6">
              <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-4">Últimos cadastros</div>
              {loadingData ? (
                <div className="text-[13px] text-muted-foreground">Carregando…</div>
              ) : users.slice(0, 5).map((u) => (
                <div key={u.uid} className="flex items-center gap-3 py-2.5 border-b border-border/40 last:border-0">
                  <span className="text-2xl">{u.emoji}</span>
                  <div className="flex-1">
                    <div className="text-[13px]">{u.name}</div>
                    <div className="text-[11px] text-muted-foreground">{u.email}</div>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString("pt-BR") : "—"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab: Usuários */}
        {tab === "users" && (
          <div className="glass rounded-2xl overflow-hidden">
            {/* Cabeçalho da tabela */}
            <div className="grid grid-cols-[2fr_2fr_1fr_auto] gap-3 px-5 py-3 border-b border-border bg-white/[0.02]">
              <span className="text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">Usuário</span>
              <span className="text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">E-mail</span>
              <span className="text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">Cadastro</span>
              <span className="w-20" />
            </div>

            {loadingData ? (
              <div className="px-5 py-8 text-[13px] text-muted-foreground">Carregando usuários…</div>
            ) : users.length === 0 ? (
              <div className="px-5 py-8 text-[13px] text-muted-foreground">Nenhum usuário encontrado. Verifique as regras do Firestore.</div>
            ) : users.map((u) => (
              <div
                key={u.uid}
                className="grid grid-cols-[2fr_2fr_1fr_auto] gap-3 items-center px-5 py-3.5 border-b border-border/40 last:border-0 hover:bg-white/[0.02] transition"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-xl shrink-0">{u.emoji || "👤"}</span>
                  <span className="text-[13px] truncate">{u.name}</span>
                  {u.email === "yandermarssico@gmail.com" && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-champagne/10 text-champagne border border-champagne/20 shrink-0">MASTER</span>
                  )}
                </div>
                <span className="text-[12.5px] text-muted-foreground truncate">{u.email}</span>
                <span className="text-[12px] text-muted-foreground">
                  {u.createdAt ? new Date(u.createdAt).toLocaleDateString("pt-BR") : "—"}
                </span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setEditingUser(u)}
                    className="h-7 w-7 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-white/[0.05] transition flex items-center justify-center"
                    title="Editar"
                  >
                    <i className="ti ti-pencil text-[13px]" />
                  </button>
                  {u.email !== "yandermarssico@gmail.com" && (
                    <button
                      onClick={() => setConfirmDelete({ type: "user", id: u.uid, name: u.name })}
                      className="h-7 w-7 rounded-lg border border-red-500/20 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition flex items-center justify-center"
                      title="Excluir"
                    >
                      <i className="ti ti-trash text-[13px]" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab: Grupos/Casais */}
        {tab === "groups" && (
          <div className="glass rounded-2xl overflow-hidden">
            {/* Cabeçalho da tabela */}
            <div className="grid grid-cols-[2fr_1fr_1fr_auto] gap-3 px-5 py-3 border-b border-border bg-white/[0.02]">
              <span className="text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">Grupo</span>
              <span className="text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">Membros</span>
              <span className="text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">Criado em</span>
              <span className="w-20" />
            </div>

            {loadingData ? (
              <div className="px-5 py-8 text-[13px] text-muted-foreground">Carregando grupos…</div>
            ) : groups.length === 0 ? (
              <div className="px-5 py-8 text-[13px] text-muted-foreground">Nenhum grupo encontrado. Verifique as regras do Firestore.</div>
            ) : groups.map((g) => (
              <div
                key={g.id}
                className="grid grid-cols-[2fr_1fr_1fr_auto] gap-3 items-center px-5 py-3.5 border-b border-border/40 last:border-0 hover:bg-white/[0.02] transition"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-xl shrink-0">{g.groupEmoji || "🏠"}</span>
                  <div className="min-w-0">
                    <div className="text-[13px] truncate">{g.groupName}</div>
                    <div className="text-[10.5px] text-muted-foreground font-mono">{g.inviteCode}</div>
                  </div>
                </div>
                <span className="text-[12.5px] text-muted-foreground">{g.members?.length ?? 0} membro(s)</span>
                <span className="text-[12px] text-muted-foreground">
                  {g.createdAt ? new Date(g.createdAt).toLocaleDateString("pt-BR") : "—"}
                </span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setEditingGroup(g)}
                    className="h-7 w-7 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-white/[0.05] transition flex items-center justify-center"
                    title="Editar"
                  >
                    <i className="ti ti-pencil text-[13px]" />
                  </button>
                  <button
                    onClick={() => setConfirmDelete({ type: "group", id: g.id, name: g.groupName })}
                    className="h-7 w-7 rounded-lg border border-red-500/20 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition flex items-center justify-center"
                    title="Excluir"
                  >
                    <i className="ti ti-trash text-[13px]" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="glass rounded-2xl p-6 w-full max-w-sm">
        <div className="flex items-center justify-between mb-5">
          <div className="text-[20px] font-serif">{title}</div>
          <button
            onClick={onClose}
            className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground transition flex items-center justify-center"
          >
            <i className="ti ti-x text-[14px]" />
          </button>
        </div>
        <div className="space-y-4">{children}</div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 h-10 rounded-xl border border-border text-[13px] text-muted-foreground hover:text-foreground transition"
          >
            Cancelar
          </button>
          <button
            onClick={onSave}
            className="flex-1 h-10 rounded-xl bg-foreground text-background text-[13px] font-medium hover:opacity-90 transition"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground mb-1.5">{label}</div>
      {children}
    </label>
  );
}
