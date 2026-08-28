/**
 * RoadRakshak — API Client
 *
 * All backend communication goes through this module.
 * URLs are relative — Next.js rewrites proxy /api/* to Flask.
 */

// ---------------------------------------------------------------------------
// Token / user persistence (localStorage)
// ---------------------------------------------------------------------------
export function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('rr_token');
}

export function setToken(token) {
  if (typeof window !== 'undefined') localStorage.setItem('rr_token', token);
}

export function clearAuth() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('rr_token');
    localStorage.removeItem('rr_user');
  }
}

export function getStoredUser() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('rr_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user) {
  if (typeof window !== 'undefined')
    localStorage.setItem('rr_user', JSON.stringify(user));
}

// ---------------------------------------------------------------------------
// Base fetch wrapper
// ---------------------------------------------------------------------------
async function apiFetch(endpoint, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}) };

  if (token) headers['Authorization'] = `Bearer ${token}`;

  // Don't set Content-Type for FormData (browser adds multipart boundary)
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(endpoint, { ...options, headers });
  let data;
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export const login = (username, password) =>
  apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });

export const register = (username, email, password, role) =>
  apiFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, email, password, role }),
  });

export const getMe = () => apiFetch('/api/auth/me');

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------
export const getHealth = () => fetch('/api/health').then((r) => r.json());

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------
export function createReport(formData) {
  return apiFetch('/api/reports', { method: 'POST', body: formData });
}

export function getReports(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') qs.set(k, v);
  });
  const q = qs.toString();
  return apiFetch(`/api/reports${q ? '?' + q : ''}`);
}

export const getReport = (id) => apiFetch(`/api/reports/${id}`);

export const updateReport = (id, data) =>
  apiFetch(`/api/reports/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

export const deleteReport = (id) =>
  apiFetch(`/api/reports/${id}`, { method: 'DELETE' });

// ---------------------------------------------------------------------------
// Detection (standalone, no report creation)
// ---------------------------------------------------------------------------
export const detectImage = (formData) =>
  apiFetch('/api/detect', { method: 'POST', body: formData });

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
export const getStats = () => apiFetch('/api/dashboard/stats');
export const getMapData = () => apiFetch('/api/dashboard/map');

// ---------------------------------------------------------------------------
// Assignments
// ---------------------------------------------------------------------------
export const createAssignment = (data) =>
  apiFetch('/api/assignments', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateAssignment = (id, data) =>
  apiFetch(`/api/assignments/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

export function getAssignments(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') qs.set(k, v);
  });
  const q = qs.toString();
  return apiFetch(`/api/assignments${q ? '?' + q : ''}`);
}

// ---------------------------------------------------------------------------
// Repairs
// ---------------------------------------------------------------------------
export const createRepair = (formData) =>
  apiFetch('/api/repairs', { method: 'POST', body: formData });

export const verifyRepair = (id) =>
  apiFetch(`/api/repairs/${id}/verify`, { method: 'POST' });

export const getRepair = (id) => apiFetch(`/api/repairs/${id}`);

// ---------------------------------------------------------------------------
// Users (for assignment dropdowns)
// ---------------------------------------------------------------------------
export function getUsers(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') qs.set(k, v);
  });
  const q = qs.toString();
  return apiFetch(`/api/auth/users${q ? '?' + q : ''}`);
}
