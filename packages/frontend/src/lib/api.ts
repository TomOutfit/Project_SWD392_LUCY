// src/lib/api.ts
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('lucy_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Redirect to login on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('lucy_token');
      localStorage.removeItem('lucy_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Auth
export const authApi = {
  register: (data: { email: string; password: string; displayName: string; personaId: number }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
};

// Users
export const usersApi = {
  me: () => api.get('/users/me'),
  leaderboard: () => api.get('/users/leaderboard'),
};

// Wallet
export const walletApi = {
  get: () => api.get('/wallet'),
  deposit: (amount: number) => api.post('/wallet/deposit', { amount }),
  sendGift: (data: { recipientEmail: string; roomId: string; giftType: string; amount: number }) =>
    api.post('/gifts/send', data),
};

// Levels
export const njsApi = axios.create({
  baseURL: import.meta.env.VITE_NJS_URL || 'http://localhost:3001',
  headers: { 'Content-Type': 'application/json' },
});

export const levelsApi = {
  all: () => njsApi.get('/api/levels'),
  byLang: (lang: string) => njsApi.get(`/api/levels/lang/${lang}`),
  byId: (id: number) => njsApi.get(`/api/levels/${id}`),
};

export const roomsApi = {
  all: (lang?: string) => lang ? njsApi.get(`/api/rooms?lang=${lang}`) : njsApi.get('/api/rooms'),
  active: () => njsApi.get('/api/rooms/active'),
  create: (data: any) => njsApi.post('/api/rooms', data),
  agoraToken: (channelName: string, uid: number) =>
    njsApi.get('/api/agora/token', { params: { channelName, uid } }),
  uploadDoc: (roomId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return njsApi.post(`/api/rooms/${roomId}/upload-doc`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export const podcastsApi = {
  all: () => njsApi.get('/api/podcasts'),
};
