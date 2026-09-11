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

type OAuthProvider = 'google' | 'apple' | 'line';

export const OAUTH_PROVIDERS = {
  google: { enabled: true, label: 'Googleで続ける' },
  apple: { enabled: false, label: 'Appleで続ける' },
  line: { enabled: true, label: 'LINEで続ける' },
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
let lastAuthEvent: string | null = null;
const listeners = new Set<() => void>();

export function getLastAuthEvent(): string | null {
  return lastAuthEvent;
}

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
    lastAuthEvent = event;
    notify();
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
  if (error) {
    return { error: 'メールアドレスまたはパスワードが正しくありません。' };
  }
  return { error: null };
};

const signUp = async (email: string, password: string) => {
  if (!supabase) return { error: '現在クラウド保存を利用できません' };
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) {
    // Deliberately generic: a message that varies with whether the address is
    // already registered would let anyone enumerate accounts from this form.
    return {
      error: '登録を完了できませんでした。入力内容をご確認のうえ、もう一度お試しください。',
    };
  }
  return { error: null };
};

const signInWithOAuth = async (provider: OAuthProvider) => {
  if (!supabase) return { error: '現在クラウド保存を利用できません' };
  if (!OAUTH_PROVIDERS[provider].enabled) {
    return { error: '現在このログイン方法は利用できません。メールアドレスでお進みください。' };
  }

  if (provider === 'line') {
    // LINE is not a built-in Supabase OAuth provider, so we redirect to our
    // custom Edge Function which handles the LINE Login flow server-side.
    const startUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/line-auth/start?redirect_to=${encodeURIComponent(window.location.origin)}`;
    window.location.href = startUrl;
    return { error: null };
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: window.location.origin,
    },
  });
  if (error) {
    return {
      error:
        'Googleログインを完了できませんでした。もう一度お試しいただくか、メールアドレスでお進みください。',
    };
  }
  return { error: null };
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

// Columns a user is allowed to change on their own profile. Privileged columns
// such as membership_tier are never writable from the client; the database also
// enforces this with column-level privileges.
const EDITABLE_PROFILE_FIELDS = ['display_name', 'role', 'preferred_language', 'area'] as const;

const updateProfile = async (patch: Partial<Profile>) => {
  if (!supabase || !authState.user) return { error: 'ログインしていません' };
  const safePatch: Record<string, unknown> = {};
  for (const field of EDITABLE_PROFILE_FIELDS) {
    if (field in patch) safePatch[field] = (patch as Record<string, unknown>)[field];
  }
  const { error } = await supabase
    .from('profiles')
    .update({ ...safePatch, updated_at: new Date().toISOString() })
    .eq('id', authState.user.id);
  if (!error) await refreshProfile();
  return { error: error ? 'プロフィールを保存できませんでした。' : null };
};

const updatePrivacy = async (patch: Partial<PrivacySettings>) => {
  if (!supabase || !authState.user) return { error: 'ログインしていません' };
  const { error } = await supabase
    .from('privacy_settings')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('user_id', authState.user.id);
  if (!error) await refreshProfile();
  return { error: error ? '設定を保存できませんでした。' : null };
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
