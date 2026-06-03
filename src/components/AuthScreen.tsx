import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

const EMOJIS = ["😊","😎","🤩","😍","🥰","🤗","💪","🦁","🐻","🌟","🔥","💎","🌸","🎯","🚀","👑","🐺","🦋"];
const PALETTES = [
  { id: "violet", bg: "#1e1b4b", accent: "#818CF8", name: "Violeta" },
  { id: "emerald", bg: "#022c22", accent: "#34D399", name: "Esmeralda" },
  { id: "rose", bg: "#4c0519", accent: "#FB7185", name: "Rosa" },
  { id: "amber", bg: "#431407", accent: "#FBBF24", name: "Âmbar" },
  { id: "sky", bg: "#0c1a2e", accent: "#38BDF8", name: "Céu" },
];

export function AuthScreen() {
  const { register, login } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [pass2, setPass2] = useState("");
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("😊");
  const [palId, setPalId] = useState("violet");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const pal = PALETTES.find((p) => p.id === palId) || PALETTES[0];

  const handleLogin = async () => {
    if (!email || !pass) { setErr("Preencha todos os campos."); return; }
    setLoading(true); setErr("");
    try { await login(email, pass); }
    catch { setErr("Email ou senha incorretos."); setLoading(false); }
  };

  const handleReg = async () => {
    if (!name) { setErr("Digite seu nome."); return; }
    setLoading(true); setErr("");
    try { await register({ email, password: pass, name, emoji, paletteId: palId }); }
    catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      setErr(msg.includes("email-already-in-use") ? "Email já cadastrado." : msg);
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (!email || !pass) { setErr("Preencha email e senha."); return; }
    if (pass.length < 6) { setErr("Senha mínimo 6 caracteres."); return; }
    if (pass !== pass2) { setErr("Senhas não conferem."); return; }
    setErr(""); setStep(1);
  };

  return (
    <div className="min-h-screen hero-bg flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 -z-10 animate-breathe-soft"
        style={{ background: "var(--gradient-hero-warm)" }} />
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-[0.06] grain-overlay" />

      <div className="w-full max-w-[420px] relative z-10">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-4">
            <span className="size-8 rounded-full" style={{ background: "var(--gradient-champagne)" }} />
            <span className="font-serif text-[26px] text-foreground">Sincronia</span>
          </div>
          <p className="text-[13px] text-muted-foreground">Sistema Financeiro do Casal</p>
        </div>

        <div className="glass rounded-2xl p-7 border border-border">
          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-white/[0.04] rounded-xl mb-7">
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setErr(""); setStep(0); }}
                className={`flex-1 h-9 rounded-lg text-[13px] font-medium transition ${
                  mode === m
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "login" ? "Entrar" : "Criar conta"}
              </button>
            ))}
          </div>

          {/* Login */}
          {mode === "login" && (
            <div className="space-y-4">
              <Field label="Email">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full bg-white/[0.06] border border-border rounded-xl h-11 px-4 text-[14px] focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground" />
              </Field>
              <Field label="Senha">
                <input type="password" value={pass} onChange={(e) => setPass(e.target.value)}
                  placeholder="Sua senha"
                  className="w-full bg-white/[0.06] border border-border rounded-xl h-11 px-4 text-[14px] focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground" />
              </Field>
              {err && <p className="text-[12px] text-red-400">{err}</p>}
              <button onClick={handleLogin} disabled={loading}
                className="w-full h-11 rounded-xl bg-foreground text-background text-[14px] font-medium hover:opacity-90 transition disabled:opacity-40">
                {loading ? "Entrando…" : "Entrar →"}
              </button>
            </div>
          )}

          {/* Register Step 0 */}
          {mode === "register" && step === 0 && (
            <div className="space-y-4">
              <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden mb-2">
                <div className="h-full w-1/2 rounded-full" style={{ background: "var(--gradient-champagne)" }} />
              </div>
              <Field label="Email">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full bg-white/[0.06] border border-border rounded-xl h-11 px-4 text-[14px] focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground" />
              </Field>
              <Field label="Senha">
                <input type="password" value={pass} onChange={(e) => setPass(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full bg-white/[0.06] border border-border rounded-xl h-11 px-4 text-[14px] focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground" />
              </Field>
              <Field label="Confirmar senha">
                <input type="password" value={pass2} onChange={(e) => setPass2(e.target.value)}
                  placeholder="Repita a senha"
                  className="w-full bg-white/[0.06] border border-border rounded-xl h-11 px-4 text-[14px] focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground" />
              </Field>
              {err && <p className="text-[12px] text-red-400">{err}</p>}
              <button onClick={nextStep}
                className="w-full h-11 rounded-xl bg-foreground text-background text-[14px] font-medium hover:opacity-90 transition">
                Continuar →
              </button>
            </div>
          )}

          {/* Register Step 1 */}
          {mode === "register" && step === 1 && (
            <div className="space-y-5">
              <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden mb-2">
                <div className="h-full w-full rounded-full" style={{ background: "var(--gradient-champagne)" }} />
              </div>
              {/* Preview */}
              <div className="flex items-center gap-3 p-4 rounded-xl border border-border"
                style={{ background: `${pal.accent}10` }}>
                <div className="size-12 rounded-xl flex items-center justify-center text-2xl"
                  style={{ background: pal.bg, border: `2px solid ${pal.accent}` }}>{emoji}</div>
                <div>
                  <div className="font-medium" style={{ color: pal.accent }}>{name || "Seu nome"}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{pal.name}</div>
                </div>
              </div>

              <Field label="Como quer ser chamado(a)?">
                <input value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                  className="w-full bg-white/[0.06] border border-border rounded-xl h-11 px-4 text-[14px] focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground" />
              </Field>

              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3">Emoji</div>
                <div className="flex flex-wrap gap-2">
                  {EMOJIS.map((em) => (
                    <button key={em} onClick={() => setEmoji(em)}
                      className={`size-9 rounded-lg text-lg transition ${emoji === em ? "ring-2" : "border border-border hover:border-muted-foreground"}`}
                      style={emoji === em ? { border: `2px solid ${pal.accent}`, background: `${pal.accent}20`, outline: `2px solid ${pal.accent}`, outlineOffset: '1px' } : {}}>
                      {em}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3">Cor do perfil</div>
                <div className="flex gap-2 flex-wrap">
                  {PALETTES.map((p) => (
                    <button key={p.id} onClick={() => setPalId(p.id)}
                      className={`size-9 rounded-full transition ${palId === p.id ? "ring-2 ring-offset-2 ring-offset-background" : ""}`}
                      style={{ background: p.bg, border: `2px solid ${p.accent}` }}
                      title={p.name} />
                  ))}
                </div>
              </div>

              {err && <p className="text-[12px] text-red-400">{err}</p>}
              <div className="flex gap-3">
                <button onClick={() => setStep(0)}
                  className="h-11 px-5 rounded-xl border border-border text-[14px] text-muted-foreground hover:text-foreground transition">
                  ← Voltar
                </button>
                <button onClick={handleReg} disabled={loading}
                  className="flex-1 h-11 rounded-xl bg-foreground text-background text-[14px] font-medium hover:opacity-90 transition disabled:opacity-40">
                  {loading ? "Criando…" : "Criar conta ✓"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-2">{label}</div>
      {children}
    </label>
  );
}
