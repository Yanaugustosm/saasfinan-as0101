/**
 * AuditorPerfil v2 — Anamnese Financeira em 4 Etapas
 *
 * NÍVEL 1 (Onboarding):
 *   Step 0 → Raio-X da Renda (quem trabalha + renda líquida)
 *   Step 1 → Calculadora de Custos Fixos (moradia, mercado, assinaturas, transporte)
 *   Step 2 → Blindagem / Reserva (0, 3, 6, 12 meses)
 *   Step 3 → Veredito do Consultor (análise real + seleção do nível)
 *
 * O algoritmo usa os dados declarados para gerar sugestões precisas desde o
 * primeiro acesso, antes de existir qualquer histórico de lançamentos.
 */

import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useData, calcNivelSugerido, fmt } from "@/contexts/DataContext";
import type { NivelEconomia } from "@/contexts/DataContext";

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface AuditorPerfilProps {
  isOpen:       boolean;
  onClose:      () => void;
  isMandatory?: boolean;
}

// ─── Constantes visuais ──────────────────────────────────────────────────────

const NIVEIS: { value: NivelEconomia; emoji: string; label: string; desc: string }[] = [
  {
    value: "conforto",
    emoji: "🛋️",
    label: "Conforto",
    desc: "Gastam bem e ainda economizam. O Consultor só alerta gastos muito excessivos.",
  },
  {
    value: "moderado",
    emoji: "⚖️",
    label: "Moderado",
    desc: "Equilíbrio entre qualidade de vida e metas. O Consultor avisa excessos pontuais.",
  },
  {
    value: "agressivo",
    emoji: "🎯",
    label: "Agressivo",
    desc: "Foco máximo nas metas. O Consultor cobra rigor em qualquer desvio.",
  },
];

// Logos/ícones das principais assinaturas (emoji fallback para universalidade)
const ASSINATURAS_ICONS = [
  { nome: "Netflix", emoji: "🎬" },
  { nome: "Spotify", emoji: "🎵" },
  { nome: "Amazon", emoji: "📦" },
  { nome: "Disney+", emoji: "✨" },
  { nome: "Internet", emoji: "🌐" },
  { nome: "YouTube", emoji: "▶️" },
];

const TOTAL_STEPS = 4;

// ─── Componente ───────────────────────────────────────────────────────────────

export function AuditorPerfil({ isOpen, onClose, isMandatory = false }: AuditorPerfilProps) {
  const { group, updateGroup } = useAuth();
  const { metas }              = useData();

  const accent = "oklch(0.82 0.07 75)"; // champagne

  // ── State da Anamnese ─────────────────────────────────────────────────────

  // Step 0: Renda
  const [dinamica, setDinamica] = useState<"um_provedor" | "dois_provedores">(
    group?.dinamicaRenda ?? "dois_provedores"
  );
  const [renda, setRenda] = useState(String(group?.rendaDeclarada ?? ""));

  // Step 1: Custos Fixos
  const [custoMoradia,      setCustoMoradia]      = useState(String(group?.custoMoradia      ?? ""));
  const [custoMercado,      setCustoMercado]      = useState(String(group?.custoMercado      ?? ""));
  const [custoAssinaturas,  setCustoAssinaturas]  = useState(String(group?.custoAssinaturas  ?? ""));
  const [custoTransporte,   setCustoTransporte]   = useState(String(group?.custoTransporte   ?? ""));

  // Step 2: Reserva
  const [mesesReserva, setMesesReserva] = useState<number>(group?.mesesReservaIdeal ?? 6);
  const [reserva,      setReserva]      = useState(String(group?.reservaExistente   ?? ""));

  // Step 3: Nível
  const [nivel, setNivel] = useState<NivelEconomia>(group?.nivelEconomia ?? "moderado");

  const [step,   setStep]   = useState(0);
  const [saving, setSaving] = useState(false);

  // ── Conversões numéricas ──────────────────────────────────────────────────

  const rendaNum           = parseFloat(renda.replace(",", "."))            || 0;
  const moradiaNum         = parseFloat(custoMoradia.replace(",", "."))     || 0;
  const mercadoNum         = parseFloat(custoMercado.replace(",", "."))     || 0;
  const assinaturasNum     = parseFloat(custoAssinaturas.replace(",", ".")) || 0;
  const transporteNum      = parseFloat(custoTransporte.replace(",", "."))  || 0;
  const reservaNum         = parseFloat(reserva.replace(",", "."))          || 0;

  const custoTotalFixo = moradiaNum + mercadoNum + assinaturasNum + transporteNum;
  const folgaMensal    = rendaNum - custoTotalFixo;
  const pctComprometida = rendaNum > 0 ? (custoTotalFixo / rendaNum) * 100 : 0;

  // ── Sugestão inteligente baseada nos dados reais da Anamnese ─────────────
  const sugestao = useMemo(() => {
    if (rendaNum <= 0) return { nivel: "moderado" as NivelEconomia, motivo: "Informe a renda para receber uma sugestão personalizada." };
    return calcNivelSugerido(rendaNum, custoTotalFixo, metas);
  }, [rendaNum, custoTotalFixo, metas]);

  // Texto clínico do Veredito
  const veredito = useMemo(() => {
    if (rendaNum <= 0) return "";
    const pct = Math.round(pctComprometida);
    const folga = folgaMensal;

    if (pct <= 40) return `Com ${pct}% da renda comprometida com o essencial, vocês têm uma folga saudável de ${fmt(folga)}/mês. Ótimo cenário para investir em sonhos.`;
    if (pct <= 65) return `${pct}% da renda vai para custos fixos, deixando ${fmt(folga)}/mês livre. Com disciplina, vocês alcançam as metas no prazo.`;
    if (pct <= 85) return `Atenção: ${pct}% da renda já está comprometida com o essencial. A margem de ${fmt(folga)}/mês exige controle rigoroso para honrar as metas.`;
    return `Alerta crítico: ${pct}% da renda está comprometida, restando apenas ${fmt(Math.max(0, folga))}. Revisar os custos fixos é urgente antes de pensar em metas.`;
  }, [rendaNum, pctComprometida, folgaMensal]);

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateGroup({
        dinamicaRenda:      dinamica,
        rendaDeclarada:     Math.round(rendaNum * 100) / 100,
        custoMoradia:       Math.round(moradiaNum * 100) / 100,
        custoMercado:       Math.round(mercadoNum * 100) / 100,
        custoAssinaturas:   Math.round(assinaturasNum * 100) / 100,
        custoTransporte:    Math.round(transporteNum * 100) / 100,
        custoVidaEssencial: Math.round(custoTotalFixo * 100) / 100,
        reservaExistente:   Math.round(reservaNum * 100) / 100,
        mesesReservaIdeal:  mesesReserva,
        nivelEconomia:      nivel,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const inputCls = "w-full h-12 pl-10 pr-4 rounded-2xl text-[15px] bg-white/[0.05] border border-white/[0.08] text-white/85 focus:outline-none focus:border-white/20 transition [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";
  const labelCls = "text-[10.5px] uppercase tracking-[0.20em] text-white/30 mb-2";

  // ── Renderização dos Steps ────────────────────────────────────────────────

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center sm:p-6 bg-black/80 backdrop-blur-sm"
      onClick={(e) => { if (!isMandatory && e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-[480px] rounded-t-[28px] sm:rounded-[24px] border shadow-2xl max-h-[92dvh] overflow-y-auto"
        style={{ background: "oklch(0.13 0.01 240)", borderColor: "oklch(1 0 0 / 0.08)" }}
      >
        {/* Handle mobile */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 rounded-full bg-white/20" />
        </div>

        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[18px]">{isMandatory ? "✨" : "🧠"}</span>
              <h2 className="font-serif text-[20px] font-normal text-white/90">
                {isMandatory ? "Bem-vindo ao Sincronia" : "Auditor de Perfil"}
              </h2>
            </div>
            <p className="text-[12px] text-white/35">
              {isMandatory
                ? "Vamos calibrar a inteligência do sistema para a realidade de vocês."
                : "Recalibrar o Consultor com os dados atuais do casal."}
            </p>
          </div>
          {!isMandatory && (
            <button
              onClick={onClose}
              className="size-8 rounded-full flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition text-[18px]"
            >✕</button>
          )}
        </div>

        {/* Barra de progresso */}
        <div className="flex gap-1 px-6 mb-5">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className="h-[2.5px] flex-1 rounded-full transition-all duration-400"
              style={{ background: i <= step ? accent : "oklch(1 0 0 / 0.10)" }}
            />
          ))}
        </div>

        <div className="px-6 pb-6 space-y-4">

          {/* ══════════════════════════════════════════════════════════════════
              STEP 0: RAIO-X DA RENDA
          ══════════════════════════════════════════════════════════════════ */}
          {step === 0 && (
            <div className="space-y-4 animate-fade-up">
              <div className="rounded-2xl p-4 border" style={{ background: `${accent}08`, borderColor: `${accent}20` }}>
                <p className="text-[13px] text-white/60 leading-relaxed">
                  <strong className="text-white/80">Raio-X da Renda</strong> — vamos entender quanto dinheiro entra no casal todo mês. Isso é a base de todo o diagnóstico do Consultor.
                </p>
              </div>

              {/* Dinâmica */}
              <div>
                <div className={labelCls}>Como funciona a renda de vocês?</div>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { value: "dois_provedores", emoji: "👫", label: "Os dois trabalham", desc: "Renda combinada dos dois." },
                    { value: "um_provedor",     emoji: "🧑‍💼", label: "Só um trabalha",   desc: "Um provedor principal." },
                  ] as const).map((op) => {
                    const sel = dinamica === op.value;
                    return (
                      <button
                        key={op.value}
                        onClick={() => setDinamica(op.value)}
                        className="text-left px-4 py-3 rounded-2xl border transition-all"
                        style={sel
                          ? { background: `${accent}12`, borderColor: `${accent}40` }
                          : { background: "oklch(1 0 0 / 0.03)", borderColor: "oklch(1 0 0 / 0.07)" }
                        }
                      >
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[20px]">{op.emoji}</span>
                          <span className="text-[13px] font-medium text-white/80">{op.label}</span>
                          {sel && (
                            <span className="ml-auto size-4 rounded-full flex items-center justify-center text-[10px]" style={{ background: accent, color: "oklch(0.12 0.01 240)" }}>✓</span>
                          )}
                        </div>
                        <p className="text-[11px] text-white/35">{op.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Renda */}
              <div>
                <div className={labelCls}>
                  {dinamica === "dois_provedores" ? "Renda líquida somada (os dois)" : "Renda líquida mensal"}
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[13px] text-white/35 font-medium">R$</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={renda}
                    onChange={(e) => setRenda(e.target.value)}
                    placeholder="0,00"
                    className={inputCls}
                    autoFocus
                  />
                </div>
                {rendaNum > 0 && (
                  <p className="text-[11px] text-white/35 mt-1.5">
                    {dinamica === "dois_provedores"
                      ? `Média de ${fmt(rendaNum / 2)}/pessoa — somados: ${fmt(rendaNum)}/mês`
                      : `Renda principal: ${fmt(rendaNum)}/mês`}
                  </p>
                )}
              </div>

              <button
                onClick={() => setStep(1)}
                disabled={rendaNum <= 0}
                className="w-full h-12 rounded-2xl text-[14px] font-semibold transition-all active:scale-[0.98]"
                style={rendaNum > 0
                  ? { background: "oklch(0.96 0.012 80)", color: "oklch(0.12 0.01 240)" }
                  : { background: "oklch(1 0 0 / 0.08)", color: "oklch(1 0 0 / 0.25)", cursor: "not-allowed" }
                }
              >
                Continuar →
              </button>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              STEP 1: CALCULADORA DE CUSTOS FIXOS
          ══════════════════════════════════════════════════════════════════ */}
          {step === 1 && (
            <div className="space-y-4 animate-fade-up">
              <div className="rounded-2xl p-4 border" style={{ background: `${accent}08`, borderColor: `${accent}20` }}>
                <p className="text-[13px] text-white/60 leading-relaxed">
                  <strong className="text-white/80">Custos fixos</strong> são os gastos que aparecem todo mês, independentemente do que aconteça. Quanto mais preciso, mais certeiro será o Consultor.
                </p>
              </div>

              {/* Campo Moradia */}
              <div>
                <div className={labelCls}>🏠 Moradia (Aluguel / Condomínio / Financiamento)</div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[13px] text-white/35 font-medium">R$</span>
                  <input type="number" inputMode="decimal" value={custoMoradia} onChange={(e) => setCustoMoradia(e.target.value)} placeholder="0,00" className={inputCls} />
                </div>
              </div>

              {/* Campo Mercado */}
              <div>
                <div className={labelCls}>🛒 Mercado & Alimentação Base</div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[13px] text-white/35 font-medium">R$</span>
                  <input type="number" inputMode="decimal" value={custoMercado} onChange={(e) => setCustoMercado(e.target.value)} placeholder="0,00" className={inputCls} />
                </div>
              </div>

              {/* Campo Assinaturas */}
              <div>
                <div className={labelCls}>🎬 Assinaturas & Serviços</div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {ASSINATURAS_ICONS.map((s) => (
                    <span
                      key={s.nome}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] text-white/50 border border-white/[0.08]"
                      style={{ background: "oklch(1 0 0 / 0.04)" }}
                    >
                      {s.emoji} {s.nome}
                    </span>
                  ))}
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[13px] text-white/35 font-medium">R$</span>
                  <input type="number" inputMode="decimal" value={custoAssinaturas} onChange={(e) => setCustoAssinaturas(e.target.value)} placeholder="0,00" className={inputCls} />
                </div>
              </div>

              {/* Campo Transporte */}
              <div>
                <div className={labelCls}>🚗 Transporte & Combustível</div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[13px] text-white/35 font-medium">R$</span>
                  <input type="number" inputMode="decimal" value={custoTransporte} onChange={(e) => setCustoTransporte(e.target.value)} placeholder="0,00" className={inputCls} />
                </div>
              </div>

              {/* Total calculado ao vivo */}
              {custoTotalFixo > 0 && (
                <div
                  className="rounded-2xl px-4 py-3 flex items-center justify-between border"
                  style={{ background: `${accent}08`, borderColor: `${accent}20` }}
                >
                  <span className="text-[12px] text-white/45">Total fixo mensal</span>
                  <span className="text-[16px] font-medium" style={{ color: accent }}>{fmt(custoTotalFixo)}</span>
                </div>
              )}
              {rendaNum > 0 && custoTotalFixo > 0 && (
                <p className="text-[11.5px] text-white/40 -mt-2 text-center">
                  {Math.round(pctComprometida)}% da renda comprometida com o essencial
                </p>
              )}

              <div className="flex gap-3">
                <button onClick={() => setStep(0)} className="h-12 px-5 rounded-2xl border border-white/[0.10] text-[14px] text-white/45 hover:text-white/70 hover:bg-white/[0.04] transition">← Voltar</button>
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 h-12 rounded-2xl text-[14px] font-semibold transition-all active:scale-[0.98]"
                  style={{ background: "oklch(0.96 0.012 80)", color: "oklch(0.12 0.01 240)" }}
                >Continuar →</button>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              STEP 2: BLINDAGEM (RESERVA)
          ══════════════════════════════════════════════════════════════════ */}
          {step === 2 && (
            <div className="space-y-4 animate-fade-up">
              <div>
                <div className={labelCls}>Quantos meses de reserva querem ter?</div>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { meses: 0,  emoji: "🛑", label: "Desativar",          desc: "Não queremos focar em reserva agora. O Consultor vai respeitar e focar nas metas." },
                    { meses: 3,  emoji: "🚀", label: "3 meses — Acelerado",  desc: "Ideal para renda estável (CLT, concurso). Libera caixa para acelerar os sonhos." },
                    { meses: 6,  emoji: "⚖️", label: "6 meses — Equilibrado",desc: "Recomendação padrão. Balanço entre segurança e liberdade para as metas." },
                    { meses: 12, emoji: "🛡️", label: "12 meses — Conservador",desc: "Ideal para autônomos e empreendedores que precisam de máxima segurança." },
                  ] as const).map((op) => {
                    const sel = mesesReserva === op.meses;
                    return (
                      <button
                        key={op.meses}
                        onClick={() => setMesesReserva(op.meses)}
                        className="text-left px-3 py-3 rounded-2xl border transition-all"
                        style={sel
                          ? { background: `${accent}12`, borderColor: `${accent}40` }
                          : { background: "oklch(1 0 0 / 0.03)", borderColor: "oklch(1 0 0 / 0.07)" }
                        }
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[18px]">{op.emoji}</span>
                          <span className="text-[12px] font-medium text-white/80">{op.label}</span>
                          {sel && <span className="ml-auto size-4 rounded-full flex items-center justify-center text-[10px]" style={{ background: accent, color: "oklch(0.12 0.01 240)" }}>✓</span>}
                        </div>
                        <p className="text-[11px] text-white/35 leading-relaxed">{op.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {mesesReserva > 0 && (
                <div>
                  <div className="rounded-2xl p-4 border mb-3" style={{ background: `${accent}08`, borderColor: `${accent}20` }}>
                    <p className="text-[13px] text-white/60 leading-relaxed">
                      Meta de vocês: <strong className="text-white/70">{mesesReserva} meses</strong> de custo essencial
                    </p>
                    <p className="text-[12px] mt-1" style={{ color: accent }}>
                      Alvo: <strong>{fmt(custoTotalFixo * mesesReserva)}</strong>
                    </p>
                  </div>
                  <div className={labelCls}>Quanto vocês já têm guardado?</div>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[13px] text-white/35 font-medium">R$</span>
                    <input type="number" inputMode="decimal" value={reserva} onChange={(e) => setReserva(e.target.value)} placeholder="0,00" className={inputCls} />
                  </div>
                  {reservaNum > 0 && (
                    <p className="text-[11px] text-white/35 mt-1.5">
                      {reservaNum >= custoTotalFixo * mesesReserva
                        ? "✅ Reserva completa! Vocês estão protegidos."
                        : `Faltam ${fmt(Math.max(0, custoTotalFixo * mesesReserva - reservaNum))} para completar.`}
                    </p>
                  )}
                </div>
              )}

              {mesesReserva === 0 && (
                <div className="rounded-2xl p-4 border" style={{ background: "oklch(0.16 0.02 60 / 0.20)", borderColor: "oklch(0.72 0.10 60 / 0.25)" }}>
                  <p className="text-[12.5px] text-white/55 leading-relaxed">
                    💡 <strong className="text-white/70">O Consultor entende.</strong> Sem cobranças sobre reserva. Foco 100% em gastos e metas.
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="h-12 px-5 rounded-2xl border border-white/[0.10] text-[14px] text-white/45 hover:text-white/70 hover:bg-white/[0.04] transition">← Voltar</button>
                <button onClick={() => setStep(3)} className="flex-1 h-12 rounded-2xl text-[14px] font-semibold transition-all active:scale-[0.98]" style={{ background: "oklch(0.96 0.012 80)", color: "oklch(0.12 0.01 240)" }}>Continuar →</button>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              STEP 3: VEREDITO DO CONSULTOR
          ══════════════════════════════════════════════════════════════════ */}
          {step === 3 && (
            <div className="space-y-4 animate-fade-up">

              {/* Diagnóstico clínico baseado nos dados reais */}
              <div className="rounded-2xl p-4 border" style={{ background: `${accent}08`, borderColor: `${accent}20` }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[14px]">✦</span>
                  <span className="text-[11px] uppercase tracking-[0.18em] text-white/40">Diagnóstico do Consultor</span>
                </div>

                {/* Resumo numérico */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="rounded-xl p-2 text-center" style={{ background: "oklch(1 0 0 / 0.04)" }}>
                    <div className="text-[10px] text-white/35 mb-0.5">Renda</div>
                    <div className="text-[13px] font-medium text-white/75">{fmt(rendaNum)}</div>
                  </div>
                  <div className="rounded-xl p-2 text-center" style={{ background: "oklch(1 0 0 / 0.04)" }}>
                    <div className="text-[10px] text-white/35 mb-0.5">Fixos</div>
                    <div className="text-[13px] font-medium text-white/75">{fmt(custoTotalFixo)}</div>
                  </div>
                  <div className="rounded-xl p-2 text-center" style={{ background: folgaMensal >= 0 ? "oklch(0.30 0.06 150 / 0.30)" : "oklch(0.30 0.08 20 / 0.30)" }}>
                    <div className="text-[10px] text-white/35 mb-0.5">Folga</div>
                    <div className="text-[13px] font-medium" style={{ color: folgaMensal >= 0 ? "#34D399" : "#F87171" }}>{fmt(folgaMensal)}</div>
                  </div>
                </div>

                <p className="text-[13px] text-white/65 leading-relaxed">{veredito}</p>

                {sugestao && (
                  <button
                    onClick={() => setNivel(sugestao.nivel)}
                    className="mt-3 text-[12px] font-medium transition hover:opacity-80"
                    style={{ color: accent }}
                  >
                    Usar nível <strong>{sugestao.nivel}</strong> →
                  </button>
                )}
              </div>

              {/* Seleção manual do nível */}
              <div className="space-y-2">
                {NIVEIS.map((n) => {
                  const sel = nivel === n.value;
                  return (
                    <button
                      key={n.value}
                      onClick={() => setNivel(n.value)}
                      className="w-full text-left px-4 py-4 rounded-2xl border transition-all"
                      style={sel
                        ? { background: `${accent}12`, borderColor: `${accent}40` }
                        : { background: "oklch(1 0 0 / 0.03)", borderColor: "oklch(1 0 0 / 0.07)" }
                      }
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-[22px]">{n.emoji}</span>
                        <div className="flex-1">
                          <div className="text-[13.5px] font-medium text-white/85">{n.label}</div>
                          <div className="text-[11.5px] text-white/40 mt-0.5">{n.desc}</div>
                        </div>
                        {sel && (
                          <div className="size-5 rounded-full flex items-center justify-center text-[11px]" style={{ background: accent, color: "oklch(0.12 0.01 240)" }}>✓</div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={() => setStep(2)} className="h-12 px-5 rounded-2xl border border-white/[0.10] text-[14px] text-white/45 hover:text-white/70 hover:bg-white/[0.04] transition">← Voltar</button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 h-12 rounded-2xl text-[14px] font-semibold transition-all active:scale-[0.98]"
                  style={{ background: "oklch(0.96 0.012 80)", color: "oklch(0.12 0.01 240)" }}
                >
                  {saving ? "Salvando…" : "✓ Ativar o Consultor"}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
