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
  logout: () => void;
  updateBalance: (balance: number) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: {
        id: 1,
        email: 'pro.host@lucy.com',
        displayName: 'Professor LUCY',
        personaId: 2,
        role: 'SUPER',
        walletBalance: 1000,
      },
      token: 'mock-jwt-token-by-default-to-skip-login',
      isAuthenticated: true,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await authApi.login({ email, password });
          localStorage.setItem('lucy_token', data.token);
          localStorage.setItem('lucy_refresh', data.refreshToken);
          set({ user: data.user, token: data.token, isAuthenticated: true, isLoading: false });
          return true;
        } catch {
          set({ error: 'Invalid email or password', isLoading: false });
          return false;
        }
      },

      register: async (email, password, displayName, personaId) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await authApi.register({ email, password, displayName, personaId });
          localStorage.setItem('lucy_token', data.token);
          localStorage.setItem('lucy_refresh', data.refreshToken);
          set({ user: data.user, token: data.token, isAuthenticated: true, isLoading: false });
          return true;
        } catch {
          set({ error: 'Email already registered', isLoading: false });
          return false;
        }
      },

      logout: () => {
        // Reset to default mock user to skip login screens entirely
        set({
          user: {
            id: 1,
            email: 'pro.host@lucy.com',
            displayName: 'Professor LUCY',
            personaId: 2,
            role: 'SUPER',
            walletBalance: 1000,
          },
          token: 'mock-jwt-token-by-default-to-skip-login',
          isAuthenticated: true,
        });
      },

      updateBalance: (balance) => {
        const user = get().user;
        if (user) set({ user: { ...user, walletBalance: balance } });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'lucy-auth',
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
    }
  )
);
