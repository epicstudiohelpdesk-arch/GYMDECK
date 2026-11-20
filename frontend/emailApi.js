/**
 * GymDeck Email API client.
 *
 * All calls go through the authenticated cloud bridge
 * (`cloud_communications_request_command`) in Tauri, so the cloud session token
 * never enters frontend JavaScript; all requests are tenant-scoped by the server.
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
      const message =
        typeof raw === 'string'
          ? raw
          : raw?.message || raw?.toString?.() || 'Desktop cloud bridge is unavailable.';
      const err = new Error(message);
      err.code = 'TAURI_IPC';
      throw err;
    }

    if (response.status >= 400) {
      const message =
        response.body?.error?.message ||
        response.body?.message ||
        `Request failed (${response.status}).`;
      const err = new Error(message);
      err.status = response.status;
      err.code = response.body?.error?.code;
      err.details = response.body?.error?.details;
      throw err;
    }
    return response.body;
  }

  const token = localStorage.getItem('gymdeck_cloud_token');
  if (!token) {
    const err = new Error('Cloud session unavailable. Sign in to GymDeck Cloud first.');
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
    err.code = json?.error?.code;
    err.details = json?.error?.details;
    throw err;
  }
  return json;
}

async function data(method, path, body) {
  const response = await request(method, path, body);
  return response?.data;
}

function queryString(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    if (Array.isArray(value)) qs.set(key, value.join(','));
    else qs.set(key, String(value));
  });
  const text = qs.toString();
  return text ? `?${text}` : '';
}

export const emailApi = {
  isTauri,

  getOverview: () => data('GET', '/v1/owner/email/overview'),
  getRecipients: (params) => data('GET', `/v1/owner/email/recipients${queryString(params)}`),
  sendEmail: (payload) => data('POST', '/v1/owner/email/send', payload),
  getDrafts: () => data('GET', '/v1/owner/email/drafts'),
  saveDraft: (payload) => data('POST', '/v1/owner/email/drafts', payload),
  deleteDraft: (id) => data('DELETE', `/v1/owner/email/drafts/${encodeURIComponent(id)}`),
  getHistory: (params) => data('GET', `/v1/owner/email/history${queryString(params)}`),
  getMessageDetails: (id) => data('GET', `/v1/owner/email/messages/${encodeURIComponent(id)}`),
  getTemplates: () => data('GET', '/v1/owner/email/templates'),
  createTemplate: (payload) => data('POST', '/v1/owner/email/templates', payload),
};
