"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useAuth } from "@/components/providers/auth-provider";
import { Lock, Mail, Eye, EyeOff, ShieldAlert } from "lucide-react";

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
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/40 via-background to-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow blobs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-card/65 backdrop-blur-xl border border-border/80 rounded-2xl shadow-2xl overflow-hidden animate-fade-in">

        {/* Top branded header panel */}
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-b border-border/60 px-8 pt-8 pb-6 flex flex-col items-center gap-3 text-center">
          {/* Logo */}
          <div className="w-20 h-20 rounded-2xl overflow-hidden border border-border/60 shadow-xl shadow-primary/20 bg-card flex items-center justify-center">
            <Image
              src="/logo.png"
              alt="Kohinoor Rolling Shutters"
              width={80}
              height={80}
              className="object-contain p-1"
              priority
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <h1 className="text-xl font-heading font-bold tracking-tight text-foreground">
              Kohinoor Rolling Shutters
            </h1>
            <p className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
              Enterprise CRM · Rolling Shutter ERP
            </p>
          </div>
        </div>

        {/* Form section */}
        <div className="p-8 flex flex-col gap-5">
          <p className="text-xs text-muted-foreground text-center -mt-1">
            Sign in to access your CRM console.
          </p>

          {error && (
            <div className="bg-destructive/10 border border-destructive/25 text-destructive text-xs p-3 rounded-lg flex items-center gap-2 animate-fade-in">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Email */}
            <div className="space-y-1.5">
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

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono tracking-wider uppercase text-muted-foreground">
                Security Password
              </label>
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg text-sm hover:bg-primary/95 transition-all duration-150 shadow-lg shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-1"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                "Secure Sign In"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex items-center">
            <div className="flex-grow border-t border-border/80" />
            <span className="flex-shrink mx-4 text-[10px] font-mono tracking-widest text-muted-foreground uppercase">
              Quick Access
            </span>
            <div className="flex-grow border-t border-border/80" />
          </div>

          {/* Quick login */}
          <button
            type="button"
            onClick={handleQuickLogin}
            disabled={isSubmitting}
            className="border border-indigo-500/25 bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-400 font-medium py-3 px-4 rounded-lg text-xs transition-all duration-150 flex flex-col items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed w-full"
          >
            <span className="text-lg">👑</span>
            <div className="flex flex-col text-center">
              <span className="font-semibold text-foreground">Quick Admin Access</span>
              <span className="text-[9px] text-muted-foreground/80 font-mono">owner@kohinoor.com · admin123</span>
            </div>
          </button>

          <p className="text-center text-[10px] text-muted-foreground font-mono">
            Enterprise Security · SSL Encryption Active
          </p>
        </div>
      </div>
    </div>
  );
}
