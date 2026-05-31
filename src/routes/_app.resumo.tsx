import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  useData,
  calcTotais,
  getLast6Months,
  monthLabel,
  nowMonth,
  fmt,
  fmtK,
} from "@/contexts/DataContext";
import type { Transacao } from "@/contexts/DataContext";

export const Route = createFileRoute("/_app/resumo")({
  head: () => ({
    meta: [
      { title: "Resumo · Sincronia" },
      {
        name: "description",
        content:
          "Visão panorâmica das finanças do casal — 6 meses lado a lado.",
      },
    ],
  }),
  component: ResumoPage,
});

// ─── Constantes ───────────────────────────────────────────────────────────────

const CATEGORIAS_FIXAS = [
  "Moradia/Aluguel",
  "Energia",
  "Água",
  "Internet",
  "Condomínio",
  "Salário",
  "Streaming",
];

// ─── Componente principal ─────────────────────────────────────────────────────

function ResumoPage() {
  const { group } = useAuth();
  const { transacoes } = useData();

  const months = getLast6Months();
  const curMonth = nowMonth();
  const members = group?.memberProfiles ?? {};

  // Calcula dados de cada um dos 6 meses
  const monthData = useMemo(
    () =>
      months.map((m) => {
        const list = transacoes.filter((t) => t.data?.startsWith(m));
        const { rec, des, saldo } = calcTotais(list);
        const savRate = rec > 0 ? Math.round((saldo / rec) * 100) : 0;

        const catSpend: Record<string, number> = {};
        list
          .filter((t) => t.tipo === "despesa")
          .forEach((t) => {
            catSpend[t.categoria] = (catSpend[t.categoria] || 0) + t.valor;
          });

        const topCat = Object.entries(catSpend).sort(
          (a, b) => b[1] - a[1]
        )[0];

        return { m, rec, des, saldo, savRate, catSpend, topCat, list };
      }),
    [transacoes, months]
  );

  const [selectedMonth, setSelectedMonth] = useState(curMonth);
  const [compactMode, setCompactMode] = useState(true);
  const [filter, setFilter] = useState<"all" | "receita" | "despesa">("all");

  const selMonthData = monthData.find((d) => d.m === selectedMonth);
  const selList = useMemo(() => {
    const list = selMonthData?.list ?? [];
    return list
      .filter((t) => filter === "all" || t.tipo === filter)
      .sort((a, b) => b.data.localeCompare(a.data));
  }, [selMonthData, filter]);

  const totalRec = monthData.reduce((s, d) => s + d.rec, 0);
  const totalDes = monthData.reduce((s, d) => s + d.des, 0);
  const totalSaldo = totalRec - totalDes;

  const allCats = useMemo(() => {
    const cats = new Set<string>();
    monthData.forEach((d) =>
      Object.keys(d.catSpend).forEach((c) => cats.add(c))
    );
    return Array.from(cats).sort();
  }, [monthData]);

  return (
    <div className="hero-bg min-h-screen">
      {/* ── STICKY HEADER com totais ──────────────────────────────── */}
      <div className="sticky top-16 z-30 bg-background/90 backdrop-blur-xl border-b border-border">
        <div className="mx-auto max-w-[1240px] px-5 lg:px-8 h-12 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6 tabular text-[13px]">
            <span className="text-muted-foreground text-[11px] uppercase tracking-[0.12em]">
              6 meses
            </span>
            <span className="text-[oklch(0.74_0.12_145)]">
              ↑ {fmtK(totalRec)}
            </span>
            <span className="text-foreground/70">↓ {fmtK(totalDes)}</span>
            <span
              className={
                totalSaldo >= 0
                  ? "text-champagne font-medium"
                  : "text-destructive font-medium"
              }
            >
              = {fmtK(totalSaldo)}
            </span>
          </div>
          <button
            onClick={() => setCompactMode((v) => !v)}
            className="h-7 px-3 rounded-full border border-border text-[11px] text-muted-foreground hover:text-foreground transition hidden md:inline-flex items-center gap-1.5"
          >
            <span className="text-[14px]">{compactMode ? "▦" : "☰"}</span>
            {compactMode ? "Expandido" : "Compacto"}
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-[1240px] px-5 lg:px-8 pt-8 pb-24 space-y-8">
        {/* ── TÍTULO ─────────────────────────────────────────────── */}
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3">
            Visão panorâmica
          </div>
          <h1 className="font-serif text-[28px] sm:text-[36px] leading-[1.1]">
            6 meses lado a lado.
          </h1>
        </div>

        {/* ══════════════════════════════════════════════════════════
            BLOCO 1 — TABELA COMPARATIVA DOS 6 MESES
        ══════════════════════════════════════════════════════════ */}
        <section>
          <SectionLabel>Fluxo mensal</SectionLabel>
          <div className="w-full overflow-x-auto -mx-1 px-1">
            <table className="w-full min-w-[560px] border-collapse">
              <thead>
                <tr>
                  <th className="text-left w-28 pb-3 text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-medium">
                    Métrica
                  </th>
                  {months.map((m) => (
                    <th
                      key={m}
                      onClick={() => setSelectedMonth(m)}
                      className={`
                        pb-3 text-[12px] font-medium text-right cursor-pointer transition
                        ${
                          m === selectedMonth
                            ? "text-champagne"
                            : m === curMonth
                              ? "text-foreground"
                              : "text-muted-foreground hover:text-foreground/80"
                        }
                      `}
                    >
                      {monthLabel(m)}
                      {m === curMonth && (
                        <span className="ml-1 text-[9px] text-champagne">
                          ●
                        </span>
                      )}
                    </th>
                  ))}
                  <th className="pb-3 text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-medium text-right pl-4 border-l border-border">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                <TableRow
                  label="Receitas"
                  values={monthData.map((d) => d.rec)}
                  total={totalRec}
                  format={fmtK}
                  color="oklch(0.74 0.12 145)"
                  selectedIdx={months.indexOf(selectedMonth)}
                  positive
                />
                <TableRow
                  label="Despesas"
                  values={monthData.map((d) => d.des)}
                  total={totalDes}
                  format={fmtK}
                  selectedIdx={months.indexOf(selectedMonth)}
                />
                <TableRow
                  label="Saldo"
                  values={monthData.map((d) => d.saldo)}
                  total={totalSaldo}
                  format={fmtK}
                  selectedIdx={months.indexOf(selectedMonth)}
                  signed
                  bold
                />
                <TableRow
                  label="Poupança"
                  values={monthData.map((d) => d.savRate)}
                  total={
                    totalRec > 0
                      ? Math.round((totalSaldo / totalRec) * 100)
                      : 0
                  }
                  format={(v) => `${v}%`}
                  selectedIdx={months.indexOf(selectedMonth)}
                  signed
                  isPercent
                />
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Clique em um mês para ver os lançamentos abaixo.
          </p>
        </section>

        {/* ══════════════════════════════════════════════════════════
            BLOCO 2 — GRÁFICO DE BARRAS
        ══════════════════════════════════════════════════════════ */}
        <section>
          <SectionLabel>Saldo mês a mês</SectionLabel>
          <div className="glass rounded-2xl p-5">
            <MiniBarChart
              months={months}
              monthData={monthData}
              selectedMonth={selectedMonth}
              onSelect={setSelectedMonth}
            />
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            BLOCO 3 — TABELA DE CATEGORIAS
        ══════════════════════════════════════════════════════════ */}
        {allCats.length > 0 && (
          <section>
            <SectionLabel>Gastos por categoria</SectionLabel>
            <div className="w-full overflow-x-auto -mx-1 px-1">
              <table className="w-full min-w-[560px] border-collapse">
                <thead>
                  <tr>
                    <th className="text-left w-36 pb-3 text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-medium">
                      Categoria
                    </th>
                    {months.map((m) => (
                      <th
                        key={m}
                        className="pb-3 text-[11.5px] font-medium text-right text-muted-foreground"
                      >
                        {monthLabel(m)}
                      </th>
                    ))}
                    <th className="pb-3 text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-medium text-right pl-4 border-l border-border">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {allCats.map((cat) => {
                    const values = monthData.map((d) => d.catSpend[cat] ?? 0);
                    const total = values.reduce((s, v) => s + v, 0);
                    if (total === 0) return null;
                    const isFixed = CATEGORIAS_FIXAS.includes(cat);
                    return (
                      <tr
                        key={cat}
                        className="border-t border-border/50 hover:bg-white/[0.015] transition"
                      >
                        <td className="py-2.5 pr-4">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[12.5px] text-foreground/80 truncate max-w-[120px]">
                              {cat}
                            </span>
                            {isFixed && (
                              <span className="text-[9px] text-muted-foreground bg-white/[0.05] px-1.5 py-0.5 rounded">
                                fixo
                              </span>
                            )}
                          </div>
                        </td>
                        {values.map((v, i) => (
                          <td
                            key={i}
                            className={`
                              py-2.5 text-right text-[12.5px] tabular
                              ${months[i] === selectedMonth ? "text-champagne/80" : ""}
                              ${v === 0 ? "text-muted-foreground/30" : "text-foreground/70"}
                            `}
                          >
                            {v === 0 ? "—" : fmtK(v)}
                          </td>
                        ))}
                        <td className="py-2.5 text-right text-[12.5px] tabular font-medium text-foreground pl-4 border-l border-border">
                          {fmtK(total)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ══════════════════════════════════════════════════════════
            BLOCO 4 — LISTA DENSA DE LANÇAMENTOS
        ══════════════════════════════════════════════════════════ */}
        <section>
          <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
            <SectionLabel className="mb-0">
              Lançamentos · {monthLabel(selectedMonth)}
            </SectionLabel>

            <div className="flex items-center gap-2">
              <div className="flex gap-0.5 p-1 bg-surface rounded-full">
                {(
                  [
                    ["all", "Todos"],
                    ["receita", "↑ Rec."],
                    ["despesa", "↓ Desp."],
                  ] as const
                ).map(([k, l]) => (
                  <button
                    key={k}
                    onClick={() => setFilter(k)}
                    className={`
                      h-7 px-2.5 rounded-full text-[11.5px] transition
                      ${
                        filter === k
                          ? "bg-foreground text-background"
                          : "text-muted-foreground hover:text-foreground"
                      }
                    `}
                  >
                    {l}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCompactMode((v) => !v)}
                className="h-7 w-7 rounded-full border border-border text-[13px] text-muted-foreground hover:text-foreground transition flex items-center justify-center"
                title={compactMode ? "Modo expandido" : "Modo compacto"}
              >
                {compactMode ? "☰" : "▦"}
              </button>
            </div>
          </div>

          {selMonthData && (
            <div className="flex items-center gap-4 mb-3 px-1 tabular text-[12px]">
              <span className="text-[oklch(0.74_0.12_145)]">
                ↑ {fmt(selMonthData.rec)}
              </span>
              <span className="text-foreground/60">
                ↓ {fmt(selMonthData.des)}
              </span>
              <span
                className={`font-medium ${selMonthData.saldo >= 0 ? "text-champagne" : "text-destructive"}`}
              >
                = {fmt(selMonthData.saldo)}
              </span>
              <span className="ml-auto text-muted-foreground">
                {selList.length} lançamentos
              </span>
            </div>
          )}

          {selList.length === 0 ? (
            <div className="glass rounded-2xl py-12 text-center">
              <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Nenhum lançamento em {monthLabel(selectedMonth)}
              </div>
            </div>
          ) : (
            <div className="glass rounded-2xl overflow-hidden">
              {selList.map((t, i) => {
                const owner = (members as Record<string, { name: string; emoji: string }>)[t.userId];
                const isRec = t.tipo === "receita";
                return compactMode ? (
                  /* ── MODO COMPACTO ── */
                  <div
                    key={t.id}
                    className={`
                      flex items-center gap-3 px-4 h-10
                      hover:bg-white/[0.025] transition
                      ${i > 0 ? "border-t border-border/50" : ""}
                    `}
                  >
                    <span
                      className={`text-[11px] w-3 shrink-0 ${isRec ? "text-[oklch(0.74_0.12_145)]" : "text-foreground/40"}`}
                    >
                      {isRec ? "↑" : "↓"}
                    </span>
                    <span className="text-[11px] text-muted-foreground tabular w-12 shrink-0">
                      {t.data?.slice(5)}
                    </span>
                    <span className="text-[13px] flex-1 truncate">
                      {t.descricao}
                    </span>
                    <span className="text-[11px] text-muted-foreground truncate hidden sm:block w-28 text-right shrink-0">
                      {t.categoria}
                    </span>
                    <span
                      className="text-[14px] shrink-0 hidden sm:block"
                      title={owner?.name}
                    >
                      {owner?.emoji ?? "👤"}
                    </span>
                    <span
                      className={`text-[13px] tabular w-24 text-right shrink-0 ${isRec ? "text-[oklch(0.74_0.12_145)]" : ""}`}
                    >
                      {isRec ? "+" : "−"}
                      {fmtK(t.valor)}
                    </span>
                  </div>
                ) : (
                  /* ── MODO EXPANDIDO ── */
                  <div
                    key={t.id}
                    className={`
                      flex items-center gap-4 px-5 py-3.5
                      hover:bg-white/[0.02] transition
                      ${i > 0 ? "border-t border-border" : ""}
                    `}
                  >
                    <div className="size-9 rounded-xl bg-white/[0.05] flex items-center justify-center text-champagne text-[14px] font-serif shrink-0">
                      {t.descricao.slice(0, 1)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] truncate">{t.descricao}</div>
                      <div className="text-[11.5px] text-muted-foreground">
                        {t.categoria} · {t.data?.slice(5)} ·{" "}
                        {owner?.name ?? "você"}
                      </div>
                    </div>
                    <span
                      className={`text-[14px] tabular ${isRec ? "text-[oklch(0.74_0.12_145)]" : ""}`}
                    >
                      {isRec ? "+" : "−"}
                      {fmt(t.valor)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTES AUXILIARES
// ═══════════════════════════════════════════════════════════════════════════

function SectionLabel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-4 ${className}`}
    >
      {children}
    </div>
  );
}

// ── TableRow ─────────────────────────────────────────────────────────────────
interface TableRowProps {
  label: string;
  values: number[];
  total: number;
  format: (v: number) => string;
  selectedIdx: number;
  color?: string;
  positive?: boolean;
  signed?: boolean;
  bold?: boolean;
  isPercent?: boolean;
}

function TableRow({
  label,
  values,
  total,
  format,
  selectedIdx,
  color,
  positive,
  signed,
  bold,
  isPercent: _isPercent,
}: TableRowProps) {
  const max = Math.max(...values.map(Math.abs), 0.01);

  return (
    <tr className="border-t border-border/60 hover:bg-white/[0.015] transition group">
      <td className="py-3 pr-4">
        <span
          className={`text-[12.5px] ${bold ? "font-medium text-foreground" : "text-muted-foreground"}`}
        >
          {label}
        </span>
      </td>

      {values.map((v, i) => {
        const isSel = i === selectedIdx;
        const isEmpty = v === 0;

        let textColor = isSel ? "text-champagne" : "text-foreground/70";
        if (signed && v > 0)
          textColor = isSel
            ? "text-[oklch(0.74_0.12_145)]"
            : "text-[oklch(0.74_0.12_145)]/70";
        if (signed && v < 0)
          textColor = isSel ? "text-destructive" : "text-destructive/70";
        if (positive && !isSel)
          textColor = "text-[oklch(0.74_0.12_145)]/70";
        if (isEmpty) textColor = "text-muted-foreground/30";
        if (color && !isSel && !isEmpty) textColor = "";

        return (
          <td key={i} className="py-3 text-right">
            <div className="relative inline-flex flex-col items-end gap-0.5">
              {!isEmpty && (
                <div
                  className="h-[2px] rounded-full opacity-40 mb-0.5"
                  style={{
                    width: `${Math.round((Math.abs(v) / max) * 32)}px`,
                    background:
                      v < 0
                        ? "oklch(0.66 0.16 28)"
                        : "oklch(0.82 0.07 75)",
                  }}
                />
              )}
              <span
                className={`
                  tabular text-[12.5px] transition-all
                  ${bold ? "font-medium" : ""}
                  ${isSel ? "opacity-100 scale-[1.05] origin-right" : ""}
                  ${textColor}
                `}
                style={
                  color && !isSel && !isEmpty ? { color: `${color}99` } : {}
                }
              >
                {isEmpty
                  ? "—"
                  : signed && v > 0
                    ? `+${format(v)}`
                    : format(Math.abs(v))}
              </span>
            </div>
          </td>
        );
      })}

      <td
        className={`py-3 text-right text-[12.5px] tabular font-medium pl-4 border-l border-border ${
          signed && total > 0
            ? "text-[oklch(0.74_0.12_145)]"
            : signed && total < 0
              ? "text-destructive"
              : "text-foreground"
        }`}
      >
        {signed && total > 0 ? "+" : ""}
        {format(Math.abs(total))}
      </td>
    </tr>
  );
}

// ── MiniBarChart ──────────────────────────────────────────────────────────────
interface MiniBarChartProps {
  months: string[];
  monthData: Array<{ m: string; rec: number; des: number; saldo: number }>;
  selectedMonth: string;
  onSelect: (m: string) => void;
}

function MiniBarChart({
  months: _months,
  monthData,
  selectedMonth,
  onSelect,
}: MiniBarChartProps) {
  const maxVal = Math.max(...monthData.flatMap((d) => [d.rec, d.des]), 1);

  return (
    <div className="space-y-3">
      {monthData.map((d) => {
        const isSel = d.m === selectedMonth;
        const recPct = (d.rec / maxVal) * 100;
        const desPct = (d.des / maxVal) * 100;

        return (
          <div
            key={d.m}
            onClick={() => onSelect(d.m)}
            className={`flex items-center gap-3 cursor-pointer transition ${isSel ? "opacity-100" : "opacity-60 hover:opacity-90"}`}
          >
            <div
              className={`text-[11px] w-8 shrink-0 uppercase tracking-[0.1em] ${isSel ? "text-champagne font-medium" : "text-muted-foreground"}`}
            >
              {monthLabel(d.m)}
            </div>

            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-3 text-[9px] text-[oklch(0.74_0.12_145)]">
                  ↑
                </div>
                <div className="flex-1 h-[6px] bg-white/[0.05] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${recPct}%`,
                      background: "oklch(0.74 0.12 145 / 0.7)",
                    }}
                  />
                </div>
                <span className="text-[11px] tabular text-muted-foreground w-14 text-right">
                  {d.rec > 0 ? fmtK(d.rec) : "—"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 text-[9px] text-foreground/40">↓</div>
                <div className="flex-1 h-[6px] bg-white/[0.05] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${desPct}%`,
                      background: "oklch(0.82 0.07 75 / 0.5)",
                    }}
                  />
                </div>
                <span className="text-[11px] tabular text-muted-foreground w-14 text-right">
                  {d.des > 0 ? fmtK(d.des) : "—"}
                </span>
              </div>
            </div>

            <div
              className={`text-[12px] tabular w-16 text-right shrink-0 font-medium ${
                d.saldo > 0
                  ? "text-champagne"
                  : d.saldo < 0
                    ? "text-destructive"
                    : "text-muted-foreground"
              }`}
            >
              {d.saldo > 0 ? "+" : ""}
              {fmtK(d.saldo)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
