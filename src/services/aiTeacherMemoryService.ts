import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { MemoryEntry, MemoryEntryType } from '../types/aiTeacherLayers';

const LOCAL_MEMORY_KEY = 'yoga-ai-teacher-memory-v1';

// ── DB row type ──
interface MemoryRow {
  id: string;
  user_id: string;
  entry_type: string;
  label: string;
  detail: string | null;
  source: string;
  active: boolean;
  created_at: string;
  last_confirmed_at: string | null;
}

function rowToEntry(row: MemoryRow): MemoryEntry {
  return {
    id: row.id,
    type: row.entry_type as MemoryEntry['type'],
    label: row.label,
    detail: row.detail,
    source: row.source as MemoryEntry['source'],
    active: row.active,
    createdAt: row.created_at,
    lastConfirmedAt: row.last_confirmed_at,
  };
}

// ── Cloud operations (logged-in) ──

export async function fetchMemory(userId: string): Promise<{ data: MemoryEntry[] | null; error: string | null }> {
  if (!supabase || !isSupabaseConfigured) return { data: null, error: 'クラウド保存を利用できません' };
  const { data, error } = await supabase
    .from('ai_teacher_memory')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) return { data: null, error: error.message };
  return { data: (data as MemoryRow[]).map(rowToEntry), error: null };
}

export async function addMemoryEntry(
  userId: string,
  entry: { type: MemoryEntryType; label: string; detail?: string | null; source?: string },
): Promise<{ data: MemoryEntry | null; error: string | null }> {
  if (!supabase || !isSupabaseConfigured) return { data: null, error: 'クラウド保存を利用できません' };
  const { data, error } = await supabase
    .from('ai_teacher_memory')
    .insert({
      user_id: userId,
      entry_type: entry.type,
      label: entry.label,
      detail: entry.detail ?? null,
      source: entry.source ?? 'user_reported',
      active: true,
    })
    .select('*')
    .single();
  if (error) return { data: null, error: error.message };
  return { data: rowToEntry(data as MemoryRow), error: null };
}

export async function updateMemoryEntry(
  userId: string,
  entryId: string,
  updates: { label?: string; detail?: string | null; active?: boolean; last_confirmed_at?: string },
): Promise<{ error: string | null }> {
  if (!supabase || !isSupabaseConfigured) return { error: 'クラウド保存を利用できません' };
  const { error } = await supabase
    .from('ai_teacher_memory')
    .update(updates)
    .eq('id', entryId)
    .eq('user_id', userId);
  return { error: error?.message ?? null };
}

export async function deleteMemoryEntry(userId: string, entryId: string): Promise<{ error: string | null }> {
  if (!supabase || !isSupabaseConfigured) return { error: 'クラウド保存を利用できません' };
  const { error } = await supabase
    .from('ai_teacher_memory')
    .delete()
    .eq('id', entryId)
    .eq('user_id', userId);
  return { error: error?.message ?? null };
}

// ── Local fallback (not logged-in) ──

export function loadLocalMemory(): MemoryEntry[] {
  try {
    const raw = localStorage.getItem(LOCAL_MEMORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as MemoryEntry[];
  } catch {
    return [];
  }
}

export function saveLocalMemoryEntry(entry: { type: MemoryEntryType; label: string; detail?: string | null; source?: string }): MemoryEntry {
  const item: MemoryEntry = {
    id: `local-mem-${Date.now()}`,
    type: entry.type,
    label: entry.label,
    detail: entry.detail ?? null,
    source: (entry.source as MemoryEntry['source']) ?? 'user_reported',
    active: true,
    createdAt: new Date().toISOString(),
    lastConfirmedAt: null,
  };
  const all = loadLocalMemory();
  all.unshift(item);
  try {
    localStorage.setItem(LOCAL_MEMORY_KEY, JSON.stringify(all.slice(0, 100)));
  } catch {
    // ignore
  }
  return item;
}

export function updateLocalMemoryEntry(entryId: string, updates: { label?: string; detail?: string | null; active?: boolean }): void {
  const all = loadLocalMemory();
  const idx = all.findIndex((m) => m.id === entryId);
  if (idx === -1) return;
  if (updates.label !== undefined) all[idx].label = updates.label;
  if (updates.detail !== undefined) all[idx].detail = updates.detail;
  if (updates.active !== undefined) all[idx].active = updates.active;
  try {
    localStorage.setItem(LOCAL_MEMORY_KEY, JSON.stringify(all));
  } catch {
    // ignore
  }
}

export function deleteLocalMemoryEntry(entryId: string): void {
  const all = loadLocalMemory().filter((m) => m.id !== entryId);
  try {
    localStorage.setItem(LOCAL_MEMORY_KEY, JSON.stringify(all));
  } catch {
    // ignore
  }
}

// ── Unified API: cloud if logged in, local otherwise ──

export async function getMemory(userId: string | null): Promise<MemoryEntry[]> {
  if (userId && isSupabaseConfigured) {
    const { data, error } = await fetchMemory(userId);
    if (error) return [];
    return data ?? [];
  }
  return loadLocalMemory();
}

export async function addMemory(
  userId: string | null,
  entry: { type: MemoryEntryType; label: string; detail?: string | null; source?: string },
): Promise<MemoryEntry | null> {
  if (userId && isSupabaseConfigured) {
    const { data, error } = await addMemoryEntry(userId, entry);
    if (error) return null;
    return data;
  }
  return saveLocalMemoryEntry(entry);
}

export async function editMemory(
  userId: string | null,
  entryId: string,
  updates: { label?: string; detail?: string | null; active?: boolean },
): Promise<void> {
  if (userId && isSupabaseConfigured) {
    await updateMemoryEntry(userId, entryId, { ...updates, last_confirmed_at: new Date().toISOString() });
    return;
  }
  updateLocalMemoryEntry(entryId, updates);
}

export async function removeMemory(userId: string | null, entryId: string): Promise<void> {
  if (userId && isSupabaseConfigured) {
    await deleteMemoryEntry(userId, entryId);
    return;
  }
  deleteLocalMemoryEntry(entryId);
}

// ── Safety: convert user-reported concern to memory entry ──
// Explicitly NOT a medical diagnosis. Stored as user_reported_concern.

export function createUserReportedConcern(area: string, text: string): {
  type: MemoryEntryType;
  label: string;
  detail: string;
  source: string;
} {
  return {
    type: 'user_reported_concern',
    label: `${area}に不安があると本人から申告あり`,
    detail: text,
    source: 'user_reported',
  };
}

// ── Memory summary for planner integration ──

export interface MemorySummary {
  favoritePractices: string[];
  frequentPractices: string[];
  preferredDuration: number | null;
  preferredTime: string | null;
  preferredExplanation: string | null;
  preferredTone: string | null;
  goals: string[];
  userConcerns: { area: string; text: string }[];
  activeConcerns: string[];
}

export function summarizeMemory(entries: MemoryEntry[]): MemorySummary {
  const active = entries.filter((e) => e.active);
  return {
    favoritePractices: active.filter((e) => e.type === 'favorite_practice').map((e) => e.label),
    frequentPractices: active.filter((e) => e.type === 'frequent_practice').map((e) => e.label),
    preferredDuration: (() => {
      const e = active.find((e) => e.type === 'preferred_duration');
      return e ? parseInt(e.label, 10) || null : null;
    })(),
    preferredTime: active.find((e) => e.type === 'preferred_time')?.label ?? null,
    preferredExplanation: active.find((e) => e.type === 'preferred_explanation_style')?.label ?? null,
    preferredTone: active.find((e) => e.type === 'preferred_teacher_tone')?.label ?? null,
    goals: active.filter((e) => e.type === 'goal').map((e) => e.label),
    userConcerns: active
      .filter((e) => e.type === 'user_reported_concern')
      .map((e) => ({ area: e.label.split('に')[0] ?? '', text: e.detail ?? e.label })),
    activeConcerns: active
      .filter((e) => e.type === 'user_reported_concern')
      .map((e) => e.label),
  };
}
