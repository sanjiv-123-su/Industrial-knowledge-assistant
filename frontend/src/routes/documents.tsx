import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { Panel } from "@/components/ui-kit/Panel";
import { StatusBadge } from "@/components/ui-kit/StatusBadge";
import {
  UploadCloud,
  Search,
  RefreshCw,
  Trash2,
  Eye,
  FileText,
  Filter,
  X,
  AlertCircle,
  Loader2,
  RotateCw,
  Inbox,
} from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  useDeleteDocument,
  useDocument,
  useDocuments,
  useReindexDocument,
  useUploadDocument,
} from "@/hooks/use-documents";
import { ACCEPTED_EXT, MAX_FILE_SIZE, validateFile, type DocumentResponse } from "@/lib/api";
import type { UploadProgress } from "@/types/document";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/documents")({
  head: () => ({
    meta: [
      { title: "Document Center — Industrial Knowledge Assistant" },
      { name: "description", content: "Upload, process, and manage plant documents." },
    ],
  }),
  component: DocumentsPage,
});

function formatBytes(n?: number) {
  if (!n && n !== 0) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
  } catch { return iso; }
}

type LocalDocStatus = "processed" | "processing" | "failed" | "queued";

function mapStatus(status: "Processing" | "Indexed" | "Failed"): LocalDocStatus {
  if (status === "Indexed") return "processed";
  if (status === "Failed") return "failed";
  return "processing";
}

function DocumentsPage() {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<"All" | LocalDocStatus>("All");
  const [viewId, setViewId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<DocumentResponse | null>(null);
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const filesRef = useRef<Map<string, File>>(new Map());

  // Ingestion Modal States
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDept, setUploadDept] = useState("Blast Furnace");
  const [uploadVer, setUploadVer] = useState("1.0");
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);

  const { data: docs, isLoading, isError, refetch, isFetching } = useDocuments();
  const uploadMut = useUploadDocument();
  const deleteMut = useDeleteDocument();
  const reindexMut = useReindexDocument();
  const viewQuery = useDocument(viewId);

  const types = useMemo(
    () => ["All", ...Array.from(new Set((docs ?? []).map((d) => d.department)))],
    [docs],
  );

  const filtered = useMemo(() => {
    const list = docs ?? [];
    return list.filter(
      (d) =>
        (typeFilter === "All" || d.department === typeFilter) &&
        (statusFilter === "All" || mapStatus(d.status) === statusFilter) &&
        d.title.toLowerCase().includes(query.toLowerCase()),
    );
  }, [docs, typeFilter, statusFilter, query]);

  const startUpload = useCallback(
    (file: File, title: string, department: string, version: string) => {
      const id = `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      filesRef.current.set(id, file);
      
      setUploads((prev) => [
        { fileId: id, fileName: file.name, progress: 0, status: "uploading" },
        ...prev,
      ]);

      uploadMut.mutate(
        {
          file,
          title,
          department,
          version,
          onProgress: (pct) =>
            setUploads((prev) => prev.map((u) => (u.fileId === id ? { ...u, progress: pct } : u))),
        },
        {
          onSuccess: () => {
            setUploads((prev) => prev.map((u) => (u.fileId === id ? { ...u, progress: 100, status: "success" } : u)));
            toast.success(`${title} uploaded successfully.`);
            setTimeout(() => {
              setUploads((prev) => prev.filter((u) => u.fileId !== id));
              filesRef.current.delete(id);
            }, 2500);
          },
          onError: (err) => {
            const msg = err instanceof Error ? err.message : "Upload failed";
            setUploads((prev) => prev.map((u) => (u.fileId === id ? { ...u, status: "error", error: msg } : u)));
            toast.error(`${title}: ${msg}`);
          },
        },
      );
    },
    [uploadMut],
  );

  const handleFiles = useCallback(
    (fileList: FileList | File[]) => {
      const files = Array.from(fileList);
      if (!files.length) return;
      const file = files[0];
      const err = validateFile(file);
      if (err) {
        toast.error(err);
        return;
      }
      setSelectedFile(file);
      setUploadTitle(file.name.replace(/\.[^/.]+$/, ""));
      setUploadDept("Blast Furnace");
      setUploadVer("1.0");
      setIsUploadDialogOpen(true);
    },
    [],
  );

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;
    setIsUploadDialogOpen(false);
    startUpload(selectedFile, uploadTitle, uploadDept, uploadVer);
  };

  const totalChunks = (docs ?? []).reduce((s, d) => s + (d.chunks || 0), 0);

  return (
    <AppShell>
      <div className="space-y-6 max-w-[1500px] mx-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Document Center</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Ingest manuals, SOPs, and inspection reports into the knowledge base.
            </p>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-border bg-card text-sm hover:bg-accent disabled:opacity-60 cursor-pointer"
          >
            <RotateCw className={cn("w-3.5 h-3.5", isFetching && "animate-spin")} /> Refresh
          </button>
        </div>

        <UploadZone onFiles={handleFiles} />

        <AnimatePresence>
          {uploads.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden"
            >
              {uploads.map((u) => (
                <div key={u.fileId} className="p-4 flex items-center gap-4">
                  <div className="grid place-items-center w-9 h-9 rounded-md bg-primary/10 text-primary ring-1 ring-primary/20">
                    {u.status === "uploading" ? <Loader2 className="w-4 h-4 animate-spin" /> :
                      u.status === "error" ? <AlertCircle className="w-4 h-4 text-destructive" /> :
                      <FileText className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate">{u.fileName}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {u.status === "error" ? "Failed" : `${u.progress}%`}
                      </span>
                    </div>
                    <Progress value={u.progress} className="mt-2 h-1.5" />
                    {u.error && <p className="mt-1 text-xs text-destructive">{u.error}</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    {u.status === "error" && (
                      <button
                        onClick={() => {
                          const f = filesRef.current.get(u.fileId);
                          if (f) {
                            setSelectedFile(f);
                            setUploadTitle(f.name.replace(/\.[^/.]+$/, ""));
                            setIsUploadDialogOpen(true);
                          }
                        }}
                        className="h-8 px-2 rounded-md text-xs hover:bg-accent inline-flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCw className="w-3 h-3" /> Retry
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setUploads((prev) => prev.filter((x) => x.fileId !== u.fileId));
                        filesRef.current.delete(u.fileId);
                      }}
                      className="grid place-items-center w-8 h-8 rounded-md hover:bg-accent text-muted-foreground cursor-pointer"
                      aria-label="Dismiss"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <Panel
          title="Library"
          description={`${docs?.length ?? 0} documents • ${totalChunks} chunks indexed`}
          action={
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search documents"
                  className="h-9 w-56 rounded-md bg-background border border-border pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="h-9 rounded-md bg-background border border-border pl-9 pr-7 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  {types.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                className="h-9 rounded-md bg-background border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="All">All statuses</option>
                <option value="processed">Processed</option>
                <option value="processing">Processing</option>
                <option value="queued">Queued</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          }
        >
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-y border-border">
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-3 py-3 font-medium">Department</th>
                  <th className="px-3 py-3 font-medium">Uploaded</th>
                  <th className="px-3 py-3 font-medium text-right">Pages</th>
                  <th className="px-3 py-3 font-medium text-right">Chunks</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      {Array.from({ length: 7 }).map((__, j) => (
                        <td key={j} className="px-3 py-3"><Skeleton className="h-4 w-full" /></td>
                      ))}
                    </tr>
                  ))
                ) : isError ? (
                  <tr><td colSpan={7} className="px-5 py-16 text-center">
                    <div className="inline-flex flex-col items-center gap-3 text-muted-foreground">
                      <AlertCircle className="w-8 h-8 text-destructive" />
                      <p className="text-sm">Failed to load documents.</p>
                      <button onClick={() => refetch()} className="inline-flex items-center gap-2 h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium cursor-pointer">
                        <RotateCw className="w-3.5 h-3.5" /> Retry
                      </button>
                    </div>
                  </td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-16 text-center">
                    <div className="inline-flex flex-col items-center gap-3 text-muted-foreground">
                      <div className="grid place-items-center w-12 h-12 rounded-2xl bg-muted">
                        <Inbox className="w-6 h-6" />
                      </div>
                      <p className="text-sm">
                        {(docs?.length ?? 0) === 0 ? "No documents yet. Upload your first file above." : "No documents match the current filters."}
                      </p>
                    </div>
                  </td></tr>
                ) : (
                  filtered.map((d) => {
                    const isReindexing = reindexMut.isPending && reindexMut.variables === d.id;
                    const isDeleting = deleteMut.isPending && deleteMut.variables === d.id;
                    const mappedStat = mapStatus(d.status);
                    return (
                      <tr key={d.id} className="border-b border-border last:border-0 hover:bg-background/40 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="grid place-items-center w-8 h-8 rounded-md bg-primary/10 text-primary ring-1 ring-primary/20 shrink-0">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium truncate">{d.title}</div>
                              <div className="text-xs text-muted-foreground">v{d.version || "1.0"}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">{d.department}</td>
                        <td className="px-3 py-3 text-muted-foreground tabular-nums">{formatDate(d.created_at)}</td>
                        <td className="px-3 py-3 text-right tabular-nums">{d.pages}</td>
                        <td className="px-3 py-3 text-right tabular-nums">{d.chunks}</td>
                        <td className="px-3 py-3"><StatusBadge status={mappedStat} /></td>
                        <td className="px-5 py-3">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => setViewId(d.id)}
                              className="grid place-items-center w-8 h-8 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground cursor-pointer"
                              aria-label="View document"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                reindexMut.mutate(d.id, {
                                  onSuccess: () => toast.success(`Reindexing ${d.title}`),
                                  onError: (e) => toast.error(e instanceof Error ? e.message : "Reindex failed"),
                                });
                              }}
                              disabled={isReindexing || mappedStat === "processing"}
                              className="grid place-items-center w-8 h-8 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground disabled:opacity-50 cursor-pointer"
                              aria-label="Reindex document"
                            >
                              {isReindexing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => setPendingDelete(d)}
                              disabled={isDeleting}
                              className="grid place-items-center w-8 h-8 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive disabled:opacity-50 cursor-pointer"
                              aria-label="Delete document"
                            >
                              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <Dialog open={!!viewId} onOpenChange={(o) => !o && setViewId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              {viewQuery.data?.title ?? "Document"}
            </DialogTitle>
            <DialogDescription>
              {viewQuery.data ? `${viewQuery.data.department} • v${viewQuery.data.version || "1.0"} • ${viewQuery.data.pages} pages • ${viewQuery.data.chunks} chunks` : "Loading metadata…"}
            </DialogDescription>
          </DialogHeader>
          {viewQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
          ) : viewQuery.isError ? (
            <p className="text-sm text-destructive">Failed to load document details.</p>
          ) : viewQuery.data ? (
            <div className="space-y-4 text-sm mt-2">
              <div className="grid grid-cols-2 gap-4">
                <Meta label="Department" value={viewQuery.data.department} />
                <Meta label="Status" value={<StatusBadge status={mapStatus(viewQuery.data.status)} />} />
                <Meta label="Uploaded" value={formatDate(viewQuery.data.created_at)} />
                <Meta label="Uploader" value={viewQuery.data.uploaded_by} />
              </div>
              
              {viewQuery.data.summary && (
                <div className="rounded-md border border-border bg-background/40 p-4">
                  <div className="text-[11px] uppercase font-semibold text-muted-foreground mb-1.5 tracking-wider">AI Generated Ingestion Summary</div>
                  <p className="text-muted-foreground leading-relaxed">{viewQuery.data.summary}</p>
                </div>
              )}

              {viewQuery.data.keywords && viewQuery.data.keywords.length > 0 && (
                <div>
                  <div className="text-[11px] uppercase font-semibold text-muted-foreground mb-1.5 tracking-wider">Keywords</div>
                  <div className="flex flex-wrap gap-1.5">
                    {viewQuery.data.keywords.map((kw) => (
                      <span key={kw} className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs border border-primary/20">{kw}</span>
                    ))}
                  </div>
                </div>
              )}

              {viewQuery.data.suggested_questions && viewQuery.data.suggested_questions.length > 0 && (
                <div>
                  <div className="text-[11px] uppercase font-semibold text-muted-foreground mb-1.5 tracking-wider">Suggested Questions</div>
                  <div className="grid gap-2">
                    {viewQuery.data.suggested_questions.map((q, idx) => (
                      <div key={idx} className="text-xs p-2 rounded-md border border-border bg-card/50 text-muted-foreground">{q}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-primary" />
              Document Ingestion Meta
            </DialogTitle>
            <DialogDescription>
              Assign the department division and metadata fields for indexing.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUploadSubmit} className="space-y-4 mt-2">
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Selected Asset</label>
              <div className="mt-1 text-xs font-medium p-2.5 rounded-md border border-border bg-background/50 truncate">
                {selectedFile?.name}
              </div>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide" htmlFor="upload-title">Document Title</label>
              <input
                id="upload-title"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                required
                className="mt-1 w-full h-9 rounded-md bg-background border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="Enter document title"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide" htmlFor="upload-dept">Department / Division</label>
              <select
                id="upload-dept"
                value={uploadDept}
                onChange={(e) => setUploadDept(e.target.value)}
                className="mt-1 w-full h-9 rounded-md bg-background border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
              >
                <option value="Blast Furnace">Blast Furnace</option>
                <option value="Safety Center">Safety Center</option>
                <option value="Maintenance Shop">Maintenance Shop</option>
                <option value="Rolling Mill">Rolling Mill</option>
                <option value="Coke Oven">Coke Oven</option>
                <option value="General">General Division</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide" htmlFor="upload-ver">Document Version</label>
              <input
                id="upload-ver"
                value={uploadVer}
                onChange={(e) => setUploadVer(e.target.value)}
                className="mt-1 w-full h-9 rounded-md bg-background border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="e.g. 1.0"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsUploadDialogOpen(false)}
                className="h-9 px-4 rounded-md border border-border hover:bg-accent text-sm font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="h-9 px-4 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium cursor-pointer"
              >
                Start Ingestion
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-foreground">{pendingDelete?.title}</span> will be removed from the knowledge base along with all of its indexed chunks. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMut.isPending} className="cursor-pointer">Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMut.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer"
              onClick={(e) => {
                e.preventDefault();
                if (!pendingDelete) return;
                deleteMut.mutate(pendingDelete.id, {
                  onSuccess: () => {
                    toast.success(`${pendingDelete.title} deleted`);
                    setPendingDelete(null);
                  },
                  onError: (err) => toast.error(err instanceof Error ? err.message : "Delete failed"),
                });
              }}
            >
              {deleteMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
      <div className="mt-1 text-sm">{value}</div>
    </div>
  );
}

function UploadZone({ onFiles }: { onFiles: (files: FileList | File[]) => void }) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDrag(false);
      if (e.dataTransfer.files?.length) onFiles(e.dataTransfer.files);
    },
    [onFiles],
  );

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={onDrop}
      className={cn(
        "rounded-xl border-2 border-dashed p-10 text-center transition-colors cursor-pointer",
        drag ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-card/80",
      )}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_EXT.join(",")}
        className="hidden"
        onChange={(e) => {
          if (e.target.files) onFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <motion.div animate={{ y: drag ? -4 : 0 }} className="mx-auto grid place-items-center w-14 h-14 rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/30">
        <UploadCloud className="w-7 h-7" />
      </motion.div>
      <h3 className="mt-4 text-base font-semibold">Drop PDFs, DOCX, or TXT files here</h3>
      <p className="text-sm text-muted-foreground">
        Files are OCR'd, chunked, embedded, and indexed automatically. Max {Math.round(MAX_FILE_SIZE / (1024 * 1024))}MB per file.
      </p>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
        className="mt-4 inline-flex items-center gap-2 h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 cursor-pointer"
      >
        <UploadCloud className="w-4 h-4" /> Browse files
      </button>
    </div>
  );
}