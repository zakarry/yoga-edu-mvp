import { supabase } from '../lib/supabase';

export interface KnowledgeExplanation {
  masterId: string;
  title: string;
  category: string;
  publicContent: string;
}

function getSupabase() {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}

async function fetchExplanations(search?: string): Promise<KnowledgeExplanation[]> {
  const client = getSupabase();
  const { data, error } = await client.rpc('lookup_teacher_explanation', { p_search: search ?? null });
  if (error) {
    console.error('lookup_teacher_explanation error:', error);
    return [];
  }
  return (data ?? []) as KnowledgeExplanation[];
}

export async function getSafeExplanationCandidates(): Promise<KnowledgeExplanation[]> {
  return fetchExplanations();
}

export async function getExplanationByMasterId(masterId: string): Promise<KnowledgeExplanation | null> {
  const all = await fetchExplanations();
  return all.find((e) => e.masterId === masterId) ?? null;
}

export async function findExplanationByTitle(title: string): Promise<KnowledgeExplanation | null> {
  const results = await fetchExplanations(title);
  return results.length > 0 ? results[0] : null;
}

export async function findExplanationByKeyword(keyword: string): Promise<KnowledgeExplanation | null> {
  const results = await fetchExplanations(keyword);
  return results.length > 0 ? results[0] : null;
}
