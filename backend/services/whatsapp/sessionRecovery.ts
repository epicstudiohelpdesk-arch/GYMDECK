/**
 * Explicit failed-session recovery. Detection is read-only; recovery requires
 * an operator-supplied confirmation token and verified tenant ownership.
 * No automatic restart or session recreation is ever performed.
 */
import { openwaClient } from './openwaClient';

export interface OpenWaSessionState {
  id: string;
  name: string;
  status: string;
  phone?: string | null;
}

export interface LinkedAccount {
  gymId: string;
  openwaSessionId: string | null;
  connectionStatus: string;
}

export const FAILED_STATUSES = new Set(['failed', 'action_required']);

export function detectFailedSessions(sessions: OpenWaSessionState[]): OpenWaSessionState[] {
  return sessions.filter((s) => FAILED_STATUSES.has(String(s.status).toLowerCase()));
}

export interface RecoveryPlan {
  allowed: boolean;
  reason: string;
  gymId?: string;
  sessionId?: string;
}

export function planRecovery(session: OpenWaSessionState, account: LinkedAccount | null, confirmed: boolean): RecoveryPlan {
  if (!confirmed) return { allowed: false, reason: 'operator confirmation required' };
  if (!account) return { allowed: false, reason: 'no linked gym account for session' };
  if (account.openwaSessionId !== session.id) return { allowed: false, reason: 'session id does not match linked account' };
  if (!account.gymId) return { allowed: false, reason: 'gym ownership could not be verified' };
  return { allowed: true, reason: 'verified', gymId: account.gymId, sessionId: session.id };
}

export async function recoverFailedSession(
  session: OpenWaSessionState,
  account: LinkedAccount | null,
  confirmationToken: string | undefined
): Promise<RecoveryPlan> {
  const plan = planRecovery(session, account, confirmationToken === 'RECOVER-' + session.id);
  if (!plan.allowed) return plan;
  // Start only the existing session; never delete or recreate it here.
  const result = await openwaClient.startSession(session.id);
  return { ...plan, reason: result ? 'existing session start requested' : 'session start did not return a session' };
}
