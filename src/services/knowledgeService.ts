import { supabase } from '../lib/supabase';

function getSupabase() {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}

export interface KnowledgeEntry {
  id: string;
  slug: string;
  title_ja: string;
  title_en: string | null;
  category: string;
  subcategory: string | null;
  content_type: string;
  summary: string | null;
  content: string | null;
  difficulty: string | null;
  audience: string[];
  language: string;
  chapter_no: number | null;
  chapter_title: string | null;
  item_no: number | null;
  is_published: boolean;
  ai_use_scope: 'reference_only' | 'ai_teacher_explanation' | 'ai_teacher_practice' | 'teacher_education' | 'guru_future';
  created_at: string;
  updated_at: string;
}

export interface KnowledgeSource {
  id: string;
  entry_id: string;
  source_type: string;
  source_title: string;
  source_section: string | null;
  source_chapter: string | null;
  source_url: string | null;
  source_order: number | null;
  is_primary: boolean;
  source_status: 'checked' | 'final' | 'review_required' | 'draft';
  created_at: string;
}

export interface KnowledgeRelation {
  id: string;
  from_entry_id: string;
  to_entry_id: string;
  relation_type: string;
  created_at: string;
}

export interface PracticeKnowledge {
  id: string;
  knowledge_entry_id: string;
  practice_type: 'asana' | 'pranayama' | 'breathwork' | 'dhyana';
  practice_name: string;
  default_minutes: number | null;
  difficulty: string | null;
  beginner_friendly: boolean;
  general_purpose_tags: string[];
  instruction_short: string | null;
  instruction_normal: string | null;
  instruction_detailed: string | null;
  general_cautions: string | null;
  is_ai_teacher_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface LearningMapping {
  id: string;
  knowledge_entry_id: string;
  learning_program: string;
  level: string | null;
  chapter: string | null;
  unit: string | null;
  external_content_id: string | null;
  external_url: string | null;
  created_at: string;
}

export async function getKnowledgeEntryBySlug(slug: string): Promise<KnowledgeEntry | null> {
  const client = getSupabase();
  const { data, error } = await client
    .from('knowledge_entries')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .maybeSingle();

  if (error) {
    console.error('getKnowledgeEntryBySlug failed');
    return null;
  }

  return data as KnowledgeEntry | null;
}

export async function getKnowledgeEntriesByCategory(category: string): Promise<KnowledgeEntry[]> {
  const client = getSupabase();
  const { data, error } = await client
    .from('knowledge_entries')
    .select('*')
    .eq('category', category)
    .eq('is_published', true)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('getKnowledgeEntriesByCategory failed');
    return [];
  }

  return (data ?? []) as KnowledgeEntry[];
}

export async function getRelatedKnowledge(entryId: string): Promise<KnowledgeEntry[]> {
  const client = getSupabase();
  const { data: relations, error: relError } = await client
    .from('knowledge_relations')
    .select('to_entry_id')
    .eq('from_entry_id', entryId);

  if (relError) {
    console.error('getRelatedKnowledge relations failed');
    return [];
  }

  if (!relations || relations.length === 0) return [];

  const toIds = relations.map((r) => r.to_entry_id);

  const { data: entries, error: entryError } = await client
    .from('knowledge_entries')
    .select('*')
    .in('id', toIds)
    .eq('is_published', true);

  if (entryError) {
    console.error('getRelatedKnowledge entries failed');
    return [];
  }

  return (entries ?? []) as KnowledgeEntry[];
}

export async function getPracticeKnowledge(practiceType?: 'asana' | 'pranayama' | 'breathwork' | 'dhyana'): Promise<PracticeKnowledge[]> {
  const client = getSupabase();
  let query = client
    .from('practice_knowledge')
    .select('*');

  if (practiceType) {
    query = query.eq('practice_type', practiceType);
  }

  const { data, error } = await query;

  if (error) {
    console.error('getPracticeKnowledge failed');
    return [];
  }

  return (data ?? []) as PracticeKnowledge[];
}

export async function getLearningMappings(program: string): Promise<LearningMapping[]> {
  const client = getSupabase();
  const { data, error } = await client
    .from('learning_mappings')
    .select('*')
    .eq('learning_program', program);

  if (error) {
    console.error('getLearningMappings failed');
    return [];
  }

  return (data ?? []) as LearningMapping[];
}

export async function getKnowledgeSources(entryId: string): Promise<KnowledgeSource[]> {
  const client = getSupabase();
  const { data, error } = await client
    .from('knowledge_sources')
    .select('*')
    .eq('entry_id', entryId)
    .order('source_order', { ascending: true, nullsFirst: false });

  if (error) {
    console.error('getKnowledgeSources failed');
    return [];
  }

  return (data ?? []) as KnowledgeSource[];
}
