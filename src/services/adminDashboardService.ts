import { supabase } from '../lib/supabase';

export interface AdminSummary {
  totalMembers: number;
  freeMembers: number;
  paidMembers: number;
  todayNew: number;
  weekNew: number;
  monthNew: number;
  lineLinkedMembers: number;
  diagnosisUsers: number;
  diagnosisCount: number;
  aiTeacherUsers: number;
  aiTeacherCount: number;
  practiceUsers: number;
  practiceCount: number;
}

export interface AdminMember {
  id: string;
  displayName: string;
  membershipTier: string;
  role: string;
  area: string;
  createdAt: string;
  lineLinked: boolean;
  consentVerified: boolean;
  consentDate: string | null;
  diagnosisCount: number;
  practiceCount: number;
  aiTeacherUsed: boolean;
}

export interface AdminMembersResponse {
  members: AdminMember[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminMembersParams {
  page?: number;
  pageSize?: number;
  search?: string;
  membershipTier?: 'all' | 'free' | 'paid';
  lineLinked?: boolean;
}

async function callAdminDashboard(body: Record<string, unknown>): Promise<Response> {
  if (!supabase) throw new Error('Supabase not configured');
  const { data: session } = await supabase.auth.getSession();
  const accessToken = session?.session?.access_token;
  if (!accessToken) throw new Error('No session');

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-dashboard`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
  });
  return res;
}

export async function fetchAdminSummary(): Promise<AdminSummary> {
  const res = await callAdminDashboard({ action: 'summary' });
  if (res.status === 403) throw new Error('forbidden');
  if (res.status === 401) throw new Error('unauthorized');
  if (!res.ok) throw new Error('fetch_error');
  const data = await res.json();
  if (data.error) throw new Error('fetch_error');
  return data.summary as AdminSummary;
}

export async function fetchAdminMembers(params: AdminMembersParams): Promise<AdminMembersResponse> {
  const res = await callAdminDashboard({
    action: 'members',
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 50,
    search: params.search ?? '',
    membershipTier: params.membershipTier ?? 'all',
    lineLinked: params.lineLinked ?? false,
  });
  if (res.status === 403) throw new Error('forbidden');
  if (res.status === 401) throw new Error('unauthorized');
  if (!res.ok) throw new Error('fetch_error');
  const data = await res.json();
  if (data.error) throw new Error('fetch_error');
  return data as AdminMembersResponse;
}
