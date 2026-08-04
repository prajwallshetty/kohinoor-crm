"use client";

import React, { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./providers/auth-provider";
import { useTheme } from "next-themes";
import Link from "next/link";
import {
  Search,
  Bell,
  Plus,
  Sun,
  Moon,
  Laptop,
  ChevronRight,
  User,
  LogOut,
  Command,
  Settings,
  Sparkles,
  HelpCircle,
  FileText,
  FolderGit2
} from "lucide-react";

interface SearchResult {
  type: "Customer" | "Quotation" | "Invoice" | "Material" | "Template";
  title: string;
  subtitle: string;
  url: string;
}

export function Navbar({ title }: { title: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  // Search States
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [allData, setAllData] = useState<{
    customers: any[];
    quotations: any[];
    invoices: any[];
    materials: any[];
    templates: any[];
  }>({
    customers: [],
    quotations: [],
    invoices: [],
    materials: [],
    templates: []
  });

  // Notifications States
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [hasNewNotifications, setHasNewNotifications] = useState(false);

  // Quick Actions States
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);

  // User Dropdown States
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  // Refs for closing popovers on click outside
  const searchRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const quickActionsRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  // Fetch search sources & notifications on focus/load
  const loadSearchData = async () => {
    try {
      const [cRes, qRes, iRes, mRes, tRes] = await Promise.all([
        fetch("/api/customers"),
        fetch("/api/quotations"),
        fetch("/api/invoices"),
        fetch("/api/master-data"),
        fetch("/api/quotation-templates")
      ]);

      const [customers, quotations, invoices, materials, templates] = await Promise.all([
        cRes.ok ? cRes.json() : [],
        qRes.ok ? qRes.json() : [],
        iRes.ok ? iRes.json() : [],
        mRes.ok ? mRes.json() : [],
        tRes.ok ? tRes.json() : []
      ]);

      setAllData({ customers, quotations, invoices, materials, templates });
    } catch (e) {
      console.error("Failed to load search data:", e);
    }
  };

  const loadNotifications = async () => {
    try {
      const res = await fetch("/api/audit-logs");
      if (res.ok) {
        const logs = await res.json();
        setNotifications(logs.slice(0, 10)); // keep last 10 logs
        // If there's a log from within last 1 hour, flag it
        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        const fresh = logs.some((l: any) => new Date(l.timestamp).getTime() > oneHourAgo);
        setHasNewNotifications(fresh);
      }
    } catch (e) {}
  };

  useEffect(() => {
    if (user) {
      loadSearchData();
      loadNotifications();
      // Background poll notifications every 60s
      const timer = setInterval(loadNotifications, 60000);
      return () => clearInterval(timer);
    }
  }, [user]);

  // Global Key Bindings: Ctrl+K / '/' for Search
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
        setNotificationsOpen(false);
        setQuickActionsOpen(false);
        setUserDropdownOpen(false);
      }
    };
    window.addEventListener("keydown", handleGlobalKey);
    return () => window.removeEventListener("keydown", handleGlobalKey);
  }, []);

  // Filter search results
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const query = searchQuery.toLowerCase();
    const results: SearchResult[] = [];

    // Customers
    allData.customers.forEach((c) => {
      if (c.name.toLowerCase().includes(query) || (c.companyName && c.companyName.toLowerCase().includes(query))) {
        results.push({
          type: "Customer",
          title: c.name,
          subtitle: c.companyName || c.phone,
          url: "/customers"
        });
      }
    });

    // Quotations
    allData.quotations.forEach((q) => {
      if (q.quoteNumber.toLowerCase().includes(query) || (q.customer?.name && q.customer.name.toLowerCase().includes(query))) {
        results.push({
          type: "Quotation",
          title: q.quoteNumber,
          subtitle: `Customer: ${q.customer?.name || "Unknown"} | ₹${q.totalAmount.toLocaleString("en-IN")}`,
          url: "/quotations"
        });
      }
    });

    // Invoices
    allData.invoices.forEach((inv) => {
      if (inv.invoiceNumber.toLowerCase().includes(query) || (inv.customer?.name && inv.customer.name.toLowerCase().includes(query))) {
        results.push({
          type: "Invoice",
          title: inv.invoiceNumber,
          subtitle: `Customer: ${inv.customer?.name || "Unknown"} | ₹${inv.totalAmount.toLocaleString("en-IN")} (${inv.status})`,
          url: "/invoices"
        });
      }
    });

    // Materials
    allData.materials.forEach((mat) => {
      if (mat.name.toLowerCase().includes(query) || mat.category.toLowerCase().includes(query)) {
        results.push({
          type: "Material",
          title: mat.name,
          subtitle: `Category: ${mat.category} | Rate: ₹${mat.rate}`,
          url: "/master-data"
        });
      }
    });

    // Templates
    allData.templates.forEach((temp) => {
      if (temp.name.toLowerCase().includes(query) || (temp.description && temp.description.toLowerCase().includes(query))) {
        results.push({
          type: "Template",
          title: temp.name,
          subtitle: temp.description || "Quotation Template",
          url: "/quotation-templates"
        });
      }
    });

    setSearchResults(results.slice(0, 10)); // Limit to top 10 search results
  }, [searchQuery, allData]);

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
      if (quickActionsRef.current && !quickActionsRef.current.contains(e.target as Node)) {
        setQuickActionsOpen(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) return null;

  // Breadcrumbs Helper
  const getBreadcrumbs = () => {
    const segments = pathname.split("/").filter(Boolean);
    const crumbs = [{ label: "Home", href: "/" }];

    if (segments.length === 0) {
      return crumbs;
    }

    if (segments[0] === "customers") {
      crumbs.push({ label: "Customers", href: "/customers" });
    } else if (segments[0] === "quotations") {
      crumbs.push({ label: "Sales", href: "/quotations" });
      crumbs.push({ label: "Quotations", href: "/quotations" });
    } else if (segments[0] === "invoices") {
      crumbs.push({ label: "Sales", href: "/invoices" });
      crumbs.push({ label: "Invoices", href: "/invoices" });
    } else if (segments[0] === "payments") {
      crumbs.push({ label: "Sales", href: "/payments" });
      crumbs.push({ label: "Payments Ledger", href: "/payments" });
    } else if (segments[0] === "master-data") {
      crumbs.push({ label: "Master Data", href: "/master-data" });
      crumbs.push({ label: "Materials & Inventory", href: "/master-data" });
    } else if (segments[0] === "quotation-templates") {
      crumbs.push({ label: "Master Data", href: "/master-data" });
      crumbs.push({ label: "Templates", href: "/quotation-templates" });
    } else if (segments[0] === "admin") {
      crumbs.push({ label: "Settings", href: "/admin" });
      crumbs.push({ label: "Admin Console & Branding", href: "/admin" });
    } else {
      crumbs.push({ label: segments[0].charAt(0).toUpperCase() + segments[0].slice(1), href: pathname });
    }

    return crumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <>
      <header className="h-16 border-b border-border bg-card/60 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-20">
        
        {/* Left: Breadcrumbs & Workspace Indicator */}
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex items-center gap-1 bg-secondary/40 border border-border px-2.5 py-1 rounded-md text-[11px] font-bold text-foreground max-w-[150px] shrink-0">
            <FolderGit2 className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="truncate">Kohinoor Main</span>
          </div>

          <div className="h-4 w-px bg-border shrink-0" />

          {/* Breadcrumbs List */}
          <nav className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium truncate">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={crumb.href + idx}>
                {idx > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground/60 shrink-0" />}
                <Link
                  href={crumb.href}
                  className={`hover:text-foreground transition-colors truncate ${
                    idx === breadcrumbs.length - 1 ? "text-foreground font-bold" : ""
                  }`}
                >
                  {crumb.label}
                </Link>
              </React.Fragment>
            ))}
          </nav>
        </div>

        {/* Center: Search Bar Launcher */}
        <div className="flex-1 max-w-md mx-6 relative">
          <button
            onClick={() => setSearchOpen(true)}
            className="w-full flex items-center justify-between px-3 py-1.5 bg-secondary/30 hover:bg-secondary/65 border border-border/80 hover:border-border rounded-lg text-xs text-muted-foreground/80 hover:text-muted-foreground transition-all text-left shadow-sm cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-muted-foreground/60" />
              <span>Search customers, quotations, invoices...</span>
            </div>
            <div className="flex items-center gap-1 font-mono text-[10px] bg-secondary/80 border border-border/60 px-1.5 py-0.5 rounded leading-none">
              <Command className="w-2.5 h-2.5" />
              <span>K</span>
            </div>
          </button>
        </div>

        {/* Right: Actions, Notifications, Theme, User */}
        <div className="flex items-center gap-3">
          
          {/* Quick Actions Dropdown */}
          <div className="relative" ref={quickActionsRef}>
            <button
              onClick={() => setQuickActionsOpen(!quickActionsOpen)}
              className="flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-bold px-3 py-2 rounded-lg hover:bg-primary/95 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Quick Add</span>
            </button>

            {quickActionsOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-popover text-popover-foreground border rounded-lg shadow-lg py-1 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                <Link
                  href="/quotations"
                  onClick={() => setQuickActionsOpen(false)}
                  className="flex items-center gap-2 px-3.5 py-2 text-xs hover:bg-secondary/60 font-semibold text-foreground transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Create Quotation</span>
                </Link>
                <Link
                  href="/invoices"
                  onClick={() => setQuickActionsOpen(false)}
                  className="flex items-center gap-2 px-3.5 py-2 text-xs hover:bg-secondary/60 font-semibold text-foreground transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Create Invoice</span>
                </Link>
                <Link
                  href="/customers"
                  onClick={() => setQuickActionsOpen(false)}
                  className="flex items-center gap-2 px-3.5 py-2 text-xs hover:bg-secondary/60 font-semibold text-foreground transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Add Customer</span>
                </Link>
                <Link
                  href="/master-data"
                  onClick={() => setQuickActionsOpen(false)}
                  className="flex items-center gap-2 px-3.5 py-2 text-xs hover:bg-secondary/60 font-semibold text-foreground transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Add Material Item</span>
                </Link>
              </div>
            )}
          </div>

          {/* Notifications Dropdown */}
          <div className="relative" ref={notificationsRef}>
            <button
              onClick={() => {
                setNotificationsOpen(!notificationsOpen);
                setHasNewNotifications(false);
              }}
              className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground border border-transparent hover:border-border transition-all relative cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              {hasNewNotifications && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full border border-card animate-pulse" />
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-popover text-popover-foreground border rounded-xl shadow-lg py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="px-4 py-2 border-b border-border flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-foreground">Recent Activity Logs</span>
                  <span className="text-[10px] text-muted-foreground font-mono">Live Logs</span>
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-border/60">
                  {notifications.length > 0 ? (
                    notifications.map((log: any) => (
                      <div key={log.id} className="p-3 text-[11px] hover:bg-secondary/35 transition-colors">
                        <div className="flex justify-between items-start gap-2 mb-1">
                          <span className="font-extrabold uppercase tracking-wider text-primary text-[9px] font-mono">
                            {log.action.replace("_", " ")}
                          </span>
                          <span className="text-[9px] text-muted-foreground font-mono shrink-0">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-foreground font-medium leading-relaxed mb-0.5">{log.details}</p>
                        <p className="text-muted-foreground text-[9px] font-mono">{log.userEmail}</p>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-xs text-muted-foreground">No recent system logs</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Theme Toggler */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground border border-transparent hover:border-border transition-all cursor-pointer"
            title="Toggle theme"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <div className="h-4 w-px bg-border" />

          {/* User Profile dropdown */}
          <div className="relative" ref={userDropdownRef}>
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center gap-2 cursor-pointer p-1 rounded-lg hover:bg-secondary/60 transition-all border border-transparent hover:border-border"
            >
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-300 font-black flex items-center justify-center text-xs border border-indigo-500/35">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="hidden md:flex flex-col text-left shrink-0 max-w-[120px]">
                <span className="text-xs font-bold truncate text-foreground leading-none">{user.name.split(" ")[0]}</span>
                <span className="text-[9px] text-muted-foreground truncate mt-0.5">Administrator</span>
              </div>
            </button>

            {userDropdownOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-popover text-popover-foreground border rounded-xl shadow-lg py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="px-4 py-2 border-b border-border/80">
                  <p className="text-xs font-extrabold text-foreground truncate">{user.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                </div>
                <Link
                  href="/admin"
                  onClick={() => setUserDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-xs hover:bg-secondary/60 text-foreground font-semibold transition-colors"
                >
                  <Settings className="w-4 h-4 text-muted-foreground" />
                  <span>Admin Branding</span>
                </Link>
                <div className="h-px bg-border/60 my-1.5" />
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs hover:bg-destructive/10 text-destructive font-bold transition-colors text-left cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>

        </div>
      </header>

      {/* Global Search Overlay (Vercel style modal) */}
      {searchOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-start justify-center pt-24 animate-in fade-in duration-200">
          <div
            ref={searchRef}
            className="w-full max-w-xl bg-card border border-border shadow-xl rounded-xl overflow-hidden flex flex-col max-h-[500px]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input */}
            <div className="flex items-center px-4 py-3 border-b border-border gap-3 shrink-0">
              <Search className="w-5 h-5 text-muted-foreground/60 shrink-0" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search database (customers, quotations, invoices, materials...)"
                className="w-full bg-transparent text-sm border-none focus:outline-none placeholder-muted-foreground text-foreground font-medium"
              />
              <button
                onClick={() => setSearchOpen(false)}
                className="text-[10px] bg-secondary border border-border px-2 py-1 rounded text-muted-foreground leading-none font-semibold hover:text-foreground cursor-pointer"
              >
                ESC
              </button>
            </div>

            {/* Results Grid */}
            <div className="flex-1 overflow-y-auto divide-y divide-border/60">
              {searchResults.length > 0 ? (
                searchResults.map((res, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSearchOpen(false);
                      setSearchQuery("");
                      router.push(res.url);
                    }}
                    className="w-full px-4 py-3 hover:bg-secondary/40 text-left flex justify-between items-center transition-colors cursor-pointer"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-semibold text-foreground">{res.title}</span>
                      <span className="text-[10px] text-muted-foreground">{res.subtitle}</span>
                    </div>
                    <span className="text-[9px] bg-secondary/80 border border-border px-2 py-0.5 rounded text-muted-foreground uppercase font-mono font-bold">
                      {res.type}
                    </span>
                  </button>
                ))
              ) : searchQuery ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No records match "{searchQuery}"
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                  <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground/75 bg-secondary/40 border border-border px-2 py-1 rounded">
                    <Command className="w-3.5 h-3.5" />
                    <span>Type to start searching across modules</span>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-4 py-2 border-t border-border bg-secondary/20 flex justify-between text-[9px] font-medium text-muted-foreground font-mono shrink-0">
              <span>↑↓ Navigation</span>
              <span>↵ Select</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
