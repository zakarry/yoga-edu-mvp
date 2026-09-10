import { supabase } from '../lib/supabase';

function getSupabase() {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}

export type LearningStatus = 'viewed' | 'learning' | 'completed';

export interface UserLearningProgress {
  id: string;
  user_id: string;
  knowledge_entry_id: string;
  status: LearningStatus;
  view_count: number;
  last_viewed_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function getLearningProgress(knowledgeEntryId: string): Promise<UserLearningProgress | null> {
  const client = getSupabase();
  const { data, error } = await client
    .from('user_learning_progress')
    .select('*')
    .eq('knowledge_entry_id', knowledgeEntryId)
    .maybeSingle();

  if (error) {
    console.error('getLearningProgress failed');
    return null;
  }

  return data as UserLearningProgress | null;
}

export async function markViewed(knowledgeEntryId: string): Promise<UserLearningProgress | null> {
  const existing = await getLearningProgress(knowledgeEntryId);

  if (existing) {
    const client = getSupabase();
    const { data, error } = await client
      .from('user_learning_progress')
      .update({
        view_count: existing.view_count + 1,
        last_viewed_at: new Date().toISOString(),
        status: existing.status === 'completed' ? 'completed' : 'viewed',
      })
      .eq('id', existing.id)
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('markViewed update failed');
      return null;
    }

    return data as UserLearningProgress | null;
  }

  const client = getSupabase();
  const { data, error } = await client
    .from('user_learning_progress')
    .insert({
      knowledge_entry_id: knowledgeEntryId,
      status: 'viewed',
      view_count: 1,
      last_viewed_at: new Date().toISOString(),
    })
    .select('*')
    .maybeSingle();

  if (error) {
    console.error('markViewed insert failed');
    return null;
  }

  return data as UserLearningProgress | null;
}

export async function markLearning(knowledgeEntryId: string): Promise<UserLearningProgress | null> {
  const existing = await getLearningProgress(knowledgeEntryId);

  if (existing) {
    const client = getSupabase();
    const { data, error } = await client
      .from('user_learning_progress')
      .update({
        status: 'learning',
        last_viewed_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('markLearning update failed');
      return null;
    }

    return data as UserLearningProgress | null;
  }

  const client = getSupabase();
  const { data, error } = await client
    .from('user_learning_progress')
    .insert({
      knowledge_entry_id: knowledgeEntryId,
      status: 'learning',
      view_count: 1,
      last_viewed_at: new Date().toISOString(),
    })
    .select('*')
    .maybeSingle();

  if (error) {
    console.error('markLearning insert failed');
    return null;
  }

  return data as UserLearningProgress | null;
}

export async function markCompleted(knowledgeEntryId: string): Promise<UserLearningProgress | null> {
  const existing = await getLearningProgress(knowledgeEntryId);

  if (existing) {
    const client = getSupabase();
    const { data, error } = await client
      .from('user_learning_progress')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        last_viewed_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('markCompleted update failed');
      return null;
    }

    return data as UserLearningProgress | null;
  }

  const client = getSupabase();
  const { data, error } = await client
    .from('user_learning_progress')
    .insert({
      knowledge_entry_id: knowledgeEntryId,
      status: 'completed',
      view_count: 1,
      completed_at: new Date().toISOString(),
      last_viewed_at: new Date().toISOString(),
    })
    .select('*')
    .maybeSingle();

  if (error) {
    console.error('markCompleted insert failed');
    return null;
  }

  return data as UserLearningProgress | null;
}
