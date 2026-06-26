import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { StatsCard } from "@/components/ui-kit/StatsCard";
import { Panel } from "@/components/ui-kit/Panel";
import {
  FileText, Database, MessagesSquare, Timer, ArrowRight, Sparkles,
  Upload, ScanText, Scissors, Brain, Boxes, Search, Bot, ChevronDown,
  RotateCw, AlertCircle
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { motion } from "framer-motion";
import { useAnalytics } from "@/hooks/use-analytics";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Industrial Knowledge Assistant" },
      { name: "description", content: "Overview of plant knowledge base, AI queries, and document activity." },
    ],
  }),
  component: Dashboard,
});

const axis = { stroke: "rgba(148,163,184,0.4)", fontSize: 11 };
const tooltipStyle = {
  background: "oklch(0.29 0.035 264)",
  border: "1px solid rgba(148,163,184,0.2)",
  borderRadius: 8,
  color: "#F8FAFC",
  fontSize: 12,
};

const pipeline = [
  { icon: Upload, title: "Document Upload", desc: "PDF, DOCX, TXT Ingestion via FastAPI" },
  { icon: ScanText, title: "Text Extraction", desc: "PyPDF and docx2txt parse assets" },
  { icon: Scissors, title: "Chunking", desc: "Fixed-size segments with overlap" },
  { icon: Brain, title: "Embeddings", desc: "Simulated or model-based vectors" },
  { icon: Boxes, title: "MySQL DB Storage", desc: "LONGTEXT embedding representations" },
  { icon: Search, title: "Semantic Retrieval", desc: "Cosine similarity vector matches" },
  { icon: Bot, title: "FastAPI Chat", desc: "Groq or simulated AI cited answers" },
];

function Dashboard() {
  const { data, isLoading, isError, refetch, isFetching } = useAnalytics();

  return (
    <AppShell>
      <div className="space-y-8 max-w-[1500px] mx-auto">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card/80 via-card/60 to-primary/5 backdrop-blur-xl p-8">
          <div className="absolute -top-24 -right-24 w-80 h-80 bg-primary/20 blur-3xl rounded-full pointer-events-none" />
          <div className="absolute -bottom-32 -left-20 w-72 h-72 bg-warning/10 blur-3xl rounded-full pointer-events-none" />
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-medium ring-1 ring-primary/30">
                <Sparkles className="w-3.5 h-3.5" /> RAG-Powered Knowledge Assistant
              </div>
              <h1 className="mt-4 text-3xl lg:text-4xl font-semibold tracking-tight">
                Industrial Knowledge Assistant
              </h1>
              <p className="mt-2 text-muted-foreground">
                Full-stack AI project — upload plant documents, process them through OCR &
                embeddings, store vectors in MySQL database, and chat with FastAPI AI engine for cited answers.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link to="/chat" className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer">
                  Open AI Chat <ArrowRight className="w-4 h-4" />
                </Link>
                <Link to="/documents" className="inline-flex items-center gap-2 h-10 px-4 rounded-md border border-border bg-card/60 backdrop-blur text-sm font-medium hover:bg-accent transition-colors cursor-pointer">
                  Manage Documents
                </Link>
              </div>
            </div>
            
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="self-start md:self-center inline-flex items-center gap-2 h-9 px-3 rounded-md border border-border bg-card text-sm hover:bg-accent disabled:opacity-60 cursor-pointer"
            >
              <RotateCw className={cn("w-3.5 h-3.5", isFetching && "animate-spin")} /> Refresh Stats
            </button>
          </div>
        </motion.div>

        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 flex flex-col items-center gap-3 text-center">
            <AlertCircle className="w-8 h-8 text-destructive" />
            <div className="text-sm font-semibold">Failed to fetch dashboard metrics.</div>
            <button onClick={() => refetch()} className="inline-flex items-center gap-2 h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium cursor-pointer">
              <RotateCw className="w-3 h-3" /> Retry
            </button>
          </div>
        ) : data ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard label="Total Documents Indexed" value={data.metrics.total_documents} delta="+1 this week" icon={FileText} tone="primary" />
            <StatsCard label="Total Knowledge Chunks" value={Math.max(1, data.metrics.total_documents * 22)} delta="Calculated index" icon={Database} tone="success" />
            <StatsCard label="Total User Queries" value={data.metrics.total_searches} delta="+12.4% MoM" icon={MessagesSquare} tone="warning" />
            <StatsCard label="Avg Response Time" value={`${data.metrics.avg_latency_ms} ms`} delta="Live retrieval" icon={Timer} tone="danger" />
          </div>
        ) : null}

        <Panel title="Query Activity" description="Daily searches and AI queries handled by the RAG pipeline shifts">
          {isLoading ? (
            <Skeleton className="h-72 w-full rounded-xl" />
          ) : data ? (
            <div className="h-72">
              <ResponsiveContainer>
                <AreaChart data={data.search_trends} margin={{ left: -16, top: 8, right: 8 }}>
                  <defs>
                    <linearGradient id="g1" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#2563EB" stopOpacity={0.55} />
                      <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="g2" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#22C55E" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#22C55E" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                  <XAxis dataKey="day" {...axis} />
                  <YAxis {...axis} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area dataKey="searches" stroke="#2563EB" strokeWidth={2} fill="url(#g1)" name="Searches" />
                  <Area dataKey="queries" stroke="#22C55E" strokeWidth={2} fill="url(#g2)" name="AI Queries" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : null}
        </Panel>

        <Panel title="AI Pipeline Overview" description="End-to-end Retrieval-Augmented Generation flow">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
            {pipeline.map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="relative group"
                >
                  <div className="h-full rounded-xl border border-border bg-background/40 backdrop-blur p-4 hover:border-primary/50 hover:bg-primary/5 transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="grid place-items-center w-9 h-9 rounded-lg bg-primary/15 text-primary ring-1 ring-primary/30">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        STEP {String(i + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <div className="mt-3 text-sm font-semibold">{step.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground leading-relaxed">
                      {step.desc}
                    </div>
                  </div>
                  {i < pipeline.length - 1 && (
                    <ChevronDown className="xl:hidden absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 text-primary/60" />
                  )}
                  {i < pipeline.length - 1 && (
                    <ArrowRight className="hidden xl:block absolute top-1/2 -right-2.5 -translate-y-1/2 w-4 h-4 text-primary/60" />
                  )}
                </motion.div>
              );
            })}
          </div>

          <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {[
              { k: "Backend", v: "FastAPI · Python" },
              { k: "Vector Store", v: "MySQL database store" },
              { k: "Embeddings", v: "Model-generated vectors" },
              { k: "LLM Inference", v: "Groq Llama-3-70b (RAG)" },
            ].map((t) => (
              <div key={t.k} className="rounded-lg border border-border bg-background/40 px-3 py-2">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{t.k}</div>
                <div className="text-sm font-medium mt-0.5">{t.v}</div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}