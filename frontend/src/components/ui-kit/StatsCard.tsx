import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatsCard({
  label, value, delta, icon: Icon, tone = "primary",
}: {
  label: string; value: string | number; delta?: string; icon: LucideIcon;
  tone?: "primary" | "success" | "warning" | "danger";
}) {
  const toneMap = {
    primary: "text-primary bg-primary/10 ring-primary/30",
    success: "text-success bg-success/10 ring-success/30",
    warning: "text-warning bg-warning/10 ring-warning/30",
    danger: "text-destructive bg-destructive/10 ring-destructive/30",
  } as const;
  return (
    <motion.div whileHover={{ y: -2 }} className="rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-lg hover:shadow-primary/5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
          {delta && <div className="mt-1 text-xs text-success">{delta}</div>}
        </div>
        <div className={cn("grid place-items-center w-10 h-10 rounded-lg ring-1", toneMap[tone])}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </motion.div>
  );
}