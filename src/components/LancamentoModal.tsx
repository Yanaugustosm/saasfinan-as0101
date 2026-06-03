/**
 * LancamentoModal v3 — Fluxo progressivo em 3 etapas
 *
 * Etapa 1: Tipo (Despesa/Receita) + Valor grande
 * Etapa 2: Descrição + Categoria (chips do histórico primeiro)
 * Etapa 3: Confirmar (grupo, data, obs — pré-preenchidos, raramente tocados)
 *
 * Aprende com o histórico:
 *  - Chips de categoria ordenados por frequência de uso do casal
 *  - Sugestão automática de categoria ao digitar descrição conhecida
 *  - Grupo e data herdados do último lançamento
 */

import { useEffect, useRef, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useData, nowDate, fmt } from "@/contexts/DataContext";
import { useToast } from "@/contexts/ToastContext";
import type { Transacao } from "@/contexts/DataContext";

// ─── Constantes ──────────────────────────────────────────────────────────────

const ALL_CATS = [
  "Alimentação", "Transporte", "Saúde", "Lazer",
  "Moradia/Aluguel", "Supermercado", "Energia", "Internet",
  "Streaming", "Viagens", "Restaurantes", "Salário",
  "Receita variável", "Investimento", "Outros",
];

const GRUPOS: { value: "familiar" | "pessoal" | "negocio"; label: string; emoji: string }[] = [
  { value: "familiar", label: "Familiar",  emoji: "🏠" },
  { value: "pessoal",  label: "Pessoal",   emoji: "👤" },
  { value: "negocio",  label: "Negócio",   emoji: "🏢" },
];

const CHIPS_VISIBLE = 6;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseValor(raw: string): number {
  return parseFloat(raw.replace(",", ".")) || 0;
}

function buildSubLabel(tipo: "despesa" | "receita", valorNum: number): string {
  const sinal = tipo === "receita" ? "+" : "−";
  return `${sinal} R$ ${valorNum.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function sortCatsByHistory(transacoes: Transacao[], tipo: "despesa" | "receita"): string[] {
  const freq: Record<string, number> = {};
  transacoes
    .filter((t) => t.tipo === tipo && t.categoria)
    .forEach((t) => {
      freq[t.categoria] = (freq[t.categoria] || 0) + 1;
    });
  return [...ALL_CATS].sort((a, b) => (freq[b] || 0) - (freq[a] || 0));
}

function suggestCategory(descricao: string, transacoes: Transacao[]): string | null {
  if (descricao.length < 3) return null;
  const lower = descricao.toLowerCase();
  const matches = transacoes.filter(
    (t) => t.descricao?.toLowerCase().includes(lower) && t.categoria
  );
  if (matches.length === 0) return null;
  const freq: Record<string, number> = {};
  matches.forEach((t) => { freq[t.categoria] = (freq[t.categoria] || 0) + 1; });
  return Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

function getLastDefaults(transacoes: Transacao[]): { grupo: "familiar" | "pessoal" | "negocio"; data: string } {
  const last = [...transacoes].sort((a, b) => (b.data ?? "").localeCompare(a.data ?? ""))[0];
  return {
    grupo: (last?.grupo as "familiar" | "pessoal" | "negocio") ?? "familiar",
    data:  nowDate(),
  };
}

// ─── Tipos ───────────────────────────────────────────────────────────────────

type Etapa = 1 | 2 | 3;

export interface LancamentoModalProps {
  isOpen:     boolean;
  onClose:    () => void;
  transacao?: Transacao | null;
}

// ─── Componente principal ────────────────────────────────────────────────────

export function LancamentoModal({ isOpen, onClose, transacao }: LancamentoModalProps) {
  const { user }                                        = useAuth();
  const { addTransacao, updateTransacao, transacoes }   = useData();
  const { toast }                                       = useToast();
  const valorRef = useRef<HTMLInputElement>(null);
  const descRef  = useRef<HTMLInputElement>(null);

  const isEdit = Boolean(transacao);

  const lastDefaults = useMemo(() => getLastDefaults(transacoes), [transacoes]);

  const blank = {
    tipo:      "despesa" as "despesa" | "receita",
    descricao: "",
    valor:     "",
    grupo:     lastDefaults.grupo,
    categoria: "",
    data:      lastDefaults.data,
    obs:       "",
    tipoGasto:   "" as "essencial" | "desejo" | "emergencia" | "",
    receitaTipo: "" as "normal" | "extra" | "",
  };

  const [form,          setForm]           = useState(blank);
  const [etapa,         setEtapa]          = useState<Etapa>(1);
  const [saving,        setSaving]         = useState(false);
  const [showAllCats,   setShowAllCats]    = useState(false);
  const [catSuggestion, setCatSuggestion]  = useState<string | null>(null);

  const sf = (k: keyof typeof blank) => (v: string) =>
    setForm((p) => ({ ...p, [k]: v }));

  const sortedCats = useMemo(
    () => sortCatsByHistory(transacoes, form.tipo),
    [transacoes, form.tipo]
  );
  const visibleCats = showAllCats ? sortedCats : sortedCats.slice(0, CHIPS_VISIBLE);

  // ── Reset ao abrir ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    if (transacao) {
      setForm({
        tipo:        transacao.tipo,
        descricao:   transacao.descricao,
        valor:       String(transacao.valor),
        grupo:       transacao.grupo,
        categoria:   transacao.categoria ?? "",
        data:        transacao.data,
        obs:         transacao.obs ?? "",
        tipoGasto:   (transacao.tipoGasto ?? "") as "essencial" | "desejo" | "emergencia" | "",
        receitaTipo: (transacao.receitaTipo ?? "") as "normal" | "extra" | "",
      });
      setEtapa(2);
    } else {
      setForm({ ...blank, grupo: lastDefaults.grupo, data: lastDefaults.data });
      setEtapa(1);
      setShowAllCats(false);
      setCatSuggestion(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, transacao]);

  // ── Foco automático ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    if (etapa === 1) setTimeout(() => valorRef.current?.focus(), 180);
    if (etapa === 2) setTimeout(() => descRef.current?.focus(),  180);
  }, [isOpen, etapa]);

  // ── Sugestão de categoria ─────────────────────────────────────────────────
  useEffect(() => {
    if (form.categoria) return;
    setCatSuggestion(suggestCategory(form.descricao, transacoes));
  }, [form.descricao, form.categoria, transacoes]);

  // ── Fechar com Escape ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (etapa > 1 && !isEdit) setEtapa((p) => (p - 1) as Etapa);
        else onClose();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [isOpen, etapa, isEdit, onClose]);

  if (!isOpen) return null;

  const valorNum  = parseValor(form.valor);
  const isReceita = form.tipo === "receita";
  const subLabel  = buildSubLabel(form.tipo, valorNum);

  const etapa1Ok = valorNum > 0;
  const etapa2Ok = Boolean(form.descricao.trim() && form.categoria);
  const canSave  = etapa1Ok && etapa2Ok;

  const avancar = () => {
    if (etapa === 1 && etapa1Ok) setEtapa(2);
    if (etapa === 2 && etapa2Ok) setEtapa(3);
  };

  const handleSave = async () => {
    if (!canSave || !user) return;
    setSaving(true);
    try {
      // FIX 5: arredondamento de ponto flutuante — garante exatamente 2 casas decimais no banco
      const valorSalvo = Math.round(valorNum * 100) / 100;

      const payload: Record<string, unknown> = {
        tipo:      form.tipo,
        descricao: form.descricao.trim(),
        valor:     valorSalvo,
        grupo:     form.grupo,
        categoria: form.categoria || "Outros",
        data:      form.data,
        obs:       form.obs.trim(),
      };

      // Campos de inteligência: adiciona se preenchidos
      if (form.tipo === "despesa" && form.tipoGasto)
        payload.tipoGasto = form.tipoGasto;
      if (form.tipo === "receita" && form.receitaTipo)
        payload.receitaTipo = form.receitaTipo;

      // FIX 4: estado "fantasma" — pendenteInteligencia deve ser explicitamente
      // removido (false) quando o usuário classifica o lançamento ao editar,
      // caso contrário a flag fica presa no banco para sempre.
      const semClassificacao =
        (form.tipo === "despesa" && !form.tipoGasto) ||
        (form.tipo === "receita" && !form.receitaTipo);
      payload.pendenteInteligencia = semClassificacao;

      if (isEdit && transacao) {
        await updateTransacao(transacao.id, payload as Partial<import("@/contexts/DataContext").Transacao>);
        toast("Lançamento atualizado");
      } else {
        await addTransacao(payload as Omit<import("@/contexts/DataContext").Transacao, "id" | "groupId" | "userId">, user.uid);
        toast(`${isReceita ? "Receita" : "Despesa"} de ${fmt(valorSalvo)} salva`);
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const corDespesa = "oklch(0.72 0.14 28)";
  const corReceita = "oklch(0.75 0.12 150)";
  const corAtiva   = isReceita ? corReceita : corDespesa;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center sm:p-6 bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-[440px] rounded-t-[28px] sm:rounded-[24px] border shadow-2xl animate-fade-up max-h-[92dvh] overflow-y-auto"
        style={{ background: "oklch(0.14 0.01 240)", borderColor: "oklch(1 0 0 / 0.08)" }}
      >
        {/* Handle mobile */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 rounded-full bg-white/20" />
        </div>

        {/* ── Cabeçalho ── */}
        <div className="flex items-center justify-between px-6 pt-4 pb-4 sm:pt-6">
          <div className="flex items-center gap-3">
            {etapa > 1 && !isEdit && (
              <button
                onClick={() => setEtapa((p) => (p - 1) as Etapa)}
                className="size-8 rounded-full flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition"
                aria-label="Voltar"
              >
                ←
              </button>
            )}
            <div>
              <h2 className="font-serif text-[20px] font-normal text-white/90 leading-none">
                {isEdit ? "Editar lançamento"
                  : etapa === 1 ? "Quanto foi?"
                  : etapa === 2 ? "O que foi?"
                  : "Confirmar"}
              </h2>
              {!isEdit && (
                <div className="flex items-center gap-1.5 mt-2">
                  {([1, 2, 3] as Etapa[]).map((e) => (
                    <div
                      key={e}
                      className="h-[2px] rounded-full transition-all duration-300"
                      style={{
                        width:      e === etapa ? "20px" : "8px",
                        background: e <= etapa ? corAtiva : "oklch(1 0 0 / 0.12)",
                      }}
                    />
                  ))}
                  <span className="text-[10px] text-white/25 ml-1">{etapa}/3</span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="size-8 rounded-full flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition text-[18px]"
          >
            ✕
          </button>
        </div>

        <div className="px-6 pb-6">

          {/* ══ ETAPA 1 — Tipo + Valor ══ */}
          {etapa === 1 && (
            <div className="space-y-4 animate-fade-up">
              {/* Toggle */}
              <div
                className="flex gap-2 p-1 rounded-2xl border"
                style={{ background: "oklch(1 0 0 / 0.04)", borderColor: "oklch(1 0 0 / 0.06)" }}
              >
                {(["despesa", "receita"] as const).map((t) => {
                  const ativo = form.tipo === t;
                  const cor   = t === "despesa" ? corDespesa : corReceita;
                  return (
                    <button
                      key={t}
                      onClick={() => sf("tipo")(t)}
                      className="flex-1 h-11 rounded-xl text-[13.5px] font-medium flex items-center justify-center gap-2 transition-all duration-200 border"
                      style={ativo
                        ? { color: cor, borderColor: `${cor}55`, background: `${cor}12` }
                        : { borderColor: "transparent", color: "oklch(1 0 0 / 0.35)" }
                      }
                    >
                      <span className="text-[16px]">{t === "despesa" ? "↘" : "↗"}</span>
                      {t === "despesa" ? "Despesa" : "Receita"}
                    </button>
                  );
                })}
              </div>

              {/* Campo valor */}
              <div
                className="rounded-2xl p-6 text-center border transition-all"
                style={{ background: `${corAtiva}08`, borderColor: `${corAtiva}20` }}
              >
                <div className="text-[10px] uppercase tracking-[0.25em] text-white/30 mb-2">Valor</div>
                <input
                  ref={valorRef}
                  type="number"
                  inputMode="decimal"
                  value={form.valor}
                  onChange={(e) => sf("valor")(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && etapa1Ok && setEtapa(2)}
                  placeholder="0"
                  className="w-full text-center text-[64px] font-light tracking-tight bg-transparent outline-none placeholder:text-white/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    color: valorNum > 0 ? "oklch(0.96 0.012 80)" : "oklch(1 0 0 / 0.25)",
                  }}
                />
                <div
                  className="text-[14px] mt-1 tabular-nums font-medium transition-all"
                  style={{ color: valorNum > 0 ? corAtiva : "oklch(1 0 0 / 0.18)" }}
                >
                  {subLabel}
                </div>
              </div>

              <button
                onClick={() => etapa1Ok && setEtapa(2)}
                disabled={!etapa1Ok}
                className="w-full h-13 rounded-2xl text-[14px] font-semibold transition-all duration-200 active:scale-[0.98]"
                style={etapa1Ok
                  ? { background: "oklch(0.96 0.012 80)", color: "oklch(0.12 0.01 240)" }
                  : { background: "oklch(1 0 0 / 0.08)", color: "oklch(1 0 0 / 0.25)", cursor: "not-allowed" }
                }
              >
                {etapa1Ok ? "Continuar →" : "Digite o valor"}
              </button>
            </div>
          )}

          {/* ══ ETAPA 2 — Descrição + Categoria ══ */}
          {etapa === 2 && (
            <div className="space-y-4 animate-fade-up">
              {/* Resumo do valor */}
              <div
                className="flex items-center gap-3 px-4 py-3 rounded-xl border"
                style={{ background: `${corAtiva}08`, borderColor: `${corAtiva}20` }}
              >
                <span className="text-[10px] uppercase tracking-[0.18em] text-white/30">
                  {isReceita ? "Receita" : "Despesa"}
                </span>
                <span className="text-[18px] font-medium tabular-nums ml-auto" style={{ color: corAtiva }}>
                  {buildSubLabel(form.tipo, valorNum)}
                </span>
                <button
                  onClick={() => setEtapa(1)}
                  className="text-[11px] text-white/25 hover:text-white/50 transition"
                >
                  editar
                </button>
              </div>

              {/* Descrição */}
              <div>
                <div className="text-[10.5px] uppercase tracking-[0.20em] text-white/30 mb-2">Descrição</div>
                <input
                  ref={descRef}
                  value={form.descricao}
                  onChange={(e) => sf("descricao")(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && avancar()}
                  placeholder={isReceita ? "Ex: Salário, Freela, Aluguel..." : "Ex: Mercado, Uber, Netflix..."}
                  className="w-full h-12 px-4 rounded-2xl text-[14px] bg-white/[0.05] border border-white/[0.08] text-white/85 placeholder:text-white/25 focus:outline-none focus:border-white/20 focus:bg-white/[0.07] transition"
                />
                {catSuggestion && !form.categoria && (
                  <button
                    onClick={() => sf("categoria")(catSuggestion)}
                    className="mt-2 text-[11.5px] flex items-center gap-1.5 transition"
                    style={{ color: corAtiva }}
                  >
                    <span className="opacity-60">✦</span>
                    Sugestão: <strong>{catSuggestion}</strong>
                    <span className="opacity-40 text-[10px]">— toque para usar</span>
                  </button>
                )}
              </div>

              {/* Chips de categoria */}
              <div>
                <div className="text-[10.5px] uppercase tracking-[0.20em] text-white/30 mb-2.5">Categoria</div>
                <div className="flex flex-wrap gap-2">
                  {visibleCats.map((cat) => {
                    const selected = form.categoria === cat;
                    return (
                      <button
                        key={cat}
                        onClick={() => sf("categoria")(selected ? "" : cat)}
                        className="px-3 py-2 rounded-xl text-[12.5px] font-medium border transition-all duration-150 active:scale-[0.96]"
                        style={selected
                          ? { background: `${corAtiva}18`, borderColor: `${corAtiva}50`, color: corAtiva }
                          : { background: "oklch(1 0 0 / 0.04)", borderColor: "oklch(1 0 0 / 0.08)", color: "oklch(1 0 0 / 0.55)" }
                        }
                      >
                        {cat}
                      </button>
                    );
                  })}
                  {sortedCats.length > CHIPS_VISIBLE && (
                    <button
                      onClick={() => setShowAllCats((v) => !v)}
                      className="px-3 py-2 rounded-xl text-[12px] border border-white/[0.06] text-white/30 hover:text-white/50 transition"
                    >
                      {showAllCats ? "− menos" : `+ ${sortedCats.length - CHIPS_VISIBLE}`}
                    </button>
                  )}
                </div>
              </div>

              {/* Classificação inteligente: Despesa */}
              {form.tipo === "despesa" && (
                <div>
                  <div className="text-[10.5px] uppercase tracking-[0.20em] text-white/30 mb-2.5">Este gasto foi...</div>
                  <div className="flex gap-2">
                    {(["essencial", "desejo", "emergencia"] as const).map((tg) => {
                      const labels = { essencial: "✅ Essencial", desejo: "✨ Desejo", emergencia: "🚨 Emergência" };
                      const sel = form.tipoGasto === tg;
                      return (
                        <button
                          key={tg}
                          onClick={() => setForm(p => ({ ...p, tipoGasto: sel ? "" : tg }))}
                          className="flex-1 py-2 rounded-xl text-[12px] font-medium border transition-all active:scale-[0.96]"
                          style={sel
                            ? { background: `${corAtiva}18`, borderColor: `${corAtiva}50`, color: corAtiva }
                            : { background: "oklch(1 0 0 / 0.04)", borderColor: "oklch(1 0 0 / 0.08)", color: "oklch(1 0 0 / 0.45)" }
                          }
                        >
                          {labels[tg]}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-white/20 mt-1.5">Opcional — ajuda o Consultor a analisar seus hábitos</p>
                </div>
              )}

              {/* Classificação inteligente: Receita */}
              {form.tipo === "receita" && (
                <div>
                  <div className="text-[10.5px] uppercase tracking-[0.20em] text-white/30 mb-2.5">Tipo de receita</div>
                  <div className="flex gap-2">
                    {(["normal", "extra"] as const).map((rt) => {
                      const labels = { normal: "💼 Normal", extra: "🎯 Extra" };
                      const sel = form.receitaTipo === rt;
                      return (
                        <button
                          key={rt}
                          onClick={() => setForm(p => ({ ...p, receitaTipo: sel ? "" : rt }))}
                          className="flex-1 py-2 rounded-xl text-[12px] font-medium border transition-all active:scale-[0.96]"
                          style={sel
                            ? { background: `${corAtiva}18`, borderColor: `${corAtiva}50`, color: corAtiva }
                            : { background: "oklch(1 0 0 / 0.04)", borderColor: "oklch(1 0 0 / 0.08)", color: "oklch(1 0 0 / 0.45)" }
                          }
                        >
                          {labels[rt]}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-white/20 mt-1.5">Opcional — ajuda o Consultor a separar renda fixa de extra</p>
                </div>
              )}

              <button
                onClick={() => etapa2Ok && setEtapa(3)}
                disabled={!etapa2Ok}
                className="w-full h-13 rounded-2xl text-[14px] font-semibold transition-all duration-200 active:scale-[0.98]"
                style={etapa2Ok
                  ? { background: "oklch(0.96 0.012 80)", color: "oklch(0.12 0.01 240)" }
                  : { background: "oklch(1 0 0 / 0.08)", color: "oklch(1 0 0 / 0.25)", cursor: "not-allowed" }
                }
              >
                {etapa2Ok ? "Revisar →" : "Escolha uma categoria"}
              </button>
            </div>
          )}

          {/* ══ ETAPA 3 — Confirmar (pré-preenchida) ══ */}
          {(etapa === 3 || isEdit) && (
            <div className="space-y-4 animate-fade-up">
              {/* Resumo visual */}
              {!isEdit && (
                <div
                  className="rounded-2xl p-4 border space-y-1"
                  style={{ background: `${corAtiva}06`, borderColor: `${corAtiva}18` }}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-[13px] text-white/80 font-medium">{form.descricao}</span>
                    <span className="text-[16px] font-medium tabular-nums" style={{ color: corAtiva }}>
                      {buildSubLabel(form.tipo, valorNum)}
                    </span>
                  </div>
                  <div className="text-[11.5px] text-white/35">
                    {form.categoria}
                    {form.grupo && ` · ${GRUPOS.find(g => g.value === form.grupo)?.emoji} ${GRUPOS.find(g => g.value === form.grupo)?.label}`}
                  </div>
                </div>
              )}

              {/* Grupo */}
              <div>
                <div className="text-[10.5px] uppercase tracking-[0.20em] text-white/30 mb-2.5">Grupo</div>
                <div className="flex gap-2">
                  {GRUPOS.map((g) => {
                    const sel = form.grupo === g.value;
                    return (
                      <button
                        key={g.value}
                        onClick={() => sf("grupo")(g.value)}
                        className="flex-1 h-11 rounded-xl border text-[12.5px] font-medium transition-all"
                        style={sel
                          ? { background: "oklch(1 0 0 / 0.1)", borderColor: "oklch(1 0 0 / 0.25)", color: "oklch(0.96 0.012 80)" }
                          : { background: "transparent", borderColor: "oklch(1 0 0 / 0.07)", color: "oklch(1 0 0 / 0.35)" }
                        }
                      >
                        {g.emoji} {g.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Data */}
              <div>
                <div className="text-[10.5px] uppercase tracking-[0.20em] text-white/30 mb-2">Data</div>
                <input
                  type="date"
                  value={form.data}
                  onChange={(e) => sf("data")(e.target.value)}
                  className="w-full h-12 px-4 rounded-2xl text-[14px] bg-white/[0.05] border border-white/[0.08] text-white/70 focus:outline-none focus:border-white/20 transition appearance-none cursor-pointer"
                />
              </div>

              {/* Observação colapsável */}
              <ObsField value={form.obs} onChange={sf("obs")} />

              {/* Botões */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={onClose}
                  className="flex-1 h-12 rounded-2xl border border-white/[0.10] text-[14px] text-white/45 hover:text-white/70 hover:bg-white/[0.04] transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !canSave}
                  className="flex-1 h-12 rounded-2xl text-[14px] font-semibold transition-all duration-200 active:scale-[0.98]"
                  style={canSave
                    ? { background: "oklch(0.96 0.012 80)", color: "oklch(0.12 0.01 240)" }
                    : { background: "oklch(1 0 0 / 0.08)", color: "oklch(1 0 0 / 0.25)" }
                  }
                >
                  {saving ? "Salvando…" : isEdit ? "Salvar alterações" : "Confirmar"}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

// ─── ObsField ────────────────────────────────────────────────────────────────

function ObsField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full text-left text-[12px] text-white/25 hover:text-white/45 transition py-1"
      >
        + Adicionar observação
      </button>
    );
  }

  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-[0.20em] text-white/30 mb-2">Observação</div>
      <input
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Opcional..."
        className="w-full h-11 px-4 rounded-2xl text-[13px] bg-white/[0.05] border border-white/[0.08] text-white/70 placeholder:text-white/20 focus:outline-none transition"
      />
    </div>
  );
}
