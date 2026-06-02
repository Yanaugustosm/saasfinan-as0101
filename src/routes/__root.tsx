import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect } from "react";
import appCss from "../styles.css?url";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { DataProvider } from "@/contexts/DataContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { AuthScreen } from "@/components/AuthScreen";
import { GroupSetup } from "@/components/GroupSetup";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link to="/" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">Something went wrong on our end.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button onClick={() => { router.invalidate(); reset(); }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
            Try again
          </button>
          <a href="/" className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent">
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "Sincronia — Finanças do Casal" },
      { name: "description", content: "Sistema financeiro compartilhado para casais — controle de receitas, despesas, metas e notas em tempo real." },
      { name: "author", content: "Sincronia" },
      { property: "og:title", content: "Sincronia — Finanças do Casal" },
      { property: "og:description", content: "Construa um futuro juntos com inteligência financeira." },
      { property: "og:type", content: "website" },
      // PWA — esconde barra do navegador ao abrir via ícone na tela inicial
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "Sincronia" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "theme-color", content: "#111111" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "stylesheet", href: "https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function SuspendedScreen() {
  const { logout } = useAuth();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: "#090909" }}>
      {/* subtle grid */}
      <div className="pointer-events-none fixed inset-0 opacity-[0.025]"
        style={{ backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)", backgroundSize: "48px 48px" }} />
      <div className="relative text-center max-w-sm">
        <div className="size-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <i className="ti ti-ban text-[32px]" style={{ color: "#f87171" }} />
        </div>
        <h1 className="text-[22px] font-bold text-white leading-tight mb-3">Conta suspensa</h1>
        <p className="text-[14px] leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>
          Sua conta foi temporariamente suspensa pelo administrador.<br />
          Entre em contato com o suporte para mais informações.
        </p>
        <button onClick={logout}
          className="mt-8 h-10 px-6 rounded-xl text-[13px] border transition"
          style={{ borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)" }}
          onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
          onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}
        >
          Sair da conta
        </button>
        <div className="mt-10 text-[11px] tracking-[0.2em] uppercase" style={{ color: "rgba(255,255,255,0.12)" }}>Sincronia</div>
      </div>
    </div>
  );
}

function AppGate() {
  const { user, profile, group, loading } = useAuth();
  const pathname = useRouterState({ select: s => s.location.pathname });

  // ── Bypass: Admin Portal cuida da sua própria autenticação ──────────────────
  if (pathname.startsWith("/admin")) return <Outlet />;

  if (loading) {
    return (
      <div className="min-h-screen hero-bg flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center gap-2.5 mb-6">
            <span className="size-7 rounded-full" style={{ background: "var(--gradient-champagne)" }} />
            <span className="font-serif text-[20px] text-foreground">Sincronia</span>
          </div>
          <div className="flex gap-1 justify-center">
            {[0, 1, 2].map((i) => (
              <div key={i} className="size-1.5 rounded-full bg-champagne/60 animate-pulse"
                style={{ animationDelay: `${i * 150}ms` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user || !profile) return <AuthScreen />;
  if (profile.suspended && !profile.isMaster) return <SuspendedScreen />;
  if (!group)              return <GroupSetup />;

  return (
    <DataProvider groupId={group.id}>
      <Outlet />
    </DataProvider>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  // Registra o Service Worker — obrigatório para o Chrome Android
  // aceitar a instalação como PWA em tela cheia (sem barra de navegação)
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(console.error);
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <AppGate />
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
