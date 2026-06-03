import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useData, calcTotais, nowMonth, fmt, fmtK } from "@/contexts/DataContext";
import type { Transacao } from "@/contexts/DataContext";
import { MemberAvatar } from "@/components/MemberAvatar";
import { EmptyStates } from "@/components/EmptyState";
import { useToast } from "@/contexts/ToastContext";
import { LancamentoModal } from "@/components/LancamentoModal";

export const Route = createFileRoute("/_app/lancamentos")({
  head: () => ({
    meta: [
      { title: "Lançamentos · Sincronia" },
      { name: "description", content: "Tudo que vocês viveram este mês — receitas, despesas e categorias." },
      { property: "og:title", content: "Lançamentos do casal · Sincronia" },
      { property: "og:description", content: "Acompanhe cada movimento financeiro do mês em conjunto." },
    ],
  }),
  component: LancamentosPage,
});

type Filter = "all" | "in" | "out";

function LancamentosPage() {
  const { user, group } = useAuth();
  const { transacoes, deleteTransacao } = useData();
  const { toast } = useToast();
  const members = group?.memberProfiles ?? {};

  const d = new Date();
  const currentMonthLabel = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const months6: string[] = [];
  for (let i = 0; i < 6; i++) {
    const dd = new Date(d.getFullYear(), d.getMonth() - i, 1);
    months6.push(dd.toISOString().slice(0, 7));
  }

  const [filter, setFilter]       = useState<Filter>("all");
  const [q, setQ]                 = useState("");
  const [selMonth, setSelMonth]   = useState(nowMonth());
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Transacao | null>(null);
  const [viewMode, setViewMode]   = useState<"list" | "table">("list");

  const filtered = useMemo(() => {
    return transacoes.filter((t) => {
      if (!t.data?.startsWith(selMonth)) return false;
      if (filter === "in" && t.tipo !== "receita") return false;
      if (filter === "out" && t.tipo !== "despesa") return false;
      if (q && !`${t.descricao} ${t.categoria}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [transacoes, filter, q, selMonth]);

  const grouped = useMemo(() => {
    const map = new Map<string, Transacao[]>();
    for (const t of filtered) {
      const arr = map.get(t.data) ?? [];
      arr.push(t);
      map.set(t.data, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => (a < b ? 1 : -1));
  }, [filtered]);

  // Agrupamento por categoria para o modo planilha
  const byCategory = useMemo(() => {
    if (viewMode !== "table") return [];
    const map2 = new Map<string, { items: Transacao[]; total: number; tipo: "receita" | "despesa" | "misto" }>();
    for (const t of filtered) {
      const key = t.categoria || "Sem categoria";
      const existing = map2.get(key);
      if (!existing) {
        map2.set(key, { items: [t], total: t.tipo === "receita" ? t.valor : -t.valor, tipo: t.tipo });
      } else {
        existing.items.push(t);
        existing.total += t.tipo === "receita" ? t.valor : -t.valor;
        if (existing.tipo !== t.tipo) existing.tipo = "misto";
      }
    }
    return Array.from(map2.entries())
      .map(([cat, data]) => ({ cat, ...data }))
      .sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
  }, [filtered, viewMode]);

  const { rec, des, economiaPotencial, dinheiroNaMesa, pendentes: pendentesClassif } = calcTotais(filtered);
  const economiaReal = Math.max(0, rec - des);

  const openNew  = () => { setEditTarget(null); setShowModal(true); };
  const openEdit = (t: Transacao) => { setEditTarget(t); setShowModal(true); };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este lançamento?")) return;
    await deleteTransacao(id);
    toast("Lançamento excluído", "info");
  };

  // Supress unused warning
  void user;

  return (
    <div className="hero-bg">
      <div className="mx-auto max-w-[1100px] px-5 lg:px-8 pt-10 lg:pt-14">
        <div className="text-[11.5px] uppercase tracking-[0.18em] text-muted-foreground">
          Lançamentos · {currentMonthLabel}
        </div>
        <div className="mt-5 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <h1 className="font-serif text-[32px] sm:text-[40px] leading-[1.05] max-w-xl">
            <em className="not-italic">Tudo que vocês viveram</em>
            <br />
            este mês.
          </h1>
          <div className="flex items-end gap-4">
            <div className="text-right space-y-1 tabular">
              <div className="text-[15px] text-[oklch(0.85_0.12_145)]">+ {fmt(rec)}</div>
              <div className="text-[15px] text-foreground">− {fmt(des)}</div>
            </div>
            <button
              onClick={openNew}
              className="h-10 px-4 rounded-full border border-border text-[13px] text-foreground hover:bg-white/[0.04] transition"
            >
              + Novo
            </button>
          </div>
        </div>

        {/* Mini-painel Balanço Potencial */}
        {filtered.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="glass rounded-xl px-4 py-3">
              <div className="text-[10px] uppercase tracking-[0.14em] text-white/35 mb-1">Economia Real</div>
              <div className="text-[15px] font-medium tabular" style={{ color: "oklch(0.75 0.14 150)" }}>{fmt(economiaReal)}</div>
            </div>
            <div className="glass rounded-xl px-4 py-3">
              <div className="text-[10px] uppercase tracking-[0.14em] text-white/35 mb-1">Poderia Economizar</div>
              <div className="text-[15px] font-medium tabular" style={{ color: "oklch(0.82 0.07 75)" }}>{fmt(economiaPotencial)}</div>
            </div>
            <div className="glass rounded-xl px-4 py-3">
              <div className="text-[10px] uppercase tracking-[0.14em] text-white/35 mb-1">Deixou na Mesa</div>
              <div className="text-[15px] font-medium tabular" style={{ color: "oklch(0.72 0.14 28)" }}>
                {fmt(dinheiroNaMesa)}
              </div>
              {pendentesClassif > 0 && (
                <div className="text-[9.5px] text-amber-400/60 mt-0.5">{pendentesClassif} sem classif.</div>
              )}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="mt-8 glass rounded-2xl p-2 flex flex-col md:flex-row items-stretch md:items-center gap-2">
          <div className="flex-1 flex items-center gap-2 px-3">
            <span className="text-muted-foreground">⌕</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por descrição, categoria, valor…"
              className="flex-1 bg-transparent h-10 outline-none text-[14px] placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex gap-1 p-1">
            {([
              ["all", "Todos"],
              ["out", "Despesas"],
              ["in", "Receitas"],
            ] as const).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={`h-9 px-3.5 rounded-full text-[12.5px] transition ${
                  filter === k ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <select
            value={selMonth}
            onChange={(e) => setSelMonth(e.target.value)}
            className="h-9 px-3 rounded-full text-[12.5px] bg-transparent border border-border text-muted-foreground focus:outline-none cursor-pointer"
          >
            {months6.map((m) => (
              <option key={m} value={m} className="bg-background">
                {new Date(m + "-15").toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
              </option>
            ))}
          </select>

          {/* Toggle Lista / Categorias */}
          <div className="flex gap-1 p-1 bg-white/[0.04] rounded-xl border border-border ml-auto md:ml-0">
            <button
              onClick={() => setViewMode("list")}
              aria-label="Modo lista"
              className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-medium transition-all ${
                viewMode === "list"
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <i className="ti ti-list text-[13px]" aria-hidden="true" />
              Lista
            </button>
            <button
              onClick={() => setViewMode("table")}
              aria-label="Modo categorias"
              className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-medium transition-all ${
                viewMode === "table"
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <i className="ti ti-chart-pie text-[13px]" aria-hidden="true" />
              Categorias
            </button>
          </div>
        </div>

        {/* Lista ou Planilha */}
        <div className="mt-8 pb-20">

          {/* ── MODO LISTA (código original sem alterações) ── */}
          {viewMode === "list" && (
            <div className="space-y-8">
              {grouped.map(([date, items]) => {
                const dObj = new Date(date + "T12:00:00");
                const dayLabel = dObj.toLocaleDateString("pt-BR", { day: "2-digit", weekday: "short" });
                const dayNet = items.reduce((s, t) => s + (t.tipo === "receita" ? t.valor : -t.valor), 0);
                return (
                  <div key={date}>
                    <div className="flex items-baseline justify-between px-1 mb-2.5">
                      <span className="text-[11.5px] uppercase tracking-[0.18em] text-muted-foreground">
                        {dayLabel}
                      </span>
                      <span
                        className={`text-[12px] tabular ${
                          dayNet >= 0 ? "text-[oklch(0.85_0.12_145)]" : "text-muted-foreground"
                        }`}
                      >
                        {dayNet >= 0 ? "+ " : "− "}
                        {fmt(Math.abs(dayNet))}
                      </span>
                    </div>
                    <ul className="glass rounded-2xl divide-y divide-border overflow-hidden">
                      {items.map((t) => {
                        const owner = members[t.userId];
                        return (
                          <li
                            key={t.id}
                            className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition group"
                          >
                            <div className="size-9 rounded-xl bg-white/[0.05] flex items-center justify-center text-champagne text-[14px] font-serif">
                              {t.descricao.slice(0, 1)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[14px] text-foreground truncate">{t.descricao}</div>
                              <div className="flex items-center gap-2 flex-wrap mt-0.5">
                                <span className="text-[11.5px] text-muted-foreground">
                                  {t.categoria} · por {owner?.name ?? "você"}
                                </span>
                                {/* Badge de classificação inteligente */}
                                {t.tipoGasto === "essencial" && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400/80 border border-emerald-500/20">✅ Essencial</span>
                                )}
                                {t.tipoGasto === "desejo" && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400/80 border border-amber-500/20">✨ Desejo</span>
                                )}
                                {t.tipoGasto === "emergencia" && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400/80 border border-red-500/20">🚨 Emergência</span>
                                )}
                                {t.receitaTipo === "extra" && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400/80 border border-blue-500/20">🎯 Extra</span>
                                )}
                                {t.pendenteInteligencia && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 text-white/30 border border-white/10">Pendente</span>
                                )}
                              </div>
                            </div>
                            <MemberAvatar emoji={owner?.emoji ?? "👤"} name={owner?.name} size={26} />
                            <span
                              className={`text-[14px] tabular w-28 text-right ${
                                t.tipo === "receita" ? "text-[oklch(0.85_0.12_145)]" : "text-foreground"
                              }`}
                            >
                              {t.tipo === "receita" ? "+ " : "− "}
                              {fmt(t.valor)}
                            </span>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                              <button
                                onClick={() => openEdit(t)}
                                className="size-8 rounded-lg border border-border text-muted-foreground hover:text-foreground text-xs transition"
                              >✏️</button>
                              <button
                                onClick={() => handleDelete(t.id)}
                                className="size-8 rounded-lg border border-border text-muted-foreground hover:text-destructive text-xs transition"
                              >🗑</button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
              {grouped.length === 0 && EmptyStates.lancamentos(openNew)}
            </div>
          )}

          {/* ── MODO PLANILHA ── */}
          {viewMode === "table" && (
            <TableView
              filtered={filtered}
              byCategory={byCategory}
              members={members}
              rec={rec}
              des={des}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          )}

        </div>
      </div>

      {/* Modal premium unificado */}
      <LancamentoModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditTarget(null); }}
        transacao={editTarget}
      />
    </div>
  );
}

// ─── TableView ────────────────────────────────────────────────────────────────

interface TableViewProps {
  filtered: Transacao[];
  byCategory: Array<{
    cat: string;
    items: Transacao[];
    total: number;
    tipo: "receita" | "despesa" | "misto";
  }>;
  members: Record<string, { name?: string; emoji?: string }>;
  rec: number;
  des: number;
  onEdit: (t: Transacao) => void;
  onDelete: (id: string) => void;
}

function TableView({ filtered, byCategory, members, rec, des, onEdit, onDelete }: TableViewProps) {
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const saldo = rec - des;
  const maxAbs = Math.max(...byCategory.map((c) => Math.abs(c.total)), 1);
  const savRate = rec > 0 ? Math.max(0, Math.min(100, (saldo / rec) * 100)) : 0;
  const savRateFmt = savRate.toFixed(1).replace(".", ",") + "%";
  const savLabel = savRate >= 80 ? "Excelente! Acima de 80%" : savRate >= 50 ? "Muito bom! Acima de 50%" : savRate >= 20 ? "Saudável · ideal acima de 20%" : "Atenção · ideal mínimo de 20%";

  if (filtered.length === 0) {
    return (
      <div className="glass rounded-2xl py-16 text-center">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Nenhum lançamento neste período
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* ── Cards de totais ── */}
      <div className="grid grid-cols-3 gap-3">
        {([
          { label: "Receitas", value: rec,   color: "text-[oklch(0.74_0.12_145)]", prefix: "+" },
          { label: "Despesas", value: des,   color: "text-foreground/70",          prefix: "−" },
          {
            label: "Saldo",
            value: saldo,
            color: saldo >= 0 ? "text-champagne" : "text-destructive",
            prefix: saldo > 0 ? "+" : "−",
          },
        ] as const).map(({ label, value, color, prefix }) => (
          <div key={label} className="glass rounded-xl px-4 py-3">
            <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-1.5">{label}</div>
            <div className={`text-[15px] font-medium tabular ${color}`}>
              {prefix}{fmtK(Math.abs(value))}
            </div>
          </div>
        ))}
      </div>

      {/* ── Taxa de Poupança ── */}
      {rec > 0 && (
        <div className="glass rounded-xl px-5 py-4">
          <div className="flex justify-between items-center mb-3">
            <span className="text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">Taxa de poupança</span>
            <span className={`text-[14px] font-semibold tabular ${
              savRate >= 20 ? "text-champagne" : "text-destructive"
            }`}>{savRateFmt}</span>
          </div>
          <div className="h-[4px] rounded-full bg-white/[0.06] overflow-hidden mb-2">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${savRate}%`,
                background: savRate >= 20
                  ? "linear-gradient(90deg, oklch(0.74 0.12 145 / 0.5), #C9A96E)"
                  : "oklch(0.55 0.18 25 / 0.6)",
              }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground/60">
            <span>{savLabel}</span>
            <span>Receita: {fmtK(rec)}</span>
          </div>
        </div>
      )}

      {/* ── Tabela por categoria ── */}
      <div className="glass rounded-2xl overflow-hidden">

        {/* Cabeçalho */}
        <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 px-5 py-3 border-b border-border bg-white/[0.02]">
          <span className="text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">Categoria</span>
          <span className="text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground text-center w-10">Qtd</span>
          <span className="text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground text-right w-24">Total</span>
          <span className="w-6" />
        </div>

        {/* Linhas por categoria */}
        {byCategory.map(({ cat, items, total, tipo }) => {
          const isExpanded = expandedCat === cat;
          const isRec      = tipo === "receita";
          const absTotal   = Math.abs(total);
          const barPct     = Math.round((absTotal / maxAbs) * 100);

          return (
            <div key={cat}>
              {/* Linha da categoria — clicável para expandir */}
              <button
                onClick={() => setExpandedCat(isExpanded ? null : cat)}
                className="w-full grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 px-5 h-12 hover:bg-white/[0.025] transition border-b border-border/50 text-left"
                style={
                  isExpanded
                    ? { background: "rgba(201,169,110,0.05)", borderLeft: "2px solid #C9A96E" }
                    : { borderLeft: "2px solid transparent" }
                }
              >
                {/* Nome + mini barra proporcional */}
                <div className="flex flex-col justify-center gap-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] text-foreground truncate">{cat}</span>
                    {tipo === "misto" && (
                      <span className="text-[9px] text-muted-foreground bg-white/[0.05] px-1.5 py-0.5 rounded shrink-0">
                        misto
                      </span>
                    )}
                  </div>
                  <div className="h-[2px] rounded-full bg-white/[0.06] overflow-hidden w-full max-w-[120px]">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${barPct}%`,
                        background: isRec
                          ? "oklch(0.74 0.12 145 / 0.7)"
                          : "oklch(0.82 0.07 75 / 0.6)",
                      }}
                    />
                  </div>
                </div>

                {/* Quantidade */}
                <span className="text-[12px] text-muted-foreground tabular text-center w-10">
                  {items.length}
                </span>

                {/* Total */}
                <span className={`text-[13px] tabular w-24 text-right font-medium ${
                  isRec ? "text-[oklch(0.74_0.12_145)]" : "text-foreground/80"
                }`}>
                  {isRec ? "+" : "−"}{fmtK(absTotal)}
                </span>

                {/* Chevron */}
                <span className={`text-muted-foreground text-[12px] w-6 text-center transition-transform duration-200 ${
                  isExpanded ? "rotate-180" : ""
                }`}>
                  <i className="ti ti-chevron-down" aria-hidden="true" />
                </span>
              </button>

              {/* Lançamentos individuais (expandido) */}
              {isExpanded && (
                <div className="border-b border-border/30">
                  {/* Sub-cabeçalho */}
                  <div className="grid grid-cols-[20px_1fr_44px_80px_64px] items-center gap-2 px-5 py-2 bg-white/[0.015] border-b border-border/30">
                    <div />
                    <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/60">Descrição</span>
                    <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/60 text-center">Data</span>
                    <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/60 text-right">Valor</span>
                    <div />
                  </div>

                  {items
                    .sort((a, b) => b.data.localeCompare(a.data))
                    .map((t) => {
                      const owner = members[t.userId];
                      return (
                        <div
                          key={t.id}
                          className="grid grid-cols-[20px_1fr_44px_80px_64px] items-center gap-2 px-5 h-10 hover:bg-white/[0.02] transition group"
                        >
                          <span className="text-[14px] text-center">{owner?.emoji ?? "👤"}</span>
                          <span className="text-[12.5px] text-foreground/80 truncate">{t.descricao}</span>
                          <span className="text-[11px] text-muted-foreground tabular text-center shrink-0">
                            {t.data?.slice(5)}
                          </span>
                          <span className={`text-[12.5px] tabular text-right shrink-0 ${
                            t.tipo === "receita" ? "text-[oklch(0.74_0.12_145)]" : "text-foreground/70"
                          }`}>
                            {t.tipo === "receita" ? "+" : "−"}{fmtK(t.valor)}
                          </span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition justify-end">
                            <button
                              onClick={() => onEdit(t)}
                              className="size-7 rounded-lg border border-border text-muted-foreground hover:text-foreground text-[11px] transition flex items-center justify-center"
                              aria-label="Editar"
                            >
                              <i className="ti ti-edit" aria-hidden="true" />
                            </button>
                            <button
                              onClick={() => onDelete(t.id)}
                              className="size-7 rounded-lg border border-border text-muted-foreground hover:text-destructive text-[11px] transition flex items-center justify-center"
                              aria-label="Excluir"
                            >
                              <i className="ti ti-trash" aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      );
                    })}

                  {/* Subtotal da categoria */}
                  <div className="flex justify-between items-center px-5 py-2.5 bg-white/[0.015] border-t border-border/30">
                    <span className="text-[11px] text-muted-foreground">
                      Subtotal · {items.length} {items.length === 1 ? "lançamento" : "lançamentos"}
                    </span>
                    <span className={`text-[12.5px] tabular font-medium ${
                      isRec ? "text-[oklch(0.74_0.12_145)]" : "text-foreground/80"
                    }`}>
                      {isRec ? "+" : "−"}{fmt(absTotal)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Rodapé */}
        <div className="flex justify-between items-center px-5 py-4 bg-white/[0.02]">
          <span className="text-[11.5px] text-muted-foreground uppercase tracking-[0.12em]">
            Total · {filtered.length} lançamentos
          </span>
          <span className={`text-[14px] tabular font-medium ${saldo >= 0 ? "text-champagne" : "text-destructive"}`}>
            {saldo >= 0 ? "+" : "−"}{fmt(Math.abs(saldo))}
          </span>
        </div>

      </div>
    </div>
  );
}
