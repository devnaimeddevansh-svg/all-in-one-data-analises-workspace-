"use client";

import { useEffect, useState } from "react";
import { Plus, Loader2, Trash2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  createdAt: string;
}

const STATUS_OPTIONS = ["TODO", "IN_PROGRESS", "DONE", "CANCELED"] as const;
const PRIORITY_OPTIONS = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

function priorityVariant(priority: string) {
  if (priority === "URGENT") return "destructive" as "warning";
  if (priority === "HIGH") return "warning";
  return "secondary";
}

function statusVariant(status: string) {
  if (status === "DONE") return "success";
  if (status === "IN_PROGRESS") return "warning";
  if (status === "CANCELED") return "secondary";
  return "secondary";
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [dueDate, setDueDate] = useState("");

  function loadTasks() {
    const url = filter === "all" ? "/api/tasks" : `/api/tasks?status=${filter}`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => setTasks(data.tasks ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadTasks();
  }, [filter]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          priority,
          dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to create task");
      setTitle("");
      setDescription("");
      setPriority("MEDIUM");
      setDueDate("");
      setShowForm(false);
      loadTasks();
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  }

  async function updateTask(id: string, data: Partial<Task>) {
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    loadTasks();
  }

  async function deleteTask(id: string) {
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    loadTasks();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Tasks</h1>
          <p className="text-zinc-400">Manage your to-dos with priorities and due dates</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4" />
          New Task
        </Button>
      </div>

      <div className="flex gap-2">
        {["all", ...STATUS_OPTIONS].map((s) => (
          <Button
            key={s}
            size="sm"
            variant={filter === s ? "default" : "outline"}
            onClick={() => setFilter(s)}
          >
            {s === "all" ? "All" : s.replace("_", " ")}
          </Button>
        ))}
      </div>

      {showForm && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Priority</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRIORITY_OPTIONS.map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input id="dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
              </div>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Create Task
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {tasks.map((task) => (
          <Card key={task.id}>
            <CardContent className="flex items-start gap-4 p-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className={`font-medium ${task.status === "DONE" ? "line-through text-zinc-500" : ""}`}>
                    {task.title}
                  </h3>
                  <Badge variant={priorityVariant(task.priority)}>{task.priority}</Badge>
                  <Badge variant={statusVariant(task.status)}>{task.status.replace("_", " ")}</Badge>
                </div>
                {task.description && (
                  <p className="text-sm text-zinc-400 mt-1">{task.description}</p>
                )}
                {task.dueDate && (
                  <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Due {format(new Date(task.dueDate), "MMM d, yyyy")}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Select
                  value={task.status}
                  onValueChange={(v) => updateTask(task.id, { status: v })}
                >
                  <SelectTrigger className="w-32 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => deleteTask(task.id)}>
                  <Trash2 className="h-3 w-3 text-zinc-500" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {tasks.length === 0 && (
          <p className="text-center text-zinc-500 py-12">No tasks yet. Create one to get started.</p>
        )}
      </div>
    </div>
  );
}
