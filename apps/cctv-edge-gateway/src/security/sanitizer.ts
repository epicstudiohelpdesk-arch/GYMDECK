/**
 * GymDeck CCTV Subsystem - Security & Privacy Sanitization Engine
 * Strips camera credentials, tokens, and sensitive headers from client payloads, URLs, and logs.
 */

export function sanitizeRtspUrl(rawUrl: string | undefined | null, maskCredentials = true): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  
  if (maskCredentials) {
    return rawUrl.replace(/rtsp:\/\/([^:]+):([^@]+)@/i, 'rtsp://***:***@');
  }
  // Strip credentials completely
  return rawUrl.replace(/rtsp:\/\/[^@]+@/i, 'rtsp://');
}

export function sanitizeLog(input: any): string {
  if (input === null || input === undefined) return '';
  const str = typeof input === 'string' ? input : JSON.stringify(input);

  return str
    // Redact RTSP credentials: rtsp://user:pass@host -> rtsp://***:***@host
    .replace(/rtsp:\/\/([^:\s"']+):([^@\s"']+)@/gi, 'rtsp://***:***@')
    // Redact JSON password fields
    .replace(/"password"\s*:\s*"[^"]*"/gi, '"password":"[REDACTED]"')
    // Redact device tokens & bearer tokens
    .replace(/Bearer\s+[A-Za-z0-9-_.]+/gi, 'Bearer [REDACTED]')
    .replace(/"token"\s*:\s*"[^"]*"/gi, '"token":"[REDACTED]"')
    .replace(/"deviceToken"\s*:\s*"[^"]*"/gi, '"deviceToken":"[REDACTED]"');
}

/**
 * Validates that an RTSP URL has a valid RTSP or RTSPS scheme and parsable structure.
 */
export function isValidRtspUrl(rawUrl: string | undefined | null): boolean {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  try {
    const parsed = new URL(rawUrl);
    return (parsed.protocol === 'rtsp:' || parsed.protocol === 'rtsps:') && Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

