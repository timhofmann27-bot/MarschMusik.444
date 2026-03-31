import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;
const api = axios.create({ baseURL: `${API}/api`, withCredentials: true });

// ─── Auth ─────────────────────────────────────────────────────────
export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (username, email, password) => api.post('/auth/register', { username, email, password }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  refresh: () => api.post('/auth/refresh'),
};

// ─── Songs ────────────────────────────────────────────────────────
export const songsApi = {
  getAll: (search) => api.get('/songs', { params: { search } }),
  get: (id) => api.get(`/songs/${id}`),
  upload: (formData, onProgress) => api.post('/songs/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => onProgress && e.total && onProgress(Math.round((e.loaded * 100) / e.total)),
  }),
  update: (id, data) => api.put(`/songs/${id}`, data),
  delete: (id) => api.delete(`/songs/${id}`),
  toggleLike: (id) => api.post(`/songs/${id}/like`),
  getLiked: () => api.get('/songs/liked/all'),
  streamUrl: (id) => `${API}/api/songs/${id}/stream`,
  download: async (id, filename) => {
    const res = await api.get(`/songs/${id}/download`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },
};

// ─── Playlists ────────────────────────────────────────────────────
export const playlistsApi = {
  getAll: () => api.get('/playlists'),
  get: (id) => api.get(`/playlists/${id}`),
  create: (data) => api.post('/playlists', data),
  update: (id, data) => api.put(`/playlists/${id}`, data),
  delete: (id) => api.delete(`/playlists/${id}`),
  addSong: (plId, songId) => api.post(`/playlists/${plId}/songs/${songId}`),
  removeSong: (plId, songId) => api.delete(`/playlists/${plId}/songs/${songId}`),
  toggleShare: (plId) => api.post(`/playlists/${plId}/share`),
  addCollaborator: (plId, email) => api.post(`/playlists/${plId}/collaborators/${encodeURIComponent(email)}`),
  removeCollaborator: (plId, email) => api.delete(`/playlists/${plId}/collaborators/${encodeURIComponent(email)}`),
  getCollaborators: (plId) => api.get(`/playlists/${plId}/collaborators`),
  getShared: (shareId) => api.get(`/shared/${shareId}`),
};

// ─── Other ────────────────────────────────────────────────────────
export const statsApi = {
  get: () => api.get('/stats'),
  weekly: () => api.get('/stats/weekly'),
};

export const searchApi = {
  search: (q) => api.get('/search', { params: { q } }),
};

export const artistsApi = {
  getAll: () => api.get('/artists'),
  getSongs: (name) => api.get(`/artists/${encodeURIComponent(name)}/songs`),
};

export const albumsApi = {
  getAll: () => api.get('/albums'),
  getSongs: (name) => api.get(`/albums/${encodeURIComponent(name)}/songs`),
};

export const historyApi = {
  getAll: (limit = 20) => api.get('/history', { params: { limit } }),
  add: (songId) => api.post(`/history/${songId}`),
  getStats: () => api.get('/history/stats'),
};

export const usersApi = {
  getProfile: () => api.get('/users/me'),
  updateProfile: (data) => api.put('/users/me', data),
  uploadAvatar: (formData) => api.post('/users/me/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};
