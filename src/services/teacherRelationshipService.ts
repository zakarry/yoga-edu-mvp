import { supabase } from '../lib/supabase';
import { findTeacherRecord } from './directoryService';

export type RelationshipType = 'primary' | 'regular' | 'specialist';
export type RelationshipStatus = 'active' | 'ended';

export interface TeacherRelationship {
  id: string;
  teacherId: string;
  teacherName: string;
  area: string;
  relationshipType: RelationshipType;
  status: RelationshipStatus;
  startedAt: string;
  endedAt: string | null;
}

type RelationshipRow = {
  id: string;
  teacher_id: string;
  relationship_type: RelationshipType;
  status: RelationshipStatus;
  started_at: string;
  ended_at: string | null;
  teacher: { legacy_id: string; name: string; area: string } | Array<{ legacy_id: string; name: string; area: string }> | null;
};

function mapRelationship(row: RelationshipRow): TeacherRelationship | null {
  const teacher = Array.isArray(row.teacher) ? row.teacher[0] : row.teacher;
  if (!teacher) return null;
  return {
    id: row.id,
    teacherId: teacher.legacy_id,
    teacherName: teacher.name,
    area: teacher.area,
    relationshipType: row.relationship_type,
    status: row.status,
    startedAt: row.started_at,
    endedAt: row.ended_at,
  };
}

export async function getTeacherRelationships(userId: string): Promise<{ data: TeacherRelationship[]; error: string | null }> {
  if (!supabase) return { data: [], error: '現在クラウド保存を利用できません' };
  const { data, error } = await supabase
    .from('teacher_relationships')
    .select('id, teacher_id, relationship_type, status, started_at, ended_at, teacher:teachers(legacy_id, name, area)')
    .eq('user_id', userId)
    .order('status', { ascending: true })
    .order('started_at', { ascending: false });
  if (error) return { data: [], error: error.message };
  return { data: (data as RelationshipRow[]).map(mapRelationship).filter((row): row is TeacherRelationship => row !== null), error: null };
}

export async function addTeacherRelationship(userId: string, legacyTeacherId: string, relationshipType: RelationshipType): Promise<{ error: string | null }> {
  if (!supabase) return { error: '現在クラウド保存を利用できません' };
  const teacher = await findTeacherRecord(legacyTeacherId);
  if (teacher.error) return { error: teacher.error };
  const { error } = await supabase.from('teacher_relationships').insert({
    user_id: userId,
    teacher_id: teacher.id,
    relationship_type: relationshipType,
    status: 'active',
  });
  return { error: error?.message ?? null };
}

export async function endTeacherRelationship(userId: string, relationshipId: string): Promise<{ error: string | null }> {
  if (!supabase) return { error: '現在クラウド保存を利用できません' };
  const { error } = await supabase
    .from('teacher_relationships')
    .update({ status: 'ended', ended_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', relationshipId)
    .eq('user_id', userId)
    .eq('status', 'active');
  return { error: error?.message ?? null };
}
