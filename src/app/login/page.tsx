"use client";

import React, { useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { ShieldCheck, Lock, Mail, Eye, EyeOff, ShieldAlert } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Direct validation matches
      if (email === "owner@kohinoor.com" && password === "admin123") {
        await login(email);
      } else {
        setError("Invalid email or password. Hint: Try using the quick-access button below.");
        setIsSubmitting(false);
        return;
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = async () => {
    setIsSubmitting(true);
    await login("owner@kohinoor.com");
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/40 via-background to-background flex items-center justify-center p-4">
      {/* Glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl -z-10 pointer-events-none" />

      <div className="w-full max-w-md bg-card/65 backdrop-blur-xl border border-border/80 rounded-2xl shadow-2xl p-8 flex flex-col gap-6">
        
        {/* Header */}
        <div className="flex flex-col items-center text-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-2xl shadow-xl shadow-primary/20">
            K
          </div>
          <h2 className="text-2xl font-heading font-bold tracking-tight mt-3 text-foreground">
            Kohinoor Shutters
          </h2>
          <p className="text-xs text-muted-foreground">
            Sign in to access your Rolling Shutter ERP & CRM console.
          </p>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/25 text-destructive text-xs p-3 rounded-lg flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Email input */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono tracking-wider uppercase text-muted-foreground">
              Corporate Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-secondary/40 border border-border/80 rounded-lg py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 transition-all duration-150"
              />
            </div>
          </div>

          {/* Password input */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-mono tracking-wider uppercase text-muted-foreground">
                Security Password
              </label>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-secondary/40 border border-border/80 rounded-lg py-2.5 pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 transition-all duration-150"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg text-sm hover:bg-primary/95 transition-all duration-150 shadow-lg shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
            ) : (
              "Secure Authorization"
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative flex items-center my-1">
          <div className="flex-grow border-t border-border/80"></div>
          <span className="flex-shrink mx-4 text-[10px] font-mono tracking-widest text-muted-foreground uppercase">
            Quick Sandbox Access
          </span>
          <div className="flex-grow border-t border-border/80"></div>
        </div>

        {/* Quick evaluation buttons */}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleQuickLogin}
            disabled={isSubmitting}
            className="border border-indigo-500/25 bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-400 font-medium py-3 px-4 rounded-lg text-xs transition-all duration-150 flex flex-col items-center gap-1.5 cursor-pointer"
          >
            <span className="text-lg">👑</span>
            <div className="flex flex-col text-center">
              <span className="font-semibold text-foreground">Quick Admin Access</span>
              <span className="text-[9px] text-muted-foreground/80 font-mono">owner@kohinoor.com (Password: admin123)</span>
            </div>
          </button>
        </div>

        <div className="text-center text-[10px] text-muted-foreground font-mono mt-2">
          Enterprise Security Key Required. SSL Encryption Active.
        </div>
      </div>
    </div>
  );
}
