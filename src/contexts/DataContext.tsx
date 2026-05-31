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
  return { rec, des, saldo: rec - des };
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

  const savingsRate = rec > 0 ? (saldo / rec) * 100 : 0;
  const today = nowDate();
  const overdueCount = (notas || []).filter(
    (n) => ["conta", "divida"].includes(n.tipo) && n.vencimento && n.vencimento < today && !n.pago
  ).length;
  const metasAtingidas = (metas || []).filter((m) => m.acumulado >= m.valor).length;
  const last3 = monthData.slice(-3);
  const avgDes = last3.reduce((s, m) => s + m.des, 0) / 3 || 1;
  const desTrend = last3.length > 1 ? ((last3[2].des - last3[0].des) / avgDes) * 100 : 0;

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
