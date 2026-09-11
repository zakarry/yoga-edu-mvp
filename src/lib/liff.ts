import { useEffect, useState } from 'react';
import liff from '@line/liff';

export interface LiffProfile {
  displayName: string;
  userId: string;
  pictureUrl?: string;
}

export interface LiffState {
  initialized: boolean;
  isInClient: boolean;
  isLoggedIn: boolean;
  profile: LiffProfile | null;
  error: string | null;
  autoLoginStatus: 'idle' | 'loading' | 'success' | 'failed';
}

let liffState: LiffState = {
  initialized: false,
  isInClient: false,
  isLoggedIn: false,
  profile: null,
  error: null,
  autoLoginStatus: 'idle',
};

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

function setLiffState(patch: Partial<LiffState>) {
  liffState = { ...liffState, ...patch };
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

/**
 * Attempt LIFF auto-login: send the LINE ID Token to our edge function
 * for server-side verification, then set the returned session in the
 * Supabase client. Only called when isInClient && isLoggedIn && no
 * existing Supabase session.
 */
export async function attemptLiffAutoLogin(): Promise<{ success: boolean; error: string | null }> {
  if (autoLoginAttempted) {
    return { success: false, error: 'already_attempted' };
  }
  autoLoginAttempted = true;

  setLiffState({ autoLoginStatus: 'loading' });

  try {
    const idToken = liff.getIDToken();
    if (!idToken) {
      setLiffState({ autoLoginStatus: 'failed' });
      return { success: false, error: 'no_id_token' };
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

    const response = await fetch(`${supabaseUrl}/functions/v1/line-auth/liff`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`,
        'apikey': anonKey,
      },
      body: JSON.stringify({ id_token: idToken }),
    });

    if (!response.ok) {
      setLiffState({ autoLoginStatus: 'failed' });
      return { success: false, error: 'verification_failed' };
    }

    const data = await response.json();
    if (!data?.session?.access_token || !data?.session?.refresh_token) {
      setLiffState({ autoLoginStatus: 'failed' });
      return { success: false, error: 'invalid_response' };
    }

    // Import supabase client dynamically to avoid circular dependency
    const { supabase } = await import('./supabase');
    if (!supabase) {
      setLiffState({ autoLoginStatus: 'failed' });
      return { success: false, error: 'supabase_not_configured' };
    }

    const { error: setError } = await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });

    if (setError) {
      setLiffState({ autoLoginStatus: 'failed' });
      return { success: false, error: 'session_set_failed' };
    }

    setLiffState({ autoLoginStatus: 'success' });
    return { success: true, error: null };
  } catch {
    setLiffState({ autoLoginStatus: 'failed' });
    return { success: false, error: 'unexpected_error' };
  }
}

export function isAutoLoginAttempted(): boolean {
  return autoLoginAttempted;
}

export function resetAutoLoginAttempt() {
  autoLoginAttempted = false;
  setLiffState({ autoLoginStatus: 'idle' });
}
