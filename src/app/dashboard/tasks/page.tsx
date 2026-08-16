import { Card, CardContent } from "@/components/ui/card";
import { CheckSquare } from "lucide-react";

export default function TasksPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Tasks</h1>
        <p className="text-zinc-400">Task management — coming in Phase 2</p>
      </div>
      <Card className="opacity-75">
        <CardContent className="flex flex-col items-center justify-center py-16 text-zinc-500">
          <CheckSquare className="h-12 w-12 mb-4" />
          <p>Tasks will be available in Phase 2</p>
        </CardContent>
      </Card>
    </div>
  );
}
