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
  const modalOpenRef = React.useRef(false);

  // Auto-clear transient errors (e.g. rate limit, connection timeouts) after 2.5s
  useEffect(() => {
    if (!error) return undefined;
    const timer = setTimeout(() => {
      setError('');
    }, 2500);
    return () => clearTimeout(timer);
  }, [error]);

  const lastReportedStatusRef = React.useRef(null);

  const load = useCallback(async () => {
    try {
      setError('');
      const data = await whatsappApi.getConnection();
      // If modal is NOT open, don't revert user to an unprompted CONNECTING state
      if (!modalOpenRef.current && data?.connectionStatus === 'CONNECTING') {
        const fallback = {
          ...data,
          connectionStatus: 'NOT_CONNECTED',
          qrCode: null,
        };
        setConnection(fallback);
        if (onStatusChange && lastReportedStatusRef.current !== 'NOT_CONNECTED') {
          lastReportedStatusRef.current = 'NOT_CONNECTED';
          onStatusChange(fallback);
        }
        return;
      }
      setConnection(data);
      // Only notify parent dashboard if status meaningfully changed, preventing infinite rapid refreshes
      const statusKey = `${data?.connectionStatus}_${data?.isLive}`;
      if (onStatusChange && lastReportedStatusRef.current !== statusKey) {
        lastReportedStatusRef.current = statusKey;
        onStatusChange(data);
      }
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
    // Only poll for QR/connection progression if modal is open and in CONNECTING state
    if (!connection || connection.connectionStatus !== 'CONNECTING' || !showConnectModal) return undefined;
    // Poll every 2000ms to stay safely within OpenWA API rate limits while keeping QR responsive
    const timer = setInterval(load, 2000);
    return () => clearInterval(timer);
  }, [connection, showConnectModal, load]);

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
    modalOpenRef.current = true;
    setShowConnectModal(true);
    try {
      const result = await whatsappApi.connect();
      // If user closed or cancelled before this async connect finished, discard result
      if (!modalOpenRef.current) {
        whatsappApi.disconnect().catch(() => {});
        return;
      }
      setConnection(result);
      if (result?.connectionStatus === 'CONNECTED') {
        setNotice('WhatsApp connected successfully.');
      }
    } catch (err) {
      if (modalOpenRef.current) {
        setError(err.message || 'Could not start the WhatsApp session.');
      }
    } finally {
      setBusy((prev) => (prev === 'connect' ? '' : prev));
    }
  };

  const handleVerify = async () => {
    setBusy('verify');
    setError('');
    try {
      await whatsappApi.verifyConnection();
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
      setConnection({
        connectionStatus: 'NOT_CONNECTED',
        isLive: false,
        qrCode: null,
        businessPhoneNumber: null,
      });
      await load();
    } catch (err) {
      setError(err.message || 'Could not disconnect WhatsApp.');
    } finally {
      setBusy('');
    }
  };

  const handleCancelLinking = async () => {
    // 1. Immediately dismiss modal, update ref, and reset connection state to clean NOT_CONNECTED
    modalOpenRef.current = false;
    setShowConnectModal(false);
    setConnection({
      connectionStatus: 'NOT_CONNECTED',
      isLive: false,
      qrCode: null,
      businessPhoneNumber: null,
    });
    setBusy('cancel');
    setError('');
    setNotice('');

    // 2. Tear down the session in background so it never hangs in CONNECTING
    try {
      await whatsappApi.disconnect();
      const fresh = await whatsappApi.getConnection();
      if (fresh?.connectionStatus === 'CONNECTING') {
        setConnection({
          ...fresh,
          connectionStatus: 'NOT_CONNECTED',
          qrCode: null,
        });
      } else {
        setConnection(fresh);
      }
      if (onStatusChange) onStatusChange(fresh);
    } catch (err) {
      console.warn('[WhatsAppConnectionCard] Cancel connection cleanup error:', err);
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
    <div className={`h-full flex flex-col ${compact ? 'space-y-3' : 'space-y-3.5'}`}>
      {/* ─── GRAPHICAL ENTERPRISE CONNECTION CARD (#009A00 WITH FAINT GRID TEXTURE) ─── */}
      <div 
        className="rounded-2xl border p-5 transition-all duration-200 text-white shadow-2xs relative overflow-hidden flex flex-col justify-between h-full"
        style={{
          backgroundColor: '#009A00',
          borderColor: '#008700',
          boxShadow: '0 8px 24px -4px rgba(0, 154, 0, 0.28)',
        }}
      >
        {/* Faded grid texture overlay */}
        <div 
          aria-hidden="true" 
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(255, 255, 255, 0.08) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255, 255, 255, 0.08) 1px, transparent 1px)
            `,
            backgroundSize: '24px 24px',
            maskImage: 'radial-gradient(ellipse 100% 100% at 50% 50%, black 40%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 100% 100% at 50% 50%, black 40%, transparent 100%)',
          }}
        />

        {/* Ambient radial lighting glow for depth */}
        <div 
          aria-hidden="true" 
          className="absolute -top-16 -right-16 w-48 h-48 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(255, 255, 255, 0.15) 0%, transparent 70%)',
          }}
        />

        {/* Refreshing connection overlay with wave pulsing dots */}
        {busy === 'verify' ? (
          <div 
            className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-zinc-950/70 backdrop-blur-[2px] transition-all duration-200 animate-in fade-in"
            aria-live="polite"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms', animationDuration: '0.8s' }} />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms', animationDuration: '0.8s' }} />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '300ms', animationDuration: '0.8s' }} />
            </div>
            <span className="text-xs font-semibold tracking-wide text-white/95">
              Refreshing connection…
            </span>
          </div>
        ) : null}

        {/* Top Section: Header with Official Logo, Title, Phone Pill, and Telemetry Badge */}
        <div className="flex items-start justify-between gap-3 relative z-1">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* WhatsApp Brand Icon placed inline & aligned with text */}
              <img 
                src="/whatsapp-logo.png" 
                alt="WhatsApp" 
                className="w-5 h-5 object-contain shrink-0 drop-shadow-xs"
              />

              <span className="text-sm font-bold tracking-tight text-white">
                WhatsApp Line
              </span>

              {connection?.businessPhoneNumber ? (
                <span className="text-[11px] font-mono font-semibold text-emerald-950 bg-white/95 px-2 py-0.5 rounded-md shadow-2xs truncate">
                  {connection.businessPhoneNumber}
                </span>
              ) : null}
            </div>

            <p className="text-[11px] text-white/85 mt-1 leading-relaxed font-normal max-w-sm">
              {isLive 
                ? 'Companion gateway online. Delivering real-time fee receipts, renewal alerts, and 1-click member chat.'
                : status === 'CONNECTING'
                ? 'Scan QR from WhatsApp > Linked Devices on gym phone.'
                : 'Link gym device to enable automatic PDF invoices, payment alerts, and direct member chats.'}
            </p>
          </div>

          {/* Top Right: Status Badge & Live Wi-Fi Signal Indicator */}
          <div className="shrink-0 flex items-center gap-1.5 self-start">
            {isLive ? (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/25 shadow-2xs">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-white">
                  Connected
                </span>
                <span className="w-px h-3 bg-white/30 ml-0.5" />
                <Wifi size={13} strokeWidth={2.5} className="text-white animate-pulse" />
              </div>
            ) : status === 'CONNECTING' ? (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/25 backdrop-blur-md border border-white/20 shadow-2xs">
                <Loader2 size={12} className="animate-spin text-white" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-white">
                  Pairing
                </span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/25 backdrop-blur-md border border-white/15 shadow-2xs">
                <WifiOff size={12} strokeWidth={2} className="text-white/70" />
                <span className="text-[11px] font-medium text-white/90">
                  Offline
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Section: Integrated Action Buttons Side by Side Inside The Card */}
        <div className="mt-4 pt-3.5 border-t border-white/20 flex flex-wrap items-center justify-between gap-3 relative z-1">
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
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-zinc-900 text-white text-xs font-bold hover:bg-zinc-800 disabled:opacity-60 cursor-pointer transition-colors shadow-2xs"
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
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-white/90 hover:bg-white text-xs font-bold text-zinc-700 hover:text-zinc-900 disabled:opacity-60 cursor-pointer transition-colors shadow-2xs"
              >
                {busy === 'cancel' ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <X size={13} className="text-zinc-500" />
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
                  className="group relative inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-white text-xs font-bold text-zinc-800 hover:text-zinc-950 shadow-2xs hover:shadow transition-all disabled:opacity-50 cursor-pointer border border-white/40"
                >
                  {busy === 'verify' ? (
                    <Loader2 size={13} className="animate-spin text-emerald-600" />
                  ) : (
                    <RefreshCw size={13} className="text-zinc-500 group-hover:text-zinc-900 group-hover:rotate-45 transition-transform" />
                  )}
                  <span>Refresh status</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowDisconnectModal(true)}
                  disabled={Boolean(busy)}
                  className="group inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-xs font-bold text-white shadow-2xs hover:shadow transition-all disabled:opacity-50 cursor-pointer"
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
