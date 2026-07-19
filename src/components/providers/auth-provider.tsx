"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Attempt to load session from localStorage
    const savedUser = localStorage.getItem("crm_user");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem("crm_user");
      }
    }
    setIsLoading(false);
  }, []);

  // Sync route protection
  useEffect(() => {
    if (isLoading) return;

    const isPublicRoute = pathname === "/login";
    if (!user && !isPublicRoute) {
      router.push("/login");
    } else if (user && isPublicRoute) {
      router.push("/");
    }
  }, [user, pathname, isLoading, router]);

  const login = async (email: string): Promise<boolean> => {
    setIsLoading(true);
    const newUser: User = {
      id: "u-1",
      name: "Administrator",
      email
    };

    localStorage.setItem("crm_user", JSON.stringify(newUser));
    setUser(newUser);
    setIsLoading(false);
    
    // Log login action
    await fetch("/api/audit-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: newUser.id,
        userEmail: newUser.email,
        action: "LOGIN",
        details: "User logged in as Administrator"
      })
    }).catch(() => {});

    router.push("/");
    return true;
  };

  const logout = () => {
    if (user) {
      fetch("/api/audit-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          userEmail: user.email,
          action: "LOGOUT",
          details: `User logged out`
        })
      }).catch(() => {});
    }

    localStorage.removeItem("crm_user");
    setUser(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
