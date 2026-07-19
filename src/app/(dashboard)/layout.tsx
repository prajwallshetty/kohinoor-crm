"use client";

import React from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { Sidebar } from "@/components/sidebar";
import { Navbar } from "@/components/navbar";
import { usePathname } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-muted-foreground font-mono">Verifying credentials...</span>
      </div>
    );
  }

  if (!user) {
    return null; // Will trigger router redirect in AuthProvider
  }

  // Get Page Title from pathname
  const getPageTitle = (path: string) => {
    switch (path) {
      case "/":
        return "CRM Dashboard & Metrics";
      case "/leads":
        return "Leads Pipeline (Kanban)";
      case "/customers":
        return "Customer Database & Site Details";
      case "/measurements":
        return "Technical Shutter Measurements";
      case "/quotations":
        return "Quotation Builder & PDF Generation";
      case "/invoices":
        return "Invoice Ledger";
      case "/payments":
        return "Payments Ledger & UPI Ledger";
      case "/installations":
        return "Installation Jobs Scheduler";
      case "/inventory":
        return "Inventory Alerts & Stock Control";
      case "/warranty":
        return "Warranty Certificates Console";
      case "/storage":
        return "Cloud Storage Management";
      case "/admin":
        return "Admin Console & Branding Templates";
      case "/audit-logs":
        return "System Activity Audit Trail";
      default:
        return "Kohinoor Shutters CRM";
    }
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground overflow-hidden">
      {/* Collapsible/Sticky Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar title={getPageTitle(pathname)} />
        <main className="flex-1 overflow-y-auto p-8 relative">
          {children}
        </main>
      </div>
    </div>
  );
}
