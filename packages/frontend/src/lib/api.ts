// src/lib/api.ts
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

function attachLatencyTracker(axiosInstance: any, telemetryEndpoint: string) {
  axiosInstance.interceptors.request.use((config: any) => {
    if (!config.url?.includes('/telemetry/') && !config.url?.includes('/latency/')) {
      config.metadata = { startTime: Date.now() };
    }
    return config;
  });

  axiosInstance.interceptors.response.use(
    (response: any) => {
      const startTime = response.config?.metadata?.startTime;
      if (startTime) {
        const totalMs = Date.now() - startTime;
        const serverTiming = response.headers['server-timing'];
        let serverMs = 0;
        if (serverTiming) {
          const match = /dur=([\d.]+)/.exec(serverTiming);
          if (match) serverMs = parseFloat(match[1]);
        }
        const networkMs = Math.max(0, totalMs - serverMs);
        
        fetch(telemetryEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: response.config.url || '',
            method: response.config.method || 'GET',
            totalMs,
            serverMs,
            networkMs,
          }),
        }).catch(() => {});
      }
      return response;
    },
    (error: any) => {
      const startTime = error.config?.metadata?.startTime;
      if (startTime) {
        const totalMs = Date.now() - startTime;
        fetch(telemetryEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: error.config.url || '',
            method: error.config.method || 'GET',
            totalMs,
            serverMs: 0,
            networkMs: totalMs,
          }),
        }).catch(() => {});
      }
      return Promise.reject(error);
    }
  );
}

attachLatencyTracker(api, `${API_BASE}/telemetry/log-latency`);


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
      localStorage.removeItem('lucy-auth');
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
  guest: (displayName?: string) =>
    api.post('/auth/guest', { displayName }),
};

// Users
export const usersApi = {
  me: () => api.get('/users/me'),
  leaderboard: () => api.get('/users/leaderboard'),
  updateMe: (data: { displayName?: string; personaId?: number }) => api.put('/users/me', data),
  deleteMe: () => api.delete('/users/me'),
};

// Wallet
export const walletApi = {
  get: () => api.get('/wallet'),
  deposit: (amount: number) => api.post('/wallet/deposit', { amount }),
  updateBalance: (amount: number) => api.put('/wallet', { amount }),
  clearHistory: () => api.delete('/wallet'),
  sendGift: (data: { recipientEmail: string; roomId: string; giftType: string; amount: number }) =>
    api.post('/gifts/send', data),
};

// Levels
// In production (Docker), VITE_NJS_URL is unset → empty string → same origin
// nginx proxies /api/levels, /api/rooms, /api/agora, /socket.io/ → NJS :3001
export const njsApi = axios.create({
  baseURL: import.meta.env.VITE_NJS_URL || '',
  headers: { 'Content-Type': 'application/json' },
});

attachLatencyTracker(njsApi, `${import.meta.env.VITE_NJS_URL || ''}/api/latency/log`);


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
  listen: (id: string) => njsApi.post(`/api/podcasts/${id}/listen`),
  updateTitle: (id: string, title: string) => njsApi.patch(`/api/podcasts/${id}`, { title }),
};
