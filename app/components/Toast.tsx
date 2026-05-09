"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

// ─── Types ──────────────────────────────────────────────────

export type ToastVariant = "success" | "error" | "info";

export interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
  duration: number; // ms
}

// ─── Singleton event bus ─────────────────────────────────────

type ToastListener = (toast: ToastItem) => void;
const listeners: Set<ToastListener> = new Set();

let idCounter = 0;

export function toast(
  message: string,
  variant: ToastVariant = "info",
  duration = 2800
) {
  const item: ToastItem = {
    id: `toast-${++idCounter}`,
    message,
    variant,
    duration,
  };
  listeners.forEach((fn) => fn(item));
}

// Convenience shortcuts
toast.success = (msg: string, duration?: number) =>
  toast(msg, "success", duration);
toast.error = (msg: string, duration?: number) =>
  toast(msg, "error", duration ?? 4000);
toast.info = (msg: string, duration?: number) =>
  toast(msg, "info", duration);

// ─── Individual toast element ─────────────────────────────────

function ToastEl({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const dismiss = useCallback(() => {
    setLeaving(true);
    setTimeout(() => onDismiss(item.id), 280);
  }, [item.id, onDismiss]);

  // Entrance
  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  // Auto-dismiss
  useEffect(() => {
    const t = setTimeout(dismiss, item.duration);
    return () => clearTimeout(t);
  }, [item.duration, dismiss]);

  const icons: Record<ToastVariant, React.ReactNode> = {
    success: <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0" />,
    error: <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />,
    info: <Info className="h-4 w-4 text-blue-400 flex-shrink-0" />,
  };

  const accent: Record<ToastVariant, string> = {
    success: "border-l-green-500",
    error: "border-l-red-500",
    info: "border-l-blue-500",
  };

  const progressColor: Record<ToastVariant, string> = {
    success: "bg-green-500",
    error: "bg-red-500",
    info: "bg-blue-500",
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className={`
        relative flex w-full max-w-[320px] items-start gap-3 overflow-hidden
        rounded-xl border-l-2 bg-zinc-900/95 px-4 py-3 shadow-2xl ring-1 ring-white/8
        backdrop-blur-md transition-all duration-280 ease-out
        ${accent[item.variant]}
        ${visible && !leaving
          ? "translate-y-0 opacity-100 scale-100"
          : "translate-y-2 opacity-0 scale-95"
        }
      `}
    >
      {/* Icon */}
      <div className="mt-0.5">{icons[item.variant]}</div>

      {/* Message */}
      <p className="flex-1 text-sm leading-snug text-zinc-200 font-medium">
        {item.message}
      </p>

      {/* Close */}
      <button
        type="button"
        onClick={dismiss}
        className="mt-0.5 flex-shrink-0 rounded text-zinc-500 transition-colors hover:text-zinc-300"
        aria-label="Dismiss notification"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      {/* Auto-dismiss progress bar */}
      <div
        className={`absolute bottom-0 left-0 h-[2px] ${progressColor[item.variant]} opacity-60`}
        style={{
          animation: `toast-progress ${item.duration}ms linear forwards`,
        }}
      />
    </div>
  );
}

// ─── Container (mount once in layout) ────────────────────────

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const listener: ToastListener = (item) => {
      setToasts((prev) => {
        // Cap at 5 to avoid overflow
        const next = [...prev, item];
        return next.length > 5 ? next.slice(next.length - 5) : next;
      });
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  if (toasts.length === 0) return null;

  return (
    <>
      <style>{`
        @keyframes toast-progress {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
      <div
        aria-label="Notifications"
        className="pointer-events-none fixed bottom-6 right-4 z-[9999] flex flex-col-reverse items-end gap-2"
      >
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto w-full">
            <ToastEl item={t} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </>
  );
}
