"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "./providers/auth-provider";
import { Bell, HardDrive } from "lucide-react";

export function Navbar({ title }: { title: string }) {
  const { user } = useAuth();
  const [quota, setQuota] = useState<{ totalQuotaBytes: number; usedBytes: number }>({
    totalQuotaBytes: 10 * 1024 * 1024 * 1024,
    usedBytes: 1.45 * 1024 * 1024 * 1024
  });

  useEffect(() => {
    // Get storage usage
    const fetchStorage = async () => {
      try {
        const res = await fetch("/api/storage");
        if (res.ok) {
          const data = await res.json();
          setQuota(data);
        }
      } catch (e) {}
    };

    fetchStorage();
    // Refresh storage on interval
    const interval = setInterval(fetchStorage, 10000);
    return () => clearInterval(interval);
  }, []);

  if (!user) return null;

  const usedGB = quota.usedBytes / (1024 * 1024 * 1024);
  const totalGB = quota.totalQuotaBytes / (1024 * 1024 * 1024);
  const usagePercentage = Math.min((quota.usedBytes / quota.totalQuotaBytes) * 100, 100);
  const isStorageFull = quota.usedBytes >= quota.totalQuotaBytes;

  return (
    <header className="h-16 border-b border-border bg-card/45 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Title */}
      <h1 className="font-heading font-semibold text-lg tracking-tight text-foreground">
        {title}
      </h1>

      {/* Right Actions Wrapper */}
      <div className="flex items-center gap-6">
        {/* Storage Quick Tracker */}
        <div className="hidden md:flex items-center gap-3 bg-secondary/30 px-3 py-1.5 rounded-lg border border-border/40">
          <HardDrive className={`w-4 h-4 ${isStorageFull ? "text-destructive animate-pulse" : "text-muted-foreground"}`} />
          <div className="flex flex-col w-24">
            <div className="flex justify-between text-[9px] font-mono leading-none mb-1">
              <span>{usedGB.toFixed(2)} GB</span>
              <span>{totalGB.toFixed(0)} GB</span>
            </div>
            <div className="w-full bg-border h-1 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isStorageFull ? "bg-destructive" : usagePercentage > 85 ? "bg-amber-500" : "bg-primary"
                }`}
                style={{ width: `${usagePercentage}%` }}
              />
            </div>
          </div>
          {isStorageFull && (
            <span className="text-[9px] bg-destructive/15 text-destructive border border-destructive/20 font-bold px-1.5 py-0.5 rounded leading-none">
              FULL
            </span>
          )}
        </div>

        {/* Notifications Mock Indicator */}
        <div className="relative cursor-pointer p-2 border border-border hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-all duration-150">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full ring-2 ring-card" />
        </div>
      </div>
    </header>
  );
}
