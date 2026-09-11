import { useEffect, useState } from 'react';
import liff from '@line/liff';

export interface LiffProfile {
  displayName: string;
  userId: string;
  pictureUrl?: string;
}

export interface LiffDiagnostics {
  hasIdToken: boolean | null;
  edgeCalled: boolean;
  edgeStatus: number | null;
  edgeOk: boolean | null;
  lineVerify: boolean | null;
  identityResolved: boolean | null;
  sessionCreated: boolean | null;
  setSessionResult: 'pending' | 'ok' | 'error' | null;
  getSessionAfterSet: boolean | null;
}

export interface LiffState {
  initialized: boolean;
  isInClient: boolean;
  isLoggedIn: boolean;
  profile: LiffProfile | null;
  error: string | null;
  autoLoginStatus: 'idle' | 'loading' | 'success' | 'failed';
  autoLoginError: string | null;
  diagnostics: LiffDiagnostics;
}

const initialDiagnostics: LiffDiagnostics = {
  hasIdToken: null,
  edgeCalled: false,
  edgeStatus: null,
  edgeOk: null,
  lineVerify: null,
  identityResolved: null,
  sessionCreated: null,
  setSessionResult: null,
  getSessionAfterSet: null,
};

let liffState: LiffState = {
  initialized: false,
  isInClient: false,
  isLoggedIn: false,
  profile: null,
  error: null,
  autoLoginStatus: 'idle',
  autoLoginError: null,
  diagnostics: initialDiagnostics,
};

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

function setLiffState(patch: Partial<LiffState>) {
  liffState = { ...liffState, ...patch };
  notify();
}

function setDiagnostics(patch: Partial<LiffDiagnostics>) {
  liffState = { ...liffState, diagnostics: { ...liffState.diagnostics, ...patch } };
  notify();
}

let initPromise: Promise<void> | null = null;
let autoLoginAttempted = false;

async function initLiff() {
  const liffId = import.meta.env.VITE_LINE_LIFF_ID as string | undefined;
  if (!liffId) {
    setLiffState({ initialized: true, error: 'LIFF ID not configured' });
    return;
  }

  try {
    await liff.init({ liffId });
    const isInClient = liff.isInClient();
    const isLoggedIn = liff.isLoggedIn();

    let profile: LiffProfile | null = null;
    if (isLoggedIn) {
      try {
        const p = await liff.getProfile();
        profile = {
          displayName: p.displayName,
          userId: p.userId,
          pictureUrl: p.pictureUrl,
        };
      } catch {
        // profile scope may not be available
      }
    }

    setLiffState({
      initialized: true,
      isInClient,
      isLoggedIn,
      profile,
      error: null,
    });
  } catch (err) {
    setLiffState({
      initialized: true,
      error: err instanceof Error ? err.message : 'LIFF init failed',
    });
  }
}

export function initLiffOnce() {
  if (!initPromise) {
    initPromise = initLiff();
  }
  return initPromise;
}

export function getLiffState(): LiffState {
  return liffState;
}

export function useLiff(): LiffState {
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const fn = () => forceUpdate((n) => n + 1);
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);
  return liffState;
}

export async function attemptLiffAutoLogin(): Promise<{ success: boolean; error: string | null }> {
  if (autoLoginAttempted) {
    return { success: false, error: 'already_attempted' };
  }
  autoLoginAttempted = true;

  setLiffState({ autoLoginStatus: 'loading', autoLoginError: null, diagnostics: initialDiagnostics });

  try {
    const idToken = liff.getIDToken();
    setDiagnostics({ hasIdToken: Boolean(idToken) });
    if (!idToken) {
      setLiffState({ autoLoginStatus: 'failed', autoLoginError: 'no_id_token' });
      return { success: false, error: 'no_id_token' };
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

    setDiagnostics({ edgeCalled: true });
    const response = await fetch(`${supabaseUrl}/functions/v1/line-auth/liff`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`,
        'apikey': anonKey,
      },
      body: JSON.stringify({ id_token: idToken }),
    });

    setDiagnostics({ edgeStatus: response.status, edgeOk: response.ok });

    if (!response.ok) {
      setLiffState({ autoLoginStatus: 'failed', autoLoginError: `edge_${response.status}` });
      return { success: false, error: 'verification_failed' };
    }

    const data = await response.json();
    setDiagnostics({ lineVerify: true, identityResolved: true });

    if (!data?.session?.access_token || !data?.session?.refresh_token) {
      setDiagnostics({ sessionCreated: false });
      setLiffState({ autoLoginStatus: 'failed', autoLoginError: 'invalid_response' });
      return { success: false, error: 'invalid_response' };
    }

    setDiagnostics({ sessionCreated: true });

    const { supabase } = await import('./supabase');
    if (!supabase) {
      setLiffState({ autoLoginStatus: 'failed', autoLoginError: 'supabase_not_configured' });
      return { success: false, error: 'supabase_not_configured' };
    }

    setDiagnostics({ setSessionResult: 'pending' });
    const { error: setError } = await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });

    if (setError) {
      setDiagnostics({ setSessionResult: 'error' });
      setLiffState({ autoLoginStatus: 'failed', autoLoginError: 'session_set_failed' });
      return { success: false, error: 'session_set_failed' };
    }

    setDiagnostics({ setSessionResult: 'ok' });

    const { data: sessionCheck } = await supabase.auth.getSession();
    setDiagnostics({ getSessionAfterSet: Boolean(sessionCheck?.session) });

    setLiffState({ autoLoginStatus: 'success' });
    return { success: true, error: null };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'unexpected_error';
    setLiffState({ autoLoginStatus: 'failed', autoLoginError: errMsg });
    return { success: false, error: errMsg };
  }
}

export function isAutoLoginAttempted(): boolean {
  return autoLoginAttempted;
}

export function resetAutoLoginAttempt() {
  autoLoginAttempted = false;
  setLiffState({ autoLoginStatus: 'idle', autoLoginError: null, diagnostics: initialDiagnostics });
}
