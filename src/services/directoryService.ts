import type { Club, EventItem, School, SearchItem, Teacher } from '../data';
import { clubs, events, schools, teachers } from '../data';
import { supabase } from '../lib/supabase';

interface DirectoryRow {
  id: string;
  legacy_id: string;
  name: string;
  area: string;
  latitude: number;
  longitude: number;
  description: string;
  is_published: boolean;
  target_levels?: string[];
  specialties?: string[];
  formats?: string[];
  certifications?: string[];
  foreign_support_status?: string;
  languages?: string[];
  language_level?: string;
  pro_yoga_status?: string;
  beginner_friendly?: boolean;
  school_types?: string[];
  programs?: string[];
  strengths?: string[];
  international_support_level?: string;
  pro_yoga_supported?: boolean;
  featured?: boolean;
  priority_rank?: number;
  admin_recommended?: boolean;
  google_place_id?: string | null;
  website_url?: string | null;
  event_date?: string;
  date?: string;
  organizer_type?: string;
  event_types?: string[];
  content_tags?: string[];
  foreign_participant_status?: string;
  has_interpreter?: boolean;
  is_international_event?: boolean;
  club_types?: string[];
  activities?: string[];
  international_exchange_available?: boolean;
}

const tableByType = {
  teacher: 'teachers',
  school: 'schools',
  event: 'events',
  club: 'clubs',
} as const;

const fieldsByType = {
  teacher: 'id, legacy_id, name, area, latitude, longitude, description, target_levels, specialties, formats, certifications, foreign_support_status, languages, language_level, pro_yoga_status, beginner_friendly, is_published',
  school: 'id, legacy_id, name, area, latitude, longitude, description, school_types, programs, strengths, foreign_support_status, languages, international_support_level, pro_yoga_supported, featured, priority_rank, admin_recommended, google_place_id, website_url, is_published',
  event: 'id, legacy_id, name, area, latitude, longitude, event_date, description, organizer_type, event_types, content_tags, foreign_participant_status, languages, has_interpreter, is_international_event, is_published',
  club: 'id, legacy_id, name, area, latitude, longitude, description, club_types, activities, foreign_participant_status, languages, international_exchange_available, is_published',
} as const;

function baseRow(row: DirectoryRow): Pick<SearchItem, 'id' | 'name' | 'area' | 'lat' | 'lng' | 'description'> {
  return {
    id: row.legacy_id,
    name: row.name,
    area: row.area,
    lat: row.latitude,
    lng: row.longitude,
    description: row.description,
  };
}

function adaptTeacher(row: DirectoryRow): Teacher {
  return {
    ...baseRow(row),
    type: 'teacher',
    targetLevels: row.target_levels ?? [],
    specialties: row.specialties ?? [],
    formats: row.formats ?? [],
    certifications: row.certifications ?? [],
    foreignSupportStatus: row.foreign_support_status as Teacher['foreignSupportStatus'],
    languages: row.languages ?? [],
    languageLevel: row.language_level ?? '',
    proYogaStatus: row.pro_yoga_status ?? '',
  };
}

function adaptSchool(row: DirectoryRow): School {
  return {
    ...baseRow(row),
    type: 'school',
    schoolTypes: row.school_types ?? [],
    programs: row.programs ?? [],
    strengths: row.strengths ?? [],
    foreignSupportStatus: row.foreign_support_status as School['foreignSupportStatus'],
    languages: row.languages ?? [],
    internationalSupportLevel: row.international_support_level ?? '',
    proYogaSupported: row.pro_yoga_supported ?? false,
    featured: row.featured ?? false,
    priorityRank: row.priority_rank ?? 0,
    adminRecommended: row.admin_recommended ?? false,
  };
}

function adaptEvent(row: DirectoryRow): EventItem {
  return {
    ...baseRow(row),
    type: 'event',
    date: row.event_date ?? row.date ?? '',
    organizerType: row.organizer_type ?? '',
    eventTypes: row.event_types ?? [],
    contentTags: row.content_tags ?? [],
    foreignParticipantStatus: row.foreign_participant_status as EventItem['foreignParticipantStatus'],
    languages: row.languages ?? [],
    hasInterpreter: row.has_interpreter ?? false,
    isInternationalEvent: row.is_international_event ?? false,
  };
}

function adaptClub(row: DirectoryRow): Club {
  return {
    ...baseRow(row),
    type: 'club',
    clubTypes: row.club_types ?? [],
    activities: row.activities ?? [],
    foreignParticipantStatus: row.foreign_participant_status as Club['foreignParticipantStatus'],
    languages: row.languages ?? [],
    internationalExchangeAvailable: row.international_exchange_available ?? false,
  };
}

async function fetchType<T extends SearchItem>(type: T['type'], fallback: T[], adapter: (row: DirectoryRow) => T): Promise<{ data: T[]; usedFallback: boolean; error: string | null }> {
  if (!supabase) return { data: fallback, usedFallback: true, error: 'Supabase is not configured' };
  const { data, error } = await supabase
    .from(tableByType[type])
    .select(fieldsByType[type])
    .eq('is_published', true)
    .order('legacy_id');
  if (error) return { data: fallback, usedFallback: true, error: error.message };
  if (!data) return { data: fallback, usedFallback: true, error: 'Directory response was empty' };
  return { data: (data as DirectoryRow[]).map(adapter), usedFallback: false, error: null };
}

export async function fetchDirectory(): Promise<{
  teachers: Teacher[];
  schools: School[];
  events: EventItem[];
  clubs: Club[];
  usedFallback: boolean;
  errors: Partial<Record<SearchItem['type'], string>>;
}> {
  const results = await Promise.all([
    fetchType<Teacher>('teacher', teachers, adaptTeacher),
    fetchType<School>('school', schools, adaptSchool),
    fetchType<EventItem>('event', events, adaptEvent),
    fetchType<Club>('club', clubs, adaptClub),
  ]);
  const errors: Partial<Record<SearchItem['type'], string>> = {};
  results.forEach((result, index) => {
    if (result.error) errors[(['teacher', 'school', 'event', 'club'] as const)[index]] = result.error;
  });
  return {
    teachers: results[0].data,
    schools: results[1].data,
    events: results[2].data,
    clubs: results[3].data,
    usedFallback: results.some((result) => result.usedFallback),
    errors,
  };
}

export async function findTeacherRecord(legacyId: string): Promise<{ id: string; error: string | null }> {
  if (!supabase) return { id: legacyId, error: '現在クラウド保存を利用できません' };
  const { data, error } = await supabase.from('teachers').select('id').eq('legacy_id', legacyId).maybeSingle();
  if (error || !data) return { id: '', error: error?.message ?? '先生が見つかりません' };
  return { id: data.id as string, error: null };
}
