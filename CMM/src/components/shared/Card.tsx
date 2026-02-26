import { ReactNode } from "react";
import { clsx } from "clsx";

export const Card = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div
    className={clsx(
      "rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md",
      className
    )}
  >
    {children}
  </div>
);
