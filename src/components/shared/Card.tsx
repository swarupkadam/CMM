import { ReactNode } from "react";
import { clsx } from "clsx";

export const Card = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div className={clsx("rounded-xl border border-slate-200 bg-white p-6 shadow-sm", className)}>
    {children}
  </div>
);
