'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthUser {
  id: string;
  email: string;
  nombre: string;
  rol: 'ADMIN' | 'VENDEDOR' | 'CLIENTE';
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  setAuth: (user: AuthUser, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  refreshSession: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,

      login: async (email: string, password: string) => {
        const res = await fetch('/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || 'Error al iniciar sesión');
        }

        const data = await res.json();
        set({
          user: data.user,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        });
      },


      setAuth: (user: AuthUser, accessToken: string, refreshToken: string) => {
        set({ user, accessToken, refreshToken });
      },

      logout: () => {
        set({ user: null, accessToken: null, refreshToken: null });
      },

      refreshSession: async () => {
        const { refreshToken } = get();
        if (!refreshToken) return false;
        try {
          const res = await fetch('/api/v1/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });

          if (!res.ok) {
            get().logout();
            return false;
          }

          const data = await res.json();
          set({
            user: data.user,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
          });
          return true;
        } catch {
          get().logout();
          return false;
        }
      },
    }),
    {
      name: 'kairosmix-auth',
    }
  )
);
