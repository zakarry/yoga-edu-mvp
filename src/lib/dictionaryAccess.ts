import type { User } from '@supabase/supabase-js';
import type { Profile } from './auth';
import { getAccessTier, type AccessTier } from './accessTier';

export type { AccessTier } from './accessTier';
export type ContentLevel = 'free' | 'premium';

export interface DictionaryAccess {
  tier: AccessTier;
  canView: (level?: ContentLevel) => boolean;
  requiresLogin: boolean;
}

export function getDictionaryAccess(
  user: User | null,
  profile: Profile | null,
  consentVerified = false,
): DictionaryAccess {
  const tier = getAccessTier(user, profile, consentVerified);

  if (tier === 'guest') {
    return {
      tier,
      requiresLogin: true,
      canView: () => false,
    };
  }

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
