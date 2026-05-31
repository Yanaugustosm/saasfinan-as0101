interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center animate-fade-up">
      {/* Ícone com halo champagne */}
      <div className="relative mb-6">
        <div
          className="absolute inset-0 rounded-full blur-2xl opacity-20"
          style={{ background: "var(--gradient-champagne)", transform: "scale(1.8)" }}
        />
        <div className="relative size-20 rounded-full glass flex items-center justify-center text-4xl select-none">
          {icon}
        </div>
      </div>

      {/* Texto */}
      <h3 className="font-serif italic text-[20px] text-foreground/80 leading-snug max-w-xs">
        {title}
      </h3>
      <p className="mt-3 text-[13.5px] text-muted-foreground leading-relaxed max-w-sm">
        {description}
      </p>

      {/* CTA opcional */}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

// Variantes pré-configuradas por página
export const EmptyStates = {
  lancamentos: (onAdd: () => void) => (
    <EmptyState
      icon="📋"
      title="Nenhum lançamento este mês."
      description="Cada registro conta uma parte da história financeira de vocês. Comece adicionando a primeira entrada ou despesa do mês."
      action={
        <button
          onClick={onAdd}
          className="h-10 px-5 rounded-full bg-foreground text-background text-[13px] font-medium hover:opacity-90 transition"
        >
          + Primeiro lançamento
        </button>
      }
    />
  ),

  sonhos: (onAdd: () => void) => (
    <EmptyState
      icon="✨"
      title="Os sonhos de vocês ainda não foram escritos."
      description="Todo futuro começa com um desejo. Adicione o primeiro sonho do casal e comecem a construir o caminho juntos."
      action={
        <button
          onClick={onAdd}
          className="h-10 px-5 rounded-full bg-foreground text-background text-[13px] font-medium hover:opacity-90 transition"
        >
          + Primeiro sonho
        </button>
      }
    />
  ),

  notas: (onAdd: () => void) => (
    <EmptyState
      icon="📝"
      title="Nenhum compromisso registrado."
      description="Guardem aqui contas a pagar, lembretes e notas financeiras importantes para nunca esquecer nada que importa."
      action={
        <button
          onClick={onAdd}
          className="h-10 px-5 rounded-full bg-foreground text-background text-[13px] font-medium hover:opacity-90 transition"
        >
          + Primeiro compromisso
        </button>
      }
    />
  ),
};
