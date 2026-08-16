import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot } from "lucide-react";

const agents = [
  { name: "Researcher", description: "Deep research and competitive analysis", type: "RESEARCHER" },
  { name: "Business Analyst", description: "Data analysis and business insights", type: "BUSINESS_ANALYST" },
  { name: "Marketing Manager", description: "Campaign planning and content strategy", type: "MARKETING_MANAGER" },
  { name: "Sales Assistant", description: "Lead research and outreach drafts", type: "SALES_ASSISTANT" },
  { name: "Operations Manager", description: "Process optimization and workflows", type: "OPERATIONS_MANAGER" },
  { name: "Executive Assistant", description: "Scheduling, summaries, and coordination", type: "EXECUTIVE_ASSISTANT" },
];

export default function AgentsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">AI Agents</h1>
        <p className="text-zinc-400">Your AI employees — coming in Phase 2</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent) => (
          <Card key={agent.type} className="opacity-75">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Bot className="h-8 w-8 text-violet-500" />
                <CardTitle className="text-lg">{agent.name}</CardTitle>
              </div>
              <CardDescription>{agent.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-zinc-500">Available in Phase 2</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
