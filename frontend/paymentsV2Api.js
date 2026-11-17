/**
 * GymDeck Payments V2 desktop API client.
 *
 * Receiving / Banking & Settlement accounts are persisted locally, per signed-in
 * gym, in the SQLCipher database through narrow Tauri commands. This makes the
 * desktop vault the source of truth: details survive logout/login and remain
 * isolated to the gym account that created them, even when the cloud is offline.
 *
 * Reconciliation endpoints stay cloud-only (they are not account-owned state).
 * Browser/dev preview falls back to a scoped localStorage store because the
 * native IPC boundary is unavailable there.
 */

const CLOUD_BASE =
  (typeof window !== 'undefined' && window.__GYMDECK_CLOUD_URL__) ||
  (typeof localStorage !== 'undefined' && localStorage.getItem('gymdeck_cloud_url')) ||
  'http://localhost:3001';

const isTauri = () => typeof window !== 'undefined' && Boolean(window.__TAURI__?.core?.invoke);

async function invokeLocal(command, args = {}) {
  const response = await window.__TAURI__.core.invoke(command, args);
  if (response && response.success === false) {
    throw new Error(response?.error?.message || 'Banking database request failed.');
  }
  return response;
}

/* -------------------------------------------------------------------------- */
/* Browser preview fallback (no native DB available)                           */
/* -------------------------------------------------------------------------- */

const BROWSER_STORE_KEY = 'gymdeck_bank_accounts_db';

function browserAccounts() {
  try {
    const parsed = JSON.parse(localStorage.getItem(BROWSER_STORE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistBrowserAccounts(accounts) {
  localStorage.setItem(BROWSER_STORE_KEY, JSON.stringify(accounts));
  return accounts;
}

function maskAccountNumber(number) {
  const digits = String(number || '').replace(/\D/g, '');
  return digits.length >= 4 ? `•••• •••• ${digits.slice(-4)}` : null;
}

const browserAccountsApi = {
  listAccounts: async () => ({ success: true, data: { accounts: browserAccounts() } }),
  createAccount: async (payload) => {
    const account = {
      id: `acc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      method: payload.method,
      label: payload.label || null,
      status: 'UNVERIFIED',
      isActive: true,
      isPrimary: Boolean(payload.isPrimary),
      beneficiaryName: payload.beneficiaryName,
      upiVpa: payload.upiVpa || null,
      bankName: payload.bankName || null,
      accountType: payload.accountType || null,
      accountNumberMasked: maskAccountNumber(payload.accountNumber),
      ifscCode: payload.ifscCode || null,
      branchName: payload.branchName || null,
      branchCity: payload.branchCity || null,
      qrImageUrl: payload.qrImageUrl || null,
      instructions: payload.instructions || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const accounts = browserAccounts();
    if (account.isPrimary) {
      accounts.forEach((a) => { if (a.method === account.method) a.isPrimary = false; });
    }
    persistBrowserAccounts([...accounts, account]);
    return { success: true, data: { account } };
  },
  updateAccount: async (id, payload) => {
    const accounts = browserAccounts();
    const index = accounts.findIndex((a) => a.id === id);
    if (index === -1) throw new Error('Payment account not found in this gym.');
    const current = accounts[index];
    const next = {
      ...current,
      ...payload,
      accountNumberMasked: payload.accountNumber
        ? maskAccountNumber(payload.accountNumber)
        : current.accountNumberMasked,
      updatedAt: new Date().toISOString(),
    };
    delete next.accountNumber;
    delete next.confirmAccountNumber;
    accounts[index] = next;
    persistBrowserAccounts(accounts);
    return { success: true, data: { account: next } };
  },
  setPrimary: async (id) => {
    const accounts = browserAccounts();
    const target = accounts.find((a) => a.id === id);
    if (!target) throw new Error('Payment account not found in this gym.');
    accounts.forEach((a) => { if (a.method === target.method) a.isPrimary = a.id === id; });
    persistBrowserAccounts(accounts);
    return { success: true, data: { account: accounts.find((a) => a.id === id) } };
  },
  deactivateAccount: async (id) => {
    const accounts = browserAccounts().map((a) =>
      a.id === id ? { ...a, isActive: false, isPrimary: false, status: 'DISABLED' } : a
    );
    persistBrowserAccounts(accounts);
    return { success: true, data: { account: accounts.find((a) => a.id === id) } };
  },
};

/* -------------------------------------------------------------------------- */
/* Cloud transport (reconciliation + non-native account access)                 */
/* -------------------------------------------------------------------------- */

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

const LOCAL_COMMANDS = {
  listAccounts: () => ['payment_accounts_list_command', {}],
  createAccount: (payload) => ['payment_accounts_create_command', { payload }],
  updateAccount: (id, payload) => ['payment_accounts_update_command', { id, payload }],
  setPrimary: (id) => ['payment_accounts_set_primary_command', { id }],
  deactivateAccount: (id) => ['payment_accounts_deactivate_command', { id }],
};

async function accountRequest(name, ...args) {
  if (isTauri()) {
    const [command, invokeArgs] = LOCAL_COMMANDS[name](...args);
    return invokeLocal(command, invokeArgs);
  }
  if (typeof localStorage !== 'undefined') {
    return browserAccountsApi[name](...args);
  }
  // Extremely rare: no native bridge, no storage. Surface a clear failure.
  throw new Error('Banking persistence is unavailable in this environment.');
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

  // Banking & Settlement — local, per-gym database in the desktop app.
  listAccounts: () => accountRequest('listAccounts'),
  createAccount: (payload) => accountRequest('createAccount', payload),
  updateAccount: (id, payload) => accountRequest('updateAccount', id, payload),
  setPrimary: (id) => accountRequest('setPrimary', id),
  deactivateAccount: (id) => accountRequest('deactivateAccount', id),

  // Payment preferences still live in the cloud tenant record.
  getSettings: () => request('GET', '/v1/owner/payment-accounts/settings/current'),
  updateSettings: (payload) => request('PUT', '/v1/owner/payment-accounts/settings/current', payload),
};

if (typeof window !== 'undefined') {
  window.paymentsV2Api = paymentsV2Api;
}

export default paymentsV2Api;
