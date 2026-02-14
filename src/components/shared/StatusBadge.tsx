import { clsx } from "clsx";

export const StatusBadge = ({ status }: { status: "Running" | "Stopped" | "Restarting" }) => {
  return (
    <span
      className={clsx(
        "rounded-full px-3 py-1 text-xs font-semibold",
        status === "Running" && "bg-emerald-50 text-emerald-700",
        status === "Stopped" && "bg-rose-50 text-rose-700",
        status === "Restarting" && "bg-amber-50 text-amber-700"
      )}
    >
      {status}
    </span>
  );
};
