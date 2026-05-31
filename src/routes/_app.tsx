import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <AppHeader />
      <main className="pb-28 md:pb-12">
        <Outlet />
      </main>
    </div>
  );
}
