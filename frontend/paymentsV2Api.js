/**
 * GymDeck Payments V2 desktop API client.
 * Tauri builds proxy through Rust so the cloud token never enters JS.
 * Browser/dev falls back to a bearer token in localStorage.
 */

const CLOUD_BASE =
  (typeof window !== 'undefined' && window.__GYMDECK_CLOUD_URL__) ||
  (typeof localStorage !== 'undefined' && localStorage.getItem('gymdeck_cloud_url')) ||
  'http://localhost:3001';

const isTauri = () => typeof window !== 'undefined' && Boolean(window.__TAURI__?.core?.invoke);

async function request(method, path, body) {
  if (isTauri()) {
    const response = await window.__TAURI__.core.invoke('cloud_communications_request_command', {
      request: { method, path, body: body ?? null },
    });
    if (response.status >= 400) {
      const message = response.body?.error?.message || response.body?.message || `Request failed (${response.status}).`;
      const err = new Error(message);
      err.status = response.status;
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
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(json?.error?.message || json?.message || `Request failed (${res.status}).`);
    err.status = res.status;
    throw err;
  }
  return json;
}

export const paymentsV2Api = {
  listPending: (limit = 50, offset = 0) =>
    request('GET', `/v1/owner/payment-reconciliation/pending?limit=${limit}&offset=${offset}`),
  listAll: (status, limit = 50, offset = 0) =>
    request('GET', `/v1/owner/payment-reconciliation/all?status=${status || ''}&limit=${limit}&offset=${offset}`),
  detail: (id) => request('GET', `/v1/owner/payment-reconciliation/${id}`),
  verify: (id, payload) => request('POST', `/v1/owner/payment-reconciliation/${id}/verify`, payload),
  reject: (id, reason) => request('POST', `/v1/owner/payment-reconciliation/${id}/reject`, { reason }),
  clarify: (id, note) => request('POST', `/v1/owner/payment-reconciliation/${id}/clarify`, { note }),
  refund: (paymentId, payload) => request('POST', `/v1/owner/payment-reconciliation/refunds/${paymentId}`, payload),
  listAccounts: () => request('GET', '/v1/owner/payment-accounts'),
  createAccount: (payload) => request('POST', '/v1/owner/payment-accounts', payload),
  updateAccount: (id, payload) => request('PATCH', `/v1/owner/payment-accounts/${id}`, payload),
  setPrimary: (id) => request('POST', `/v1/owner/payment-accounts/${id}/primary`, {}),
  deactivateAccount: (id) => request('DELETE', `/v1/owner/payment-accounts/${id}`),
  getSettings: () => request('GET', '/v1/owner/payment-accounts/settings/current'),
  updateSettings: (payload) => request('PUT', '/v1/owner/payment-accounts/settings/current', payload),
};

export default paymentsV2Api;
