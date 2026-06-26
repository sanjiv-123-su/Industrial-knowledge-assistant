import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Mic, Copy, Sparkles, FileText, BookOpen, Bot, User, Trash2, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useChat } from "@/hooks/useChat";
import { toast } from "sonner";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "AI Chat — Industrial Knowledge Assistant" },
      { name: "description", content: "Ask the AI about SOPs, safety, and maintenance." },
    ],
  }),
  component: ChatPage,
});

const suggestedQuestions = [
  "What PPE is required in Blast Furnace area?",
  "How should workers respond to gas leakage?",
  "What is the conveyor shutdown procedure?",
  "Lockout/tagout steps for the rolling mill",
];

interface ChatMsg {
  id: string;
  role: "user" | "assistant";
  content: string;
  confidence?: string;
  citations?: Array<{
    doc: string;
    page: number;
    snippet: string;
  }>;
}

function ChatPage() {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef<string>("");

  const chatMut = useChat();

  // Initialize unique session ID and load cached history
  useEffect(() => {
    let sid = localStorage.getItem("active_chat_session_id");
    if (!sid) {
      sid = "session-" + Math.random().toString(36).slice(2, 11) + "-" + Date.now();
      localStorage.setItem("active_chat_session_id", sid);
    }
    sessionIdRef.current = sid;

    const cached = localStorage.getItem(`chat_history_${sid}`);
    if (cached) {
      try {
        setMessages(JSON.parse(cached));
      } catch (e) {
        console.error("Failed to parse cached chat history", e);
      }
    }
  }, []);

  // Sync messages with local storage history
  useEffect(() => {
    if (sessionIdRef.current && messages.length > 0) {
      localStorage.setItem(`chat_history_${sessionIdRef.current}`, JSON.stringify(messages));
    }
  }, [messages]);

  // Autoscroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, chatMut.isPending]);

  const send = (text: string) => {
    const q = text.trim();
    if (!q || chatMut.isPending) return;

    const userMessageId = "user-" + Math.random().toString(36).slice(2, 9);
    const newMsg: ChatMsg = {
      id: userMessageId,
      role: "user",
      content: q,
    };

    setMessages((m) => [...m, newMsg]);
    setInput("");

    chatMut.mutate(
      {
        session_id: sessionIdRef.current,
        message: q,
      },
      {
        onSuccess: (res) => {
          const aiMsg: ChatMsg = {
            id: res.id,
            role: "assistant",
            content: res.content,
            confidence: res.confidence_score || "100%",
            citations: res.citations?.map((c) => ({
              doc: c.document_title,
              page: c.chunk_index + 1,
              snippet: c.snippet,
            })) || [],
          };
          setMessages((m) => [...m, aiMsg]);
        },
        onError: (err) => {
          const msg = err instanceof Error ? err.message : "Internal RAG pipeline error";
          toast.error(`Error: ${msg}`);
          
          // Display error in chat bubble
          const errorMsg: ChatMsg = {
            id: "error-" + Date.now(),
            role: "assistant",
            content: `Failed to retrieve answer. Connection error: ${msg}. Please make sure the FastAPI backend is running locally.`,
          };
          setMessages((m) => [...m, errorMsg]);
        },
      }
    );
  };

  const clearHistory = () => {
    setMessages([]);
    if (sessionIdRef.current) {
      localStorage.removeItem(`chat_history_${sessionIdRef.current}`);
    }
    toast.success("Conversation history cleared.");
  };

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");

  return (
    <AppShell>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 h-[calc(100vh-7rem)]">
        <div className="flex flex-col rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-3 px-5 h-14 border-b border-border">
            <div className="grid place-items-center w-8 h-8 rounded-md bg-primary/15 text-primary ring-1 ring-primary/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-semibold">Knowledge Assistant</div>
              <div className="text-[11px] text-muted-foreground">RAG · Llama-3 · pgvector/MySQL</div>
            </div>
            <div className="ml-auto flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="hidden sm:inline tabular-nums">
                {messages.filter((m) => m.role === "user").length} queries
              </span>
              {messages.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-border hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" /> Clear
                </button>
              )}
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 && (
              <div className="h-full grid place-items-center text-center">
                <div className="max-w-md">
                  <div className="mx-auto grid place-items-center w-14 h-14 rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/30">
                    <Bot className="w-7 h-7" />
                  </div>
                  <h2 className="mt-4 text-lg font-semibold">How can I help your shift today?</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Ask about safety procedures, machine operations, or maintenance steps. All answers are cited from your indexed documents.
                  </p>
                  <div className="mt-5 grid gap-2">
                    {suggestedQuestions.map((q) => (
                      <button key={q} onClick={() => send(q)} disabled={chatMut.isPending}
                        className="text-left text-sm rounded-md border border-border bg-background/40 px-3 py-2 hover:border-primary/60 hover:bg-primary/5 transition-colors cursor-pointer disabled:opacity-50">
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <AnimatePresence initial={false}>
              {messages.map((m) => (
                <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className={cn("flex gap-3", m.role === "user" ? "justify-end" : "justify-start")}>
                  {m.role === "assistant" && (
                    <div className="grid place-items-center w-8 h-8 shrink-0 rounded-md bg-primary/15 text-primary ring-1 ring-primary/30">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}
                  <div className={cn("max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                    m.role === "user" ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-background border border-border rounded-bl-sm")}>
                    <p className="whitespace-pre-wrap">{m.content}</p>
                    {m.role === "assistant" && m.confidence && (
                      <div className="mt-3 flex items-center gap-3 pt-3 border-t border-border">
                        <span className="text-[11px] text-muted-foreground">Confidence</span>
                        <div className="h-1 w-24 rounded-full bg-card overflow-hidden">
                          <div className="h-full bg-success" style={{ width: m.confidence }} />
                        </div>
                        <span className="text-[11px] tabular-nums">{m.confidence}</span>
                        <button onClick={() => {
                          navigator.clipboard.writeText(m.content);
                          toast.success("Response copied to clipboard.");
                        }}
                          className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer">
                          <Copy className="w-3 h-3" /> Copy
                        </button>
                      </div>
                    )}
                  </div>
                  {m.role === "user" && (
                    <div className="grid place-items-center w-8 h-8 shrink-0 rounded-md bg-muted text-muted-foreground">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {chatMut.isPending && (
              <div className="flex gap-3">
                <div className="grid place-items-center w-8 h-8 rounded-md bg-primary/15 text-primary ring-1 ring-primary/30">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="rounded-2xl bg-background border border-border px-4 py-3">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.span key={i} className="w-2 h-2 rounded-full bg-primary"
                        animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-3 border-t border-border bg-card">
            <div className="flex items-end gap-2 rounded-xl border border-border bg-background px-3 py-2 focus-within:ring-2 focus-within:ring-primary/40">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
                }}
                rows={1}
                disabled={chatMut.isPending}
                placeholder="Ask about SOPs, safety procedures, maintenance, machine operations..."
                className="flex-1 bg-transparent text-sm resize-none outline-none placeholder:text-muted-foreground py-1.5 max-h-32"
              />
              <button className="grid place-items-center w-9 h-9 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer">
                <Mic className="w-4 h-4" />
              </button>
              <button onClick={() => send(input)} disabled={!input.trim() || chatMut.isPending}
                className="grid place-items-center w-9 h-9 rounded-md bg-primary text-primary-foreground disabled:opacity-40 hover:bg-primary/90 transition-colors cursor-pointer">
                {chatMut.isPending ? <RotateCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        <aside className="rounded-xl border border-border bg-card flex flex-col overflow-hidden">
          <div className="px-5 h-14 flex items-center gap-2 border-b border-border">
            <BookOpen className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Sources</span>
            {lastAssistant?.citations && (
              <span className="ml-auto text-xs text-muted-foreground">{lastAssistant.citations.length} cited</span>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {!lastAssistant || !lastAssistant.citations || lastAssistant.citations.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-12">
                <FileText className="w-8 h-8 mx-auto mb-3 opacity-50" />
                Cited documents will appear here as you chat.
              </div>
            ) : (
              lastAssistant.citations.map((c, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="rounded-lg border border-border bg-background/40 p-3 hover:border-primary/40 transition-colors">
                  <div className="flex items-center gap-2 text-xs">
                    <FileText className="w-3.5 h-3.5 text-primary" />
                    <span className="font-medium truncate">{c.doc}</span>
                    <span className="ml-auto text-muted-foreground">Chunk {c.page}</span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground line-clamp-4">"{c.snippet}"</p>
                </motion.div>
              ))
            )}
          </div>
        </aside>
      </div>
    </AppShell>
  );
}