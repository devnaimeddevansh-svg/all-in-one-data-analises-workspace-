import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Plane, FileText, Bell } from "lucide-react";

const features = [
  { icon: Bell, title: "Tasks & Reminders", description: "Smart reminders and task management" },
  { icon: Plane, title: "Travel Planning", description: "Itineraries, bookings, and logistics" },
  { icon: FileText, title: "Document Organization", description: "Auto-categorize and find documents" },
  { icon: Calendar, title: "Personal Research", description: "Research for personal decisions" },
];

export default function LifeAdminPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Life Admin</h1>
        <p className="text-zinc-400">Personal productivity and life management — coming in Phase 3</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {features.map((feature) => (
          <Card key={feature.title} className="opacity-75">
            <CardHeader>
              <div className="flex items-center gap-3">
                <feature.icon className="h-6 w-6 text-violet-500" />
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </div>
              <CardDescription>{feature.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-zinc-500">Available in Phase 3</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
