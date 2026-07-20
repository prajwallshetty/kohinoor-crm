"use client";

import React from "react";
import { useAuth } from "./providers/auth-provider";

export function Navbar({ title }: { title: string }) {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <header className="h-16 border-b border-border bg-card/45 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Title */}
      <h1 className="font-heading font-semibold text-lg tracking-tight text-foreground">
        {title}
      </h1>
    </header>
  );
}
