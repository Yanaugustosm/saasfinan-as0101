import { createContext, useContext, useState, useCallback, useRef } from "react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastCtx {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastCtx>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const toast = useCallback((message: string, type: ToastType = "success") => {
    const id = `t${++counter.current}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast Container — canto inferior esquerdo, discreto */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[999] flex flex-col gap-2 items-center pointer-events-none">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast }: { toast: Toast }) {
  const icons: Record<ToastType, string> = {
    success: "✓",
    error: "✕",
    info: "·",
  };
  const colors: Record<ToastType, string> = {
    success: "oklch(0.82 0.07 75 / 0.15)",   // champagne suave
    error: "oklch(0.62 0.18 25 / 0.15)",      // vermelho suave
    info: "oklch(1 0 0 / 0.06)",              // neutro
  };
  const dotColors: Record<ToastType, string> = {
    success: "var(--champagne)",
    error: "var(--negative)",
    info: "var(--muted-foreground)",
  };

  return (
    <div
      className="pointer-events-auto animate-fade-up flex items-center gap-3 px-4 py-3 rounded-2xl border border-white/[0.08] backdrop-blur-xl shadow-[0_8px_32px_-8px_rgba(0,0,0,0.6)]"
      style={{ background: `oklch(0.18 0.006 60 / 0.92)` }}
    >
      {/* Dot colorido */}
      <span
        className="size-1.5 rounded-full shrink-0"
        style={{ background: dotColors[toast.type] }}
      />
      {/* Ícone */}
      <span
        className="text-[13px] font-medium"
        style={{ color: dotColors[toast.type] }}
      >
        {icons[toast.type]}
      </span>
      {/* Mensagem */}
      <span className="text-[13.5px] text-foreground/90 font-normal">
        {toast.message}
      </span>
    </div>
  );
}
