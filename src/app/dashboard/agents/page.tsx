"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bot, Play, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface Agent {
  id: string;
  name: string;
  type: string;
  description: string | null;
  isActive: boolean;
  _count: { runs: number };
  runs: Array<{ id: string; status: string; goal: string; createdAt: string }>;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [runAgent, setRunAgent] = useState<Agent | null>(null);
  const [goal, setGoal] = useState("");
  const [running, setRunning] = useState(false);

  function loadAgents() {
    fetch("/api/agents")
      .then((r) => r.json())
      .then((data) => setAgents(data.agents ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadAgents();
  }, []);

  async function handleRun() {
    if (!runAgent || !goal.trim()) return;
    setRunning(true);
    try {
      const res = await fetch(`/api/agents/${runAgent.id}/runs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: goal.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRunAgent(null);
      setGoal("");
      window.location.href = `/dashboard/agents/${runAgent.id}?run=${data.run.id}`;
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to start agent");
    } finally {
      setRunning(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">AI Agents</h1>
        <p className="text-zinc-400">Your AI employees — configure and run multi-step workflows</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent) => (
          <Card key={agent.id} className={!agent.isActive ? "opacity-60" : ""}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bot className="h-8 w-8 text-violet-500" />
                  <CardTitle className="text-lg">{agent.name}</CardTitle>
                </div>
                <Badge variant="secondary">{agent._count.runs} runs</Badge>
              </div>
              <CardDescription>{agent.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button size="sm" onClick={() => { setRunAgent(agent); setGoal(""); }}>
                <Play className="h-3 w-3" />
                Run
              </Button>
              <Link href={`/dashboard/agents/${agent.id}`}>
                <Button size="sm" variant="outline">View</Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!runAgent} onOpenChange={(open) => !open && setRunAgent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Run {runAgent?.name}</DialogTitle>
            <DialogDescription>Describe what you want this agent to accomplish.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="e.g. Research our top 3 competitors and draft a positioning strategy"
            className="min-h-[100px]"
          />
          <Button onClick={handleRun} disabled={running || !goal.trim()}>
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Start Agent
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
