"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/providers/theme-provider";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className={cn("flex flex-col items-center justify-center h-full select-none", className)}>
      <div className={cn("mb-6 p-6 rounded-2xl", isDark ? "bg-slate-800/50" : "bg-slate-100")}>
        <div className={cn("text-slate-400", isDark ? "text-slate-500" : "text-slate-400")}>
          {icon}
        </div>
      </div>
      <h3 className={cn("text-lg font-semibold mb-1", isDark ? "text-white" : "text-slate-900")}>
        {title}
      </h3>
      {description && (
        <p className={cn("text-sm text-center max-w-xs", isDark ? "text-slate-400" : "text-slate-500")}>
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
