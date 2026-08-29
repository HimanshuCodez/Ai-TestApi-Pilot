import { create } from "zustand";
import { persist } from "zustand/middleware";
import { fetchMe, loginRequest, registerRequest, type ApiUser } from "@/services/api/auth";
import { getStoredToken, setStoredToken } from "@/lib/api";
import { useProjectsStore } from "@/store/useProjectsStore";
import type { User } from "@/types";

function toDisplayUser(apiUser: ApiUser): User {
  const initials =
    apiUser.name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]!.toUpperCase())
      .join("") || "TP";
  return { id: apiUser.id, name: apiUser.name, email: apiUser.email, avatarInitials: initials, role: "Member", plan: "Free" };
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isHydrating: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isHydrating: true,

      login: async (email, password) => {
        useProjectsStore.getState().reset();
        const result = await loginRequest(email, password);
        set({ user: toDisplayUser(result.user), isAuthenticated: true });
      },

      register: async (name, email, password) => {
        useProjectsStore.getState().reset();
        const result = await registerRequest(name, email, password);
        set({ user: toDisplayUser(result.user), isAuthenticated: true });
      },

      logout: () => {
        setStoredToken(null);
        useProjectsStore.getState().reset();
        set({ user: null, isAuthenticated: false });
      },

      hydrate: async () => {
        const token = getStoredToken();
        if (!token) {
          set({ isHydrating: false, user: null, isAuthenticated: false });
          return;
        }
        try {
          const { user } = await fetchMe();
          set({ user: toDisplayUser(user), isAuthenticated: true, isHydrating: false });
        } catch {
          setStoredToken(null);
          set({ user: null, isAuthenticated: false, isHydrating: false });
        }
      },
    }),
    {
      name: "testpilot-auth",
      partialize: (s) => ({ user: s.user, isAuthenticated: s.isAuthenticated }),
    }
  )
);
