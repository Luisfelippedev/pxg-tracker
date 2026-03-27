import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AuthResponse } from "@/services/api";

interface AuthState {
  user: { id: string; email: string; role: "admin" | "user" } | null;
  accessToken: string | null;
  refreshToken: string | null;
  setSession: (payload: AuthResponse) => void;
  clearSession: () => void;
}

export const authStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setSession: (payload) =>
        set({
          user: payload.user,
          accessToken: payload.accessToken,
          refreshToken: payload.refreshToken,
        }),
      clearSession: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
        }),
    }),
    {
      name: "pxg-auth",
    },
  ),
);
