/**
 * api.js — Centralized API service layer
 * All backend communication goes through this file.
 */

import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const client = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('tos_admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Response interceptor: normalise errors ─────────────────────
client.interceptors.response.use(
  (res) => res,
  (err) => {
    // Expired/invalid admin session → clear token and bounce to admin login
    if (err.response?.status === 401 &&
        !err.config?.url?.includes('/api/admin/login')) {
      localStorage.removeItem('tos_admin_token');
      if (window.location.pathname.startsWith('/admin') &&
          window.location.pathname !== '/admin/login') {
        window.location.replace('/admin/login?expired=1');
      }
    }

    const message =
      err.response?.data?.message ||
      err.response?.data?.error ||
      err.message ||
      'An unexpected error occurred';
    const error = new Error(message);
    error.status = err.response?.status;
    error.data = err.response?.data; // extra fields e.g. invalidRegisterNumbers
    return Promise.reject(error);
  }
);

// ── Helper: build full asset URL ─────────────────────────────
export const assetUrl = (fileId) =>
  fileId ? `${BASE_URL}/api/assets/${fileId}` : null;

// ── Helper: build full URL for server-uploaded files (/uploads/...) ─
export const uploadUrl = (path) =>
  path ? `${BASE_URL}${path.startsWith('/') ? '' : '/'}${path}` : null;

// ── Helper: Google Drive links ─────────────────────────────────
export const driveFolderUrl = (folderId) =>
  folderId ? `https://drive.google.com/drive/folders/${folderId}` : null;

export const driveFileUrl = (fileId) =>
  fileId ? `https://drive.google.com/file/d/${fileId}/view` : null;

// ── Participant API ────────────────────────────────────────────
export const participantApi = {
  add: (data) => client.post('/api/participants/add', data),
  list: () => client.get('/api/participants'),
};

// ── Team API ───────────────────────────────────────────────────
export const teamApi = {
  register: (data) => client.post('/api/teams/register', data),
  leaderboard: () => client.get('/api/teams/leaderboard'),
};

// ── Clue API ───────────────────────────────────────────────────
export const clueApi = {
  getCurrent: (teamCode) => client.get(`/api/clues/team/${teamCode}`),
  submit: (teamCode, formData) =>
    client.post(`/api/clues/team/${teamCode}/submit`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

// ── Admin API ──────────────────────────────────────────────────
export const adminApi = {
  login: (data) => client.post('/api/admin/login', data),
  allocateSets: () => client.post('/api/admin/allocate-sets'),
  resetSets: () => client.post('/api/admin/reset-sets'),
  pendingSubmissions: () => client.get('/api/admin/submissions/pending'),
  approve: (progressId) =>
    client.post(`/api/admin/submissions/${progressId}/approve`),
  reject: (progressId, reason) =>
    client.post(`/api/admin/submissions/${progressId}/reject`, { rejectionReason: reason }),
  startTeam: (teamCode) =>
    client.post(`/api/admin/teams/${teamCode}/start`),
  allTeams: () => client.get('/api/admin/teams'),
  blockTeam: (teamCode, reason = '') =>
    client.post(`/api/admin/teams/${teamCode}/block`, { reason }),
  unblockTeam: (teamCode) =>
    client.post(`/api/admin/teams/${teamCode}/unblock`),
  disqualifyTeam: (teamCode, reason = '') =>
    client.post(`/api/admin/teams/${teamCode}/disqualify`, { reason }),
  deleteTeam: (teamCode) => client.delete(`/api/admin/teams/${teamCode}`),
  resetTeam: (teamCode) => client.post(`/api/admin/teams/${teamCode}/reset`),
  participants: () => client.get('/api/admin/participants'),
  addParticipants: (registerNumbers) =>
    client.post('/api/admin/participants', { registerNumbers }),
  deleteParticipant: (registerNumber) =>
    client.delete(`/api/admin/participants/${registerNumber}`),
};

export default client;
