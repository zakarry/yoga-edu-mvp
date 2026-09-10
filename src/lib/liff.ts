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
}

let liffState: LiffState = {
  initialized: false,
  isInClient: false,
  isLoggedIn: false,
  profile: null,
  error: null,
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
