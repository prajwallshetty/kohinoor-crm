"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LeadsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/customers");
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center p-12 gap-2 text-xs text-muted-foreground font-mono">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      <span>Redirecting to Customer Management...</span>
    </div>
  );
}
