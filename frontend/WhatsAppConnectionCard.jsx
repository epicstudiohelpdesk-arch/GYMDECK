import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Loader2,
  QrCode,
  Radio,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Unplug,
  Wifi,
  WifiOff,
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
  const [showConnectModal, setShowConnectModal] = useState(false);
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
    // Poll faster (every 1200ms) so QR and Connected states appear immediately.
    if (!connection || connection.connectionStatus !== 'CONNECTING') return undefined;
    const timer = setInterval(load, 1200);
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
    setShowConnectModal(true);
    try {
      const result = await whatsappApi.connect();
      setConnection(result);
      if (result?.connectionStatus === 'CONNECTED') {
        setNotice('WhatsApp connected successfully.');
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
      setTimeout(() => {
        setNotice((current) => (current === 'Connection refreshed.' ? '' : current));
      }, 1300);
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
    setNotice('');
    try {
      await whatsappApi.disconnect();
      setConnection(null);
      await load();
    } catch (err) {
      setError(err.message || 'Could not disconnect WhatsApp.');
    } finally {
      setBusy('');
    }
  };

  const handleCancelLinking = async () => {
    setShowConnectModal(false);
    setBusy('cancel');
    setError('');
    setNotice('');
    try {
      await whatsappApi.disconnect();
      setConnection(null);
      await load();
    } catch (err) {
      setError(err.message || 'Could not cancel WhatsApp setup.');
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
    <div className={compact ? 'space-y-3' : 'space-y-3.5'}>
      {/* ─── GRAPHICAL ENTERPRISE CONNECTION CARD (SOLID WHATSAPP GREEN) ─── */}
      <div 
        className="rounded-2xl border p-5 transition-all duration-200 text-white shadow-md relative overflow-hidden"
        style={{
          backgroundColor: '#40c351',
          borderColor: '#36ab46',
          boxShadow: '0 10px 28px -4px rgba(64, 195, 81, 0.28)',
        }}
      >
        {/* Top Section: Header with Official Logo, Title, Phone Pill, and Telemetry Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Official WhatsApp Brand Icon Container */}
            <div 
              className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-white shadow-xs border border-white/70"
            >
              <img 
                src="/whatsapp-logo.png" 
                alt="WhatsApp" 
                className="w-7 h-7 object-contain shrink-0"
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span 
                  className="text-base font-extrabold tracking-tight text-white flex items-center gap-2"
                  style={{
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                  }}
                >
                  WhatsApp Line
                </span>

                {isLive ? (
                  <span className="inline-flex items-center gap-1.5 font-bold text-[11px] text-emerald-950 bg-white/95 px-2.5 py-0.5 rounded-full shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Online
                  </span>
                ) : status === 'CONNECTING' ? (
                  <span className="inline-flex items-center gap-1.5 font-bold text-[11px] text-white bg-black/20 px-2.5 py-0.5 rounded-full">
                    <Loader2 size={10} className="animate-spin text-white" />
                    Pairing…
                  </span>
                ) : null}

                {connection?.businessPhoneNumber ? (
                  <span className="text-[11px] font-mono font-bold text-emerald-950 bg-white/95 px-2.5 py-0.5 rounded-md shadow-2xs truncate">
                    {connection.businessPhoneNumber}
                  </span>
                ) : null}
              </div>

              <p className="text-xs text-white/90 mt-1 leading-snug font-medium">
                {isLive 
                  ? 'Active companion pipeline • Sending automated PDF invoices and renewal notices.'
                  : status === 'CONNECTING'
                  ? 'Awaiting QR scan from official gym phone.'
                  : 'Link the gym phone to enable automated fee receipts, renewal alerts, and member chat.'}
              </p>
            </div>
          </div>

          {/* Right Status Indicator */}
          <div className="shrink-0 self-start sm:self-center">
            {isLive ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-950 bg-white px-3 py-1.5 rounded-xl shadow-xs border border-white/60">
                <ShieldCheck size={14} strokeWidth={2.5} className="text-emerald-600" /> Connected
              </span>
            ) : status === 'CONNECTING' ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-white bg-black/25 px-3 py-1.5 rounded-xl shadow-xs">
                <Loader2 size={12} className="animate-spin" /> Ready for Scan
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/90 bg-black/20 px-3 py-1.5 rounded-xl">
                <Unplug size={13} strokeWidth={2} /> Disconnected
              </span>
            )}
          </div>
        </div>

        {/* Bottom Section: Integrated Action Buttons Side by Side Inside The Card */}
        <div className="mt-4 pt-3.5 border-t border-white/20 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {canConnect || status === 'CONNECTING' ? (
              <button
                type="button"
                onClick={() => {
                  if (status === 'CONNECTING' && qrCode) {
                    setShowConnectModal(true);
                  } else {
                    handleConnect();
                  }
                }}
                disabled={Boolean(busy)}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 disabled:opacity-60 cursor-pointer transition-colors shadow-xs"
              >
                {busy === 'connect' ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Smartphone size={13} />
                )}
                <span>
                  {status === 'NOT_CONNECTED' 
                    ? 'Connect WhatsApp' 
                    : status === 'CONNECTING' 
                    ? 'Refresh QR' 
                    : 'Reconnect WhatsApp'}
                </span>
              </button>
            ) : null}

            {status === 'CONNECTING' ? (
              <button
                type="button"
                onClick={handleCancelLinking}
                disabled={Boolean(busy)}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-white/90 hover:bg-white text-xs font-bold text-slate-700 hover:text-slate-900 disabled:opacity-60 cursor-pointer transition-colors shadow-2xs"
              >
                {busy === 'cancel' ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <X size={13} className="text-slate-500" />
                )}
                <span>Cancel setup</span>
              </button>
            ) : null}

            {status === 'CONNECTED' ? (
              <>
                <button
                  type="button"
                  onClick={handleVerify}
                  disabled={Boolean(busy)}
                  className="group relative inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-white text-xs font-bold text-slate-800 hover:text-slate-950 shadow-xs hover:shadow transition-all disabled:opacity-50 cursor-pointer border border-white/40"
                >
                  {busy === 'verify' ? (
                    <Loader2 size={13} className="animate-spin text-emerald-600" />
                  ) : (
                    <RefreshCw size={13} className="text-slate-500 group-hover:text-slate-900 group-hover:rotate-45 transition-transform" />
                  )}
                  <span>Refresh status</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowDisconnectModal(true)}
                  disabled={Boolean(busy)}
                  className="group inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-xs font-bold text-white shadow-xs hover:shadow transition-all disabled:opacity-50 cursor-pointer"
                >
                  {busy === 'disconnect' ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Unplug size={13} className="text-white/80 group-hover:text-white transition-colors" />
                  )}
                  <span>Disconnect</span>
                </button>
              </>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => setShowHelp(true)}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-semibold text-white/95 hover:text-white hover:bg-white/15 transition-colors cursor-pointer ml-auto"
          >
            <QrCode size={13} className="text-white/90" />
            <span>How it works</span>
          </button>
        </div>
      </div>

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

      {/* Interactive QR Code Connection Modal (Displays when user clicks Connect / Reconnect WhatsApp) */}
      {showConnectModal && typeof document !== 'undefined' ? (
        createPortal(
          <div 
            className="fixed inset-0 z-[100000] flex items-center justify-center p-4 sm:p-6 transition-all duration-200 animate-in fade-in"
            style={{
              background: 'rgba(14, 18, 28, 0.44)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget && !busy) handleCancelLinking();
            }}
          >
            <div 
              className="w-full max-w-[440px] rounded-[32px] p-8 transition-all duration-200 text-left relative"
              style={{
                background: 'rgba(255, 255, 255, 0.98)',
                border: '1px solid rgba(255, 255, 255, 0.9)',
                boxShadow: '0 32px 80px rgba(15, 23, 42, 0.22)',
              }}
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={handleCancelLinking}
                disabled={Boolean(busy)}
                className="absolute top-6 right-6 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
                aria-label="Close"
              >
                <X size={17} />
              </button>

              <div className="mb-2">
                <p className="logout-dialog-kicker" style={{ margin: 0 }}>
                  {isLive ? 'Success' : 'QR Authentication'}
                </p>
              </div>

              {/* Title with Official WhatsApp Branding */}
              <h2 className="text-slate-900 font-extrabold tracking-tight flex items-center flex-wrap gap-2.5" style={{ fontSize: '1.65rem', lineHeight: '1.25' }}>
                <span>{isLive ? 'Connected to' : 'Connect'}</span>
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
                {isLive ? <span className="text-emerald-600">!</span> : null}
              </h2>

              <p 
                className="text-slate-500 font-normal leading-relaxed"
                style={{
                  margin: '10px 0 16px',
                  fontSize: '0.86rem',
                  lineHeight: '1.5',
                  color: '#556070',
                }}
              >
                {isLive ? (
                  <>
                    WhatsApp connection established successfully. Your gym companion pipeline is now online and active.
                  </>
                ) : (
                  <>
                    Open WhatsApp on the gym phone &rarr; <strong>Settings</strong> &rarr; <strong>Linked devices</strong> &rarr; <strong>Link a device</strong>, then scan this code:
                  </>
                )}
              </p>

              {/* QR Code Canvas or Success State / Loading State */}
              <div className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-4 flex flex-col items-center justify-center min-h-[250px] relative shadow-inner">
                {isLive ? (
                  <div className="flex flex-col items-center justify-center text-center p-4">
                    <div className="w-16 h-16 rounded-full bg-emerald-100/90 border border-emerald-200 text-emerald-600 flex items-center justify-center mb-3 shadow-xs">
                      <ShieldCheck size={36} strokeWidth={2.4} />
                    </div>
                    <span className="text-slate-900 font-extrabold text-base tracking-tight">
                      Connection Established
                    </span>
                    {connection?.businessPhoneNumber ? (
                      <span className="text-xs font-mono font-medium text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-md mt-2">
                        {connection.businessPhoneNumber}
                      </span>
                    ) : null}
                    <p className="text-[11px] text-slate-500 mt-2 max-w-xs leading-normal">
                      Automated receipts, membership alerts, and communications are ready.
                    </p>
                  </div>
                ) : qrCode ? (
                  <>
                    <div className="p-2.5 rounded-2xl bg-white shadow-xs border border-slate-200/70">
                      <img
                        src={qrCode}
                        alt="WhatsApp linking QR code"
                        className="w-52 h-52 object-contain rounded-xl"
                      />
                    </div>
                    <span className="text-[11px] text-emerald-700 font-medium mt-3 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Waiting for phone scan (auto-syncs)
                    </span>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-3 py-10 text-slate-500 text-xs font-medium">
                    <Loader2 size={28} className="animate-spin text-emerald-600" />
                    <span>Generating fresh QR code from WhatsApp…</span>
                  </div>
                )}
              </div>

              {/* Action Buttons: Cancel & Refresh QR or Close Button */}
              <div 
                className="logout-dialog-actions"
                style={{
                  marginTop: '24px',
                  display: 'flex',
                  gap: '12px',
                }}
              >
                {isLive ? (
                  <button
                    type="button"
                    onClick={() => setShowConnectModal(false)}
                    className="dialog-btn dialog-btn-danger cursor-pointer"
                    style={{
                      minHeight: '48px',
                      borderRadius: '16px',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      width: '100%',
                    }}
                  >
                    <span>Done & Close</span>
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="btn-arrow-icon" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleCancelLinking}
                      disabled={busy === 'cancel'}
                      className="dialog-btn dialog-btn-muted cursor-pointer"
                      style={{
                        minHeight: '48px',
                        borderRadius: '16px',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                      }}
                    >
                      {busy === 'cancel' ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Loader2 size={14} className="animate-spin" />
                          Cancelling…
                        </span>
                      ) : (
                        'Cancel'
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleConnect}
                      disabled={Boolean(busy)}
                      className="dialog-btn dialog-btn-danger cursor-pointer"
                      style={{
                        minHeight: '48px',
                        borderRadius: '16px',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                      }}
                    >
                      {busy === 'connect' ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Loader2 size={14} className="animate-spin" />
                          Refreshing…
                        </span>
                      ) : (
                        <>
                          <span>Refresh QR</span>
                          <RefreshCw size={15} strokeWidth={2.2} />
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>,
          document.body
        )
      ) : null}
      {showHelp && typeof document !== 'undefined' ? (
        createPortal(
          <div 
            className="fixed inset-0 z-[100000] flex items-center justify-center p-4 sm:p-6 transition-all duration-200 animate-in fade-in"
            style={{
              background: 'rgba(14, 18, 28, 0.44)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowHelp(false);
            }}
          >
            <div 
              className="w-full max-w-[440px] rounded-[32px] p-8 transition-all duration-200 text-left relative"
              style={{
                background: 'rgba(255, 255, 255, 0.98)',
                border: '1px solid rgba(255, 255, 255, 0.9)',
                boxShadow: '0 32px 80px rgba(15, 23, 42, 0.22)',
              }}
            >
              {/* Close Cross Button */}
              <button
                type="button"
                onClick={() => setShowHelp(false)}
                className="absolute top-6 right-6 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X size={17} />
              </button>

              <div className="mb-2">
                <p className="logout-dialog-kicker" style={{ margin: 0 }}>Setup guide</p>
              </div>

              {/* Header with Official WhatsApp Logo and Brand Typography */}
              <h2 className="text-slate-900 font-extrabold tracking-tight flex items-center flex-wrap gap-2.5" style={{ fontSize: '1.65rem', lineHeight: '1.25' }}>
                <span>Link</span>
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
                <span>by QR</span>
              </h2>

              <p 
                className="text-slate-500 font-normal leading-relaxed"
                style={{
                  margin: '12px 0 0',
                  fontSize: '0.88rem',
                  lineHeight: '1.55',
                  color: '#556070',
                }}
              >
                Connect your gym’s official phone in 4 quick steps to start sending invoices, payment alerts, and reminders:
              </p>

              {/* 4 Interactive Steps */}
              <div className="mt-5 space-y-2.5">
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50/80 border border-slate-100 transition-colors hover:bg-slate-50">
                  <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-2xs">
                    1
                  </span>
                  <div className="text-xs text-slate-700 leading-snug pt-0.5">
                    <span className="font-semibold text-slate-900">Open WhatsApp</span> on your gym phone.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50/80 border border-slate-100 transition-colors hover:bg-slate-50">
                  <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-2xs">
                    2
                  </span>
                  <div className="text-xs text-slate-700 leading-snug pt-0.5">
                    Go to <span className="font-semibold text-slate-900">Settings</span> (or ⋮ menu) &rarr; tap <span className="font-semibold text-slate-900">Linked devices</span>.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50/80 border border-slate-100 transition-colors hover:bg-slate-50">
                  <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-2xs">
                    3
                  </span>
                  <div className="text-xs text-slate-700 leading-snug pt-0.5">
                    Tap <span className="font-semibold text-slate-900">Link a device</span> to open the camera scanner.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50/80 border border-slate-100 transition-colors hover:bg-slate-50">
                  <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-2xs">
                    4
                  </span>
                  <div className="text-xs text-slate-700 leading-snug pt-0.5">
                    Point camera and scan the <span className="font-semibold text-slate-900">QR code</span> shown on GymDeck screen.
                  </div>
                </div>
              </div>

              {/* Action Buttons Matching Dialog Language */}
              <div 
                className="logout-dialog-actions"
                style={{
                  marginTop: '28px',
                  display: 'flex',
                  justifyContent: 'flex-end',
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowHelp(false)}
                  className="dialog-btn dialog-btn-danger cursor-pointer"
                  style={{
                    minHeight: '48px',
                    borderRadius: '16px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    width: '100%',
                  }}
                >
                  <span>Got it, close</span>
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="btn-arrow-icon" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
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
