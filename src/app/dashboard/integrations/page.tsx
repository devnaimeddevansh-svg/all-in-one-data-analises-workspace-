import { Card, CardContent } from "@/components/ui/card";
import { Plug } from "lucide-react";

export default function IntegrationsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Integrations</h1>
        <p className="text-zinc-400">Connect your tools — coming in Phase 3</p>
      </div>
      <Card className="opacity-75">
        <CardContent className="flex flex-col items-center justify-center py-16 text-zinc-500">
          <Plug className="h-12 w-12 mb-4" />
          <p>Integrations (Google Drive, Slack, Notion) coming in Phase 3</p>
        </CardContent>
      </Card>
    </div>
  );
}
