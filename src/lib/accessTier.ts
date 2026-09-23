import type { User } from '@supabase/supabase-js';
import type { Profile } from './auth';

export type AccessTier = 'guest' | 'free' | 'paid';

export function getAccessTier(
  user: User | null,
  profile: Profile | null,
  consentVerified: boolean,
): AccessTier {
  if (!user || !consentVerified) return 'guest';
  return profile?.membership_tier === 'paid' ? 'paid' : 'free';
}
