import { create } from "zustand";
import { persist } from "zustand/middleware";

export type UserRole = "student" | "advisor" | "admin";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  cohort: string | null;
}

interface AuthState {
  user: AuthUser | null;
  login: (user: AuthUser) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      login: (user) => set({ user }),
      logout: () => set({ user: null }),
    }),
    { name: "aios-auth" }
  )
);
