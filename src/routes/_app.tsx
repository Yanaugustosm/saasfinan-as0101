import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";
import { AppHeader } from "@/components/AppHeader";
import { AuditorPerfil } from "@/components/AuditorPerfil";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { group, loading } = useAuth();

  // Onboarding obrigatório: casal no grupo mas sem perfil configurado
  const precisaOnboarding = !loading && group !== null && !group.nivelEconomia;

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <AppHeader />
      <main className="pb-28 md:pb-12">
        <Outlet />
      </main>

      {/* Onboarding Global — intercepta o primeiro acesso ao sistema */}
      {precisaOnboarding && (
        <AuditorPerfil
          isOpen={true}
          onClose={() => {/* bloqueado — isMandatory impede o fechamento */}}
          isMandatory={true}
        />
      )}
    </div>
  );
}
