import { useEffect, useState, useCallback, type ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from './supabase';
import type { User, Provider } from '@supabase/supabase-js';

export interface Profile {
  id: string;
  role: 'student' | 'teacher' | 'both';
  display_name: string | null;
  preferred_language: string;
  area: string | null;
  created_at: string;
  updated_at: string;
}

export interface PrivacySettings {
  user_id: string;
  save_diagnosis: boolean;
  save_practice_history: boolean;
  allow_ai_memory: boolean;
  allow_teacher_sharing: boolean;
  allow_sensitive_data_storage: boolean;
  updated_at: string;
}

type OAuthProvider = 'google' | 'apple';

export const OAUTH_PROVIDERS = {
  google: { enabled: true, label: 'Googleで続ける' },
  apple: { enabled: false, label: 'Appleで続ける' },
  line: { enabled: false, label: 'LINEで続ける' },
} as const;

interface AuthState {
  user: User | null;
  profile: Profile | null;
  privacy: PrivacySettings | null;
  loading: boolean;
  authReady: boolean;
  cloudUnavailable: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithOAuth: (provider: OAuthProvider) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (patch: Partial<Profile>) => Promise<{ error: string | null }>;
  updatePrivacy: (patch: Partial<PrivacySettings>) => Promise<{ error: string | null }>;
}

function noop(): never {
  throw new Error('auth context not initialized');
}

const initialAuthState: AuthState = {
  user: null,
  profile: null,
  privacy: null,
  loading: false,
  authReady: false,
  cloudUnavailable: !isSupabaseConfigured,
  signIn: noop,
  signUp: noop,
  signInWithOAuth: noop,
  signOut: noop,
  refreshProfile: noop,
  updateProfile: noop,
  updatePrivacy: noop,
};

let authState: AuthState = initialAuthState;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

function setAuthState(patch: Partial<AuthState>) {
  authState = { ...authState, ...patch };
  notify();
}

async function fetchProfileAndPrivacy(userId: string) {
  if (!supabase) return { profile: null, privacy: null };

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  const { data: privacy } = await supabase
    .from('privacy_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  return { profile: profile as Profile | null, privacy: privacy as PrivacySettings | null };
}

if (supabase && isSupabaseConfigured) {
  supabase.auth.onAuthStateChange((event, session) => {
    (async () => {
      if (session?.user) {
        setAuthState({ loading: true });
        const { profile, privacy } = await fetchProfileAndPrivacy(session.user.id);
        setAuthState({
          user: session.user,
          profile,
          privacy,
          loading: false,
          authReady: true,
          cloudUnavailable: false,
        });
      } else {
        setAuthState({
          user: null,
          profile: null,
          privacy: null,
          authReady: true,
          loading: false,
        });
      }
    })();
  });
} else {
  setAuthState({ authReady: true, cloudUnavailable: true });
}

const signIn = async (email: string, password: string) => {
  if (!supabase) return { error: '現在クラウド保存を利用できません' };
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return { error: error?.message ?? null };
};

const signUp = async (email: string, password: string) => {
  if (!supabase) return { error: '現在クラウド保存を利用できません' };
  const { error } = await supabase.auth.signUp({ email, password });
  return { error: error?.message ?? null };
};

const signInWithOAuth = async (provider: OAuthProvider) => {
  if (!supabase) return { error: '現在クラウド保存を利用できません' };
  if (!OAUTH_PROVIDERS[provider].enabled) {
    return { error: '現在このログイン方法は利用できません。メールアドレスでお進みください。' };
  }
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: window.location.origin,
    },
  });
  return { error: error?.message ?? null };
};

const signOut = async () => {
  if (!supabase) return;
  await supabase.auth.signOut();
  setAuthState({ user: null, profile: null, privacy: null });
};

const refreshProfile = async () => {
  if (!supabase || !authState.user) return;
  const { profile, privacy } = await fetchProfileAndPrivacy(authState.user.id);
  setAuthState({ profile, privacy });
};

const updateProfile = async (patch: Partial<Profile>) => {
  if (!supabase || !authState.user) return { error: 'ログインしていません' };
  const { error } = await supabase
    .from('profiles')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', authState.user.id);
  if (!error) await refreshProfile();
  return { error: error?.message ?? null };
};

const updatePrivacy = async (patch: Partial<PrivacySettings>) => {
  if (!supabase || !authState.user) return { error: 'ログインしていません' };
  const { error } = await supabase
    .from('privacy_settings')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('user_id', authState.user.id);
  if (!error) await refreshProfile();
  return { error: error?.message ?? null };
};

setAuthState({ signIn, signUp, signInWithOAuth, signOut, refreshProfile, updateProfile, updatePrivacy });

export function useAuth(): AuthState {
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const fn = () => forceUpdate((n) => n + 1);
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);
  return authState;
}
