"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "./providers/auth-provider";
import {
  LayoutDashboard,
  Users,
  FileSpreadsheet,
  Receipt,
  Database,
  LayoutTemplate,
  FileText,
  Settings,
  LogOut
} from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  if (!user) return null;

  const menuItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Customers", href: "/customers", icon: Users },
    { name: "Quotations", href: "/quotations", icon: FileSpreadsheet },
    { name: "Invoices", href: "/invoices", icon: Receipt },
    { name: "Master Data", href: "/master-data", icon: Database },
    { name: "Templates", href: "/quotation-templates", icon: LayoutTemplate },
    { name: "Reports", href: "/reports", icon: FileText },
    { name: "Settings", href: "/admin", icon: Settings }
  ];

  return (
    <aside className="w-64 border-r border-border bg-card/60 backdrop-blur-md flex flex-col h-screen fixed top-0 left-0 z-30 font-sans">
      {/* Brand Logo Header */}
      <div className="h-16 px-6 border-b border-border flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center shrink-0">
          <Image src="/logo.png" alt="Kohinoor Logo" width={32} height={32} className="object-contain w-full h-full" />
        </div>
        <div className="flex flex-col">
          <span className="font-heading font-semibold text-sm leading-tight text-foreground">Kohinoor Rolling Shutters</span>
          <span className="text-[10px] text-muted-foreground font-mono tracking-widest uppercase">Enterprise CRM</span>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-md transition-all duration-150 group ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
              }`}
            >
              <item.icon
                className={`w-4.5 h-4.5 transition-transform duration-150 group-hover:scale-105 ${
                  isActive ? "text-primary-foreground" : "text-muted-foreground/80 group-hover:text-foreground"
                }`}
              />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Profile Footer */}
      <div className="p-4 border-t border-border flex flex-col gap-2 bg-secondary/20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-300 font-bold flex items-center justify-center text-xs">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate text-foreground">{user.name}</p>
            <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-3 py-1.5 mt-1 border border-border/80 text-xs font-medium rounded-md text-destructive hover:bg-destructive/10 hover:border-destructive/30 transition-all duration-150"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
