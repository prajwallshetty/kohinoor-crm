"use client";

import React from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { Sidebar } from "@/components/sidebar";
import { Navbar } from "@/components/navbar";
import { AppLoader } from "@/components/ui/loaders";
import { usePathname } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();

  if (isLoading) {
    return <AppLoader />;
  }

  if (!user) {
    return null; // AuthProvider handles redirect
  }

  const getPageTitle = (path: string) => {
    switch (path) {
      case "/":           return "CRM Dashboard & Metrics";
      case "/customers":  return "Customer Database & Site Details";
      case "/quotations": return "Quotation Builder & PDF Generation";
      case "/invoices":   return "Invoice Ledger";
      case "/payments":   return "Payments Ledger & UPI Ledger";
      case "/master-data":return "Master Data & Inventory";
      case "/admin":      return "Admin Console & Branding Templates";
      default:            return "Kohinoor Rolling Shutters CRM";
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar />
      <div className="pl-64 flex flex-col min-w-0 min-h-screen">
        <Navbar title={getPageTitle(pathname)} />
        <main className="flex-1 p-6 relative">
          {children}
        </main>
      </div>
    </div>
  );
}

