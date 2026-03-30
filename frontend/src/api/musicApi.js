import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Songs API
export const uploadSong = async (formData) => {
  const response = await axios.post(`${API}/songs/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const getSongs = async (search = '') => {
  const response = await axios.get(`${API}/songs`, {
    params: { search }
  });
  return response.data;
};

export const getSong = async (songId) => {
  const response = await axios.get(`${API}/songs/${songId}`);
  return response.data;
};

export const updateSong = async (songId, data) => {
  const response = await axios.put(`${API}/songs/${songId}`, data);
  return response.data;
};

export const deleteSong = async (songId) => {
  const response = await axios.delete(`${API}/songs/${songId}`);
  return response.data;
};

export const streamSong = (songId) => {
  return `${API}/songs/${songId}/stream`;
};

export const downloadSong = async (songId, filename) => {
  const response = await axios.get(`${API}/songs/${songId}/download`, {
    responseType: 'blob'
  });
  
  // Create download link
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
};

export const toggleLike = async (songId) => {
  const response = await axios.post(`${API}/songs/${songId}/like`);
  return response.data;
};

// Playlists API
export const createPlaylist = async (data) => {
  const response = await axios.post(`${API}/playlists`, data);
  return response.data;
};

export const getPlaylists = async () => {
  const response = await axios.get(`${API}/playlists`);
  return response.data;
};

export const getPlaylist = async (playlistId) => {
  const response = await axios.get(`${API}/playlists/${playlistId}`);
  return response.data;
};

export const updatePlaylist = async (playlistId, data) => {
  const response = await axios.put(`${API}/playlists/${playlistId}`, data);
  return response.data;
};

export const deletePlaylist = async (playlistId) => {
  const response = await axios.delete(`${API}/playlists/${playlistId}`);
  return response.data;
};

export const addSongToPlaylist = async (playlistId, songId) => {
  const response = await axios.post(`${API}/playlists/${playlistId}/songs/${songId}`);
  return response.data;
};

export const removeSongFromPlaylist = async (playlistId, songId) => {
  const response = await axios.delete(`${API}/playlists/${playlistId}/songs/${songId}`);
  return response.data;
};

// Stats API
export const getStats = async () => {
  const response = await axios.get(`${API}/stats`);
  return response.data;
};