import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useData, fmt, getLast6Months } from "@/contexts/DataContext";
import type { Meta, Transacao } from "@/contexts/DataContext";
import { EmptyStates } from "@/components/EmptyState";
import { useToast } from "@/contexts/ToastContext";

export const Route = createFileRoute("/_app/sonhos")({
  head: () => ({
    meta: [
      { title: "Sonhos · Sincronia" },
      { name: "description", content: "Os sonhos que vocês estão construindo juntos — casa, viagem, reserva." },
      { property: "og:title", content: "Sonhos do casal · Sincronia" },
      { property: "og:description", content: "Visualize o futuro e veja cada centavo se aproximando das suas metas." },
    ],
  }),
  component: SonhosPage,
});

/* ─── Cloudinary ──────────────────────────────────────────── */
const CLOUD_NAME    = "dpyl51yfe";
const UPLOAD_PRESET = "gbilxhpq";

async function uploadToCloudinary(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", UPLOAD_PRESET);
  fd.append("folder", "sincronia/sonhos");
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body: fd }
  );
  if (!res.ok) throw new Error("Falha no upload da imagem");
  const data = await res.json();
  return data.secure_url as string;
}

/* ─── Constantes visuais ──────────────────────────────────── */
const GOAL_EMOJIS = ["🏠","✈️","🚗","🎓","📈","🛡️","💎","🌊","🌿","🎯","🏖️","💍"];

const FALLBACK_GRADIENTS: Record<string, string> = {
  "🏠": "linear-gradient(145deg, #2a1f0e 0%, #1a1208 100%)",
  "✈️": "linear-gradient(145deg, #0e1a2a 0%, #081218 100%)",
  "🚗": "linear-gradient(145deg, #2a0e0e 0%, #180808 100%)",
  "🎓": "linear-gradient(145deg, #1a0e2a 0%, #120818 100%)",
  "📈": "linear-gradient(145deg, #0e2a1a 0%, #081812 100%)",
  "💎": "linear-gradient(145deg, #0e1e2a 0%, #081418 100%)",
  "💍": "linear-gradient(145deg, #2a1e0e 0%, #181208 100%)",
  "🏖️": "linear-gradient(145deg, #2a1a0e 0%, #181008 100%)",
};
const DEFAULT_GRADIENT = "linear-gradient(145deg, #1e1a12 0%, #13100a 100%)";

/* ─── calcForecast: previsão baseada em saldo médio dos últimos 3 meses ── */
function calcForecast(transacoes: Transacao[], restante: number): string {
  if (restante <= 0) return "Meta atingida";
  const last3 = getLast6Months().slice(-3);
  let totalSaldo = 0;
  let monthsWithData = 0;
  for (const m of last3) {
    const list = transacoes.filter((t) => t.data?.startsWith(m));
    const rec = list.filter((t) => t.tipo === "receita").reduce((s, t) => s + t.valor, 0);
    const des = list.filter((t) => t.tipo === "despesa").reduce((s, t) => s + t.valor, 0);
    const saldo = rec - des;
    if (rec > 0 || des > 0) {
      totalSaldo += Math.max(saldo, 0);
      monthsWithData++;
    }
  }
  if (monthsWithData === 0) return "Sem dados";
  const avgMonthly = totalSaldo / monthsWithData;
  if (avgMonthly <= 0) return "Sem poupança";
  const meses = restante / avgMonthly;
  if (meses < 0.25) return "~1 semana";
  if (meses < 0.5)  return "~2 semanas";
  if (meses < 1)    return "~1 mês";
  if (meses < 1.5)  return "~6 semanas";
  if (meses < 12)   return `~${Math.ceil(meses)} meses`;
  return `~${(meses / 12).toFixed(1)} anos`;
}

/* ─── Badge de status semântico ──────────────────────────── */
function statusBadgeProps(pct: number) {
  if (pct >= 100) return { text: "Concluído 🎉", bg: "rgba(52,211,153,0.22)", color: "oklch(0.74 0.12 145)" };
  if (pct >= 75)  return { text: "Quase lá ✦",  bg: "rgba(212,185,120,0.18)", color: "oklch(0.82 0.07 75)" };
  if (pct >= 30)  return { text: "No ritmo",    bg: "rgba(96,165,250,0.15)", color: "oklch(0.66 0.10 240)" };
  return           { text: "Começando",         bg: "rgba(255,255,255,0.08)", color: "oklch(0.66 0.012 70)" };
}

/* ─── ProgressRing SVG ───────────────────────────────────── */
function ProgressRing({ pct, size = 72 }: { pct: number; size?: number }) {
  const r      = (size / 2) - 6;
  const circ   = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(pct, 100) / 100);
  const color  = pct >= 100 ? "oklch(0.74 0.12 145)"
               : pct >= 75  ? "oklch(0.82 0.07 75)"
               : pct >= 30  ? "oklch(0.74 0.10 80)"
               :               "oklch(0.60 0.08 70)";
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="5"
        />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-px">
        <span
          className="tabular-nums font-medium leading-none"
          style={{ fontSize: size > 80 ? 22 : 15, color }}
        >
          {pct}%
        </span>
        <span className="text-[9px] text-muted-foreground uppercase tracking-wide">
          meta
        </span>
      </div>
    </div>
  );
}

/* ─── MilestonePills ─────────────────────────────────────── */
function MilestonePills({ pct }: { pct: number }) {
  const milestones = [25, 50, 75, 100];
  const next = milestones.find((m) => pct < m);
  return (
    <div className="flex flex-wrap gap-1.5 mb-3">
      {milestones.map((m) => {
        const done    = pct >= m;
        const isNext  = m === next;
        return (
          <span
            key={m}
            className="text-[10px] font-medium px-2.5 py-1 rounded-full border"
            style={
              done
                ? { background: "rgba(52,211,153,0.12)",  color: "oklch(0.74 0.12 145)", borderColor: "rgba(52,211,153,0.22)" }
                : isNext
                ? { background: "rgba(212,185,120,0.12)", color: "oklch(0.82 0.07 75)",  borderColor: "rgba(212,185,120,0.22)" }
                : { background: "rgba(255,255,255,0.04)", color: "oklch(0.55 0.01 70)",  borderColor: "rgba(255,255,255,0.07)" }
            }
          >
            {done ? `✓ ${m}%` : isNext ? `→ ${m}%` : `${m}%`}
          </span>
        );
      })}
    </div>
  );
}

/* ─── Componente principal ────────────────────────────────── */
function SonhosPage() {
  const { user }    = useAuth();
  const { metas, transacoes, addMeta, updateMeta, deleteMeta, aportar } = useData();
  const { toast }   = useToast();
  const fileRef     = useRef<HTMLInputElement>(null);

  const activeMetas  = metas.filter((m) => m.ativo);
  const totalCurrent = activeMetas.reduce((s, g) => s + g.acumulado, 0);
  const totalTarget  = activeMetas.reduce((s, g) => s + g.valor, 0);
  const totalFaltam  = Math.max(totalTarget - totalCurrent, 0);
  const avgPct       = totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0;
  const globalForecast = calcForecast(transacoes, totalFaltam);

  const [showModal, setShowModal]   = useState(false);
  const [showAporte, setShowAporte] = useState<Meta | null>(null);
  const [editId, setEditId]         = useState<string | null>(null);
  const [saving, setSaving]         = useState(false);
  const [uploading, setUploading]   = useState(false);
  const [aporteVal, setAporteVal]   = useState("");

  const blank = { titulo: "", valor: "", acumulado: "0", imagem: "🎯", prazo: "", imageUrl: "" };
  const [form, setForm] = useState(blank);
  const sf = (k: keyof typeof blank) => (v: string) => setForm((p) => ({ ...p, [k]: v }));

  const openAdd  = () => { setForm(blank); setEditId(null); setShowModal(true); };
  const openEdit = (g: Meta) => {
    setForm({
      titulo:    g.titulo,
      valor:     String(g.valor),
      acumulado: String(g.acumulado),
      imagem:    g.imagem ?? "🎯",
      prazo:     g.prazo ?? "",
      imageUrl:  (g as any).imageUrl ?? "",
    });
    setEditId(g.id);
    setShowModal(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      setForm((p) => ({ ...p, imageUrl: url }));
      toast("Foto enviada com sucesso 🎉");
    } catch {
      toast("Erro ao enviar foto. Tente novamente.", "info");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleSave = async () => {
    if (!form.titulo || !form.valor || !user) return;
    setSaving(true);
    try {
      const payload = {
        titulo:    form.titulo,
        valor:     parseFloat(form.valor),
        acumulado: parseFloat(form.acumulado) || 0,
        imagem:    form.imagem,
        imageUrl:  form.imageUrl || null,
        prazo:     form.prazo,
        categoria: "outro",
        ativo:     true,
      };
      if (editId) {
        await updateMeta(editId, payload);
        toast("Sonho atualizado");
      } else {
        await addMeta(payload, user.uid);
        toast(`Sonho "${form.titulo}" criado! ✨`);
      }
      setShowModal(false);
      setForm(blank);
      setEditId(null);
    } finally {
      setSaving(false);
    }
  };

  const handleAporte = async () => {
    if (!showAporte || !aporteVal) return;
    setSaving(true);
    const novoAcumulado = showAporte.acumulado + parseFloat(aporteVal);
    const meta = showAporte;
    try {
      await aportar(showAporte.id, parseFloat(aporteVal), showAporte.acumulado);
      if (novoAcumulado >= meta.valor) {
        toast(`🎉 Sonho "${meta.titulo}" concluído! Parabéns!`, "success");
      } else {
        toast(`Aporte de ${fmt(parseFloat(aporteVal))} registrado`);
      }
      setShowAporte(null);
      setAporteVal("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="hero-bg min-h-screen">
      <div className="mx-auto max-w-[1240px] px-5 lg:px-8 pt-10 lg:pt-14 pb-28">

        {/* ── HERO DINÂMICO ── */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
          <div>
            <div className="text-[10.5px] uppercase tracking-[0.28em] text-muted-foreground">
              Sonhos em construção
            </div>
            <h1 className="mt-3 font-serif text-[32px] sm:text-[42px] leading-[1.04] text-foreground">
              {activeMetas.length === 0 ? (
                <>Os sonhos que vocês{" "}<em className="italic text-muted-foreground">vão construir juntos.</em></>
              ) : avgPct >= 100 ? (
                <>Vocês conseguiram.{" "}<em className="italic text-champagne">Todos os sonhos realizados.</em></>
              ) : avgPct >= 75 ? (
                <>Vocês estão{" "}<em className="italic text-champagne">{avgPct}% do caminho.</em></>
              ) : (
                <>Construindo o futuro,{" "}<em className="italic text-muted-foreground">juntos.</em></>
              )}
            </h1>
          </div>
          <button
            id="btn-novo-sonho"
            onClick={openAdd}
            className="self-start sm:self-auto shrink-0 h-10 pl-4 pr-5 rounded-full text-[13px] font-semibold flex items-center gap-1.5 transition-all duration-200 active:scale-95 hover:opacity-90"
            style={{ background: "var(--gradient-champagne)", color: "oklch(0.18 0.01 60)" }}
          >
            <i className="ti ti-plus text-[15px]" />
            Novo sonho
          </button>
        </div>

        {/* ── SUMMARY BAR — pílula fluida, sem divisórias internas ── */}
        {activeMetas.length > 0 && (
          <div
            className="mt-7 grid grid-cols-3 rounded-[32px] px-2 py-1"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
              backdropFilter: "blur(20px)",
            }}
          >
            <SummaryBlock
              label="Acumulado"
              value={fmt(totalCurrent)}
              sub={`de ${fmt(totalTarget)}`}
            />
            <SummaryBlock
              label="Faltam"
              value={fmt(totalFaltam)}
              sub={`${activeMetas.length} sonho${activeMetas.length !== 1 ? "s" : ""} ativo${activeMetas.length !== 1 ? "s" : ""}`}
              valueColor="oklch(0.82 0.07 75)"
              divider
            />
            <SummaryBlock
              label="Previsão"
              value={globalForecast}
              sub="no ritmo atual"
              valueColor="oklch(0.74 0.12 145)"
              divider
            />
          </div>
        )}

        {/* ── GRID DE SONHOS ── */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {activeMetas.length === 0 && EmptyStates.sonhos(openAdd)}

          {activeMetas.map((g) => {
            const pct      = Math.min(Math.round((g.acumulado / g.valor) * 100), 100);
            const imgUrl   = (g as any).imageUrl as string | null;
            const gradient = FALLBACK_GRADIENTS[g.imagem ?? ""] ?? DEFAULT_GRADIENT;
            const badge    = statusBadgeProps(pct);
            const faltam   = Math.max(g.valor - g.acumulado, 0);
            const forecast = calcForecast(transacoes, faltam);

            return (
              <article
                key={g.id}
                className="group rounded-3xl overflow-hidden transition-all duration-300"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  backdropFilter: "blur(20px)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
                  e.currentTarget.style.background  = "rgba(255,255,255,0.045)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
                  e.currentTarget.style.background  = "rgba(255,255,255,0.03)";
                }}
              >
                {/* ── CAPA — imagem limpa, sem texto por cima ── */}
                <div className="relative overflow-hidden" style={{ aspectRatio: "16/9" }}>
                  {imgUrl ? (
                    <img
                      src={imgUrl}
                      alt={g.titulo}
                      className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-105"
                      style={{ filter: "saturate(0.85) brightness(0.80)" }}
                    />
                  ) : (
                    <>
                      <div className="absolute inset-0" style={{ background: gradient }} />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[64px] opacity-20 select-none">{g.imagem ?? "🎯"}</span>
                      </div>
                    </>
                  )}

                  {/* Vinheta inferior */}
                  <div
                    className="absolute inset-x-0 bottom-0 h-20 pointer-events-none"
                    style={{ background: "linear-gradient(to top, rgba(8,7,6,0.90), transparent)" }}
                  />

                  {/* Badge de status — semântico */}
                  <div
                    className="absolute top-3 left-3 inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-[10px] font-medium"
                    style={{
                      background: badge.bg,
                      color: badge.color,
                      border: `1px solid ${badge.color}33`,
                      backdropFilter: "blur(8px)",
                    }}
                  >
                    <span className="size-1 rounded-full" style={{ backgroundColor: badge.color }} />
                    {badge.text}
                  </div>

                  {/* Prazo — canto superior direito */}
                  {g.prazo && (
                    <div
                      className="absolute top-3 right-3 h-6 px-2.5 rounded-full text-[10px] text-white/55 flex items-center"
                      style={{
                        background: "rgba(0,0,0,0.52)",
                        backdropFilter: "blur(8px)",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      {g.prazo}
                    </div>
                  )}
                </div>

                {/* ── CORPO DO CARD — toda informação é legível aqui ── */}
                <div className="px-5 pt-4 pb-5">

                  {/* Anel + Info */}
                  <div className="flex items-start gap-4 mb-4">
                    <ProgressRing pct={pct} size={72} />
                    <div className="flex-1 min-w-0 pt-0.5">
                      <h3 className="font-serif text-[18px] italic text-foreground leading-tight truncate">
                        {g.titulo}
                      </h3>
                      <div className="mt-1.5 space-y-0.5 text-[12px] text-muted-foreground tabular-nums">
                        <div className="flex justify-between">
                          <span>Meta</span>
                          <span className="text-foreground/80">{fmt(g.valor)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Faltam</span>
                          <span style={{ color: faltam === 0 ? "oklch(0.74 0.12 145)" : "rgba(255,255,255,0.65)" }}>
                            {faltam === 0 ? "Atingida! 🎉" : fmt(faltam)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card de previsão verde */}
                  {faltam > 0 && (
                    <div
                      className="flex items-start gap-2.5 rounded-xl p-3 mb-3"
                      style={{
                        background: "rgba(52,211,153,0.07)",
                        border: "1px solid rgba(52,211,153,0.18)",
                      }}
                    >
                      <i className="ti ti-trending-up text-[14px] shrink-0 mt-px" style={{ color: "oklch(0.74 0.12 145)" }} />
                      <p className="text-[11.5px] text-muted-foreground leading-snug">
                        No ritmo atual, vocês chegam em{" "}
                        <strong className="font-semibold" style={{ color: "oklch(0.74 0.12 145)" }}>
                          {forecast}
                        </strong>
                        .
                      </p>
                    </div>
                  )}

                  {/* Milestone Pills */}
                  <MilestonePills pct={pct} />

                  {/* Barra de progresso 5px com labels */}
                  <div className="mb-4">
                    <div className="h-[5px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          background: "var(--gradient-champagne)",
                          boxShadow: pct > 0 ? "0 0 10px 2px rgba(212,185,120,0.38)" : "none",
                          transition: "width 1s cubic-bezier(0.4,0,0.2,1)",
                        }}
                      />
                    </div>
                    <div className="flex justify-between mt-1.5 text-[10px] text-muted-foreground tabular-nums">
                      <span>R$ 0</span>
                      <span style={{ color: "oklch(0.82 0.07 75)" }}>{fmt(g.acumulado)} acumulado</span>
                      <span>{fmt(g.valor)}</span>
                    </div>
                  </div>

                  {/* Ações — sempre visíveis (critical for mobile) */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowAporte(g)}
                      className="flex-1 h-9 rounded-xl text-[12.5px] font-semibold transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
                      style={{ background: "var(--gradient-champagne)", color: "oklch(0.18 0.01 60)" }}
                    >
                      + Aportar
                    </button>
                    <button
                      onClick={() => openEdit(g)}
                      aria-label="Editar sonho"
                      className="size-9 rounded-xl border text-muted-foreground hover:text-foreground transition-all duration-200 flex items-center justify-center"
                      style={{ borderColor: "rgba(255,255,255,0.09)" }}
                    >
                      <i className="ti ti-edit text-[15px]" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("Excluir este sonho?")) {
                          deleteMeta(g.id);
                          toast("Sonho removido", "info");
                        }
                      }}
                      aria-label="Excluir sonho"
                      className="size-9 rounded-xl border text-muted-foreground hover:text-red-400 transition-all duration-200 flex items-center justify-center"
                      style={{ borderColor: "rgba(255,255,255,0.09)" }}
                    >
                      <i className="ti ti-trash text-[15px]" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {/* ═══ Modal Novo / Editar ═══ */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
          style={{ background: "rgba(0,0,0,0.70)", backdropFilter: "blur(8px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div
            className="w-full sm:max-w-md rounded-t-[28px] sm:rounded-[24px] border border-white/[0.08] p-6 animate-fade-up max-h-[92vh] overflow-y-auto"
            style={{ background: "#131316", boxShadow: "0 -12px 60px rgba(0,0,0,0.7)" }}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-serif text-[20px]">{editId ? "Editar Sonho" : "Novo Sonho"}</h2>
              <button
                onClick={() => setShowModal(false)}
                className="size-8 rounded-full bg-white/[0.06] flex items-center justify-center text-muted-foreground hover:text-foreground transition text-[15px]"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Foto personalizada */}
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
                  Foto de capa (opcional)
                </div>
                <div
                  onClick={() => !uploading && fileRef.current?.click()}
                  className={`relative w-full rounded-2xl overflow-hidden cursor-pointer border-2 border-dashed flex items-center justify-center transition-all duration-300 ${uploading ? "opacity-60 cursor-wait" : "hover:border-champagne/40"}`}
                  style={{
                    aspectRatio: "16/9",
                    borderColor: form.imageUrl ? "transparent" : "rgba(255,255,255,0.10)",
                    background: form.imageUrl ? "transparent" : "rgba(255,255,255,0.03)",
                  }}
                >
                  {form.imageUrl ? (
                    <>
                      <img
                        src={form.imageUrl}
                        alt="Preview"
                        className="absolute inset-0 size-full object-cover"
                        style={{ filter: "brightness(0.85)" }}
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition rounded-2xl">
                        <span className="text-[13px] text-white font-medium">Trocar foto</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-2 py-4 text-muted-foreground">
                      {uploading ? (
                        <>
                          <div className="size-7 rounded-full border-2 border-champagne/40 border-t-champagne animate-spin" />
                          <span className="text-[12px]">Enviando…</span>
                        </>
                      ) : (
                        <>
                          <span className="text-[28px] opacity-40">📷</span>
                          <span className="text-[12.5px]">Adicionar foto de capa</span>
                          <span className="text-[11px] opacity-50">JPG, PNG ou WebP</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
                {form.imageUrl && !uploading && (
                  <button
                    onClick={() => sf("imageUrl")("")}
                    className="mt-2 text-[11.5px] text-muted-foreground hover:text-red-400 transition"
                  >
                    Remover foto
                  </button>
                )}
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </div>

              <F label="Título *">
                <input
                  value={form.titulo}
                  onChange={(e) => sf("titulo")(e.target.value)}
                  placeholder="Ex: Viagem ao Japão"
                  className="inp"
                />
              </F>

              <div className="grid grid-cols-2 gap-3">
                <F label="Meta (R$) *">
                  <input type="number" value={form.valor} onChange={(e) => sf("valor")(e.target.value)} placeholder="25000" className="inp" />
                </F>
                <F label="Já acumulado">
                  <input type="number" value={form.acumulado} onChange={(e) => sf("acumulado")(e.target.value)} placeholder="0" className="inp" />
                </F>
              </div>

              {!form.imageUrl && (
                <F label="Ícone do sonho">
                  <div className="flex flex-wrap gap-2">
                    {GOAL_EMOJIS.map((em) => (
                      <button
                        key={em}
                        onClick={() => sf("imagem")(em)}
                        className={`size-10 rounded-xl text-xl transition border ${form.imagem === em ? "border-champagne bg-white/[0.08]" : "border-white/[0.08] hover:border-white/20"}`}
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                </F>
              )}

              <F label="Prazo (ex: Dez 2026)">
                <input value={form.prazo} onChange={(e) => sf("prazo")(e.target.value)} placeholder="Dez 2026" className="inp" />
              </F>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowModal(false); setEditId(null); setForm(blank); }}
                className="flex-1 h-11 rounded-xl border border-white/[0.09] text-[14px] text-muted-foreground hover:text-foreground transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={!form.titulo || !form.valor || saving || uploading}
                className="flex-1 h-11 rounded-xl text-[14px] font-semibold hover:opacity-90 transition disabled:opacity-40"
                style={{ background: "var(--gradient-champagne)", color: "oklch(0.18 0.01 60)" }}
              >
                {saving ? "Salvando…" : "Salvar sonho"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Modal Aporte ═══ */}
      {showAporte && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
          style={{ background: "rgba(0,0,0,0.70)", backdropFilter: "blur(8px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowAporte(null); }}
        >
          <div
            className="w-full sm:max-w-sm rounded-t-[28px] sm:rounded-[24px] border border-white/[0.08] p-6 animate-fade-up"
            style={{ background: "#131316", boxShadow: "0 -12px 60px rgba(0,0,0,0.7)" }}
          >
            <div className="mb-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Aportar em</div>
            <h2 className="font-serif text-[22px] italic mb-1">{showAporte.titulo}</h2>
            <p className="text-muted-foreground text-[13px] mb-5 tabular-nums">
              {fmt(showAporte.acumulado)} de {fmt(showAporte.valor)} acumulado
            </p>
            <F label="Valor do aporte (R$)">
              <input
                type="number"
                value={aporteVal}
                onChange={(e) => setAporteVal(e.target.value)}
                placeholder="Ex: 500"
                className="inp"
                autoFocus
              />
            </F>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowAporte(null)}
                className="flex-1 h-11 rounded-xl border border-white/[0.09] text-[14px] text-muted-foreground hover:text-foreground transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleAporte}
                disabled={!aporteVal || saving}
                className="flex-1 h-11 rounded-xl text-[14px] font-semibold hover:opacity-90 transition disabled:opacity-40"
                style={{ background: "var(--gradient-champagne)", color: "oklch(0.18 0.01 60)" }}
              >
                {saving ? "Salvando…" : "Confirmar aporte"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .inp {
          width: 100%;
          min-width: 0;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 0.75rem;
          height: 2.75rem;
          padding: 0 1rem;
          font-size: 14px;
          color: var(--color-foreground);
          outline: none;
          transition: border-color 0.2s;
        }
        .inp:focus { border-color: rgba(212,185,120,0.45); }
      `}</style>
    </div>
  );
}

/* ── SummaryBlock — célula da pílula de resumo ───────────── */
function SummaryBlock({
  label, value, sub, valueColor, divider,
}: {
  label: string;
  value: string;
  sub?: string;
  valueColor?: string;
  divider?: boolean;
}) {
  return (
    <div
      className="px-5 py-4 relative"
    >
      {/* Linha divisória sutil — só espaçamento visual, não uma parede */}
      {divider && (
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-px"
          style={{ background: "rgba(255,255,255,0.07)" }}
        />
      )}
      <div className="text-[10px] uppercase tracking-[0.20em] text-muted-foreground truncate">{label}</div>
      <div
        className="mt-1.5 text-[20px] sm:text-[22px] font-light tabular-nums leading-none"
        style={{ color: valueColor ?? "rgba(255,255,255,0.88)" }}
      >
        {value}
      </div>
      {sub && <div className="mt-1 text-[10.5px] text-muted-foreground truncate">{sub}</div>}
    </div>
  );
}

/* ── F (field label wrapper) ─────────────────────────────── */
function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-2">{label}</div>
      {children}
    </label>
  );
}
