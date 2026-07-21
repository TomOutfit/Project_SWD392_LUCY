// src/stores/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types/index';
import { authApi } from '@/lib/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, displayName: string, personaId: number) => Promise<boolean>;
  loginAsGuest: (displayName?: string) => Promise<boolean>;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  updateBalance: (balance: number) => void;
  updateXp: (delta: number) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await authApi.login({ email, password });
          localStorage.setItem('lucy_token', data.token);
          set({ user: data.user, token: data.token, isAuthenticated: true, isLoading: false });
          return true;
        } catch {
          set({ error: 'Invalid email or password', isLoading: false });
          return false;
        }
      },

      loginAsGuest: async (displayName) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await authApi.guest(displayName);
          localStorage.setItem('lucy_token', data.token);
          set({ user: data.user, token: data.token, isAuthenticated: true, isLoading: false });
          return true;
        } catch (err: any) {
          const msg = err?.response?.data?.error ?? 'Guest login failed';
          set({ error: msg, isLoading: false });
          return false;
        }
      },

      register: async (email, password, displayName, personaId) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await authApi.register({ email, password, displayName, personaId });
          localStorage.setItem('lucy_token', data.token);
          set({ user: data.user, token: data.token, isAuthenticated: true, isLoading: false });
          return true;
        } catch (err: any) {
          const msg = err?.response?.data?.error ?? 'Registration failed';
          set({ error: msg, isLoading: false });
          return false;
        }
      },

      logout: () => {
        localStorage.removeItem('lucy_token');
        set({ user: null, token: null, isAuthenticated: false });
      },

      updateUser: (updatedData) => {
        const user = get().user;
        if (user) set({ user: { ...user, ...updatedData } });
      },

      updateBalance: (balance) => {
        const user = get().user;
        if (user) set({ user: { ...user, walletBalance: balance } });
      },

      updateXp: (delta) => {
        const user = get().user;
        if (user) set({ user: { ...user, xp: (user.xp ?? 0) + delta } });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'lucy-auth',
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
    }
  )
);
