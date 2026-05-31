import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useData, fmt } from "@/contexts/DataContext";
import type { Nota } from "@/contexts/DataContext";
import { EmptyStates } from "@/components/EmptyState";
import { useToast } from "@/contexts/ToastContext";

export const Route = createFileRoute("/_app/notas")({
  head: () => ({
    meta: [
      { title: "Notas · Sincronia" },
      { name: "description", content: "Lembretes, contas a pagar e a receber compartilhados entre o casal." },
      { property: "og:title", content: "Notas e lembretes · Sincronia" },
      { property: "og:description", content: "Tudo que vocês precisam lembrar, em um só lugar." },
    ],
  }),
  component: NotasPage,
});

type NoteType = Nota["tipo"];

const TYPES: { id: "all" | NoteType; label: string }[] = [
  { id: "all", label: "Todas" },
  { id: "nota", label: "Anotação" },
  { id: "conta", label: "Conta a pagar" },
  { id: "receber", label: "A receber" },
  { id: "divida", label: "Dívida" },
  { id: "lembrete", label: "Lembrete" },
];

const noteTypeLabel: Record<NoteType, string> = {
  nota: "Anotação",
  conta: "Conta a pagar",
  receber: "A receber",
  divida: "Dívida",
  lembrete: "Lembrete",
};

const accent: Record<NoteType, string> = {
  nota: "oklch(0.82 0.07 75)",
  conta: "oklch(0.7 0.16 28)",
  receber: "oklch(0.78 0.12 145)",
  divida: "oklch(0.72 0.14 18)",
  lembrete: "oklch(0.78 0.05 80)",
};

function NotasPage() {
  const { user, group } = useAuth();
  const { notas, addNota, updateNota, deleteNota, togglePago } = useData();
  const { toast } = useToast();
  const members = group?.memberProfiles ?? {};

  const [tab, setTab] = useState<"all" | NoteType>("all");
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const blank = { titulo: "", body: "", tipo: "nota" as NoteType, valor: "", vencimento: "" };
  const [form, setForm] = useState(blank);
  const sf = (k: keyof typeof blank) => (v: string) => setForm((p) => ({ ...p, [k]: v }));

  const filtered = tab === "all" ? notas : notas.filter((n) => n.tipo === tab);

  const openEdit = (n: Nota) => {
    setForm({ titulo: n.titulo, body: n.descricao ?? "", tipo: n.tipo, valor: n.valor ? String(n.valor) : "", vencimento: n.vencimento ?? "" });
    setEditId(n.id); setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.titulo || !user) return;
    setSaving(true);
    try {
      const payload = {
        titulo: form.titulo,
        descricao: form.body,
        tipo: form.tipo,
        ...(form.valor ? { valor: parseFloat(form.valor) } : {}),
        ...(form.vencimento ? { vencimento: form.vencimento } : {}),
        pago: false,
      };
      if (editId) { await updateNota(editId, payload); toast("Nota atualizada"); }
      else { await addNota(payload as Omit<Nota, "id" | "groupId" | "userId">, user.uid); toast("Nota salva com sucesso"); }
      setShowModal(false); setForm(blank); setEditId(null);
    } finally { setSaving(false); }
  };

  return (
    <div className="hero-bg">
      <div className="mx-auto max-w-[1100px] px-5 lg:px-8 pt-10 lg:pt-14 pb-20">
        <div className="text-[11.5px] uppercase tracking-[0.18em] text-muted-foreground">
          Notas &amp; lembretes
        </div>

        <div className="mt-5 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <h1 className="font-serif text-[32px] sm:text-[40px] leading-[1.05] max-w-xl">
            <em className="not-italic">Tudo que vocês precisam</em>
            <br />
            <span className="italic text-muted-foreground">lembrar.</span>
          </h1>
          <button
            onClick={() => { setShowModal(true); setForm(blank); setEditId(null); }}
            className="h-10 px-4 rounded-full border border-border text-[13px] text-foreground hover:bg-white/[0.04] transition self-start"
          >
            + Nova nota
          </button>
        </div>

        <div className="mt-8 flex flex-wrap gap-1.5">
          {TYPES.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`h-9 px-3.5 rounded-full text-[12.5px] transition ${
                tab === t.id ? "bg-white/[0.08] text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.length === 0 && EmptyStates.notas(() => { setShowModal(true); setForm(blank); setEditId(null); })}
          {filtered.map((n) => {
            const author = members[n.userId];
            return (
              <article key={n.id} className={`glass rounded-2xl p-5 hover:bg-white/[0.02] transition group ${n.pago ? "opacity-60" : ""}`}>
                <div className="flex items-center justify-between">
                  <span
                    className="inline-flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.18em]"
                    style={{ color: accent[n.tipo] }}
                  >
                    <span className="size-1 rounded-full" style={{ background: accent[n.tipo] }} />
                    {noteTypeLabel[n.tipo]}
                  </span>
                  <div className="flex items-center gap-2">
                    {n.vencimento && (
                      <span className="text-[11.5px] text-muted-foreground">vence {n.vencimento}</span>
                    )}
                    {["conta", "divida", "receber"].includes(n.tipo) && (
                      <button
                        onClick={() => togglePago(n.id, n.pago ?? false)}
                        className={`text-[11px] px-2 py-0.5 rounded-full border transition ${
                          n.pago ? "border-green-500/30 text-green-400 bg-green-500/10" : "border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {n.pago ? "✓ Pago" : "Pagar"}
                      </button>
                    )}
                  </div>
                </div>
                <h3 className="mt-3 text-[16px] text-foreground">{n.titulo}</h3>
                {n.descricao && (
                  <p className="mt-1.5 text-[13px] text-muted-foreground leading-relaxed">{n.descricao}</p>
                )}
                <div className="mt-5 flex items-center justify-between text-[11.5px] text-muted-foreground">
                  <div className="flex gap-3">
                    <span>por {author?.name ?? "você"}</span>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                      <button onClick={() => openEdit(n)} className="hover:text-foreground">Editar</button>
                      <button onClick={() => { if (confirm("Excluir?")) deleteNota(n.id); }} className="hover:text-red-400">Excluir</button>
                    </div>
                  </div>
                  {n.valor && (
                    <span className="tabular text-foreground">{fmt(n.valor)}</span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="glass rounded-2xl p-6 w-full max-w-md border border-border animate-fade-up">
            <h2 className="font-serif text-[20px] mb-5">{editId ? "Editar Nota" : "Nova Nota"}</h2>
            <div className="space-y-4">
              <F label="Título *">
                <input value={form.titulo} onChange={(e) => sf("titulo")(e.target.value)}
                  placeholder="Ex: IPTU 2ª parcela" className="inp" />
              </F>
              <F label="Descrição">
                <textarea value={form.body} onChange={(e) => sf("body")(e.target.value)}
                  placeholder="Detalhes..." className="inp" style={{ height: "80px", paddingTop: "12px" }} />
              </F>
              <F label="Tipo">
                <select value={form.tipo} onChange={(e) => sf("tipo")(e.target.value)} className="inp">
                  {TYPES.filter((t) => t.id !== "all").map((t) => (
                    <option key={t.id} value={t.id} className="bg-background">{t.label}</option>
                  ))}
                </select>
              </F>
              <div className="grid grid-cols-2 gap-3">
                <F label="Valor">
                  <input type="number" value={form.valor} onChange={(e) => sf("valor")(e.target.value)} placeholder="R$" className="inp" />
                </F>
                <F label="Vencimento">
                  <input type="date" value={form.vencimento} onChange={(e) => sf("vencimento")(e.target.value)} className="inp" />
                </F>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowModal(false); setEditId(null); setForm(blank); }}
                className="flex-1 h-11 rounded-xl border border-border text-[14px] text-muted-foreground hover:text-foreground transition">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={!form.titulo || saving}
                className="flex-1 h-11 rounded-xl bg-foreground text-background text-[14px] font-medium hover:opacity-90 transition disabled:opacity-40">
                {saving ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`.inp{width:100%;background:oklch(1 0 0/0.06);border:1px solid var(--color-border);border-radius:0.75rem;min-height:2.75rem;padding:0 1rem;font-size:14px;color:var(--color-foreground);outline:none;}`}</style>
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-2">{label}</div>
      {children}
    </label>
  );
}
