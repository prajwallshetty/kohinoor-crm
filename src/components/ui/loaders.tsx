"use client";

import React from "react";
import Image from "next/image";

export function AppLoader() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-8 select-none">
      {/* Logo + brand */}
      <div className="flex flex-col items-center gap-4 animate-fade-in">
        <div className="relative w-16 h-16 rounded-2xl overflow-hidden shadow-xl shadow-primary/20 border border-border/60">
          <Image src="/logo.png" alt="Kohinoor Logo" fill className="object-contain p-1" />
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="font-heading font-bold text-base tracking-tight text-foreground">
            Kohinoor Rolling Shutters
          </span>
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            Enterprise CRM
          </span>
        </div>
      </div>

      {/* Animated progress bar */}
      <div className="w-48 h-0.5 bg-border rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full animate-loader-bar" />
      </div>

      <span className="text-[11px] text-muted-foreground font-mono animate-pulse">
        Verifying credentials...
      </span>
    </div>
  );
}

/** Skeleton shimmer block — use for placeholder cards/rows */
export function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div
      className={`bg-secondary/60 rounded-md animate-shimmer bg-[length:400%_100%] ${className}`}
      style={{
        background: "linear-gradient(90deg, hsl(var(--secondary)) 25%, hsl(var(--muted)) 50%, hsl(var(--secondary)) 75%)",
        backgroundSize: "400% 100%",
        animation: "shimmer 1.4s ease-in-out infinite",
      }}
    />
  );
}

/** Full-page skeleton for table-based pages */
export function PageSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      {/* Header bar skeleton */}
      <div className="flex justify-between items-center">
        <SkeletonBlock className="h-8 w-48 rounded-lg" />
        <SkeletonBlock className="h-8 w-32 rounded-lg" />
      </div>

      {/* Stats tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="border border-border/60 rounded-xl p-4 flex flex-col gap-2">
            <SkeletonBlock className="h-3 w-20 rounded" />
            <SkeletonBlock className="h-7 w-28 rounded" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="border border-border/60 rounded-xl overflow-hidden">
        {/* Table header */}
        <div className="bg-secondary/20 px-4 py-3 border-b border-border/60 flex gap-6">
          {[...Array(5)].map((_, i) => (
            <SkeletonBlock key={i} className="h-3 rounded flex-1" />
          ))}
        </div>
        {/* Table rows */}
        {[...Array(rows)].map((_, i) => (
          <div
            key={i}
            className="px-4 py-3.5 border-b border-border/40 flex gap-6 items-center"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <SkeletonBlock className="h-4 w-4 rounded-full shrink-0" />
            {[...Array(4)].map((_, j) => (
              <SkeletonBlock key={j} className={`h-3 rounded flex-1 ${j === 0 ? "max-w-[140px]" : ""}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
