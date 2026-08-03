import { create } from "zustand";
import { persist } from "zustand/middleware";
import { currentUser } from "@/services/mockData";
import type { User } from "@/types";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      login: (email: string) =>
        set({ user: { ...currentUser, email }, isAuthenticated: true }),
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    { name: "testpilot-auth" }
  )
);
