"use client";

import { useEffect, useState } from "react";
import { User } from "lucide-react";

export function Header() {
  const [guestName, setGuestName] = useState<string>("Guest");

  useEffect(() => {
    fetch("/api/guest/session")
      .then((r) => r.json())
      .then((data) => {
        if (data.guest?.name) setGuestName(data.guest.name);
      })
      .catch(() => {});
  }, []);

  return (
    <header className="flex h-16 items-center justify-between border-b border-zinc-800 bg-zinc-950/80 px-6 backdrop-blur">
      <div />
      <div className="flex items-center gap-2 text-sm text-zinc-400">
        <User className="h-4 w-4" />
        <span>{guestName}</span>
      </div>
    </header>
  );
}
