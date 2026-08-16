"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Memory {
  id: string;
  content: string;
  type: string;
  createdAt: string;
  similarity?: number;
}

export default function MemoryPage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [content, setContent] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);

  function loadMemories(q?: string) {
    const url = q ? `/api/memory?q=${encodeURIComponent(q)}` : "/api/memory";
    fetch(url)
      .then((r) => r.json())
      .then((data) => setMemories(data.memories ?? []))
      .catch(console.error);
  }

  useEffect(() => {
    loadMemories();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/memory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (res.ok) {
      setContent("");
      setShowForm(false);
      loadMemories();
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/memory/${id}`, { method: "DELETE" });
    loadMemories();
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Memory</h1>
          <p className="text-zinc-400">Persistent knowledge your AI remembers across sessions</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4" />
          Add Memory
        </Button>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Search memories..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <Button variant="secondary" onClick={() => loadMemories(searchQuery)}>
          <Search className="h-4 w-4" />
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="p-4">
            <form onSubmit={handleCreate} className="space-y-4">
              <Textarea
                placeholder="What should NexusOS remember?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
              />
              <Button type="submit">Save Memory</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {memories.map((memory) => (
          <Card key={memory.id}>
            <CardContent className="flex items-start justify-between p-4">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{memory.type}</Badge>
                  {memory.similarity !== undefined && (
                    <span className="text-xs text-zinc-500">
                      {(memory.similarity * 100).toFixed(0)}% match
                    </span>
                  )}
                </div>
                <p className="text-sm">{memory.content}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(memory.id)}>
                <Trash2 className="h-4 w-4 text-zinc-500" />
              </Button>
            </CardContent>
          </Card>
        ))}
        {memories.length === 0 && (
          <p className="text-center text-zinc-500 py-12">No memories yet. Add facts your AI should remember.</p>
        )}
      </div>
    </div>
  );
}
