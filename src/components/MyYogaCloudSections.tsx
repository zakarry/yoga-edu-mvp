import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { isSupabaseConfigured } from '../lib/supabase';
import {
  getDiagnosisHistory, isSixMonthsPast,
  type DiagnosisRecord,
} from '../services/diagnosisService';
import {
  getPracticeSummary, getPracticeLogs, type PracticeSummary, type PracticeLog,
} from '../services/practiceLogService';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

const practiceLabels: Record<string, string> = {
  asana: 'アーサナ',
  pranayama: '呼吸法',
  dhyana: '瞑想',
};

export function CloudDiagnosisSection({ onStartDiagnosis }: { onStartDiagnosis: () => void }) {
  const auth = useAuth();
  const [records, setRecords] = useState<DiagnosisRecord[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.user || !isSupabaseConfigured) { setLoading(false); return; }
    (async () => {
      const { data } = await getDiagnosisHistory(auth.user!.id);
      setRecords(data);
      setLoading(false);
    })();
  }, [auth.user]);

  if (!isSupabaseConfigured) {
    return (
      <section className="panel mypage-section">
        <h3>今のわたし（クラウド診断）</h3>
        <p className="auth-unavailable-text">現在クラウド保存を利用できません。</p>
      </section>
    );
  }

  if (!auth.user) {
    return (
      <section className="panel mypage-section">
        <h3>今のわたし（クラウド診断）</h3>
        <p>ログインすると、診断結果をクラウドに保存できます。</p>
      </section>
    );
  }

  if (!auth.privacy?.save_diagnosis) {
    return (
      <section className="panel mypage-section">
        <h3>今のわたし（クラウド診断）</h3>
        <p>Yoga Memory設定で「AI診断を保存する」がONのとき、診断結果がクラウドに保存されます。</p>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="panel mypage-section">
        <h3>今のわたし（クラウド診断）</h3>
        <p>読み込み中…</p>
      </section>
    );
  }

  if (!records || records.length === 0) {
    return (
      <section className="panel mypage-section">
        <h3>今のわたし（クラウド診断）</h3>
        <p>クラウドに保存された診断履歴はまだありません。</p>
        <button type="button" className="secondary-button" onClick={onStartDiagnosis}>AI診断を始める</button>
      </section>
    );
  }

  const latest = records[0];
  const previous = records[1];
  const sixMonths = isSixMonthsPast(latest.created_at);

  return (
    <section className="panel mypage-section">
      <div className="section-inline-header tight">
        <h3>今のわたし</h3>
      </div>
      <div className="cloud-diagnosis-latest">
        <span className="eyebrow">最新AI診断</span>
        <strong>{formatDate(latest.created_at)}</strong>
        <p>診断タイプ: {latest.diagnosis_type === 'student' ? '生徒' : '先生'}</p>
        {latest.result_type && <p>結果: {latest.result_type}</p>}
        {latest.safety_state !== 'normal' && (
          <p className="safety-badge" data-state={latest.safety_state}>
            安全状態: {latest.safety_state === 'caution' ? '注意' : '実践停止・専門家相談推奨'}
          </p>
        )}
      </div>

      {previous && (
        <div className="cloud-diagnosis-diff">
          <h4>前回との変化</h4>
          <p>前回: {formatDate(previous.created_at)}</p>
          <p>今回: {formatDate(latest.created_at)}</p>
          {latest.score_json && previous.score_json && (
            <ScoreDiff latest={latest.score_json} previous={previous.score_json} />
          )}
        </div>
      )}

      {sixMonths && (
        <div className="cloud-rediagnosis-cta">
          <p>前回のAI診断から6か月が経ちました。今のYoga状態をアップデートしませんか？</p>
          <button type="button" className="primary-button" onClick={onStartDiagnosis}>AI診断書を更新する</button>
        </div>
      )}

      <div className="hero-actions">
        <button type="button" className="secondary-button" onClick={onStartDiagnosis}>もう一度診断する</button>
      </div>
    </section>
  );
}

function ScoreDiff({ latest, previous }: { latest: Record<string, unknown>; previous: Record<string, unknown> }) {
  const keys = Object.keys(latest).filter((k) => typeof latest[k] === 'number' && typeof previous[k] === 'number');
  if (keys.length === 0) return null;
  return (
    <div className="score-diff-grid">
      {keys.map((k) => {
        const diff = (latest[k] as number) - (previous[k] as number);
        const tone = diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat';
        return (
          <div key={k} className={`score-diff-cell ${tone}`}>
            <span>{k}</span>
            <strong>{latest[k] as number}</strong>
            <small>{diff > 0 ? `+${diff}` : diff}</small>
          </div>
        );
      })}
    </div>
  );
}

export function CloudPracticeSection({ onStartAITeacher }: { onStartAITeacher?: () => void }) {
  const auth = useAuth();
  const [summary, setSummary] = useState<PracticeSummary | null>(null);
  const [logs, setLogs] = useState<PracticeLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.user || !isSupabaseConfigured) { setLoading(false); return; }
    (async () => {
      const { data: s } = await getPracticeSummary(auth.user!.id);
      setSummary(s);
      const { data: l } = await getPracticeLogs(auth.user!.id);
      setLogs(l ?? []);
      setLoading(false);
    })();
  }, [auth.user]);

  if (!isSupabaseConfigured) {
    return (
      <section className="panel mypage-section">
        <h3>My Practice</h3>
        <p className="auth-unavailable-text">現在クラウド保存を利用できません。</p>
      </section>
    );
  }

  if (!auth.user) {
    return (
      <section className="panel mypage-section">
        <h3>My Practice</h3>
        <p>ログインすると、実践履歴をクラウドに保存できます。</p>
      </section>
    );
  }

  if (!auth.privacy?.save_practice_history) {
    return (
      <section className="panel mypage-section">
        <h3>My Practice</h3>
        <p>Yoga Memory設定で「実践履歴を保存する」がONのとき、実践記録がクラウドに保存されます。</p>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="panel mypage-section">
        <h3>My Practice</h3>
        <p>読み込み中…</p>
      </section>
    );
  }

  if (!summary) return null;

  const types: Array<'asana' | 'pranayama' | 'dhyana'> = ['asana', 'pranayama', 'dhyana'];
  const hasAny = types.some((t) => summary[t].count > 0);

  if (!hasAny) {
    return (
      <section className="panel mypage-section">
        <h3>My Practice</h3>
        <p>クラウドに保存された実践履歴はまだありません。</p>
        {onStartAITeacher && (
          <button type="button" className="primary-button" onClick={onStartAITeacher} style={{ marginTop: 12 }}>今日の実践を始める — My AI Teacher</button>
        )}
      </section>
    );
  }

  return (
    <section className="panel mypage-section">
      <div className="section-inline-header tight">
        <h3>My Practice</h3>
      </div>
      <div className="practice-summary-grid">
        {types.map((t) => {
          const s = summary[t];
          return (
            <article key={t} className="practice-summary-card">
              <span>{practiceLabels[t]}</span>
              {s.count > 0 ? (
                <>
                  <strong>{s.count}回</strong>
                  <p>合計 {s.totalMinutes}分</p>
                  {s.latestDate && <small>最新: {formatDate(s.latestDate)}</small>}
                </>
              ) : (
                <p className="muted">記録なし</p>
              )}
            </article>
          );
        })}
      </div>
      {onStartAITeacher && (
        <div className="hero-actions" style={{ marginTop: 16 }}>
          <button type="button" className="primary-button" onClick={onStartAITeacher}>今日の実践を始める — My AI Teacher</button>
        </div>
      )}
      {logs.filter((l) => l.ai_teacher_used).length > 0 && (
        <div className="cloud-practice-ai-teacher">
          <h4>My AI Teacherで実践した記録</h4>
          <div className="cloud-practice-ai-list">
            {logs.filter((l) => l.ai_teacher_used).slice(0, 10).map((log) => {
              const typeLabel = practiceLabels[log.practice_type] ?? log.practice_type;
              return (
                <div key={log.id} className="cloud-practice-ai-row">
                  <span className={`type-pill ${log.practice_type}`}>{typeLabel}</span>
                  <strong>{log.practice_name}</strong>
                  <span>{log.duration_min ?? '-'}分</span>
                  {log.mood_after && <small>後: {log.mood_after}</small>}
                  <small>{formatDate(log.created_at)}</small>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
