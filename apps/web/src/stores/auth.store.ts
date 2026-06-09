import { create } from "zustand";

export interface AuthUser {
  name: string;
  email: string;
  role: string;
}

interface AuthStore {
  user: AuthUser | null;
  access_token: string | null;
  hydrated: boolean;
  hasSession: boolean;
  setAuth(token: string, user: AuthUser): void;
  clearAuth(): void;
  setHydrated(): void;
}

const getInitialSession = () => {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("auth_user") === "true";
};

export const useAuthStore = create<AuthStore>()((set) => ({
  user: null,
  access_token: null,
  hydrated: false,
  hasSession: getInitialSession(),

  setAuth: (token, user) => {
    localStorage.setItem("auth_user", "true");
    set({ access_token: token, user, hasSession: true });
  },

  clearAuth: () => {
    localStorage.removeItem("auth_user");
    set({ access_token: null, user: null, hasSession: false });
  },

  setHydrated: () => set({ hydrated: true }),
}));
