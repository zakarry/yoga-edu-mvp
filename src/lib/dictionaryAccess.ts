import type { User } from '@supabase/supabase-js';
import type { Profile } from './auth';

export type AccessTier = 'guest' | 'free' | 'paid';
export type ContentLevel = 'free' | 'premium';

export interface DictionaryAccess {
  tier: AccessTier;
  canView: (level?: ContentLevel) => boolean;
  requiresLogin: boolean;
}

export function getDictionaryAccess(
  user: User | null,
  profile: Profile | null,
): DictionaryAccess {
  if (!user) {
    return {
      tier: 'guest',
      requiresLogin: true,
      canView: () => false,
    };
  }

  const tier: AccessTier =
    profile?.membership_tier === 'paid' ? 'paid' : 'free';

  return {
    tier,
    requiresLogin: false,
    canView: (level: ContentLevel = 'free') => {
      if (tier === 'paid') return true;
      if (level === 'free') return true;
      return false;
    },
  };
}
