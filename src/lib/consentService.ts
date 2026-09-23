import { supabase } from './supabase';

export const CURRENT_TERMS_VERSION = '1.0';
export const CURRENT_PRIVACY_VERSION = '1.0';

export interface ConsentRecord {
  id: string;
  user_id: string;
  terms_version: string;
  privacy_version: string;
  terms_accepted_at: string;
  privacy_accepted_at: string;
  created_at: string;
}

export async function hasCurrentConsent(userId: string): Promise<boolean> {
  if (!supabase) return false;
  const { data, error } = await supabase
    .from('user_consents')
    .select('id')
    .eq('user_id', userId)
    .eq('terms_version', CURRENT_TERMS_VERSION)
    .eq('privacy_version', CURRENT_PRIVACY_VERSION)
    .maybeSingle();
  if (error) {
    console.error('[consentService] SELECT failed:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      userId,
    });
    return false;
  }
  return data !== null;
}

export async function recordConsent(userId: string): Promise<boolean> {
  if (!supabase) return false;

  // Check if consent already exists (e.g. recorded during signup).
  // If so, no need to INSERT again — avoids UNIQUE constraint violation.
  const already = await hasCurrentConsent(userId);
  if (already) return true;

  const { error } = await supabase
    .from('user_consents')
    .insert({
      user_id: userId,
      terms_version: CURRENT_TERMS_VERSION,
      privacy_version: CURRENT_PRIVACY_VERSION,
    });
  if (error) {
    // 23505 = unique_violation — another concurrent INSERT won the race.
    // Treat as success since the consent record exists.
    if (error.code === '23505') return true;
    console.error('[consentService] INSERT failed:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      userId,
    });
    return false;
  }
  return true;
}
