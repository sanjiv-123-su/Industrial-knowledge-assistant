import { Search, Code2 } from "lucide-react";

export function Navbar() {
  return (
    <header className="sticky top-0 z-20 h-16 flex items-center gap-4 px-6 border-b border-border bg-background/70 backdrop-blur-xl">
      <div className="flex-1 max-w-xl relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          className="w-full h-10 rounded-md bg-card/60 border border-border pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          placeholder="Search documents, chunks, queries..."
        />
      </div>
      <div className="hidden md:flex items-center gap-2 px-3 h-9 rounded-md bg-card/60 border border-border text-xs text-muted-foreground">
        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
        RAG Pipeline · FastAPI + pgvector
      </div>
      
    </header>
  );
}