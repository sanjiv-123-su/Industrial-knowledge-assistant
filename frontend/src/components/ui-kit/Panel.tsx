import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Panel({
  title, description, action, children, className,
}: {
  title?: string; description?: string; action?: ReactNode; children: ReactNode; className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-border bg-card", className)}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-4 px-5 pt-5">
          <div>
            {title && <h3 className="text-sm font-semibold">{title}</h3>}
            {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
          </div>
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}