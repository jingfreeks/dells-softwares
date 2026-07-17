import { createContext, useContext, useState, type ReactNode } from "react";
import type { StaffAccount } from "./types";
import { DEMO_ADMIN, DEMO_PASSWORD } from "./mockData";

interface AuthContextValue {
  user: StaffAccount | null;
  login: (email: string, password: string) => { ok: true } | { ok: false; error: string };
  register: (input: {
    storeName: string;
    ownerName: string;
    email: string;
    password: string;
    confirmPassword: string;
  }) => { ok: true } | { ok: false; error: string };
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StaffAccount | null>(null);

  function login(email: string, password: string) {
    if (email.trim().toLowerCase() === DEMO_ADMIN.email && password === DEMO_PASSWORD) {
      setUser(DEMO_ADMIN);
      return { ok: true as const };
    }
    return { ok: false as const, error: "Incorrect email or password." };
  }

  function register(input: {
    storeName: string;
    ownerName: string;
    email: string;
    password: string;
    confirmPassword: string;
  }) {
    if (!input.storeName || !input.ownerName || !input.email) {
      return { ok: false as const, error: "All fields are required." };
    }
    if (input.password.length < 6) {
      return { ok: false as const, error: "Password must be at least 6 characters." };
    }
    if (input.password !== input.confirmPassword) {
      return { ok: false as const, error: "Passwords do not match." };
    }
    setUser({
      id: `u-${Date.now()}`,
      name: input.ownerName,
      email: input.email.trim().toLowerCase(),
      role: "admin",
    });
    return { ok: true as const };
  }

  function logout() {
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
