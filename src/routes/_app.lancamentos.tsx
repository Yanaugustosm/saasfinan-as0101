import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useData, calcTotais, nowMonth, fmt } from "@/contexts/DataContext";
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
  const monthLabel = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const months6: string[] = [];
  for (let i = 0; i < 6; i++) {
    const dd = new Date(d.getFullYear(), d.getMonth() - i, 1);
    months6.push(dd.toISOString().slice(0, 7));
  }

  const [filter, setFilter]   = useState<Filter>("all");
  const [q, setQ]             = useState("");
  const [selMonth, setSelMonth] = useState(nowMonth());
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Transacao | null>(null);

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

  const { rec, des } = calcTotais(filtered);

  const openNew  = () => { setEditTarget(null); setShowModal(true); };
  const openEdit = (t: Transacao) => { setEditTarget(t); setShowModal(true); };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este lançamento?")) return;
    await deleteTransacao(id);
    toast("Lançamento excluído", "info");
  };

  return (
    <div className="hero-bg">
      <div className="mx-auto max-w-[1100px] px-5 lg:px-8 pt-10 lg:pt-14">
        <div className="text-[11.5px] uppercase tracking-[0.18em] text-muted-foreground">
          Lançamentos · {monthLabel}
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
        </div>

        {/* Groups */}
        <div className="mt-8 space-y-8 pb-20">
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
                          <div className="text-[11.5px] text-muted-foreground">
                            {t.categoria} · por {owner?.name ?? "você"}
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
