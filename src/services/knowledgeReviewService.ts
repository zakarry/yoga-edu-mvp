import { supabase } from '../lib/supabase';

function getSupabase() {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}

export type UsageStatus =
  | 'source_only'
  | 'public_candidate'
  | 'ai_explanation_candidate'
  | 'teacher_candidate'
  | 'guru_candidate'
  | 'safety_review_required'
  | 'restricted';

export interface KnowledgeReviewEntry {
  id: string;
  master_id: string | null;
  slug: string;
  title_ja: string;
  category: string;
  ai_use_scope: string;
  editorial_status: string;
  safety_sensitive: boolean;
  usage_status: UsageStatus;
}

const REVIEW_COLUMNS = 'id, master_id, slug, title_ja, category, ai_use_scope, editorial_status, safety_sensitive, usage_status';

async function fetchByUsageStatus(status: UsageStatus): Promise<KnowledgeReviewEntry[]> {
  const client = getSupabase();
  const { data, error } = await client
    .from('knowledge_entries')
    .select(REVIEW_COLUMNS)
    .eq('usage_status', status)
    .order('master_id', { ascending: true, nullsFirst: false });

  if (error) {
    console.error(`fetchByUsageStatus(${status}) error:`, error);
    return [];
  }
  return (data ?? []) as KnowledgeReviewEntry[];
}

export function getSafetyReviewRequired(): Promise<KnowledgeReviewEntry[]> {
  return fetchByUsageStatus('safety_review_required');
}

export function getAiExplanationCandidates(): Promise<KnowledgeReviewEntry[]> {
  return fetchByUsageStatus('ai_explanation_candidate');
}

export function getPublicCandidates(): Promise<KnowledgeReviewEntry[]> {
  return fetchByUsageStatus('public_candidate');
}

export function getTeacherCandidates(): Promise<KnowledgeReviewEntry[]> {
  return fetchByUsageStatus('teacher_candidate');
}

export function getGuruCandidates(): Promise<KnowledgeReviewEntry[]> {
  return fetchByUsageStatus('guru_candidate');
}

export async function getUsageStatusCounts(): Promise<Record<UsageStatus, number>> {
  const client = getSupabase();
  const { data, error } = await client
    .from('knowledge_entries')
    .select('usage_status');

  if (error) {
    console.error('getUsageStatusCounts error:', error);
    return {
      source_only: 0,
      public_candidate: 0,
      ai_explanation_candidate: 0,
      teacher_candidate: 0,
      guru_candidate: 0,
      safety_review_required: 0,
      restricted: 0,
    };
  }

  const counts: Record<UsageStatus, number> = {
    source_only: 0,
    public_candidate: 0,
    ai_explanation_candidate: 0,
    teacher_candidate: 0,
    guru_candidate: 0,
    safety_review_required: 0,
    restricted: 0,
  };
  for (const row of data ?? []) {
    const status = (row as { usage_status: UsageStatus }).usage_status;
    if (status in counts) counts[status] += 1;
  }
  return counts;
}
