import { ChatInterface } from "@/components/chat/chat-interface";

export default function DashboardPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-zinc-800 px-6 py-4">
        <h1 className="text-xl font-semibold text-zinc-100">What do you want to accomplish?</h1>
        <p className="text-sm text-zinc-400">
          Your AI will understand, research, analyze, plan, and execute.
        </p>
      </div>
      <div className="flex-1">
        <ChatInterface placeholder="What do you want to accomplish?" />
      </div>
    </div>
  );
}
