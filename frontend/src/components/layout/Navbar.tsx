"use client";

import { useState } from "react";
import { Search } from "lucide-react";

interface NavbarProps {
  onSearch: (query: string) => void;
}

export function Navbar({ onSearch }: NavbarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // Trigger the callback function provided by page.tsx
    if (onSearch) {
      onSearch(searchQuery);
    }
  };

  return (
    <header className="sticky top-0 z-20 h-16 flex items-center gap-4 px-6 border-b border-border bg-background/70 backdrop-blur-xl">
      <form onSubmit={handleSearch} className="flex-1 max-w-xl relative">
        <button 
          type="submit"
          className="absolute left-3 top-1/2 -translate-y-1/2 p-0.5 rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Submit search"
        >
          <Search className="w-4 h-4" />
        </button>
        
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-10 rounded-md bg-card/60 border border-border pl-10 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          placeholder="Search documents, chunks, queries..."
        />
      </form>

      <div className="hidden md:flex items-center gap-2 px-3 h-9 rounded-md bg-card/60 border border-border text-xs text-muted-foreground">
        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
        RAG Pipeline · FastAPI + MySQL
      </div>
    </header>
  );
}