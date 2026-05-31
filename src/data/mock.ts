import casaImg from "@/assets/casa-propria.jpg";
import japaoImg from "@/assets/viagem-japao.jpg";
import reservaImg from "@/assets/reserva.jpg";
import yanAvatar from "@/assets/avatar-yan.jpg";
import naniAvatar from "@/assets/avatar-nani.jpg";

export const couple = {
  groupName: "Yan & Nani",
  since: "Janeiro 2024",
  currency: "BRL",
  members: [
    { id: "yan", name: "Yan", email: "yan@sincronia.app", avatar: yanAvatar, role: "Administrador" },
    { id: "nani", name: "Nani", email: "nani@sincronia.app", avatar: naniAvatar, role: "Co-administradora" },
  ],
};

export const period = {
  label: "Fevereiro 2026",
  short: "Fev · 2026",
};

export const summary = {
  netWorth: 42890.42,
  netWorthDeltaPct: 12.4,
  netWorthDeltaAbs: 4720,
  receitas: 18200.0,
  receitasDeltaPct: -4.2,
  despesas: 9412.58,
  despesasDeltaPct: -3.7,
  score: 94,
  scoreDelta: 1.6,
  insight:
    "Vocês economizaram R$ 562 em lazer este mês. Que tal antecipar uma parcela da Viagem ao Japão?",
  emotional: "Vocês estão construindo algo bonito.",
  healthCopy:
    "Saúde financeira em excelente. Vocês fecharam o mês com sobra suficiente para antecipar uma parcela de qualquer sonho ativo.",
};

// 12-month area chart series (saldo evolutivo)
export const evolution: { m: string; saldo: number; projecao: number }[] = [
  { m: "Mar", saldo: 21800, projecao: 21800 },
  { m: "Abr", saldo: 22950, projecao: 23100 },
  { m: "Mai", saldo: 24210, projecao: 24400 },
  { m: "Jun", saldo: 25840, projecao: 25900 },
  { m: "Jul", saldo: 27600, projecao: 27500 },
  { m: "Ago", saldo: 29100, projecao: 29200 },
  { m: "Set", saldo: 31250, projecao: 31100 },
  { m: "Out", saldo: 33010, projecao: 33400 },
  { m: "Nov", saldo: 35400, projecao: 35200 },
  { m: "Dez", saldo: 37820, projecao: 37700 },
  { m: "Jan", saldo: 40150, projecao: 40300 },
  { m: "Fev", saldo: 42890, projecao: 43100 },
];

export const sparkReceitas = [12, 14, 13, 16, 15, 18, 17, 19, 21, 20, 22, 23];
export const sparkDespesas = [10, 11, 13, 12, 14, 13, 12, 11, 10, 11, 10, 9];
export const sparkScore = [78, 80, 82, 81, 84, 86, 88, 89, 91, 92, 93, 94];

export const goals = [
  {
    id: "japao",
    title: "Viagem Japão",
    subtitle: "Tóquio · Kyoto · Outubro 2026",
    image: japaoImg,
    current: 18200,
    target: 26000,
    deadline: "Out 2026",
    feasibility: "viável",
    note: "Faltam R$ 7.800",
  },
  {
    id: "casa",
    title: "Casa Própria",
    subtitle: "Entrada · 20%",
    image: casaImg,
    current: 156400,
    target: 410000,
    deadline: "Dez 2028",
    feasibility: "no ritmo",
    note: "38% concluído",
  },
  {
    id: "reserva",
    title: "Reserva de Emergência",
    subtitle: "Objetivo · 6 meses",
    image: reservaImg,
    current: 15150,
    target: 18000,
    deadline: "Mar 2026",
    feasibility: "quase lá",
    note: "84% concluído",
  },
];

export type TxKind = "in" | "out";
export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  category: string;
  member: "yan" | "nani";
  amount: number;
  kind: TxKind;
}

export const transactions: Transaction[] = [
  { id: "t1", date: "2026-02-12", title: "Pão de Açúcar", category: "Mercado", member: "nani", amount: 342.9, kind: "out" },
  { id: "t2", date: "2026-02-12", title: "Netflix", category: "Lazer", member: "yan", amount: 55.9, kind: "out" },
  { id: "t3", date: "2026-02-10", title: "Salário Yan", category: "Receita fixa", member: "yan", amount: 9500, kind: "in" },
  { id: "t4", date: "2026-02-10", title: "Aluguel", category: "Casa", member: "nani", amount: 2400, kind: "out" },
  { id: "t5", date: "2026-02-09", title: "Uber para o aeroporto", category: "Transporte", member: "yan", amount: 78.4, kind: "out" },
  { id: "t6", date: "2026-02-08", title: "Freelance branding", category: "Receita variável", member: "nani", amount: 3200, kind: "in" },
  { id: "t7", date: "2026-02-07", title: "Farmácia", category: "Saúde", member: "nani", amount: 94.3, kind: "out" },
  { id: "t8", date: "2026-02-07", title: "Jantar Sole", category: "Restaurantes", member: "yan", amount: 340, kind: "out" },
  { id: "t9", date: "2026-02-05", title: "Spotify Família", category: "Lazer", member: "yan", amount: 34.9, kind: "out" },
  { id: "t10", date: "2026-02-04", title: "Mercado da semana", category: "Mercado", member: "nani", amount: 487.2, kind: "out" },
  { id: "t11", date: "2026-02-03", title: "Aporte Reserva", category: "Investimento", member: "yan", amount: 800, kind: "out" },
  { id: "t12", date: "2026-02-02", title: "Salário Nani", category: "Receita fixa", member: "nani", amount: 5500, kind: "in" },
];

export const timeline = [
  { id: "e1", who: "yan", text: "Yan adicionou R$ 300 à Casa Própria.", detail: "Vocês estão R$ 47.900 mais perto.", time: "há 2h" },
  { id: "e2", who: "nani", text: "Vocês fecharam fevereiro com R$ 8.767 de sobra.", detail: "Acima da média dos últimos 6 meses.", time: "há 6h" },
  { id: "e3", who: "nani", text: "Nani reduziu lazer em 15%.", detail: "R$ 412 redirecionados para a Viagem Japão.", time: "ontem" },
  { id: "e4", who: "yan", text: "A parceria está funcionando.", detail: "Score do casal subiu para 94/100.", time: "ontem" },
  { id: "e5", who: "yan", text: "Yan registrou Aporte Reserva R$ 800.", detail: "Faltam apenas R$ 2.850 para concluir.", time: "3 dias" },
  { id: "e6", who: "nani", text: "Nani adicionou Mercado da semana.", detail: "Categoria mercado está 6% abaixo do esperado.", time: "4 dias" },
];

export type NoteType = "anotacao" | "conta-pagar" | "a-receber" | "divida" | "lembrete";
export interface Note {
  id: string;
  type: NoteType;
  title: string;
  body: string;
  due?: string;
  amount?: number;
  author: "yan" | "nani";
}

export const notes: Note[] = [
  {
    id: "n1",
    type: "lembrete",
    title: "Resgatar passagem Chamonix",
    body: "Confirmar troca do cartão antes da terça.",
    author: "yan",
  },
  {
    id: "n2",
    type: "conta-pagar",
    title: "IPTU 2ª parcela",
    body: "Vence 18/02 · R$ 412,30",
    due: "18/02",
    amount: 412.3,
    author: "nani",
  },
  {
    id: "n3",
    type: "a-receber",
    title: "Restituição IR",
    body: "Previsão 22/03 · R$ 1.460,00",
    due: "22/03",
    amount: 1460,
    author: "yan",
  },
  {
    id: "n4",
    type: "anotacao",
    title: "Reorganizar o orçamento de lazer",
    body: "Conversamos no jantar — reduzir 15% e mover para Japão.",
    author: "nani",
  },
  {
    id: "n5",
    type: "divida",
    title: "Empréstimo do carro",
    body: "Faltam 4 parcelas · R$ 2.840 restantes.",
    author: "yan",
  },
  {
    id: "n6",
    type: "lembrete",
    title: "Aniversário Nani — 12/03",
    body: "Reservar restaurante até 28/02.",
    author: "yan",
  },
];

export const noteTypeLabel: Record<NoteType, string> = {
  anotacao: "Anotação",
  "conta-pagar": "Conta a pagar",
  "a-receber": "A receber",
  divida: "Dívida",
  lembrete: "Lembrete",
};

export function formatBRL(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatBRLShort(n: number): string {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
