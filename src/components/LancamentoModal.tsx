/**
 * LancamentoModal — Modal premium unificado
 *
 * v3 — Correções definitivas mobile:
 *  - ReactDOM.createPortal → renderiza no document.body, acima de TUDO
 *  - Cores hex sólidas → sem oklch() para máxima compatibilidade mobile
 *  - safe-area-inset-bottom → botões nunca ficam embaixo da Tab Bar
 */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth }  from "@/contexts/AuthContext";
import { useData, nowDate, fmt } from "@/contexts/DataContext";
import { useToast } from "@/contexts/ToastContext";
import type { Transacao } from "@/contexts/DataContext";

/* ─── Categorias disponíveis ─────────────────────────────── */
const CATS = [
  "Alimentação", "Transporte", "Saúde", "Lazer",
  "Moradia/Aluguel", "Supermercado", "Energia", "Internet",
  "Streaming", "Viagens", "Restaurantes", "Salário",
  "Receita variável", "Investimento", "Outros",
];

/* ─── Grupos ─────────────────────────────────────────────── */
const GRUPOS: { value: "familiar" | "pessoal" | "negocio"; label: string }[] = [
  { value: "familiar", label: "Familiar" },
  { value: "pessoal",  label: "Pessoal"  },
  { value: "negocio",  label: "Negócio"  },
];

/* ─── Props ──────────────────────────────────────────────── */
export interface LancamentoModalProps {
  isOpen:   boolean;
  onClose:  () => void;
  transacao?: Transacao | null;
}

/* ─── Helpers ────────────────────────────────────────────── */
function parseValor(raw: string): number {
  return parseFloat(raw.replace(",", ".")) || 0;
}

function formatDisplay(raw: string): string {
  const n = parseValor(raw);
  if (!raw || n === 0) return "0,00";
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ═══════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
═══════════════════════════════════════════════════════════ */
export function LancamentoModal({ isOpen, onClose, transacao }: LancamentoModalProps) {
  const { user }         = useAuth();
  const { addTransacao, updateTransacao } = useData();
  const { toast }        = useToast();
  const valorRef         = useRef<HTMLInputElement>(null);

  const isEdit = Boolean(transacao);

  const blank = {
    tipo:      "despesa" as "despesa" | "receita",
    descricao: "",
    valor:     "",
    grupo:     "familiar" as "familiar" | "pessoal" | "negocio",
    categoria: "",
    data:      nowDate(),
    obs:       "",
  };

  const [form,   setForm]   = useState(blank);
  const [saving, setSaving] = useState(false);
  const sf = (k: keyof typeof blank) => (v: string) =>
    setForm((p) => ({ ...p, [k]: v }));

  /* Sincroniza form com transação em modo edição */
  useEffect(() => {
    if (isOpen) {
      if (transacao) {
        setForm({
          tipo:      transacao.tipo,
          descricao: transacao.descricao,
          valor:     String(transacao.valor),
          grupo:     transacao.grupo,
          categoria: transacao.categoria ?? "",
          data:      transacao.data,
          obs:       transacao.obs ?? "",
        });
      } else {
        setForm(blank);
      }
      setTimeout(() => valorRef.current?.focus(), 150);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, transacao]);

  /* Fecha no Escape + trava scroll do body */
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const valorNum  = parseValor(form.valor);
  const isReceita = form.tipo === "receita";
  const subLabel  = `${isReceita ? "+" : "−"} ${fmt(valorNum)}`;

  /* Cores semânticas — hex sólido para máxima compatibilidade mobile */
  const corAtivaDespesa = "text-[#e07060] border-[#e07060]/40 bg-[#e07060]/10";
  const corAtivaReceita = "text-[#5dbf90] border-[#5dbf90]/40 bg-[#5dbf90]/10";
  const subColor        = isReceita ? "#5dbf90" : "rgba(255,255,255,0.35)";

  const handleSave = async () => {
    if (!form.descricao || !form.valor || !user) return;
    setSaving(true);
    try {
      const payload = {
        tipo:      form.tipo,
        descricao: form.descricao,
        valor:     parseValor(form.valor),
        grupo:     form.grupo,
        categoria: form.categoria || "Outros",
        data:      form.data,
        obs:       form.obs,
      };
      if (isEdit && transacao) {
        await updateTransacao(transacao.id, payload);
        toast("Lançamento atualizado com sucesso");
      } else {
        await addTransacao(payload, user.uid);
        toast(`${isReceita ? "Receita" : "Despesa"} de ${fmt(valorNum)} salva`);
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  /* ── Portal: renderiza direto no body, acima de tudo ── */
  return createPortal(
    /* Overlay */
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        padding: "0",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Painel — fundo hex sólido, safe-area no bottom */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "440px",
          backgroundColor: "#131316",
          border: "1px solid rgba(255,255,255,0.08)",
          borderTopLeftRadius: "28px",
          borderTopRightRadius: "28px",
          boxShadow: "0 -20px 60px rgba(0,0,0,0.6)",
          overflowY: "auto",
          overflowX: "hidden",
          maxHeight: "90dvh",
          paddingBottom: "env(safe-area-inset-bottom, 16px)",
        }}
      >
        {/* ── Handle mobile */}
        <div style={{ display: "flex", justifyContent: "center", paddingTop: "12px", paddingBottom: "4px" }}>
          <div style={{ width: "36px", height: "4px", borderRadius: "9999px", backgroundColor: "rgba(255,255,255,0.18)" }} />
        </div>

        {/* ── Cabeçalho */}
        <div className="flex items-center justify-between px-6 pt-4 pb-2">
          <h2 className="font-serif text-[22px] font-normal" style={{ color: "rgba(255,255,255,0.92)" }}>
            {isEdit ? "Editar lançamento" : "Novo lançamento"}
          </h2>
          <button
            onClick={onClose}
            className="size-8 rounded-full flex items-center justify-center text-[18px] transition"
            style={{ color: "rgba(255,255,255,0.4)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.85)")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}
          >
            ✕
          </button>
        </div>

        <div className="px-6 pb-6 space-y-4">

          {/* ── Toggle Despesa / Receita */}
          <div
            className="flex gap-2 p-1 rounded-2xl"
            style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            {(["despesa", "receita"] as const).map((t) => {
              const ativo = form.tipo === t;
              return (
                <button
                  key={t}
                  onClick={() => sf("tipo")(t)}
                  className={`
                    flex-1 h-11 rounded-xl text-[13.5px] font-medium
                    flex items-center justify-center gap-2
                    transition-all duration-200 border
                    ${ativo
                      ? t === "despesa" ? corAtivaDespesa : corAtivaReceita
                      : "border-transparent hover:bg-white/5"
                    }
                  `}
                  style={!ativo ? { color: "rgba(255,255,255,0.4)" } : undefined}
                >
                  {t === "despesa"
                    ? <><span className="text-[16px]">↘</span> Despesa</>
                    : <><span className="text-[16px]">↗</span> Receita</>
                  }
                </button>
              );
            })}
          </div>

          {/* ── Display de Valor */}
          <div
            className="rounded-2xl p-5 text-center"
            style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div className="text-[11px] uppercase tracking-[0.22em] mb-3" style={{ color: "rgba(255,255,255,0.30)" }}>Valor</div>
            <input
              ref={valorRef}
              type="number"
              inputMode="decimal"
              value={form.valor}
              onChange={(e) => sf("valor")(e.target.value)}
              placeholder="0"
              className="w-full min-w-0 block text-center text-[52px] font-light tracking-tight bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              style={{
                fontFamily: "'Outfit', sans-serif",
                maxWidth: "100%",
                color: "rgba(255,255,255,0.92)",
              }}
            />
            <div className="text-[13px] mt-1 tabular-nums" style={{ color: subColor }}>
              {subLabel}
            </div>
          </div>

          {/* ── Descrição */}
          <div>
            <FieldLabel>Descrição</FieldLabel>
            <input
              value={form.descricao}
              onChange={(e) => sf("descricao")(e.target.value)}
              placeholder="Ex: Supermercado"
              className={INPUT_CLS}
            />
          </div>

          {/* ── Grupo + Categoria */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Grupo</FieldLabel>
              <select
                value={form.grupo}
                onChange={(e) => sf("grupo")(e.target.value as any)}
                className={INPUT_CLS}
              >
                {GRUPOS.map((g) => (
                  <option key={g.value} value={g.value} className="bg-[#1c1c1e]">
                    {g.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel>Categoria</FieldLabel>
              <select
                value={form.categoria}
                onChange={(e) => sf("categoria")(e.target.value)}
                className={INPUT_CLS}
              >
                <option value="" className="bg-[#1c1c1e]">Selecione...</option>
                {CATS.map((c) => (
                  <option key={c} value={c} className="bg-[#1c1c1e]">{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ── Data */}
          <div>
            <FieldLabel>Data</FieldLabel>
            <input
              type="date"
              value={form.data}
              onChange={(e) => sf("data")(e.target.value)}
              className={INPUT_CLS}
            />
          </div>

          {/* ── Observação */}
          <div>
            <FieldLabel>Observação</FieldLabel>
            <input
              value={form.obs}
              onChange={(e) => sf("obs")(e.target.value)}
              placeholder="Opcional"
              className={INPUT_CLS}
            />
          </div>

          {/* ── Validação inline */}
          {(!form.descricao || !form.valor) && (
            <div className="flex flex-col gap-1 -mt-1">
              {!form.valor && (
                <p className="text-[11.5px] flex items-center gap-1.5" style={{ color: "#e07060" }}>
                  <span>⚠</span> Informe o valor do lançamento
                </p>
              )}
              {!form.descricao && (
                <p className="text-[11.5px] flex items-center gap-1.5" style={{ color: "#e07060" }}>
                  <span>⚠</span> Informe uma descrição
                </p>
              )}
            </div>
          )}

          {/* ── Botões */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 h-12 rounded-2xl text-[14px] transition hover:bg-white/5"
              style={{
                border: "1px solid rgba(255,255,255,0.10)",
                color: "rgba(255,255,255,0.50)",
              }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={!form.descricao || !form.valor || saving}
              title={!form.descricao || !form.valor ? "Preencha todos os campos obrigatórios" : ""}
              className="flex-1 h-12 rounded-2xl text-[14px] font-semibold transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: "#f4efe6", color: "#0f0f0f" }}
            >
              {saving ? "Salvando…" : "Salvar"}
            </button>
          </div>

        </div>
      </div>
    </div>,
    document.body
  );
}

/* ─── Helpers de estilo ───────────────────────────────────── */
const INPUT_CLS = `
  w-full min-w-0 h-12 px-4 rounded-2xl text-[14px]
  bg-white/[0.05] border border-white/[0.08]
  placeholder:text-white/25
  focus:outline-none focus:border-white/25 focus:bg-white/[0.07]
  transition appearance-none cursor-pointer
`.trim();

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10.5px] uppercase tracking-[0.20em] mb-2" style={{ color: "rgba(255,255,255,0.35)" }}>
      {children}
    </div>
  );
}
