import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { isSupabaseConfigured } from '../lib/supabase';
import { endTeacherRelationship, getTeacherRelationships, type TeacherRelationship } from '../services/teacherRelationshipService';

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('ja-JP');
}

interface MyTeacherSectionProps {
  refreshToken?: number;
}

export function MyTeacherSection({ refreshToken = 0 }: MyTeacherSectionProps) {
  const auth = useAuth();
  const [relationships, setRelationships] = useState<TeacherRelationship[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!auth.user || !isSupabaseConfigured) return;
    const result = await getTeacherRelationships(auth.user.id);
    setRelationships(result.data);
    setError(result.error);
  }, [auth.user]);

  useEffect(() => { void load(); }, [load, refreshToken]);

  if (!auth.user) return null;
  if (!isSupabaseConfigured) return null;

  const active = relationships.filter((item) => item.status === 'active');
  const ended = relationships.filter((item) => item.status === 'ended');

  return (
    <section className="panel mypage-section my-teacher-section">
      <div className="section-inline-header tight">
        <div>
          <span className="eyebrow">My Teacher</span>
          <h3>My Teacher</h3>
        </div>
        <span>{active.length}人</span>
      </div>
      <p className="result-section-copy">あなたの先生として記録した先生を確認できます。先生への通知は行われません。</p>
      {error && <p className="auth-unavailable-text">先生の記録を読み込めませんでした。</p>}
      {active.length === 0 ? (
        <div className="empty-box">現在の先生はまだ登録されていません。</div>
      ) : (
        <div className="my-teacher-list">
          {active.map((item) => (
            <article className="my-teacher-card" key={item.id}>
              <div><span className="eyebrow">現在の先生</span><h4>{item.teacherName}</h4><p>{item.area} / {item.relationshipType}</p></div>
              <dl><div><dt>開始日</dt><dd>{formatDate(item.startedAt)}</dd></div></dl>
              <button type="button" className="secondary-button" onClick={async () => { await endTeacherRelationship(auth.user!.id, item.id); await load(); }}>この先生との記録を終了</button>
            </article>
          ))}
        </div>
      )}
      {ended.length > 0 && (
        <details className="mypage-details-panel">
          <summary>過去の先生を見る</summary>
          <div className="my-teacher-list">
            {ended.map((item) => (
              <article className="my-teacher-card ended" key={item.id}>
                <div><h4>{item.teacherName}</h4><p>{item.area} / {item.relationshipType}</p></div>
                <p>学んでいた期間: {formatDate(item.startedAt)}〜{formatDate(item.endedAt)}</p>
              </article>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}
