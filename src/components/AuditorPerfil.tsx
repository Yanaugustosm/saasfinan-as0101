/**
 * AuditorPerfil — Onboarding Comportamental do Casal
 *
 * Tela/modal onde o casal configura:
 *  1. Custo de vida essencial (média mensal dos gastos necessários)
 *  2. Se já tem Reserva de Emergência (e quanto)
 *  3. Nível de Economia (sugerido automaticamente, mas editável)
 *
 * Essa configuração alimenta o Consultor Inteligente e o Motor Preditivo.
 */

import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useData, calcTotais, calcNivelSugerido, getLast6Months, fmt } from "@/contexts/DataContext";
import type { NivelEconomia } from "@/contexts/DataContext";

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface AuditorPerfilProps {
  isOpen:      boolean;
  onClose:     () => void;
  isMandatory?: boolean; // true = onboarding obrigatório: sem X, sem fechar pelo fundo
}

// ─── Helpers visuais ─────────────────────────────────────────────────────────

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

// ─── Componente ───────────────────────────────────────────────────────────────

export function AuditorPerfil({ isOpen, onClose, isMandatory = false }: AuditorPerfilProps) {
  const { group, updateGroup } = useAuth();
  const { transacoes, metas }  = useData();

  // Calcula a média de despesas dos últimos 6 meses como ponto de partida
  const mediaDespesas = useMemo(() => {
    const months = getLast6Months();
    const totais = months.map((m) => {
      const l = transacoes.filter((t) => t.data?.startsWith(m));
      return calcTotais(l).des;
    });
    const validos = totais.filter((v) => v > 0);
    return validos.length > 0 ? Math.round(validos.reduce((a, b) => a + b, 0) / validos.length) : 0;
  }, [transacoes]);

  const mediaReceitas = useMemo(() => {
    const months = getLast6Months();
    const totais = months.map((m) => {
      const l = transacoes.filter((t) => t.data?.startsWith(m));
      return calcTotais(l).rec;
    });
    const validos = totais.filter((v) => v > 0);
    return validos.length > 0 ? Math.round(validos.reduce((a, b) => a + b, 0) / validos.length) : 0;
  }, [transacoes]);

  const [custo,        setCusto]        = useState(String(group?.custoVidaEssencial ?? mediaDespesas));
  const [reserva,      setReserva]      = useState(String(group?.reservaExistente ?? 0));
  const [mesesReserva, setMesesReserva] = useState<number>(group?.mesesReservaIdeal ?? 6);
  const [nivel,        setNivel]        = useState<NivelEconomia>(group?.nivelEconomia ?? "moderado");
  const [saving,       setSaving]       = useState(false);
  const [step,         setStep]         = useState(0); // 0 = custo, 1 = reserva, 2 = nível

  const custoNum   = parseFloat(custo.replace(",", "."))   || 0;
  const reservaNum = parseFloat(reserva.replace(",", ".")) || 0;

  // Sugestão de nível baseada nos dados reais
  const sugestao = useMemo(
    () => calcNivelSugerido(mediaReceitas, custoNum, metas),
    [mediaReceitas, custoNum, metas]
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateGroup({
        custoVidaEssencial: custoNum,
        reservaExistente:   reservaNum,
        nivelEconomia:      nivel,
        mesesReservaIdeal:  mesesReserva,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const accent = "oklch(0.82 0.07 75)"; // champagne

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center sm:p-6 bg-black/75 backdrop-blur-sm"
      onClick={(e) => {
        // Onboarding obrigatório: não fecha ao clicar fora
        if (!isMandatory && e.target === e.currentTarget) onClose();
      }}
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
                : "Configura o Consultor para o seu casal"}
            </p>
          </div>
          {/* Botão de fechar: escondido no onboarding obrigatório */}
          {!isMandatory && (
            <button
              onClick={onClose}
              className="size-8 rounded-full flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition text-[18px]"
            >✕</button>
          )}
        </div>

        {/* Indicador de etapas */}
        <div className="flex gap-1 px-6 mb-5">
          {[0, 1, 2].map((s) => (
            <div
              key={s}
              className="h-[2px] flex-1 rounded-full transition-all duration-300"
              style={{ background: s <= step ? accent : "oklch(1 0 0 / 0.10)" }}
            />
          ))}
        </div>

        <div className="px-6 pb-6 space-y-5">

          {/* ── STEP 0: Custo de Vida Essencial ── */}
          {step === 0 && (
            <div className="space-y-4 animate-fade-up">
              <div
                className="rounded-2xl p-4 border"
                style={{ background: `${accent}08`, borderColor: `${accent}20` }}
              >
                <p className="text-[13px] text-white/60 leading-relaxed">
                  <strong className="text-white/80">Custo de vida essencial</strong> é a soma dos gastos que vocês <em>precisam</em> ter todo mês: aluguel, mercado, energia, transporte, saúde.
                </p>
                <p className="text-[12px] text-white/35 mt-2">
                  Média dos últimos 6 meses: <strong className="text-white/50">{fmt(mediaDespesas)}</strong>
                </p>
              </div>

              <div>
                <div className="text-[10.5px] uppercase tracking-[0.20em] text-white/30 mb-2">
                  Custo mensal essencial estimado
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[13px] text-white/35 font-medium">R$</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={custo}
                    onChange={(e) => setCusto(e.target.value)}
                    placeholder={String(mediaDespesas)}
                    className="w-full h-13 pl-10 pr-4 rounded-2xl text-[16px] bg-white/[0.05] border border-white/[0.08] text-white/85 focus:outline-none focus:border-white/20 transition [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>

              <button
                onClick={() => setStep(1)}
                disabled={custoNum <= 0}
                className="w-full h-12 rounded-2xl text-[14px] font-semibold transition-all active:scale-[0.98]"
                style={custoNum > 0
                  ? { background: "oklch(0.96 0.012 80)", color: "oklch(0.12 0.01 240)" }
                  : { background: "oklch(1 0 0 / 0.08)", color: "oklch(1 0 0 / 0.25)", cursor: "not-allowed" }
                }
              >
                Continuar →
              </button>
            </div>
          )}

          {/* ── STEP 1: Reserva de Emergência ── */}
          {step === 1 && (
            <div className="space-y-4 animate-fade-up">

              {/* Seletor de meses — o Consultor age como conselheiro aqui */}
              <div>
                <div className="text-[10.5px] uppercase tracking-[0.20em] text-white/30 mb-3">
                  Quantos meses de reserva querem ter?
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    {
                      meses: 0,
                      emoji: "🛑",
                      label: "Desativar",
                      desc: "Não queremos focar em reserva agora. O Consultor vai respeitar essa decisão e não cobrar nada sobre isso.",
                    },
                    {
                      meses: 3,
                      emoji: "🚀",
                      label: "3 meses — Acelerado",
                      desc: "Ideal para casais com renda estável (CLT, concurso público). Libera mais caixa para acelerar os sonhos.",
                    },
                    {
                      meses: 6,
                      emoji: "⚖️",
                      label: "6 meses — Equilibrado",
                      desc: "A recomendação padrão do Consultor. Balanço entre segurança e liberdade para investir nos sonhos.",
                    },
                    {
                      meses: 12,
                      emoji: "🛡️",
                      label: "12 meses — Conservador",
                      desc: "Ideal para autônomos, empreendedores ou quem quer dormir tranquilo antes de qualquer outra meta.",
                    },
                  ] as const).map((op) => {
                    const sel = mesesReserva === op.meses;
                    return (
                      <button
                        key={op.meses}
                        onClick={() => setMesesReserva(op.meses)}
                        className="text-left px-3 py-3 rounded-2xl border transition-all col-span-1"
                        style={sel
                          ? { background: `${accent}12`, borderColor: `${accent}40` }
                          : { background: "oklch(1 0 0 / 0.03)", borderColor: "oklch(1 0 0 / 0.07)" }
                        }
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[18px]">{op.emoji}</span>
                          <span className="text-[12.5px] font-medium text-white/80">{op.label}</span>
                          {sel && (
                            <span
                              className="ml-auto size-4 rounded-full flex items-center justify-center text-[10px]"
                              style={{ background: accent, color: "oklch(0.12 0.01 240)" }}
                            >✓</span>
                          )}
                        </div>
                        <p className="text-[11px] text-white/35 leading-relaxed">{op.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Saldo atual da reserva — some se escolheram Desativar */}
              {mesesReserva > 0 && (
                <div>
                  <div
                    className="rounded-2xl p-4 border mb-3"
                    style={{ background: `${accent}08`, borderColor: `${accent}20` }}
                  >
                    <p className="text-[13px] text-white/60 leading-relaxed">
                      <strong className="text-white/80">Reserva de emergência</strong> é o dinheiro guardado para imprevistos. A meta de vocês: <strong className="text-white/70">{mesesReserva} meses</strong> de custo essencial.
                    </p>
                    <p className="text-[12px] mt-2" style={{ color: accent }}>
                      Meta ideal para vocês: <strong>{fmt(custoNum * mesesReserva)}</strong>
                    </p>
                  </div>

                  <div className="text-[10.5px] uppercase tracking-[0.20em] text-white/30 mb-2">
                    Quanto vocês já têm guardado?
                  </div>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[13px] text-white/35 font-medium">R$</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={reserva}
                      onChange={(e) => setReserva(e.target.value)}
                      placeholder="0"
                      className="w-full h-13 pl-10 pr-4 rounded-2xl text-[16px] bg-white/[0.05] border border-white/[0.08] text-white/85 focus:outline-none focus:border-white/20 transition [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                  {reservaNum > 0 && (
                    <p className="text-[11px] text-white/35 mt-1.5">
                      {reservaNum >= custoNum * mesesReserva
                        ? "✅ Reserva completa! Vocês estão protegidos."
                        : `Faltam ${fmt(Math.max(0, custoNum * mesesReserva - reservaNum))} para completar.`}
                    </p>
                  )}
                </div>
              )}

              {/* Feedback quando desativam a reserva */}
              {mesesReserva === 0 && (
                <div
                  className="rounded-2xl p-4 border"
                  style={{ background: "oklch(0.16 0.02 60 / 0.20)", borderColor: "oklch(0.72 0.10 60 / 0.25)" }}
                >
                  <p className="text-[12.5px] text-white/55 leading-relaxed">
                    💡 <strong className="text-white/70">O Consultor entende.</strong> Sem cobranças sobre reserva. Nosso foco será 100% em otimizar seus gastos e acelerar suas metas.
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(0)}
                  className="h-12 px-5 rounded-2xl border border-white/[0.10] text-[14px] text-white/45 hover:text-white/70 hover:bg-white/[0.04] transition"
                >
                  ← Voltar
                </button>
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 h-12 rounded-2xl text-[14px] font-semibold transition-all active:scale-[0.98]"
                  style={{ background: "oklch(0.96 0.012 80)", color: "oklch(0.12 0.01 240)" }}
                >
                  Continuar →
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 2: Nível de Economia ── */}
          {step === 2 && (
            <div className="space-y-4 animate-fade-up">
              {/* Sugestão automática */}
              <div
                className="rounded-2xl p-4 border"
                style={{ background: `${accent}08`, borderColor: `${accent}20` }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[14px]">✦</span>
                  <span className="text-[11px] uppercase tracking-[0.18em] text-white/40">Sugestão do Consultor</span>
                </div>
                <p className="text-[13px] text-white/70 leading-relaxed">{sugestao.motivo}</p>
                <button
                  onClick={() => setNivel(sugestao.nivel)}
                  className="mt-2 text-[11.5px] font-medium transition"
                  style={{ color: accent }}
                >
                  Usar nível <strong>{sugestao.nivel}</strong> →
                </button>
              </div>

              {/* Seleção manual */}
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
                          <div
                            className="size-5 rounded-full flex items-center justify-center text-[11px]"
                            style={{ background: accent, color: "oklch(0.12 0.01 240)" }}
                          >
                            ✓
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setStep(1)}
                  className="h-12 px-5 rounded-2xl border border-white/[0.10] text-[14px] text-white/45 hover:text-white/70 hover:bg-white/[0.04] transition"
                >
                  ← Voltar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 h-12 rounded-2xl text-[14px] font-semibold transition-all active:scale-[0.98]"
                  style={{ background: "oklch(0.96 0.012 80)", color: "oklch(0.12 0.01 240)" }}
                >
                  {saving ? "Salvando…" : "✓ Salvar configuração"}
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
