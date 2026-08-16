"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ResearchProject {
  id: string;
  title: string;
  query: string;
  status: string;
  createdAt: string;
  reports: Array<{ id: string; title: string }>;
}

export default function ResearchPage() {
  const [projects, setProjects] = useState<ResearchProject[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/research")
      .then((r) => r.json())
      .then((data) => setProjects(data.projects ?? []))
      .catch(console.error);
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/research", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, query }),
    });
    const data = await res.json();
    if (res.ok) {
      setProjects((prev) => [data.project, ...prev]);
      setShowForm(false);
      setTitle("");
      setQuery("");
    }
    setLoading(false);
  }

  const statusVariant = (status: string) => {
    if (status === "COMPLETED") return "success";
    if (status === "IN_PROGRESS") return "warning";
    if (status === "FAILED") return "destructive" as "warning";
    return "secondary";
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Research Analyst</h1>
          <p className="text-zinc-400">Deep research with web search, citations, and recommendations</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4" />
          New Research
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Start Research Project</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <Input
                placeholder="Project title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
              <Textarea
                placeholder="What do you want to research? Be specific for better results."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                rows={4}
                required
              />
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Start Research"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {projects.map((project) => (
          <Link key={project.id} href={`/dashboard/research/${project.id}`}>
            <Card className="hover:border-violet-600/50 transition-colors cursor-pointer">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <FileText className="h-8 w-8 text-violet-500" />
                  <div>
                    <h3 className="font-medium">{project.title}</h3>
                    <p className="text-sm text-zinc-400 line-clamp-1">{project.query}</p>
                  </div>
                </div>
                <Badge variant={statusVariant(project.status) as "success" | "warning" | "secondary"}>
                  {project.status.replace("_", " ")}
                </Badge>
              </CardContent>
            </Card>
          </Link>
        ))}
        {projects.length === 0 && (
          <p className="text-center text-zinc-500 py-12">No research projects yet. Start your first one!</p>
        )}
      </div>
    </div>
  );
}
