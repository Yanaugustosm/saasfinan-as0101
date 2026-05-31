import { useAuth } from "@/contexts/AuthContext";
import { useData, calcTotais, nowMonth, fmt } from "@/contexts/DataContext";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { LancamentoModal } from "@/components/LancamentoModal";

export function HeroSection() {
  const { group } = useAuth();
  const { transacoes, metas } = useData();
  const [showModal, setShowModal] = useState(false);

  const curMonth = nowMonth();
  const curList  = transacoes.filter((t) => t.data?.startsWith(curMonth));
  const { rec, des, saldo } = calcTotais(curList);

  /* Número dividido: inteiro + decimais */
  const formatted = Math.abs(saldo).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const [intWhole, intFrac] = formatted.split(",");

  /* Membros */
  const members = Object.values(group?.memberProfiles ?? {});
  const names =
    members.length >= 2
      ? `${members[0].name} & ${members[1].name}`
      : members[0]?.name ?? "Você";

  const greeting = greetingFor(new Date());

  /* Período */
  const d  = new Date();
  const mo = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"][d.getMonth()];
  const periodShort = `${mo} · ${d.getFullYear()}`;

  /* Próximo sonho */
  const activeMetas = metas.filter((m) => m.ativo && m.valor > 0);
  const nextDream   = activeMetas[0] ?? null;
  const dreamPct    = nextDream
    ? Math.min(Math.round((nextDream.acumulado / nextDream.valor) * 100), 100)
    : 0;
  const dreamFalta  = nextDream
    ? Math.max(nextDream.valor - nextDream.acumulado, 0)
    : 0;

  return (
    <section className="relative isolate -mx-5 lg:-mx-8 overflow-hidden">

      {/* ── Atmosfera: gradientes + grain, SEM imagem ── */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 animate-breathe-soft"
        style={{ background: "var(--gradient-hero-warm)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.055] grain-overlay"
      />
      {/* Vinheta inferior */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-48"
        style={{ background: "var(--gradient-hero-vignette)" }}
      />
      {/* Luz ambient champagne no topo-direita */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -right-40 -z-10 size-[600px] rounded-full opacity-[0.06]"
        style={{ background: "radial-gradient(circle, oklch(0.82 0.10 75), transparent 70%)" }}
      />

      {/* ── Layout: 2 colunas em desktop, 1 coluna no mobile ── */}
      <div className="px-5 lg:px-8 grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-8 lg:gap-16 items-center pt-8 sm:pt-10 lg:pt-16 pb-10 lg:pb-16 overflow-hidden">

        {/* ═══ COLUNA ESQUERDA — Editorial ═══ */}
        <div className="fade-up-stagger flex flex-col">

          {/* Rótulo */}
          <div className="flex items-center gap-2.5 text-muted-foreground">
            <span className="size-1.5 rounded-full bg-champagne animate-pulse-dot" />
            <span className="text-[10.5px] sm:text-[11px] uppercase tracking-[0.32em] font-medium">
              Patrimônio · {periodShort}
            </span>
          </div>

          {/* Saudação */}
          <h1 className="mt-6 sm:mt-8 font-serif text-foreground/90 text-[28px] sm:text-[34px] lg:text-[40px] leading-[1.08]">
            {greeting},<br />
            <span className="text-foreground">{names}.</span>
          </h1>

          {/* Número dominante */}
          <div className="mt-5 sm:mt-8 lg:mt-10">
            <div
              className="flex items-baseline gap-2 sm:gap-3 tabular text-foreground"
              style={{ fontFeatureSettings: '"tnum", "ss01"' }}
            >
              <span className="text-[16px] sm:text-[26px] lg:text-[30px] font-light opacity-35 leading-none shrink-0">
                R$
              </span>
              <span className="font-light leading-[0.95] tracking-[-0.03em] text-[46px] sm:text-[88px] lg:text-[120px]">
                {intWhole}
                <span className="opacity-35 text-[22px] sm:text-[42px] lg:text-[54px]">
                  ,{intFrac}
                </span>
              </span>
            </div>

            {/* Pílulas gêmeas simétricas — entrada e despesas */}
            <div className="mt-4 flex flex-wrap items-center gap-2 text-[13px]">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.025] px-3 py-1.5 text-foreground/85">
                <span className="size-1.5 rounded-full bg-champagne shrink-0" />
                <span className="text-champagne tabular">{fmt(rec)}</span>
                <span className="text-foreground/40 text-[11px]">entrada</span>
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.025] px-3 py-1.5 text-foreground/85">
                <span className="size-1.5 rounded-full shrink-0" style={{ background: "oklch(0.65 0.12 40)" }} />
                <span className="tabular" style={{ color: "oklch(0.72 0.09 45)" }}>{fmt(des)}</span>
                <span className="text-foreground/40 text-[11px]">despesas</span>
              </span>
            </div>
          </div>

          {/* Frase aspiracional */}
          <p className="mt-5 lg:mt-7 font-serif italic text-foreground/55 text-[18px] sm:text-[22px] lg:text-[24px] leading-[1.35] max-w-lg">
            Vocês estão construindo algo bonito.
          </p>

          {/* CTA — empilhado no mobile, lado a lado no desktop */}
          <div className="mt-7 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <button
              id="hero-cta-lancar"
              onClick={() => setShowModal(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-11 sm:h-10 px-6 rounded-full bg-foreground text-background text-[14px] sm:text-[13.5px] font-medium hover:opacity-90 active:scale-95 transition-all duration-200 shadow-lg"
            >
              <span className="inline-flex items-center text-[18px] font-light" style={{ lineHeight: 1 }}>+</span>
              Registrar lançamento
            </button>
            <Link
              to="/sonhos"
              className="text-center sm:text-left inline-flex items-center justify-center sm:justify-start gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Ver sonhos <span className="text-[11px]">→</span>
            </Link>
          </div>
        </div>

        {/* ═══ COLUNA DIREITA — Card do Próximo Sonho ═══ */}
        <div className="animate-fade-up">
          {nextDream ? (
            <Link
              to="/sonhos"
              className="group block rounded-[24px] border border-white/[0.07] bg-white/[0.03] backdrop-blur-xl p-7 hover:border-champagne/25 hover:bg-white/[0.05] transition-all duration-500"
            >
              {/* Eyebrow */}
              <div className="flex items-center justify-between mb-6">
                <span className="text-[10.5px] uppercase tracking-[0.25em] text-muted-foreground">
                  Próximo sonho
                </span>
                <span className="text-[12px] text-champagne tabular font-medium">
                  {dreamPct}%
                </span>
              </div>

              {/* Ícone / foto + Título */}
              <div className="flex items-center gap-4 mb-6">
                {(nextDream as any).imageUrl ? (
                  <div className="size-14 rounded-2xl overflow-hidden ring-1 ring-white/[0.10] shrink-0">
                    <img
                      src={(nextDream as any).imageUrl}
                      alt={nextDream.titulo}
                      className="size-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="size-14 rounded-2xl bg-white/[0.06] ring-1 ring-white/[0.10] flex items-center justify-center text-3xl shrink-0">
                    {nextDream.imagem ?? "🎯"}
                  </div>
                )}
                <div>
                  <div className="font-serif italic text-[22px] text-foreground leading-tight">
                    {nextDream.titulo}
                  </div>
                  {nextDream.prazo && (
                    <div className="mt-1 text-[12px] text-muted-foreground">
                      Prazo: {nextDream.prazo}
                    </div>
                  )}
                </div>
              </div>

              {/* Barra de progresso */}
              <div className="h-[3px] rounded-full bg-white/[0.06] overflow-hidden mb-3">
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: `${dreamPct}%`,
                    background: "var(--gradient-champagne)",
                  }}
                />
              </div>

              {/* Valores */}
              <div className="flex items-baseline justify-between text-[12px]">
                <span className="text-muted-foreground tabular">
                  {fmt(nextDream.acumulado)} acumulado
                </span>
                <span className="text-foreground/50 tabular">
                  faltam {fmt(dreamFalta)}
                </span>
              </div>

              {/* CTA sutil */}
              <div className="mt-6 pt-5 border-t border-white/[0.05] text-[12px] text-muted-foreground flex items-center justify-between">
                <span>Ver todos os sonhos</span>
                <span className="group-hover:translate-x-1 transition-transform duration-300">→</span>
              </div>
            </Link>
          ) : (
            /* Estado vazio elegante */
            <Link
              to="/sonhos"
              className="group block rounded-[24px] border border-dashed border-white/[0.09] p-7 text-center hover:border-champagne/30 transition-all duration-500"
            >
              <div className="text-[40px] mb-4 opacity-50">🎯</div>
              <div className="font-serif italic text-[20px] text-foreground/60 mb-2">
                Nenhum sonho ativo.
              </div>
              <div className="text-[13px] text-muted-foreground mb-6">
                Adicione uma meta e acompanhe o progresso aqui.
              </div>
              <span className="inline-flex items-center gap-2 text-[12.5px] text-champagne group-hover:gap-3 transition-all">
                Criar primeiro sonho →
              </span>
            </Link>
          )}
        </div>
      </div>

      {/* Hairline champagne inferior */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
        style={{
          background: "linear-gradient(90deg, transparent, oklch(0.82 0.07 75 / 0.16), transparent)",
        }}
      />

      {/* Modal de lançamento disparado pelo CTA do hero */}
      <LancamentoModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </section>
  );
}

function greetingFor(d: Date): string {
  const h = d.getHours();
  if (h < 5)  return "Boa madrugada";
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}
