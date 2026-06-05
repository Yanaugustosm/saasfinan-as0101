/**
 * AuditorPerfil v3 — Anamnese Financeira Premium
 *
 * Melhorias v3:
 *   1. Mercado agora tem label + aviso de que iFood/delivery é variável e fica de fora
 *   2. Assinaturas viram um Grid Premium com logos oficiais, preço por serviço e soma automática
 *   3. Veredito (Step 3) auto-seleciona o nível sugerido pelo algoritmo ao abrir o passo
 */

import { useState, useMemo, useEffect } from "react";
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

// ─── Catálogo de Streamings com Logos Oficiais ───────────────────────────────

interface StreamingDef {
  id:            string;
  nome:          string;
  logo:          string;
  precoSugerido: number;
}

// CDN: Simple Icons (SVGs vetoriais oficiais com cores de marca, open-source, sem bloqueio)
const SI = (slug: string, color: string) =>
  `https://cdn.simpleicons.org/${slug}/${color}`;

const STREAMINGS: StreamingDef[] = [
  { id: "netflix",     nome: "Netflix",      logo: SI("netflix",       "E50914"), precoSugerido: 39.90  },
  { id: "spotify",     nome: "Spotify",      logo: SI("spotify",       "1ED760"), precoSugerido: 21.90  },
  { id: "prime",       nome: "Prime Video",  logo: SI("amazonprime",   "00A8E1"), precoSugerido: 19.90  },
  { id: "disney",      nome: "Disney+",      logo: SI("disneyplus",    "0063E5"), precoSugerido: 43.90  },
  { id: "max",         nome: "Max",          logo: SI("hbomax",        "A020F0"), precoSugerido: 34.90  },
  { id: "youtube",     nome: "YouTube",      logo: SI("youtube",       "FF0000"), precoSugerido: 27.90  },
  { id: "globoplay",   nome: "Globoplay",    logo: SI("globo",         "FF5300"), precoSugerido: 24.90  },
  { id: "paramount",   nome: "Paramount+",   logo: SI("paramount",     "0064FF"), precoSugerido: 19.90  },
  { id: "apple",       nome: "Apple TV+",    logo: SI("appletv",       "ffffff"), precoSugerido: 21.90  },
  { id: "crunchyroll", nome: "Crunchyroll",  logo: SI("crunchyroll",   "F47521"), precoSugerido: 19.90  },
  { id: "deezer",      nome: "Deezer",       logo: SI("deezer",        "EF5466"), precoSugerido: 21.90  },
  { id: "internet",    nome: "Internet",     logo: SI("speedtest",     "141526"), precoSugerido: 120.00 },
];


// ─── Constantes visuais ──────────────────────────────────────────────────────

const NIVEIS: { value: NivelEconomia; emoji: string; label: string; desc: string }[] = [
  { value: "conforto",  emoji: "🛋️", label: "Conforto",  desc: "Gastam bem e ainda economizam. O Consultor só alerta gastos muito excessivos." },
  { value: "moderado",  emoji: "⚖️", label: "Moderado",  desc: "Equilíbrio entre qualidade de vida e metas. O Consultor avisa excessos pontuais." },
  { value: "agressivo", emoji: "🎯", label: "Agressivo", desc: "Foco máximo nas metas. O Consultor cobra rigor em qualquer desvio." },
];

const TOTAL_STEPS = 4;

// ─── Componente ───────────────────────────────────────────────────────────────

export function AuditorPerfil({ isOpen, onClose, isMandatory = false }: AuditorPerfilProps) {
  const { group, updateGroup } = useAuth();
  const { metas }              = useData();

  const accent = "oklch(0.82 0.07 75)";

  // ── State da Anamnese ─────────────────────────────────────────────────────

  // Step 0
  const [dinamica, setDinamica] = useState<"um_provedor" | "dois_provedores">(
    group?.dinamicaRenda ?? "dois_provedores"
  );
  const [renda, setRenda] = useState(String(group?.rendaDeclarada ?? ""));

  // Step 1
  const [custoMoradia,    setCustoMoradia]    = useState(String(group?.custoMoradia    ?? ""));
  const [custoMercado,    setCustoMercado]    = useState(String(group?.custoMercado    ?? ""));
  const [custoTransporte, setCustoTransporte] = useState(String(group?.custoTransporte ?? ""));

  // Streamings — mapa de id → preço mensal selecionado
  const [streamingsSel, setStreamingsSel] = useState<Record<string, number>>(
    group?.assinaturasDetalhadas ?? {}
  );

  // Step 2
  const [mesesReserva, setMesesReserva] = useState<number>(group?.mesesReservaIdeal ?? 6);
  const [reserva,      setReserva]      = useState(String(group?.reservaExistente   ?? ""));

  // Step 3
  const [nivel, setNivel] = useState<NivelEconomia>(group?.nivelEconomia ?? "moderado");

  const [step,   setStep]   = useState(0);
  const [saving, setSaving] = useState(false);

  // ── Cálculos ──────────────────────────────────────────────────────────────

  const rendaNum       = parseFloat(renda.replace(",", "."))         || 0;
  const moradiaNum     = parseFloat(custoMoradia.replace(",", "."))  || 0;
  const mercadoNum     = parseFloat(custoMercado.replace(",", "."))  || 0;
  const transporteNum  = parseFloat(custoTransporte.replace(",", ".")) || 0;
  const reservaNum     = parseFloat(reserva.replace(",", "."))       || 0;

  // Soma dos streamings selecionados (calculado automaticamente)
  const assinaturasNum = Object.values(streamingsSel).reduce((a, b) => a + b, 0);

  const custoTotalFixo  = moradiaNum + mercadoNum + assinaturasNum + transporteNum;
  const folgaMensal     = rendaNum - custoTotalFixo;
  const pctComprometida = rendaNum > 0 ? (custoTotalFixo / rendaNum) * 100 : 0;

  // ── Sugestão inteligente ──────────────────────────────────────────────────

  const sugestao = useMemo(
    () => rendaNum > 0
      ? calcNivelSugerido(
          rendaNum,
          custoTotalFixo,
          metas,
          reservaNum,
          mesesReserva * custoTotalFixo  // reservaIdeal = meses * custo essencial
        )
      : null,
    [rendaNum, custoTotalFixo, metas, reservaNum, mesesReserva]
  );

  // FIX: Auto-seleciona o nível sugerido assim que o passo 3 abre
  useEffect(() => {
    if (step === 3 && sugestao) {
      setNivel(sugestao.nivel);
    }
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  // Diagnóstico clínico
  const veredito = useMemo(() => {
    if (rendaNum <= 0) return "";
    const pct = Math.round(pctComprometida);
    const folga = folgaMensal;
    if (pct <= 40) return `Com ${pct}% da renda comprometida com o essencial, vocês têm uma folga saudável de ${fmt(folga)}/mês. Ótimo cenário para investir em sonhos.`;
    if (pct <= 65) return `${pct}% da renda vai para custos fixos, deixando ${fmt(folga)}/mês livre. Com disciplina, vocês alcançam as metas no prazo.`;
    if (pct <= 85) return `Atenção: ${pct}% da renda já está comprometida com o essencial. A margem de ${fmt(folga)}/mês exige controle rigoroso para honrar as metas.`;
    return `Alerta crítico: ${pct}% da renda está comprometida, restando apenas ${fmt(Math.max(0, folga))}. Revisar os custos fixos é urgente antes de pensar em metas.`;
  }, [rendaNum, pctComprometida, folgaMensal]);

  // ── Helpers de Streaming ──────────────────────────────────────────────────

  const toggleStreaming = (s: StreamingDef) => {
    setStreamingsSel((prev) => {
      if (prev[s.id] !== undefined) {
        const { [s.id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [s.id]: s.precoSugerido };
    });
  };

  const updateStreamingPreco = (id: string, valor: number) => {
    setStreamingsSel((prev) => ({ ...prev, [id]: valor }));
  };

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    setSaving(true);
    try {
      const totalAssinaturas = Math.round(assinaturasNum * 100) / 100;
      const totalFixo        = Math.round(custoTotalFixo * 100) / 100;
      await updateGroup({
        dinamicaRenda:          dinamica,
        rendaDeclarada:         Math.round(rendaNum      * 100) / 100,
        custoMoradia:           Math.round(moradiaNum    * 100) / 100,
        custoMercado:           Math.round(mercadoNum    * 100) / 100,
        custoAssinaturas:       totalAssinaturas,
        assinaturasDetalhadas:  streamingsSel,
        custoTransporte:        Math.round(transporteNum * 100) / 100,
        custoVidaEssencial:     totalFixo,
        reservaExistente:       Math.round(reservaNum    * 100) / 100,
        mesesReservaIdeal:      mesesReserva,
        nivelEconomia:          nivel,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const inputCls = "w-full h-12 pl-10 pr-4 rounded-2xl text-[15px] bg-white/[0.05] border border-white/[0.08] text-white/85 focus:outline-none focus:border-white/20 transition [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";
  const labelCls = "text-[10.5px] uppercase tracking-[0.20em] text-white/30 mb-2";

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
                          {sel && <span className="ml-auto size-4 rounded-full flex items-center justify-center text-[10px]" style={{ background: accent, color: "oklch(0.12 0.01 240)" }}>✓</span>}
                        </div>
                        <p className="text-[11px] text-white/35">{op.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className={labelCls}>
                  {dinamica === "dois_provedores" ? "Renda líquida somada (os dois)" : "Renda líquida mensal"}
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[13px] text-white/35 font-medium">R$</span>
                  <input type="number" inputMode="decimal" value={renda} onChange={(e) => setRenda(e.target.value)} placeholder="0,00" className={inputCls} autoFocus />
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
              >Continuar →</button>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              STEP 1: CUSTOS FIXOS
          ══════════════════════════════════════════════════════════════════ */}
          {step === 1 && (
            <div className="space-y-5 animate-fade-up">
              <div className="rounded-2xl p-4 border" style={{ background: `${accent}08`, borderColor: `${accent}20` }}>
                <p className="text-[13px] text-white/60 leading-relaxed">
                  <strong className="text-white/80">Custos fixos</strong> são os gastos previsíveis todo mês. Quanto mais preciso, mais certeiro o Consultor.
                </p>
              </div>

              {/* Moradia */}
              <div>
                <div className={labelCls}>🏠 Moradia (Aluguel / Condomínio / Financiamento)</div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[13px] text-white/35 font-medium">R$</span>
                  <input type="number" inputMode="decimal" value={custoMoradia} onChange={(e) => setCustoMoradia(e.target.value)} placeholder="0,00" className={inputCls} />
                </div>
              </div>

              {/* Mercado — com aviso sobre gastos variáveis */}
              <div>
                <div className={labelCls}>🛒 Supermercado — Estimativa Base</div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[13px] text-white/35 font-medium">R$</span>
                  <input type="number" inputMode="decimal" value={custoMercado} onChange={(e) => setCustoMercado(e.target.value)} placeholder="0,00" className={inputCls} />
                </div>
                {/* Aviso educativo sobre gastos variáveis */}
                <p className="text-[11px] text-white/30 mt-1.5 leading-relaxed">
                  ⚠️ Coloque apenas a compra básica mensal (mercado, feira). Gastos como <strong className="text-white/40">iFood, delivery e restaurantes</strong> são variáveis e o Consultor os rastreia separadamente nos lançamentos.
                </p>
              </div>

              {/* Assinaturas — Grid Premium com Logos Oficiais */}
              <div>
                <div className={labelCls}>🎬 Streamings & Assinaturas</div>
                <p className="text-[11.5px] text-white/35 mb-3">Selecione os serviços que vocês assinam. O sistema calcula o total automaticamente.</p>

                {/* Chips retangulares horizontais — compactos e elegantes */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {STREAMINGS.map((s) => {
                    const sel = streamingsSel[s.id] !== undefined;
                    return (
                      <button
                        key={s.id}
                        onClick={() => toggleStreaming(s)}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all duration-200"
                        style={sel
                          ? { background: `${accent}14`, borderColor: `${accent}50`, boxShadow: `0 0 0 1px ${accent}25` }
                          : { background: "oklch(1 0 0 / 0.04)", borderColor: "oklch(1 0 0 / 0.09)" }
                        }
                      >
                        {/* Ícone SVG oficial 14px */}
                        <img
                          src={s.logo}
                          alt={s.nome}
                          width={14}
                          height={14}
                          className="flex-shrink-0 object-contain"
                          style={{ filter: s.id === "apple" ? "invert(0.6)" : undefined }}
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                            const fb = e.currentTarget.nextElementSibling as HTMLElement;
                            if (fb) fb.style.display = "inline";
                          }}
                        />
                        {/* Fallback: inicial em fonte monospace — sem emoji */}
                        <span
                          className="hidden text-[9px] font-bold flex-shrink-0 w-[14px] text-center leading-none"
                          style={{ color: sel ? accent : "oklch(1 0 0 / 0.40)" }}
                        >
                          {s.nome[0]}
                        </span>

                        {/* Nome */}
                        <span
                          className="text-[11.5px] font-medium whitespace-nowrap"
                          style={{ color: sel ? accent : "oklch(1 0 0 / 0.55)" }}
                        >
                          {s.nome}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Inputs de preço dos selecionados */}
                {Object.keys(streamingsSel).length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-white/20 mb-1">Confirmar valores mensais</div>
                    {STREAMINGS.filter((s) => streamingsSel[s.id] !== undefined).map((s) => (
                      <div key={s.id} className="flex items-center gap-3 rounded-xl px-3 py-2 border" style={{ background: "oklch(1 0 0 / 0.03)", borderColor: "oklch(1 0 0 / 0.07)" }}>
                        <img src={s.logo} alt={s.nome} className="w-5 h-5 rounded object-contain flex-shrink-0"
                          onError={(e) => { e.currentTarget.style.display = "none"; }} />
                        <span className="text-[12px] text-white/55 flex-1">{s.nome}</span>
                        <span className="text-[12px] text-white/30">R$</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          value={streamingsSel[s.id]}
                          onChange={(e) => updateStreamingPreco(s.id, parseFloat(e.target.value) || 0)}
                          className="w-20 text-right bg-transparent text-[13px] text-white/80 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                    ))}

                    {/* Total automático */}
                    <div
                      className="flex items-center justify-between rounded-xl px-3 py-2.5 border mt-1"
                      style={{ background: `${accent}08`, borderColor: `${accent}20` }}
                    >
                      <span className="text-[11.5px] text-white/40">Total assinaturas</span>
                      <span className="text-[15px] font-medium" style={{ color: accent }}>{fmt(assinaturasNum)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Transporte */}
              <div>
                <div className={labelCls}>🚗 Transporte & Combustível</div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[13px] text-white/35 font-medium">R$</span>
                  <input type="number" inputMode="decimal" value={custoTransporte} onChange={(e) => setCustoTransporte(e.target.value)} placeholder="0,00" className={inputCls} />
                </div>
              </div>

              {/* Total ao vivo */}
              {custoTotalFixo > 0 && (
                <div className="space-y-1">
                  <div
                    className="rounded-2xl px-4 py-3 flex items-center justify-between border"
                    style={{ background: `${accent}08`, borderColor: `${accent}20` }}
                  >
                    <span className="text-[12px] text-white/45">Total fixo mensal</span>
                    <span className="text-[16px] font-medium" style={{ color: accent }}>{fmt(custoTotalFixo)}</span>
                  </div>
                  {rendaNum > 0 && (
                    <p className="text-[11.5px] text-white/40 text-center">
                      {Math.round(pctComprometida)}% da renda comprometida com o essencial
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setStep(0)} className="h-12 px-5 rounded-2xl border border-white/[0.10] text-[14px] text-white/45 hover:text-white/70 hover:bg-white/[0.04] transition">← Voltar</button>
                <button onClick={() => setStep(2)} className="flex-1 h-12 rounded-2xl text-[14px] font-semibold transition-all active:scale-[0.98]" style={{ background: "oklch(0.96 0.012 80)", color: "oklch(0.12 0.01 240)" }}>Continuar →</button>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              STEP 2: RESERVA DE EMERGÊNCIA
          ══════════════════════════════════════════════════════════════════ */}
          {step === 2 && (
            <div className="space-y-4 animate-fade-up">
              <div>
                <div className={labelCls}>Quantos meses de reserva querem ter?</div>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { meses: 0,  emoji: "🛑", label: "Desativar",            desc: "Não queremos focar em reserva agora. Consultor foca nas metas." },
                    { meses: 3,  emoji: "🚀", label: "3 meses — Acelerado",  desc: "Ideal para renda estável. Libera caixa para os sonhos." },
                    { meses: 6,  emoji: "⚖️", label: "6 meses — Equilibrado",desc: "Recomendação padrão. Segurança e liberdade para as metas." },
                    { meses: 12, emoji: "🛡️", label: "12 meses — Conservador",desc: "Máxima segurança. Ideal para autônomos e empreendedores." },
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
                    <p className="text-[13px] text-white/60">
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
              {/* Diagnóstico clínico */}
              <div className="rounded-2xl p-4 border" style={{ background: `${accent}08`, borderColor: `${accent}20` }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[14px]">✦</span>
                  <span className="text-[11px] uppercase tracking-[0.18em] text-white/40">Diagnóstico do Consultor</span>
                </div>

                {/* Cards numéricos */}
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

                {/* Botão de ação do veredito */}
                {sugestao && nivel !== sugestao.nivel && (
                  <button
                    onClick={() => setNivel(sugestao.nivel)}
                    className="mt-3 text-[12px] font-medium transition hover:opacity-80"
                    style={{ color: accent }}
                  >
                    Usar nível <strong>{sugestao.nivel}</strong> →
                  </button>
                )}
              </div>

              {/* Seleção do nível — pré-marcado pela sugestão */}
              <div className="space-y-2">
                {NIVEIS.map((n) => {
                  const sel       = nivel === n.value;
                  const isSugerido = sugestao?.nivel === n.value;

                  // ── UX Dinâmico: "Agressivo" tem duas personalidades ──────
                  // Personalidade A (Ambição):   renda saudável + metas exigentes → "Foco nas Metas 🎯"
                  // Personalidade B (Crise):      renda sufocada (>85% comprometida) → "Sobrevivência 🚨"
                  const emCrise   = n.value === "agressivo" && pctComprometida >= 85;
                  const accentCrise = "#F87171"; // vermelho suave de alerta

                  const displayEmoji = emCrise ? "🚨" : n.emoji;
                  const displayLabel = emCrise ? "Rigor de Sobrevivência" : n.label;
                  const displayDesc  = emCrise
                    ? "Foco total em cortar gastos e resgatar o controle. O Consultor será implacável para que vocês não fechem no vermelho."
                    : n.desc;
                  const displayAccent = emCrise && sel ? accentCrise : accent;

                  return (
                    <button
                      key={n.value}
                      onClick={() => setNivel(n.value)}
                      className="w-full text-left px-4 py-4 rounded-2xl border transition-all"
                      style={sel
                        ? { background: `${displayAccent}12`, borderColor: `${displayAccent}40` }
                        : { background: "oklch(1 0 0 / 0.03)", borderColor: "oklch(1 0 0 / 0.07)" }
                      }
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-[22px]">{displayEmoji}</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[13.5px] font-medium text-white/85">{displayLabel}</span>
                            {isSugerido && (
                              <span
                                className="text-[9px] uppercase tracking-[0.15em] px-1.5 py-0.5 rounded-full"
                                style={{ background: `${displayAccent}20`, color: displayAccent }}
                              >
                                {emCrise ? "Urgente" : "Recomendado"}
                              </span>
                            )}
                          </div>
                          <div className="text-[11.5px] text-white/40 mt-0.5">{displayDesc}</div>
                        </div>
                        {sel && (
                          <div
                            className="size-5 rounded-full flex items-center justify-center text-[11px] flex-shrink-0"
                            style={{ background: displayAccent, color: "oklch(0.12 0.01 240)" }}
                          >✓</div>
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
