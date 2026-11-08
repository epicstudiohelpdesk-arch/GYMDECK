/**
 * GymDeck Communications API client (Mode A).
 * Tauri builds proxy through Rust so the cloud token never enters JS.
 * Browser/dev falls back to direct fetch with an explicitly supplied token.
 */

const CLOUD_BASE =
  (typeof window !== 'undefined' && window.__GYMDECK_CLOUD_URL__) ||
  (typeof localStorage !== 'undefined' && localStorage.getItem('gymdeck_cloud_url')) ||
  'http://localhost:3001';

const isTauri = () => typeof window !== 'undefined' && Boolean(window.__TAURI__?.core?.invoke);

async function request(method, path, body) {
  if (isTauri()) {
    let response;
    try {
      response = await window.__TAURI__.core.invoke('cloud_communications_request_command', {
        request: { method, path, body: body ?? null },
      });
    } catch (raw) {
      const message = typeof raw === 'string'
        ? raw
        : raw?.message || raw?.toString?.() || 'Desktop cloud bridge is unavailable.';
      const err = new Error(message);
      err.code = 'TAURI_IPC';
      throw err;
    }
    if (response.status >= 400) {
      const message = response.body?.error?.message || response.body?.message || `Request failed (${response.status}).`;
      const err = new Error(message);
      err.status = response.status;
      err.details = response.body?.error?.details;
      throw err;
    }
    return response.body;
  }

  const token = localStorage.getItem('gymdeck_cloud_token');
  if (!token) {
    const err = new Error('Cloud session unavailable. Enroll this device or supply a development token.');
    err.status = 401;
    throw err;
  }
  const res = await fetch(`${CLOUD_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(json?.error?.message || json?.message || `Request failed (${res.status}).`);
    err.status = res.status;
    err.details = json?.error?.details;
    throw err;
  }
  return json;
}

export const communicationsApi = {
  isTauri,
  getEnrollmentStatus: () => window.__TAURI__.core.invoke('get_cloud_enrollment_status_command'),
  enrollCloud: (payload) => window.__TAURI__.core.invoke('login_command', { payload }),
  getSettings: () => request('GET', '/v1/owner/communications/settings'),
  saveSettings: (settings) => request('PUT', '/v1/owner/communications/settings', settings),
  getAudience: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.status) qs.set('status', params.status);
    if (params.search) qs.set('search', params.search);
    if (params.limit) qs.set('limit', String(params.limit));
    return request('GET', `/v1/owner/communications/audience?${qs.toString()}`);
  },
  previewBroadcast: (payload) => request('POST', '/v1/owner/communications/broadcasts/preview', payload),
  getBroadcast: (id) => request('GET', `/v1/owner/communications/broadcasts/${id}`),
  updateProgress: (id, updates) => request('PATCH', `/v1/owner/communications/broadcasts/${id}/progress`, { updates }),
  cancelBroadcast: (id) => request('POST', `/v1/owner/communications/broadcasts/${id}/cancel`),
};

export default communicationsApi;


