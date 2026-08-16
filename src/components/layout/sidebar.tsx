"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Search,
  Brain,
  Bot,
  Calendar,
  CheckSquare,
  Database,
  Plug,
  CreditCard,
  Settings,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Home", href: "/dashboard", icon: Home },
  { name: "Research", href: "/dashboard/research", icon: Search },
  { name: "Business Brain", href: "/dashboard/business-brain", icon: Brain },
  { name: "AI Agents", href: "/dashboard/agents", icon: Bot },
  { name: "Life Admin", href: "/dashboard/life-admin", icon: Calendar },
  { name: "Tasks", href: "/dashboard/tasks", icon: CheckSquare },
  { name: "Memory", href: "/dashboard/memory", icon: Database },
  { name: "Integrations", href: "/dashboard/integrations", icon: Plug },
];

const bottomNav = [
  { name: "Pricing", href: "/dashboard/pricing", icon: CreditCard },
  { name: "Billing", href: "/dashboard/billing", icon: CreditCard },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 flex-col border-r border-zinc-800 bg-zinc-950">
      <div className="flex h-16 items-center gap-2 border-b border-zinc-800 px-6">
        <Sparkles className="h-6 w-6 text-violet-500" />
        <span className="text-lg font-semibold text-zinc-100">NexusOS</span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-violet-600/10 text-violet-400"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-zinc-800 p-4 space-y-1">
        {bottomNav.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-violet-600/10 text-violet-400"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
