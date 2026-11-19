import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  QrCode,
  RefreshCw,
  Smartphone,
  Unplug,
  X,
} from 'lucide-react';
import { whatsappApi } from './whatsappApi.js';

const STATUS_STYLES = {
  NOT_CONNECTED: {
    label: 'Not connected',
    tone: 'amber',
    help: 'Link the gym WhatsApp once by scanning a QR code.',
  },
  CONNECTING: {
    label: 'Scan QR to connect',
    tone: 'sky',
    help: 'Open WhatsApp on the gym phone, go to Linked devices, and scan this code.',
  },
  CONNECTED: {
    label: 'Connected',
    tone: 'emerald',
    help: 'Messages are sent through the gym’s linked WhatsApp account.',
  },
  DISCONNECTED: {
    label: 'Disconnected',
    tone: 'zinc',
    help: 'Reconnect to link WhatsApp again.',
  },
  REAUTHORIZATION_REQUIRED: {
    label: 'Reconnect required',
    tone: 'amber',
    help: 'The linked device is no longer authorised. Reconnect and scan a new code.',
  },
  CONNECTION_EXPIRED: {
    label: 'Connection expired',
    tone: 'amber',
    help: 'The linked device expired. Reconnect to keep sending.',
  },
  ERROR: {
    label: 'Connection error',
    tone: 'rose',
    help: 'The WhatsApp gateway could not verify this connection.',
  },
  RESTRICTED: {
    label: 'Restricted',
    tone: 'rose',
    help: 'WhatsApp has restricted this account.',
  },
};

const TONE_CLASSES = {
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  rose: 'bg-rose-50 text-rose-700 border-rose-200',
  sky: 'bg-sky-50 text-sky-700 border-sky-200',
  zinc: 'bg-zinc-50 text-zinc-600 border-zinc-200',
};

export default function WhatsAppConnectionCard({ compact = false, onStatusChange }) {
  const [connection, setConnection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);

  const load = useCallback(async () => {
    try {
      setError('');
      const data = await whatsappApi.getConnection();
      setConnection(data);
      if (onStatusChange) onStatusChange(data);
    } catch (err) {
      setError(err.message || 'Could not read the WhatsApp connection status.');
    } finally {
      setLoading(false);
    }
  }, [onStatusChange]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    // Poll while the QR is waiting to be scanned so the card advances to
    // Connected without the owner pressing refresh.
    if (!connection || connection.connectionStatus !== 'CONNECTING') return undefined;
    const timer = setInterval(load, 3000);
    return () => clearInterval(timer);
  }, [connection, load]);

  const status =
    connection?.gatewayReachable === false
      ? 'ERROR'
      : connection?.connectionStatus || 'NOT_CONNECTED';
  const style = STATUS_STYLES[status] || STATUS_STYLES.NOT_CONNECTED;
  const tone = TONE_CLASSES[style.tone] || TONE_CLASSES.zinc;

  const handleConnect = async () => {
    setBusy('connect');
    setError('');
    setNotice('');
    try {
      const result = await whatsappApi.connect();
      setConnection(result);
      if (result?.qrCode) {
        setNotice('Scan the QR code with the gym phone to finish linking WhatsApp.');
      } else if (result?.connectionStatus === 'CONNECTED') {
        setNotice('WhatsApp is already linked.');
      }
    } catch (err) {
      setError(err.message || 'Could not start the WhatsApp session.');
    } finally {
      setBusy('');
    }
  };

  const handleVerify = async () => {
    setBusy('verify');
    setError('');
    try {
      await whatsappApi.verifyConnection();
      setNotice('Connection refreshed.');
      await load();
    } catch (err) {
      setError(err.message || 'Could not refresh the connection.');
    } finally {
      setBusy('');
    }
  };

  const handleDisconnect = async () => {
    setShowDisconnectModal(false);
    setBusy('disconnect');
    setError('');
    try {
      await whatsappApi.disconnect();
      setConnection(null);
      setNotice('WhatsApp disconnected.');
      await load();
    } catch (err) {
      setError(err.message || 'Could not disconnect WhatsApp.');
    } finally {
      setBusy('');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[11px] text-zinc-500 py-1">
        <Loader2 size={13} className="animate-spin" />
        Checking WhatsApp connection…
      </div>
    );
  }

  const canConnect = [
    'NOT_CONNECTED',
    'DISCONNECTED',
    'CONNECTION_EXPIRED',
    'REAUTHORIZATION_REQUIRED',
    'ERROR',
  ].includes(status);
  const isLive = status === 'CONNECTED';
  const qrCode = connection?.qrCode;

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      <div className={`flex items-center gap-1.5 text-[11px] font-medium border px-3 py-1.5 rounded-xl ${tone}`}>
        {isLive ? <CheckCircle2 size={13} className="shrink-0" /> : <AlertCircle size={13} className="shrink-0" />}
        <span className="truncate">{style.label}</span>
        {connection?.businessPhoneNumber ? (
          <span className="text-[10px] opacity-75 truncate">{connection.businessPhoneNumber}</span>
        ) : null}
      </div>

      <p className="text-[11px] text-zinc-500 leading-relaxed">
        {connection?.ownerMessage || style.help}
      </p>

      {notice ? (
        <p className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          {error}
        </p>
      ) : null}

      {qrCode ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-3 flex flex-col items-center gap-2">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            <QrCode size={12} /> WhatsApp linked device
          </div>
          <img
            src={qrCode}
            alt="WhatsApp linking QR code"
            className="w-44 h-44 object-contain"
          />
          <p className="text-[10px] text-zinc-500 text-center leading-relaxed">
            WhatsApp → Settings → Linked devices → Link a device. The code refreshes automatically.
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {canConnect || status === 'CONNECTING' ? (
          <button
            type="button"
            onClick={handleConnect}
            disabled={Boolean(busy)}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-zinc-900 text-white text-[11px] font-semibold hover:bg-zinc-800 disabled:opacity-60"
          >
            {busy === 'connect' ? <Loader2 size={12} className="animate-spin" /> : <Smartphone size={12} />}
            {status === 'NOT_CONNECTED' ? 'Connect WhatsApp' : status === 'CONNECTING' ? 'Refresh QR' : 'Reconnect WhatsApp'}
          </button>
        ) : null}

        {status === 'CONNECTED' ? (
          <>
            <button
              type="button"
              onClick={handleVerify}
              disabled={Boolean(busy)}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-zinc-200 bg-white text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
            >
              {busy === 'verify' ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
              Refresh status
            </button>
            <button
              type="button"
              onClick={() => setShowDisconnectModal(true)}
              disabled={Boolean(busy)}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-rose-200 bg-white text-[11px] font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60 cursor-pointer"
            >
              {busy === 'disconnect' ? <Loader2 size={12} className="animate-spin" /> : <Unplug size={12} />}
              Disconnect
            </button>
          </>
        ) : null}

        <button
          type="button"
          onClick={() => setShowHelp(true)}
          className="inline-flex items-center gap-1 h-8 px-2 rounded-lg text-[11px] font-medium text-zinc-500 hover:text-zinc-800"
        >
          <QrCode size={12} />
          How it works
        </button>
      </div>

      {showHelp && typeof document !== 'undefined' ? (
        createPortal(
          <div 
            className="fixed inset-0 z-[100000] flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4 transition-all duration-200 animate-in fade-in"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowHelp(false);
            }}
          >
            <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200/90 overflow-hidden transform transition-all duration-200">
              <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-slate-100 bg-white">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight">Link WhatsApp by QR</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Connect your gym’s phone in 4 quick steps.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowHelp(false)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="p-5 space-y-3 bg-white">
                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="w-5 h-5 rounded-md bg-emerald-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                    1
                  </span>
                  <div className="text-xs text-slate-700 leading-snug">
                    <span className="font-semibold text-slate-900">Open WhatsApp</span> on your gym phone.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="w-5 h-5 rounded-md bg-emerald-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                    2
                  </span>
                  <div className="text-xs text-slate-700 leading-snug">
                    Go to <span className="font-semibold text-slate-900">Settings</span> (or ⋮ menu) &rarr; tap <span className="font-semibold text-slate-900">Linked devices</span>.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="w-5 h-5 rounded-md bg-emerald-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                    3
                  </span>
                  <div className="text-xs text-slate-700 leading-snug">
                    Tap <span className="font-semibold text-slate-900">Link a device</span> to open the camera scanner.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="w-5 h-5 rounded-md bg-emerald-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                    4
                  </span>
                  <div className="text-xs text-slate-700 leading-snug">
                    Scan the <span className="font-semibold text-slate-900">QR code</span> shown on GymDeck screen.
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end px-5 py-3.5 border-t border-slate-100 bg-slate-50/70 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => setShowHelp(false)}
                  className="inline-flex items-center justify-center h-8 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold tracking-wide shadow-xs hover:shadow transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      ) : null}

      {/* Disconnect Confirmation Modal (Styled identically to Logout Dialog with Enhanced Spacing & Official WhatsApp Icon) */}
      {showDisconnectModal && typeof document !== 'undefined' ? (
        createPortal(
          <div 
            className="fixed inset-0 z-[100000] flex items-center justify-center p-4 sm:p-6 transition-all duration-200 animate-in fade-in"
            style={{
              background: 'rgba(14, 18, 28, 0.44)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget && !busy) setShowDisconnectModal(false);
            }}
          >
            <div 
              className="w-full max-w-[430px] rounded-[32px] p-8 transition-all duration-200 text-left"
              style={{
                background: 'rgba(255, 255, 255, 0.98)',
                border: '1px solid rgba(255, 255, 255, 0.9)',
                boxShadow: '0 32px 80px rgba(15, 23, 42, 0.22)',
              }}
            >
              <div className="mb-3">
                <p className="logout-dialog-kicker" style={{ margin: 0 }}>Confirm action</p>
              </div>

              <h2 className="text-slate-900 font-extrabold tracking-tight flex items-center flex-wrap gap-2.5" style={{ fontSize: '1.65rem', lineHeight: '1.25' }}>
                <span>Disconnect</span>
                <span 
                  className="inline-flex items-center gap-2"
                  style={{
                    color: '#25D366',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                    fontWeight: 800,
                    letterSpacing: '-0.02em',
                  }}
                >
                  <img 
                    src="/whatsapp-logo.png" 
                    alt="WhatsApp" 
                    className="w-7 h-7 object-contain inline-block shrink-0 -mt-0.5"
                  />
                  <span>WhatsApp</span>
                </span>
                <span>?</span>
              </h2>

              <p 
                id="logout-dialog-copy"
                className="text-slate-500 font-normal leading-relaxed"
                style={{
                  margin: '16px 0 0',
                  fontSize: '0.88rem',
                  lineHeight: '1.6',
                  color: '#556070',
                }}
              >
                Queued messages, automated renewal reminders, and instant digital receipts will pause until you scan and reconnect the gym's official phone.
              </p>

              <div 
                className="logout-dialog-actions"
                style={{
                  marginTop: '28px',
                  display: 'flex',
                  gap: '14px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowDisconnectModal(false)}
                  disabled={busy === 'disconnect'}
                  className="dialog-btn dialog-btn-muted cursor-pointer"
                  style={{
                    minHeight: '48px',
                    borderRadius: '16px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={busy === 'disconnect'}
                  className="dialog-btn dialog-btn-danger cursor-pointer"
                  style={{
                    minHeight: '48px',
                    borderRadius: '16px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                  }}
                >
                  {busy === 'disconnect' ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Disconnecting…</span>
                    </>
                  ) : (
                    <>
                      <span>Disconnect</span>
                      <svg viewBox="0 0 24 24" aria-hidden="true" className="btn-arrow-icon" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      ) : null}
    </div>
  );
}
