import { useEffect } from "react";
import { clsx } from "clsx";

export type Toast = {
  id: string;
  title: string;
  description?: string;
  variant?: "success" | "info";
};

export const ToastContainer = ({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) => {
  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map((toast) =>
      setTimeout(() => onDismiss(toast.id), 3000)
    );
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [toasts, onDismiss]);

  return (
    <div className="fixed right-6 top-6 z-50 space-y-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={clsx(
            "w-72 rounded-2xl border px-4 py-3 shadow-lg",
            toast.variant === "success"
              ? "border-emerald-200 bg-emerald-50"
              : "border-gray-200 bg-white"
          )}
        >
          <p className="text-sm font-semibold text-gray-800">{toast.title}</p>
          {toast.description && (
            <p className="mt-1 text-xs text-gray-500">{toast.description}</p>
          )}
        </div>
      ))}
    </div>
  );
};
