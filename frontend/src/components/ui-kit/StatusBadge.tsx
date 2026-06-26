import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: "processed" | "processing" | "failed" | "queued" }) {
  const map = {
    processed: { label: "Processed", cls: "bg-success/15 text-success ring-success/30" },
    processing: { label: "Processing", cls: "bg-warning/15 text-warning ring-warning/30" },
    queued: { label: "Queued", cls: "bg-muted text-muted-foreground ring-border" },
    failed: { label: "Failed", cls: "bg-destructive/15 text-destructive ring-destructive/30" },
  } as const;
  const { label, cls } = map[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1", cls)}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}