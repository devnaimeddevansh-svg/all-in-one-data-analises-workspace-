"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatInterfaceProps {
  conversationId?: string;
  onConversationCreated?: (id: string) => void;
  placeholder?: string;
  className?: string;
}

export function ChatInterface({
  conversationId: initialConversationId,
  onConversationCreated,
  placeholder = "What do you want to accomplish?",
  className,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(initialConversationId);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialConversationId) {
      fetch(`/api/chat/${initialConversationId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.messages) setMessages(data.messages);
        })
        .catch(console.error);
    }
  }, [initialConversationId]);

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
      const res = await fetch("/api/chat", {
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
        { id: crypto.randomUUID(), role: "assistant", content: data.content },
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
          <div
            key={msg.id}
            className={cn(
              "max-w-[85%] rounded-xl px-4 py-3 text-sm",
              msg.role === "user"
                ? "ml-auto bg-violet-600 text-white"
                : "bg-zinc-800 text-zinc-100"
            )}
          >
            <div className="whitespace-pre-wrap">{msg.content}</div>
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
