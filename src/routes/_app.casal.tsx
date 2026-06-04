import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AuditorPerfil } from "@/components/AuditorPerfil";

export const Route = createFileRoute("/_app/casal")({
  head: () => ({
    meta: [
      { title: "Casal · Sincronia" },
      { name: "description", content: "O grupo familiar — identidade compartilhada, membros e código de convite." },
      { property: "og:title", content: "O grupo do casal · Sincronia" },
      { property: "og:description", content: "Gerencie quem participa do grupo financeiro e a identidade visual de vocês." },
    ],
  }),
  component: CasalPage,
});

const palettes = [
  ["#D4B896", "#8C6F4F"],
  ["#9BD3B2", "#3F6E55"],
  ["#E0AEB0", "#8C5358"],
  ["#9BB4D3", "#445F87"],
  ["#C0AEE0", "#5A4889"],
  ["#E6DCC4", "#8A7A55"],
];

function CasalPage() {
  const { group, profile, user, updateGroup, logout } = useAuth();
  const [palette, setPalette] = useState(0);
  const [gname, setGname] = useState(group?.groupName ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showAuditor, setShowAuditor] = useState(false);

  const members = Object.values(group?.memberProfiles ?? {});
  const inviteCode = group?.inviteCode ?? "——";
  const since = group?.createdAt
    ? new Date(group.createdAt).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    : "recentemente";

  const handleSave = async () => {
    if (!gname.trim()) return;
    setSaving(true);
    try {
      await updateGroup({ groupName: gname });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(inviteCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="hero-bg">
      <div className="mx-auto max-w-[1100px] px-5 lg:px-8 pt-10 lg:pt-14">
        <div className="text-[11.5px] uppercase tracking-[0.18em] text-muted-foreground">
          Grupo do casal
        </div>

        <h1 className="mt-5 font-serif text-[40px] leading-[1.05]">
          <em className="not-italic">{group?.groupEmoji} {group?.groupName}</em>
        </h1>
        <p className="mt-2 text-[14px] text-muted-foreground">
          Família · grupo financeiro compartilhado desde {since}.
        </p>

        {/* members */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          {members.map((m) => (
            <div key={m.uid} className="glass rounded-2xl p-5 flex items-center gap-4">
              {/* Emoji avatar — same size/ring as original img */}
              <div
                className="size-[60px] rounded-2xl bg-surface ring-1 ring-white/10 flex items-center justify-center text-4xl select-none"
              >
                {m.emoji}
              </div>
              <div className="flex-1">
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  {m.uid === user?.uid ? "Você" : "Parceiro(a)"}
                </div>
                <div className="mt-1 text-[17px] text-foreground">{m.name}</div>
                <div className="text-[12.5px] text-muted-foreground">{m.email}</div>
              </div>
              {m.uid === user?.uid && (
                <span className="text-[11px] px-2 py-1 rounded-full bg-champagne/10 text-champagne border border-champagne/20">
                  Admin
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Invite code */}
        <div className="mt-4 glass rounded-2xl p-6">
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Código de convite
          </div>
          <p className="mt-1.5 text-[13px] text-muted-foreground">
            Compartilhe este código para que seu parceiro(a) entre no grupo.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1 h-14 rounded-xl border border-border bg-white/[0.04] flex items-center justify-center">
              <span className="font-mono text-[24px] tracking-[0.4em] text-champagne select-all">
                {inviteCode}
              </span>
            </div>
            <button
              onClick={copyCode}
              className="h-14 px-5 rounded-xl border border-border text-[13px] text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition"
            >
              {copied ? "✓ Copiado" : "Copiar"}
            </button>
          </div>
        </div>

        {/* identity */}
        <div className="mt-4 glass rounded-2xl p-6">
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Identidade do grupo
          </div>
          <p className="mt-1.5 text-[13px] text-muted-foreground">
            Como vocês querem aparecer no Sincronia.
          </p>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Nome do grupo">
              <input
                value={gname}
                onChange={(e) => setGname(e.target.value)}
                className="w-full bg-transparent border border-border rounded-xl h-11 px-4 text-[14px] focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
              />
            </Field>
            <Field label="Moeda">
              <select
                defaultValue="BRL"
                className="w-full bg-transparent border border-border rounded-xl h-11 px-4 text-[14px] focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
              >
                <option value="BRL" className="bg-background">Real brasileiro · BRL</option>
                <option value="USD" className="bg-background">US Dollar · USD</option>
                <option value="EUR" className="bg-background">Euro · EUR</option>
              </select>
            </Field>
          </div>

          <div className="mt-6">
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3">
              Paleta da família
            </div>
            <div className="flex flex-wrap gap-2.5">
              {palettes.map((p, i) => (
                <button
                  key={i}
                  onClick={() => setPalette(i)}
                  className={`size-9 rounded-full border transition ${
                    palette === i ? "border-champagne ring-2 ring-champagne/40" : "border-border"
                  }`}
                  style={{ background: `linear-gradient(135deg, ${p[0]}, ${p[1]})` }}
                  aria-label={`Paleta ${i + 1}`}
                />
              ))}
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="h-10 px-5 rounded-full bg-foreground text-background text-[13px] font-medium hover:opacity-90 transition disabled:opacity-40"
            >
              {saving ? "Salvando…" : saved ? "✓ Salvo!" : "Salvar alterações"}
            </button>
          </div>
        </div>

        {/* Seu perfil */}
        <div className="mt-4 glass rounded-2xl p-6">
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Seu perfil</div>
          <div className="mt-4 flex items-center gap-4">
            <div className="text-4xl select-none">{profile?.emoji}</div>
            <div>
              <div className="text-[16px] text-foreground">{profile?.name}</div>
              <div className="text-[12px] text-muted-foreground">{profile?.email}</div>
            </div>
          </div>
        </div>

        {/* Card do Consultor Inteligente */}
        <div className="mt-4 glass rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Consultor Inteligente</div>
              <p className="mt-1.5 text-[15px] text-foreground">
                Nível: <span className="capitalize text-champagne font-medium">{group?.nivelEconomia ?? "—"}</span>
              </p>
              {group?.custoVidaEssencial ? (
                <p className="text-[12.5px] text-muted-foreground mt-1">
                  Custo essencial estimado: <strong className="text-white/60">R$ {group.custoVidaEssencial.toLocaleString("pt-BR")}/mês</strong>
                </p>
              ) : null}
            </div>
            <button
              onClick={() => setShowAuditor(true)}
              className="h-10 px-4 rounded-full border border-champagne/30 text-[13px] text-champagne hover:bg-champagne/10 transition"
            >
              ⚙️ Editar Perfil
            </button>
          </div>
        </div>

        <footer className="mt-16 mb-4 flex items-center justify-between text-[11.5px] text-muted-foreground">
          <span className="tracking-[0.2em] uppercase">Sincronia</span>
          <button
            onClick={logout}
            className="text-muted-foreground hover:text-red-400 transition"
          >
            Sair da conta
          </button>
        </footer>
      </div>

      <AuditorPerfil isOpen={showAuditor} onClose={() => setShowAuditor(false)} />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
        {label}
      </div>
      {children}
    </label>
  );
}
