"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export interface ChatSource {
  chunkId: string;
  documentId: string;
  documentName: string;
  excerpt: string;
  similarity: number;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
}

interface ChatInterfaceProps {
  conversationId?: string;
  onConversationCreated?: (id: string) => void;
  placeholder?: string;
  className?: string;
  apiEndpoint?: string;
  historyEndpoint?: string;
  showSources?: boolean;
}

export function ChatInterface({
  conversationId: initialConversationId,
  onConversationCreated,
  placeholder = "What do you want to accomplish?",
  className,
  apiEndpoint = "/api/chat",
  historyEndpoint,
  showSources = false,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(initialConversationId);
  const bottomRef = useRef<HTMLDivElement>(null);

  const historyUrl = historyEndpoint ?? (conversationId ? `/api/chat/${conversationId}` : null);

  useEffect(() => {
    if (initialConversationId && historyEndpoint !== null) {
      const url = historyEndpoint ?? `/api/chat/${initialConversationId}`;
      fetch(url)
        .then((r) => r.json())
        .then((data) => {
          if (data.messages) {
            setMessages(
              data.messages.map((m: { id: string; role: string; content: string; metadata?: { sources?: ChatSource[] } }) => ({
                id: m.id,
                role: m.role as "user" | "assistant",
                content: m.content,
                sources: m.metadata?.sources,
              }))
            );
          }
        })
        .catch(console.error);
    }
  }, [initialConversationId, historyEndpoint]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", content: userMessage },
    ]);
    setLoading(true);

    try {
      const res = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage, conversationId }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to send message");

      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId);
        onConversationCreated?.(data.conversationId);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.content,
          sources: showSources ? data.sources : undefined,
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: error instanceof Error ? error.message : "Something went wrong",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="flex-1 overflow-y-auto space-y-4 p-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-zinc-500">
            <p className="text-lg">{placeholder}</p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={cn("max-w-[90%]", msg.role === "user" ? "ml-auto" : "")}>
            <div
              className={cn(
                "rounded-xl px-4 py-3 text-sm",
                msg.role === "user"
                  ? "bg-violet-600 text-white"
                  : "bg-zinc-800 text-zinc-100"
              )}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
            {showSources && msg.sources && msg.sources.length > 0 && (
              <div className="mt-2 space-y-1">
                <p className="text-xs text-zinc-500 font-medium">Sources</p>
                {msg.sources.map((src, i) => (
                  <div
                    key={src.chunkId}
                    className="flex items-start gap-2 text-xs text-zinc-400 bg-zinc-900 rounded-lg p-2"
                  >
                    <FileText className="h-3 w-3 mt-0.5 shrink-0 text-violet-400" />
                    <div>
                      <span className="text-violet-400 font-medium">[{i + 1}] {src.documentName}</span>
                      <p className="text-zinc-500 mt-0.5 line-clamp-2">{src.excerpt}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-zinc-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Thinking...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="border-t border-zinc-800 p-4">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            className="min-h-[52px] resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <Button type="submit" disabled={loading || !input.trim()} size="icon" className="h-[52px] w-[52px]">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
