/**
 * AppHeader — v4 "Apple Immersive"
 * - Header transparente no topo, glass ao rolar
 * - Botão + Lançar como frosted-glass sutil (não compete com o Hero CTA)
 */

import { Link, useLocation } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { LancamentoModal } from "@/components/LancamentoModal";

const NAV = [
  { to: "/",            label: "Início",      icon: "⌂" },
  { to: "/resumo",      label: "Resumo",      icon: "▦" },
  { to: "/lancamentos", label: "Lançamentos", icon: "↕" },
  { to: "/sonhos",      label: "Sonhos",      icon: "✦" },
  { to: "/notas",       label: "Notas",       icon: "◈" },
  { to: "/casal",       label: "Casal",       icon: "◎" },
] as const;

export function AppHeader() {
  const { pathname }        = useLocation();
  const { group }           = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [scrolled, setScrolled]   = useState(false);

  /* Detecta scroll para ativar o efeito glass */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const members = Object.values(group?.memberProfiles ?? {}).slice(0, 2);

  return (
    <>
      {/* ═══════════════════════ HEADER BAR ═══════════════════════ */}
      <header
        className="sticky top-0 z-40 transition-all duration-300"
        style={{
          backdropFilter: scrolled ? "blur(20px)" : "blur(0px)",
          WebkitBackdropFilter: scrolled ? "blur(20px)" : "blur(0px)",
          backgroundColor: scrolled ? "rgba(10,10,12,0.82)" : "transparent",
          borderBottom: scrolled ? "1px solid rgba(255,255,255,0.06)" : "1px solid transparent",
        }}
      >
        <div className="mx-auto max-w-[1240px] px-5 lg:px-8 h-16 flex items-center gap-4">

          {/* 1 ─ LOGO */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
            <span
              className="size-7 rounded-full transition-transform group-hover:scale-110"
              style={{ background: "var(--gradient-champagne)" }}
            />
            <span className="font-serif text-[19px] leading-none text-foreground">
              Sincronia
            </span>
          </Link>

          {/* 2 ─ NAV CENTRAL — visível apenas em md+ */}
          <nav className="hidden md:flex flex-1 items-center justify-center gap-0.5">
            {NAV.map(({ to, label }) => {
              const active = pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className={`
                    relative px-4 h-9 inline-flex items-center text-[13.5px]
                    rounded-full transition-all duration-200
                    ${active
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground/80"
                    }
                  `}
                >
                  {label}
                  {active && (
                    <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 size-1 rounded-full bg-champagne" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* 3 ─ DIREITA */}
          <div className="flex items-center gap-3 shrink-0 ml-auto md:ml-0">

            {/* Avatares sobrepostos */}
            {members.length > 0 && (
              <div className="flex items-center -space-x-2">
                {members.map((m) => (
                  <MemberBubble
                    key={m.uid}
                    name={m.name}
                    emoji={m.emoji}
                    photoURL={(m as any).photoURL}
                    size={28}
                  />
                ))}
              </div>
            )}

            {/* Botão SECUNDÁRIO — círculo no mobile, pílula no desktop */}
            <button
              id="btn-quick-add"
              onClick={() => setShowModal(true)}
              className="size-9 md:w-auto md:pl-3.5 md:pr-4 rounded-full text-[13px] font-medium flex items-center justify-center gap-1.5 transition-all duration-200 active:scale-95 shrink-0"
              style={{
                backgroundColor: "rgba(255,255,255,0.09)",
                border: "1px solid rgba(255,255,255,0.13)",
                color: "rgba(255,255,255,0.82)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.14)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.22)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.09)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.13)";
              }}
            >
              <span className="text-[18px] leading-none font-light">+</span>
              <span className="hidden md:inline">Lançar</span>
            </button>
          </div>
        </div>
      </header>

      {/* ═══════════════════════ MODAL PREMIUM ═══════════════════════ */}
      <LancamentoModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />

      {/* ═══════════════════════ MOBILE BOTTOM NAV ═══════════════════════ */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/90 backdrop-blur-xl safe-area-inset-bottom">
        <div className="flex justify-around items-center h-16">
          {NAV.map(({ to, label, icon }) => {
            const active = pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                  active ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                <span className={`text-[17px] leading-none transition-transform ${active ? "scale-110" : ""}`}>
                  {icon}
                </span>
                <span className="text-[10px] font-medium tracking-wide leading-none mt-0.5">
                  {label === "Lançamentos" ? "Lançar" : label}
                </span>
                <span className={`size-1 rounded-full mt-0.5 transition-all ${active ? "bg-champagne" : "bg-transparent"}`} />
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

/* ═══ MemberBubble ═══════════════════════════════════════════ */
function MemberBubble({
  name, emoji, photoURL, size = 30,
}: {
  name: string; emoji: string; photoURL?: string; size?: number;
}) {
  return photoURL ? (
    <img
      src={photoURL} alt={name} title={name}
      width={size} height={size}
      className="rounded-full object-cover ring-2 ring-background"
      style={{ width: size, height: size }}
    />
  ) : (
    <div
      title={name}
      className="rounded-full bg-surface flex items-center justify-center select-none ring-2 ring-background"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.52), lineHeight: 1 }}
    >
      {emoji}
    </div>
  );
}
