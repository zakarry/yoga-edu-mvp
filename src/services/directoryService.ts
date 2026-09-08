import type { Club, EventItem, School, SearchItem, Teacher } from '../data';
import { clubs, events, schools, teachers } from '../data';
import { supabase } from '../lib/supabase';

interface DirectoryRow {
  id: string;
  legacy_id: string;
  name: string;
  area: string;
  lat: number;
  lng: number;
  description: string;
  payload: Record<string, unknown>;
}

const tableByType = {
  teacher: 'teachers',
  school: 'schools',
  event: 'events',
  club: 'clubs',
} as const;

function adaptRow<T extends SearchItem>(row: DirectoryRow): T {
  return {
    ...(row.payload as object),
    id: row.legacy_id,
    name: row.name,
    type: (row.payload.type as SearchItem['type']) ?? 'teacher',
    area: row.area,
    lat: row.lat,
    lng: row.lng,
    description: row.description,
  } as T;
}

async function fetchType<T extends SearchItem>(type: T['type'], fallback: T[]): Promise<T[]> {
  if (!supabase) return fallback;
  const { data, error } = await supabase
    .from(tableByType[type])
    .select('id, legacy_id, name, area, lat, lng, description, payload')
    .eq('is_published', true)
    .order('legacy_id');
  if (error || !data || data.length === 0) return fallback;
  return (data as DirectoryRow[]).map((row) => adaptRow<T>(row));
}

export async function fetchDirectory(): Promise<{
  teachers: Teacher[];
  schools: School[];
  events: EventItem[];
  clubs: Club[];
  usedFallback: boolean;
}> {
  if (!supabase) return { teachers, schools, events, clubs, usedFallback: true };
  const results = await Promise.all([
    fetchType<Teacher>('teacher', teachers),
    fetchType<School>('school', schools),
    fetchType<EventItem>('event', events),
    fetchType<Club>('club', clubs),
  ]);
  const usedFallback = results.some((result, index) => result.length === [teachers, schools, events, clubs][index].length && result === [teachers, schools, events, clubs][index]);
  return { teachers: results[0], schools: results[1], events: results[2], clubs: results[3], usedFallback };
}

export async function findTeacherRecord(legacyId: string): Promise<{ id: string; error: string | null }> {
  if (!supabase) return { id: legacyId, error: '現在クラウド保存を利用できません' };
  const { data, error } = await supabase.from('teachers').select('id').eq('legacy_id', legacyId).maybeSingle();
  if (error || !data) return { id: '', error: error?.message ?? '先生が見つかりません' };
  return { id: data.id as string, error: null };
}
