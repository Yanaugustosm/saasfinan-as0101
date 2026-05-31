import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  useData,
  calcTotais,
  calcScore,
  getLast6Months,
  monthLabel,
  nowMonth,
  fmt,
} from "@/contexts/DataContext";
import { Sparkline } from "@/components/Sparkline";
import { EvolutionChart } from "@/components/EvolutionChart";
import { MemberAvatar } from "@/components/MemberAvatar";
import { HeroSection } from "@/components/HeroSection";
import { LancamentoModal } from "@/components/LancamentoModal";

export const Route = createFileRoute("/_app/")(({
  head: () => ({
    meta: [
      { title: "Início · Sincronia — finanças do casal" },
      {
        name: "description",
        content:
          "O ambiente emocional e colaborativo onde vocês constroem patrimônio juntos.",
      },
      { property: "og:title", content: "Sincronia — finanças que aproximam" },
      {
        property: "og:description",
        content:
          "Patrimônio, metas e timeline compartilhada. Construa algo bonito com quem você ama.",
      },
    ],
  }),
  component: Dashboard,
}));

function Dashboard() {
  const { group } = useAuth();
  const { transacoes, notas, metas } = useData();
  const [showModal, setShowModal] = useState(false);

  const members = Object.values(group?.memberProfiles ?? {});
  const groupName = group?.groupName ?? "Casal";

  const curMonth = nowMonth();
  const months6 = getLast6Months();

  // Sparklines
  const sparkReceitas = months6.map((m) => {
    const l = transacoes.filter((t) => t.data?.startsWith(m));
    return calcTotais(l).rec;
  });
  const sparkDespesas = months6.map((m) => {
    const l = transacoes.filter((t) => t.data?.startsWith(m));
    return calcTotais(l).des;
  });

  // Score
  const analysis = useMemo(
    () => calcScore(transacoes, notas, metas),
    [transacoes, notas, metas]
  );
  const sparkScore = months6.map((_, i) =>
    Math.max(0, analysis.score - (5 - i) * 2)
  );

  // Current month totals
  const curList = transacoes.filter((t) => t.data?.startsWith(curMonth));
  const { rec, des } = calcTotais(curList);

  // Evolution chart data
  const evolutionData = useMemo(() => {
    let acc = 0;
    return months6.map((m) => {
      const l = transacoes.filter((t) => t.data?.startsWith(m));
      const { saldo } = calcTotais(l);
      acc += saldo;
      return { m: monthLabel(m), saldo: Math.max(acc, 0), projecao: Math.max(acc * 1.015, 0) };
    });
  }, [transacoes, months6]);

  // Recent 5 transactions
  const recentTx = transacoes.slice(0, 5);

  // Active goals
  const activeGoals = metas.filter((m) => m.ativo).slice(0, 3);

  // Timeline: last 4 events
  const timeline = transacoes.slice(0, 4).map((t) => {
    const owner = members.find((m) => m.uid === t.userId);
    return {
      id: t.id,
      emoji: owner?.emoji ?? "👤",
      name: owner?.name ?? "Você",
      text: `${owner?.name ?? "Você"} registrou ${t.descricao}.`,
      // ✅ FIX: usa sinal semântico limpo + valor absoluto — sem "+ -R$"
      detail: `${t.tipo === "receita" ? "+" : "−"} ${fmt(Math.abs(t.valor))} em ${t.categoria ?? "outros"}`,
      time: t.data,
    };
  });

  const insight = analysis.sugestoes[0]?.desc ?? analysis.alertas[0]?.desc ?? "Vocês estão no caminho certo. Continue assim!";

  return (
    <div className="hero-bg">
      <div className="mx-auto max-w-[1240px] px-5 lg:px-8">
        <HeroSection />

        {/* ── 1. METRIC ROW ── Grid no mobile (sem scroll lateral), grid no desktop */}
        <section className="mt-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard
              label="Receitas"
              value={fmt(rec)}
              delta="Entradas do mês"
              spark={sparkReceitas}
              color="var(--champagne)"
            />
            <MetricCard
              label="Despesas"
              value={fmt(des)}
              delta="Saídas do mês"
              spark={sparkDespesas}
              color="#c87941"
            />
            {/* Score: largura total no mobile para dar peso à métrica */}
            <div className="col-span-2 md:col-span-1">
              <MetricCard
                label="Score do casal"
                value={`${analysis.score}`}
                valueSuffix="/100"
                delta={analysis.nivel}
                spark={sparkScore}
                color="var(--champagne)"
              />
            </div>
            {/* Consultor: largura total no mobile, espaço para ler e interagir */}
            <div className="col-span-2 md:col-span-1">
              <ConsultorCard insight={insight} onAddLancamento={() => setShowModal(true)} />
            </div>
          </div>
        </section>

        {/* ── 2. ATIVIDADE RECENTE ── (subiu de posição — frequência de uso máxima) */}
        <section className="mt-4 grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-3">
          {/* Momentos do casal */}
          <div className="glass rounded-3xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  O que vocês construíram
                </div>
                <h2 className="mt-1.5 font-serif text-[22px] italic">Momentos recentes do casal.</h2>
              </div>
              <Link to="/lancamentos" className="text-[12px] text-muted-foreground hover:text-foreground transition-colors">
                Ver tudo →
              </Link>
            </div>

            {timeline.length === 0 ? (
              <div className="mt-8 flex flex-col items-center text-center py-6 gap-3">
                <div className="text-3xl opacity-40">📭</div>
                <p className="font-serif italic text-[16px] text-foreground/60">Nenhum momento registrado ainda.</p>
                <p className="text-[12.5px] text-muted-foreground">Registrem o primeiro lançamento do casal.</p>
                <button
                  onClick={() => setShowModal(true)}
                  className="mt-1 inline-flex items-center gap-2 h-9 px-4 rounded-full bg-foreground/10 border border-white/10 text-foreground/70 text-[12.5px] hover:bg-white/[0.05] transition-all"
                >
                  + Registrar lançamento
                </button>
              </div>
            ) : (
              <ul className="mt-5 divide-y divide-border">
                {timeline.map((e) => (
                  <li key={e.id} className="py-3.5 flex items-start gap-3">
                    <MemberAvatar emoji={e.emoji} name={e.name} size={32} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] text-foreground leading-snug truncate">{e.text}</div>
                      <div className="text-[12.5px] text-muted-foreground mt-0.5">{e.detail}</div>
                    </div>
                    <span className="text-[11.5px] text-muted-foreground whitespace-nowrap shrink-0">
                      {e.time}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Últimos lançamentos */}
          <div className="glass rounded-3xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Últimos lançamentos
                </div>
                <h2 className="mt-1.5 font-serif text-[22px] italic">O fluxo da semana.</h2>
              </div>
              <Link to="/lancamentos" className="text-[12px] text-muted-foreground hover:text-foreground transition-colors">
                Abrir →
              </Link>
            </div>

            {recentTx.length === 0 ? (
              <div className="mt-8 flex flex-col items-center text-center py-6 gap-3">
                <div className="text-3xl opacity-40">💸</div>
                <p className="font-serif italic text-[16px] text-foreground/60">Nenhum lançamento ainda.</p>
                <button
                  onClick={() => setShowModal(true)}
                  className="mt-1 inline-flex items-center gap-2 h-9 px-4 rounded-full bg-foreground text-background text-[12.5px] font-medium hover:opacity-90 transition-all"
                >
                  + Primeiro lançamento
                </button>
              </div>
            ) : (
              <ul className="mt-5 space-y-3.5">
                {recentTx.map((t) => {
                  const owner = members.find((m) => m.uid === t.userId);
                  const isReceita = t.tipo === "receita";
                  return (
                    <li key={t.id} className="flex items-center gap-3">
                      <MemberAvatar emoji={owner?.emoji ?? "👤"} name={owner?.name} size={28} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[13.5px] text-foreground truncate">{t.descricao}</div>
                        <div className="text-[11.5px] text-muted-foreground">{t.categoria}</div>
                      </div>
                      {/* ✅ FIX: sinal semântico limpo + valor absoluto */}
                      <span
                        className="text-[13.5px] tabular-nums shrink-0"
                        style={{ color: isReceita ? "#a8c9a0" : "rgba(255,255,255,0.82)" }}
                      >
                        {isReceita ? "+ " : "− "}
                        {fmt(Math.abs(t.valor))}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        {/* ── 3. CHART + GOALS ── (desceu de posição — consulta mensal) */}
        <section className="mt-3 grid grid-cols-1 lg:grid-cols-[1.65fr_1fr] gap-3">
          <div className="glass rounded-3xl p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Evolução · Saldo 6 meses
                </div>
                <h2 className="mt-1.5 font-serif text-[22px] text-foreground italic">
                  A respiração do mês.
                </h2>
              </div>
              <div className="flex items-center gap-3 text-[11.5px] text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span className="block w-3 h-[2px] bg-champagne" /> Saldo
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="block w-3 border-t border-dashed border-white/30" /> Projeção
                </span>
              </div>
            </div>
            <div className="mt-4">
              <EvolutionChart data={evolutionData} />
            </div>
          </div>

          <aside className="glass rounded-3xl p-6">
            <div className="flex items-center justify-between">
              <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Em construção
              </div>
              <Link to="/sonhos" className="text-[12px] text-muted-foreground hover:text-foreground transition-colors">
                Ver todos →
              </Link>
            </div>
            <h2 className="mt-1.5 font-serif text-[22px] italic">Sonhos do casal.</h2>

            {activeGoals.length === 0 ? (
              <div className="mt-6 flex flex-col items-center text-center py-8 gap-3">
                <div className="text-4xl opacity-40 mb-1">🎯</div>
                <p className="font-serif italic text-[16px] text-foreground/60">Os sonhos de vocês ainda não foram escritos.</p>
                <p className="text-[12.5px] text-muted-foreground max-w-[200px] leading-relaxed">Cada sonho tem um valor e um prazo. Começando por aí.</p>
                <Link
                  to="/sonhos"
                  className="mt-2 inline-flex items-center gap-2 h-9 px-4 rounded-full bg-foreground/10 border border-champagne/30 text-champagne text-[12.5px] font-medium hover:bg-champagne/10 transition-all"
                >
                  + Criar primeiro sonho
                </Link>
              </div>
            ) : (
              <ul className="mt-5 space-y-4">
                {activeGoals.map((g) => {
                  const pct = Math.min(Math.round((g.acumulado / g.valor) * 100), 100);
                  return (
                    <li key={g.id} className="flex items-center gap-3">
                      <div className="size-14 rounded-2xl bg-white/[0.05] ring-1 ring-white/10 flex items-center justify-center text-2xl shrink-0">
                        {g.imagem ?? "🎯"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-[14px] text-foreground truncate">{g.titulo}</span>
                          <span className="text-[12px] text-champagne tabular shrink-0">{pct}%</span>
                        </div>
                        <div className="mt-1 text-[11.5px] text-muted-foreground truncate">
                          {g.prazo ?? "Sem prazo"}
                        </div>
                        {/* Barra de progresso mais espessa com glow */}
                        <div className="mt-2 h-[5px] rounded-full bg-white/[0.06] overflow-visible relative">
                          <div
                            className="h-full rounded-full relative"
                            style={{
                              width: `${pct}%`,
                              background: "var(--gradient-champagne)",
                              boxShadow: pct > 0 ? "0 0 8px 1px rgba(212,185,120,0.45)" : "none",
                              transition: "width 1s cubic-bezier(0.4,0,0.2,1)",
                            }}
                          />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </aside>
        </section>

        <footer className="mt-16 mb-4 flex items-center justify-between text-[11.5px] text-muted-foreground">
          <span className="tracking-[0.2em] uppercase">Sincronia</span>
          <span>Construído para {groupName}.</span>
        </footer>
      </div>

      {/* Modal de lançamento global do dashboard */}
      <LancamentoModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </div>
  );
}

interface MetricProps {
  label: string;
  value: string;
  valueSuffix?: string;
  delta: string;
  spark: number[];
  color: string;
}
function MetricCard({ label, value, valueSuffix, delta, spark, color }: MetricProps) {
  // Curva orgânica elegante como fallback quando não há dados
  const elegantWave = [2, 3.5, 2.5, 4.5, 3, 5, 3.5];
  return (
    <div className="glass rounded-3xl pt-5 px-5 pb-0 flex flex-col hover:bg-white/[0.02] transition overflow-hidden h-full">
      {/* Conteúdo ancorado no topo */}
      <div className="flex-1">
        <span className="text-[10.5px] sm:text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </span>
        <div className="mt-3 flex items-baseline gap-1.5 tabular-nums">
          <span className="text-[20px] sm:text-[24px] font-light text-foreground leading-none">{value}</span>
          {valueSuffix && <span className="text-[12px] sm:text-[14px] text-muted-foreground">{valueSuffix}</span>}
        </div>
        <div className="mt-1.5 text-[10.5px] sm:text-[11.5px] text-muted-foreground">{delta}</div>
      </div>
      {/* Gráfico sangra até as bordas (Edge-to-Edge) */}
      <div className="mt-6 -mx-5">
        <Sparkline
          data={spark.some(v => v > 0) ? spark : elegantWave}
          color={color}
          height={36}
        />
      </div>
    </div>
  );
}

function ConsultorCard({ insight, onAddLancamento }: { insight: string; onAddLancamento?: () => void }) {
  return (
    <div
      className="rounded-3xl p-5 relative overflow-hidden h-full"
      style={{
        background: "linear-gradient(135deg, #1e1a14, #181510)",
        border: "1px solid rgba(212,185,120,0.22)",
        boxShadow: "0 0 0 1px rgba(212,185,120,0.07), 0 8px 32px -8px rgba(212,185,120,0.18)",
      }}
    >
      {/* Halo champagne no canto */}
      <div
        className="absolute inset-0 opacity-60 pointer-events-none"
        style={{ background: "radial-gradient(100% 100% at 100% 0%, rgba(212,185,120,0.18), transparent 60%)" }}
      />
      <div className="relative">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-champagne">
          <span className="size-1.5 rounded-full bg-champagne animate-pulse-dot" />
          Sugestão premium
        </div>
        <p className="mt-3 text-[13.5px] text-foreground leading-snug">
          {insight}
        </p>
        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={onAddLancamento}
            className="h-8 px-3.5 rounded-full text-[12px] font-medium transition hover:opacity-90 active:scale-95"
            style={{ background: "var(--gradient-champagne)", color: "#1a1408" }}
          >
            Registrar agora
          </button>
          <button className="h-8 px-3 rounded-full border border-champagne/20 text-[12px] text-muted-foreground hover:text-foreground hover:border-champagne/40 transition">
            Mais tarde
          </button>
        </div>
      </div>
    </div>
  );
}
