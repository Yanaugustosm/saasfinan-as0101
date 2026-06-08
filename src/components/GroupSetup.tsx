import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

export function GroupSetup() {
  const { profile, createGroup, joinGroup, logout } = useAuth();
  const [tab, setTab] = useState<"criar" | "entrar">("criar");
  const [gname, setGname] = useState("");
  const [gemoji, setGemoji] = useState("🏠");
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!gname) { setErr("Digite o nome do grupo."); return; }
    setLoading(true); setErr("");
    try { await createGroup({ groupName: gname, groupEmoji: gemoji }); }
    catch (e: unknown) { setErr(e instanceof Error ? e.message : "Erro"); setLoading(false); }
  };

  const handleJoin = async () => {
    if (code.length < 4) { setErr("Digite o código."); return; }
    setLoading(true); setErr("");
    try { await joinGroup(code); }
    catch (e: unknown) { setErr(e instanceof Error ? e.message : "Erro"); setLoading(false); }
  };

  return (
    <div className="min-h-screen hero-bg flex items-center justify-center px-4 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 animate-breathe-soft"
        style={{ background: "var(--gradient-hero-warm)" }} />
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-[0.06] grain-overlay" />

      <div className="w-full max-w-[420px] relative z-10">
        <div className="text-center mb-10">
          <div className="text-4xl mb-4">{profile?.emoji}</div>
          <h1 className="font-serif text-[24px] text-foreground">Olá, {profile?.name}!</h1>
          <p className="text-[13px] text-muted-foreground mt-2">
            Crie seu grupo familiar ou entre em um existente
          </p>
        </div>

        <div className="glass rounded-2xl p-7 border border-border">
          <div className="flex gap-1 p-1 bg-white/[0.04] rounded-xl mb-7">
            {(["criar", "entrar"] as const).map((t) => (
              <button key={t} onClick={() => { setTab(t); setErr(""); }}
                className={`flex-1 h-9 rounded-lg text-[13px] font-medium transition ${
                  tab === t ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                }`}>
                {t === "criar" ? "🏠 Criar grupo" : "🔑 Entrar com código"}
              </button>
            ))}
          </div>

          {tab === "criar" && (
            <div className="space-y-5">
              <label className="block">
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-2">Nome do grupo</div>
                <input value={gname} onChange={(e) => setGname(e.target.value)}
                  placeholder="Ex: Família Silva, Nós Dois..."
                  className="w-full bg-white/[0.06] border border-border rounded-xl h-11 px-4 text-[14px] focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground" />
              </label>
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3">Emoji do grupo</div>
                <div className="flex flex-wrap gap-2">
                  {["🏠","💑","👨‍👩‍👧","🌟","💰","🚀","🎯","💎","🌿","🔥"].map((em) => (
                    <button key={em} onClick={() => setGemoji(em)}
                      className={`size-10 rounded-xl text-xl transition border ${
                        gemoji === em ? "border-champagne bg-white/[0.08]" : "border-border hover:border-muted-foreground"
                      }`}>{em}</button>
                  ))}
                </div>
              </div>
              {err && <p className="text-[12px] text-red-400">{err}</p>}
              <button onClick={handleCreate} disabled={loading}
                className="w-full h-11 rounded-xl bg-foreground text-background text-[14px] font-medium hover:opacity-90 transition disabled:opacity-40">
                {loading ? "Criando…" : "Criar grupo ✓"}
              </button>
            </div>
          )}

          {tab === "entrar" && (
            <div className="space-y-5">
              <label className="block">
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-2">Código de convite</div>
                <input value={code} onChange={(e) => setCode(e.target.value.replace(/\s+/g, "").toUpperCase())}
                  placeholder="AB12CD" maxLength={8}
                  className="w-full bg-white/[0.06] border border-border rounded-xl h-14 px-4 text-[22px] tracking-[0.4em] text-center font-mono focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground placeholder:tracking-normal placeholder:text-[14px]" />
              </label>
              <p className="text-[12px] text-muted-foreground">Peça o código de 6 letras para quem criou o grupo.</p>
              {err && <p className="text-[12px] text-red-400">{err}</p>}
              <button onClick={handleJoin} disabled={loading}
                className="w-full h-11 rounded-xl bg-foreground text-background text-[14px] font-medium hover:opacity-90 transition disabled:opacity-40">
                {loading ? "Entrando…" : "Entrar no grupo →"}
              </button>
            </div>
          )}
        </div>

        <button onClick={logout}
          className="w-full mt-4 h-10 text-[12px] text-muted-foreground hover:text-foreground transition">
          Sair da conta
        </button>
      </div>
    </div>
  );
}
