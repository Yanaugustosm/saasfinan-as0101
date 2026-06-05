import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

// ─── Types ───────────────────────────────────────────────────────────────────
export interface Transacao {
  id: string;
  tipo: "receita" | "despesa";
  descricao: string;
  valor: number;
  grupo: "pessoal" | "familiar" | "negocio";
  categoria: string;
  data: string;
  obs?: string;
  groupId: string;
  userId: string;
  // Campos do Consultor Inteligente (opcionais, retrocompatíveis)
  tipoGasto?: "essencial" | "desejo" | "emergencia";  // Só para despesas
  receitaTipo?: "normal" | "extra";                    // Só para receitas
  pendenteInteligencia?: boolean;                       // Lançado sem classificação
}

export interface Nota {
  id: string;
  titulo: string;
  descricao?: string;
  tipo: "nota" | "conta" | "receber" | "divida" | "lembrete";
  valor?: number;
  vencimento?: string;
  pago?: boolean;
  recorrente?: boolean;
  groupId: string;
  userId: string;
}

export interface Meta {
  id: string;
  titulo: string;
  valor: number;
  acumulado: number;
  categoria: string;
  prazo?: string;
  ativo: boolean;
  imagem?: string;
  groupId: string;
  userId: string;
}

interface DataContextValue {
  transacoes: Transacao[];
  notas: Nota[];
  metas: Meta[];
  loading: boolean;
  // Transações
  addTransacao: (data: Omit<Transacao, "id" | "groupId" | "userId">, uid: string) => Promise<void>;
  updateTransacao: (id: string, data: Partial<Transacao>) => Promise<void>;
  deleteTransacao: (id: string) => Promise<void>;
  // Notas
  addNota: (data: Omit<Nota, "id" | "groupId" | "userId">, uid: string) => Promise<void>;
  updateNota: (id: string, data: Partial<Nota>) => Promise<void>;
  deleteNota: (id: string) => Promise<void>;
  togglePago: (id: string, current: boolean) => Promise<void>;
  // Metas
  addMeta: (data: Omit<Meta, "id" | "groupId" | "userId">, uid: string) => Promise<void>;
  updateMeta: (id: string, data: Partial<Meta>) => Promise<void>;
  deleteMeta: (id: string) => Promise<void>;
  aportar: (id: string, valor: number, acumuladoAtual: number) => Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({
  groupId,
  children,
}: {
  groupId: string | null;
  children: ReactNode;
}) {
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [notas, setNotas] = useState<Nota[]>([]);
  const [metas, setMetas] = useState<Meta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId) {
      setLoading(false);
      setTransacoes([]);
      setNotas([]);
      setMetas([]);
      return;
    }

    const unsubs: (() => void)[] = [];

    unsubs.push(
      onSnapshot(
        query(collection(db, "transacoes"), where("groupId", "==", groupId)),
        (snap) => {
          const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Transacao);
          data.sort((a, b) => (b.data || "").localeCompare(a.data || ""));
          setTransacoes(data);
          setLoading(false);
        },
        (e) => { console.error(e); setLoading(false); }
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, "notas"), where("groupId", "==", groupId)),
        (snap) => {
          setNotas(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Nota));
        },
        console.error
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, "metas"), where("groupId", "==", groupId)),
        (snap) => {
          setMetas(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Meta));
        },
        console.error
      )
    );

    return () => unsubs.forEach((u) => u());
  }, [groupId]);

  const add = useCallback(
    async (col: string, data: object, uid: string) => {
      await addDoc(collection(db, col), {
        ...data,
        groupId,
        userId: uid,
        createdAt: serverTimestamp(),
      });
    },
    [groupId]
  );

  const upd = useCallback(async (col: string, id: string, data: object) => {
    await updateDoc(doc(db, col, id), data);
  }, []);

  const del = useCallback(async (col: string, id: string) => {
    await deleteDoc(doc(db, col, id));
  }, []);

  return (
    <DataContext.Provider
      value={{
        transacoes,
        notas,
        metas,
        loading,
        addTransacao: (d, uid) => add("transacoes", d, uid),
        updateTransacao: (id, d) => upd("transacoes", id, d),
        deleteTransacao: (id) => del("transacoes", id),
        addNota: (d, uid) => add("notas", d, uid),
        updateNota: (id, d) => upd("notas", id, d),
        deleteNota: (id) => del("notas", id),
        togglePago: (id, current) => upd("notas", id, { pago: !current }),
        addMeta: (d, uid) => add("metas", d, uid),
        updateMeta: (id, d) => upd("metas", id, d),
        deleteMeta: (id) => del("metas", id),
        aportar: (id, valor, acumuladoAtual) =>
          upd("metas", id, { acumulado: acumuladoAtual + valor }),
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
export const fmt = (v: number) =>
  (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const fmtK = (v: number) => {
  const n = Math.abs(v || 0);
  if (n >= 1e6) return (v / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (v / 1e3).toFixed(1) + "k";
  return fmt(v);
};

export const nowDate = () => new Date().toISOString().split("T")[0];
export const nowMonth = () => new Date().toISOString().slice(0, 7);

export const getLast6Months = () => {
  const months: string[] = [];
  const d = new Date();
  for (let i = 5; i >= 0; i--) {
    const dd = new Date(d.getFullYear(), d.getMonth() - i, 1);
    months.push(dd.toISOString().slice(0, 7));
  }
  return months;
};

export const calcTotais = (list: Transacao[]) => {
  const rec = list.filter((t) => t.tipo === "receita").reduce((s, t) => s + (t.valor || 0), 0);
  const des = list.filter((t) => t.tipo === "despesa").reduce((s, t) => s + (t.valor || 0), 0);

  // Fase 2: Balanço Potencial
  // gastos marcados como 'desejo' = dinheiro que poderia ter sido poupado
  const desEssencial = list
    .filter((t) => t.tipo === "despesa" && t.tipoGasto === "essencial")
    .reduce((s, t) => s + (t.valor || 0), 0);
  const desDesejo = list
    .filter((t) => t.tipo === "despesa" && t.tipoGasto === "desejo")
    .reduce((s, t) => s + (t.valor || 0), 0);
  const recExtra = list
    .filter((t) => t.tipo === "receita" && t.receitaTipo === "extra")
    .reduce((s, t) => s + (t.valor || 0), 0);
  const pendentes = list.filter((t) => t.pendenteInteligencia).length;

  const saldo = rec - des;
  const economiaPotencial = saldo + desDesejo; // o que poderia ter sobrado
  const dinheiroNaMesa = Math.max(0, desDesejo); // o que "deixou na mesa"

  return { rec, des, saldo, desEssencial, desDesejo, recExtra, pendentes, economiaPotencial, dinheiroNaMesa };
};

export const monthLabel = (m: string) => {
  if (!m) return "";
  const mo = parseInt(m.split("-")[1]) - 1;
  return ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"][mo];
};

export function calcScore(transacoes: Transacao[], notas: Nota[], metas: Meta[]) {
  const cur = nowMonth();
  const curList = transacoes.filter((t) => t.data?.startsWith(cur));
  const { rec, des, saldo } = calcTotais(curList);
  const months = getLast6Months();
  const monthData = months.map((m) => {
    const l = transacoes.filter((t) => t.data?.startsWith(m));
    return { month: m, ...calcTotais(l) };
  });

  // FIX 1: savingsRate negativa quando sem receita e com despesas (capital sendo consumido)
  const savingsRate = rec > 0 ? (saldo / rec) * 100 : des > 0 ? -100 : 0;
  const today = nowDate();
  const overdueCount = (notas || []).filter(
    (n) => ["conta", "divida"].includes(n.tipo) && n.vencimento && n.vencimento < today && !n.pago
  ).length;
  const metasAtingidas = (metas || []).filter((m) => m.acumulado >= m.valor).length;
  const last3 = monthData.slice(-3);
  const avgDes = last3.reduce((s, m) => s + m.des, 0) / 3 || 1;
  // FIX 2: usa último mês disponível (não índice fixo [2] que causa crash com <3 meses de histórico)
  const lastMonth = last3[last3.length - 1];
  const firstMonth = last3[0];
  const desTrend = last3.length > 1 ? ((lastMonth.des - firstMonth.des) / avgDes) * 100 : 0;

  let score = 50;
  if (savingsRate >= 30) score += 25;
  else if (savingsRate >= 20) score += 18;
  else if (savingsRate >= 10) score += 10;
  else if (savingsRate >= 0) score += 3;
  else score -= 15;
  score -= overdueCount * 8;
  if (desTrend < -10) score += 10;
  else if (desTrend > 30) score -= 10;
  else if (desTrend > 15) score -= 5;
  score += metasAtingidas * 5;
  if (rec > 0 && des / rec < 0.5) score += 10;
  else if (rec > 0 && des / rec > 0.9) score -= 10;
  const avgSaldo = last3.reduce((s, m) => s + m.saldo, 0) / 3;
  if (avgSaldo > 0) score += 5;
  score = Math.max(0, Math.min(100, Math.round(score)));

  let nivel: string, cor: string, desc: string;
  if (score >= 80) { nivel = "Excelente"; cor = "#34D399"; desc = "Finanças sob controle. Foco em multiplicar."; }
  else if (score >= 60) { nivel = "Saudável"; cor = "#60A5FA"; desc = "Boa base. Pequenos ajustes geram grandes resultados."; }
  else if (score >= 40) { nivel = "Atenção"; cor = "#FBBF24"; desc = "Vulnerabilidade detectada. Ação necessária."; }
  else { nivel = "Crítico"; cor = "#F87171"; desc = "Situação requer intervenção imediata."; }

  const forecast = {
    rec: (last3.reduce((s, m) => s + m.rec, 0) / 3) * 1.02,
    des: (last3.reduce((s, m) => s + m.des, 0) / 3) * (1 + desTrend / 200),
  };

  const catSpend: Record<string, number> = {};
  curList.filter((t) => t.tipo === "despesa").forEach((t) => {
    catSpend[t.categoria] = (catSpend[t.categoria] || 0) + t.valor;
  });

  const alertas: { tipo: string; icon: string; titulo: string; desc: string; acao: string }[] = [];
  if (saldo < 0) alertas.push({ tipo: "danger", icon: "🚨", titulo: "Saldo negativo", desc: `Gastos superaram receitas em ${fmt(Math.abs(saldo))} este mês.`, acao: "Corte despesas variáveis imediatamente" });
  if (savingsRate < 10 && rec > 0) alertas.push({ tipo: "warning", icon: "⚠️", titulo: "Taxa de poupança crítica", desc: `Poupando apenas ${savingsRate.toFixed(1)}% da renda.`, acao: "Revise despesas fixas" });
  if (overdueCount > 0) alertas.push({ tipo: "danger", icon: "🔴", titulo: `${overdueCount} conta(s) vencida(s)`, desc: "Contas em atraso podem gerar juros e multas.", acao: "Regularize hoje" });

  const sugestoes: { icon: string; titulo: string; desc: string }[] = [];
  if (savingsRate > 25) sugestoes.push({ icon: "📈", titulo: "Comece a investir", desc: "Com poupança sólida, Tesouro Direto ou CDB protegem de inflação." });
  if (avgSaldo > 0 && avgSaldo < rec * 0.1) sugestoes.push({ icon: "🛡️", titulo: "Monte sua reserva de emergência", desc: "Objetivo: 6 meses de despesas guardados em liquidez diária." });


  return {
    score, nivel, cor, desc, alertas, sugestoes,
    monthData, savingsRate, forecast, catSpend, desTrend,
    curTotais: { rec, des, saldo },
  };
}

// ─── Motor Preditivo (Fase 3) ─────────────────────────────────────────────────

export type NivelEconomia = "conforto" | "moderado" | "agressivo";

/**
 * Retorna alertas comportamentais baseados no histórico dos últimos 30 dias.
 * Thresholds variam pelo nível de economia escolhido pelo casal.
 */
export function analyzeBehavior(
  transacoes: Transacao[],
  metas: Meta[],
  nivelEconomia: NivelEconomia = "moderado",
  custoVidaEssencial = 0,
  reservaExistente = 0,
  mesesReservaIdeal = 6,
  // Nível 2: dados declarados na Anamnese para cruzar com a realidade
  rendaDeclarada = 0,
  custoFixoDeclarado = 0
) {
  const hoje = new Date();
  const cutoff = new Date(hoje.getFullYear(), hoje.getMonth() - 1, hoje.getDate())
    .toISOString()
    .split("T")[0];
  const ultimas = transacoes.filter(
    (t) => t.tipo === "despesa" && t.data >= cutoff
  );

  // Contagem por categoria nos últimos 30 dias
  const catCount: Record<string, number> = {};
  const catSpend: Record<string, number> = {};
  ultimas.forEach((t) => {
    catCount[t.categoria] = (catCount[t.categoria] || 0) + 1;
    catSpend[t.categoria] = (catSpend[t.categoria] || 0) + t.valor;
  });

  // Threshold de frequência por nível (ex: delivery/restaurantes)
  const freqThreshold: Record<NivelEconomia, number> = {
    agressivo: 2,
    moderado:  5,
    conforto:  10,
  };
  const threshold = freqThreshold[nivelEconomia];

  const alertasComportamentais: { icon: string; titulo: string; desc: string }[] = [];

  // ── Nível 2: Alertas de Desvio (compara o declarado com o real) ────────────
  const mesAtual = new Date().toISOString().slice(0, 7);
  const { rec: recMesAtual, des: desMesAtual, desEssencial: desEssencialAtual } = calcTotais(
    transacoes.filter((t) => t.data?.startsWith(mesAtual))
  );

  // Renda efetiva: usa real se já houver lançamentos, senão usa a declarada na Anamnese
  const rendaEfetiva = recMesAtual > 0 ? recMesAtual : rendaDeclarada;

  // FIX 2: Compara APENAS despesas Essenciais com o custo fixo declarado
  // (evita falso alarme ao misturar iFood/variáveis com o custo fixo da casa)
  if (custoFixoDeclarado > 0 && desEssencialAtual > custoFixoDeclarado * 1.10) {
    const excesso = desEssencialAtual - custoFixoDeclarado;
    alertasComportamentais.push({
      icon: "📊",
      titulo: "Custos fixos acima do planejado",
      desc: `Seus gastos essenciais (${fmt(desEssencialAtual)}) ultrapassaram em ${fmt(excesso)} o custo fixo declarado. Revise as despesas fixas da casa.`,
    });
  }

  // Alerta: Sobra de caixa — sugere aportar na meta prioritária
  const metaPrioritaria = metas
    .filter((m) => m.ativo && m.valor > 0 && m.acumulado < m.valor)
    .sort((a, b) => {
      // Prioriza a meta com prazo mais próximo
      if (!a.prazo) return 1;
      if (!b.prazo) return -1;
      return new Date(a.prazo).getTime() - new Date(b.prazo).getTime();
    })[0];

  // FIX 1: Alerta de sobra só dispara no final do mês (dia >= 25)
  // Antes disso, o mês ainda está incompleto — a despesa real ainda virá
  if (hoje.getDate() >= 25 && rendaEfetiva > 0 && desMesAtual > 0) {
    const sobraMes = rendaEfetiva - desMesAtual;
    if (sobraMes > rendaEfetiva * 0.20 && metaPrioritaria) {
      alertasComportamentais.push({
        icon: "💡",
        titulo: `Sobra de ${fmt(sobraMes)} este mês`,
        desc: `Mês quase fechado e vocês estão ${fmt(sobraMes)} positivos. Que tal destinar parte disso para "${metaPrioritaria.titulo}"?`,
      });
    }
  }

  // FIX 3: Alerta de Gadinhos via tipoGasto=="desejo" — não punir compras de mercado ou Netflix
  const despesasDesejo = ultimas.filter((t) => t.tipoGasto === "desejo");
  const dezejosCount = despesasDesejo.length;
  const dezejosThreshold: Record<NivelEconomia, number> = {
    agressivo: 4,
    moderado:  8,
    conforto:  15,
  };
  if (dezejosCount > dezejosThreshold[nivelEconomia]) {
    alertasComportamentais.push({
      icon: "🍔",
      titulo: `${dezejosCount} gastos de desejo`,
      desc: `Nos últimos 30 dias, vocês registraram ${dezejosCount} gastos de "desejo". Para o nível ${nivelEconomia}, o ideal é até ${dezejosThreshold[nivelEconomia]}. Atenção ao padrão de consumo!`,
    });
  }

  // Freio de Metas
  const metasAtivas = metas.filter((m) => m.ativo && m.valor > 0);
  const aporteNecessario = metasAtivas.reduce((sum, m) => {
    if (!m.prazo) return sum;
    const mesesRestantes = Math.max(
      1,
      Math.round(
        (new Date(m.prazo).getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24 * 30)
      )
    );
    return sum + (m.valor - m.acumulado) / mesesRestantes;
  }, 0);

  // FIX 3: usa média do saldo histórico em vez do saldo do mês atual (evita falso alarme no dia 1)
  const months6 = getLast6Months();
  const saldoMeses = months6.map((m) =>
    calcTotais(transacoes.filter((t) => t.data?.startsWith(m))).saldo
  );
  const mesesComMovimento = saldoMeses.filter((s, i) => {
    const m = months6[i];
    return transacoes.some((t) => t.data?.startsWith(m));
  });
  const saldoMedioHistorico = mesesComMovimento.length > 0
    ? mesesComMovimento.reduce((a, b) => a + b, 0) / mesesComMovimento.length
    : 0;
  // Capacidade de geração de caixa: máximo entre média histórica e (receita - custo essencial)
  const { rec: recAtual } = calcTotais(
    transacoes.filter((t) => t.data?.startsWith(new Date().toISOString().slice(0, 7)))
  );
  const capacidadeCaixa = Math.max(
    0,
    saldoMedioHistorico,
    recAtual > custoVidaEssencial ? recAtual - custoVidaEssencial : 0
  );
  const saldoLivre = capacidadeCaixa;

  const freioDeMetas =
    metasAtivas.length >= 3 && aporteNecessario > saldoLivre * 0.8
      ? {
          icon: "🚦",
          titulo: "Freio de Metas",
          desc: `Vocês têm ${metasAtivas.length} metas ativas. Com base na capacidade histórica de ${fmt(saldoLivre)}/mês, o aporte necessário de ${fmt(aporteNecessario)}/mês é muito alto. Considere pausar a meta de menor prioridade.`,
        }
      : null;

  // Diagnóstico de Reserva de Emergência
  // mesesReservaIdeal === 0 significa que o casal decidiu não focar em reserva agora.
  // O Consultor respeita essa decisão e para de cobrar.
  let reservaDiagnostico: {
    icon: string;
    titulo: string;
    desc: string;
    faltando: number;
    ideal: number;
    desativada?: boolean;
  } | null = null;

  if (mesesReservaIdeal === 0) {
    // Casal optou por não focar em reserva — Consultor não cobra, mas registra a intenção
    reservaDiagnostico = null;
  } else {
    const reservaIdeal = custoVidaEssencial * mesesReservaIdeal;
    const reservaFaltando = Math.max(0, reservaIdeal - reservaExistente);
    const precisaReserva = reservaIdeal > 0 && reservaExistente < reservaIdeal;

    // Texto consultivo varia conforme os meses escolhidos
    const descMeses: Record<number, string> = {
      3:  "3 meses (perfil acelerado). Ótimo para quem tem renda estável e quer acelerar os sonhos.",
      6:  "6 meses (perfil equilibrado). A recomendação padrão para a maioria dos casais.",
      12: "12 meses (perfil conservador). Ideal para autônomos ou quem valoriza máxima segurança.",
    };
    const descPerfil = descMeses[mesesReservaIdeal]
      ?? `${mesesReservaIdeal} meses de custo essencial guardados.`;

    if (precisaReserva) {
      reservaDiagnostico = {
        icon: "🛡️",
        titulo: "Reserva de Emergência",
        desc: `Meta de vocês: ${fmt(reservaIdeal)} — ${descPerfil} Faltam ${fmt(reservaFaltando)} para completar.`,
        faltando: reservaFaltando,
        ideal: reservaIdeal,
      };
    }
  }

  // Pendentes de inteligência (lançamentos sem classificação)
  const pendentes = transacoes.filter((t) => t.pendenteInteligencia).length;

  return {
    alertasComportamentais,
    freioDeMetas,
    reservaDiagnostico,
    pendentes,
    aporteNecessario,
    saldoLivre,
  };
}

/**
 * Calcula o Nível de Economia sugerido com base na renda, metas ativas e necessidade de reserva.
 * FIX 4: considera o deficit de Reserva de Emergência na equação — um casal sem reserva
 * não pode ser classificado como "Conforto" só porque não tem metas de luxo.
 */
export function calcNivelSugerido(
  recMedia: number,
  custoEssencial: number,
  metas: Meta[],
  reservaExistente = 0,
  reservaIdeal = 0
): { nivel: NivelEconomia; motivo: string } {
  const aporteNecessario = metas
    .filter((m) => m.ativo && m.prazo)
    .reduce((sum, m) => {
      const hoje = new Date();
      const meses = Math.max(
        1,
        Math.round(
          (new Date(m.prazo!).getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24 * 30)
        )
      );
      return sum + (m.valor - m.acumulado) / meses;
    }, 0);

  // Deficit da reserva diluído em 12 meses — segurança financeira é prioridade
  const deficitReserva = Math.max(0, reservaIdeal - reservaExistente);
  const aporteReserva  = deficitReserva / 12;

  const folga    = recMedia - custoEssencial - aporteNecessario - aporteReserva;
  const pctFolga = recMedia > 0 ? (folga / recMedia) * 100 : 0;

  if (pctFolga >= 30) return { nivel: "conforto",  motivo: "Vocês têm folga financeira confortável para seus objetivos." };
  if (pctFolga >= 15) return { nivel: "moderado",  motivo: "Com disciplina moderada, vocês alcançam as metas e completam a reserva no prazo." };
  return             { nivel: "agressivo", motivo: "Para bater as metas e construir a reserva de segurança no prazo, é necessário controle rigoroso." };
}
