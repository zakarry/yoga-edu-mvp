import { supabase } from '../lib/supabase';

export type MembershipTier = 'free' | 'paid';

let cachedTier: MembershipTier | null = null;
let cacheUserId: string | null = null;

export async function getMembershipTier(userId: string | null): Promise<MembershipTier> {
  if (!userId || !supabase) return 'free';

  if (cachedTier !== null && cacheUserId === userId) {
    return cachedTier;
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('membership_tier')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data) return 'free';

    const tier = data.membership_tier;
    if (tier === 'paid') {
      cachedTier = 'paid';
    } else {
      cachedTier = 'free';
    }
    cacheUserId = userId;
    return cachedTier;
  } catch {
    return 'free';
  }
}

export function isPaidMember(tier: MembershipTier): boolean {
  return tier === 'paid';
}

export function clearMembershipCache(): void {
  cachedTier = null;
  cacheUserId = null;
}
