import React, { useCallback, useEffect, useState } from 'react';
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
    if (!window.confirm('Disconnect WhatsApp? Queued messages will stop until you reconnect.')) return;
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
              onClick={handleDisconnect}
              disabled={Boolean(busy)}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-rose-200 bg-white text-[11px] font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60"
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

      {showHelp ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-zinc-900/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-zinc-200">
            <div className="flex items-start justify-between gap-4 p-5 border-b border-zinc-100">
              <div>
                <h3 className="text-sm font-bold text-zinc-900">Link WhatsApp by QR</h3>
                <p className="text-xs text-zinc-500 mt-1">
                  GymDeck runs its own OpenWA gateway. The gym phone stays linked as a WhatsApp
                  companion device; no Meta Business account or template approval is required.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowHelp(false)}
                className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs text-zinc-600">
              <ol className="list-decimal pl-4 space-y-1.5">
                <li>Use a dedicated gym phone number, not a personal primary number.</li>
                <li>Press Connect WhatsApp and scan the QR with that phone.</li>
                <li>Keep the phone online; WhatsApp must stay linked as a companion device.</li>
                <li>Send a test message to the gym phone before broadcasting to members.</li>
              </ol>
              <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 leading-relaxed">
                OpenWA is an unofficial WhatsApp Web gateway. WhatsApp may restrict accounts that
                send automated or bulk messages. GymDeck applies consent and rate limits, but cannot
                eliminate that risk. Use a number you can afford to lose.
              </p>
            </div>

            <div className="flex justify-end p-4 border-t border-zinc-100 bg-zinc-50/60 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setShowHelp(false)}
                className="h-8 px-3 rounded-lg bg-zinc-900 text-white text-[11px] font-semibold"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
