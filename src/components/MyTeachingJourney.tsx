import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { isSupabaseConfigured } from '../lib/supabase';
import { getTeacherDiagnosisHistory, type DiagnosisRecord } from '../services/diagnosisService';
import {
  getProYogaStatus,
  type ProYogaCertification,
} from '../services/proYogaService';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

const statusLabels: Record<string, string> = {
  not_started: '未開始',
  learning: '学習中',
  applied: '受験申込済み',
  passed: '合格',
  certified: '認定済み',
};

const scoreLabels: Record<string, string> = {
  teaching: '指導力',
  reliability: '信頼性',
  system: '体系化力',
  activity: '集客・活動力',
  international: '国際対応力',
};

function TeacherScoreDiff({ latest, previous }: { latest: Record<string, unknown>; previous: Record<string, unknown> }) {
  const keys = Object.keys(latest).filter((k) => typeof latest[k] === 'number' && typeof previous[k] === 'number');
  if (keys.length === 0) return null;
  return (
    <div className="score-diff-grid">
      {keys.map((k) => {
        const diff = (latest[k] as number) - (previous[k] as number);
        const tone = diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat';
        return (
          <div key={k} className={`score-diff-cell ${tone}`}>
            <span>{scoreLabels[k] ?? k}</span>
            <strong>{latest[k] as number}</strong>
            <small>{diff > 0 ? `+${diff}` : diff}</small>
          </div>
        );
      })}
    </div>
  );
}

interface MyTeachingJourneyProps {
  onStartTeacherDiagnosis: () => void;
  onOpenProYoga: () => void;
}

export function MyTeachingJourney({ onStartTeacherDiagnosis, onOpenProYoga }: MyTeachingJourneyProps) {
  const auth = useAuth();
  const [diagnoses, setDiagnoses] = useState<DiagnosisRecord[] | null>(null);
  const [proYoga, setProYoga] = useState<ProYogaCertification | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.user || !isSupabaseConfigured) { setLoading(false); return; }
    (async () => {
      const [diagRes, proRes] = await Promise.all([
        getTeacherDiagnosisHistory(auth.user!.id),
        getProYogaStatus(auth.user!.id),
      ]);
      setDiagnoses(diagRes.data);
      setProYoga(proRes.data);
      setLoading(false);
    })();
  }, [auth.user]);

  if (auth.profile?.role === 'student') {
    return null;
  }

  if (!isSupabaseConfigured) {
    return (
      <section className="panel mypage-section">
        <h3>My Teaching Journey</h3>
        <p className="auth-unavailable-text">現在クラウド保存を利用できません。</p>
      </section>
    );
  }

  if (!auth.user) {
    return (
      <section className="panel mypage-section">
        <h3>My Teaching Journey</h3>
        <p>ログインすると、先生AI診断の履歴とPro Yoga学習の進捗を確認できます。</p>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="panel mypage-section">
        <h3>My Teaching Journey</h3>
        <p>読み込み中…</p>
      </section>
    );
  }

  const latestDiag = diagnoses?.[0];
  const previousDiag = diagnoses?.[1];
  const showDiag = auth.privacy?.save_diagnosis;

  return (
    <section className="panel mypage-section teaching-journey-section">
      <div className="section-inline-header tight">
        <h3>My Teaching Journey</h3>
      </div>

      <div className="teaching-journey-latest">
        <span className="eyebrow">先生としての現在地</span>
        {showDiag && latestDiag ? (
          <>
            <strong>{formatDate(latestDiag.created_at)}</strong>
            {latestDiag.result_type && <p>先生タイプ: {latestDiag.result_type}</p>}
            {latestDiag.score_json && (
              <div className="score-diff-grid">
                {Object.entries(latestDiag.score_json).map(([k, v]) => (
                  <div key={k} className="score-diff-cell flat">
                    <span>{scoreLabels[k] ?? k}</span>
                    <strong>{String(v)}</strong>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : showDiag ? (
          <p>クラウドに保存された先生AI診断履歴はまだありません。</p>
        ) : (
          <p>Yoga Memory設定で「AI診断を保存する」がONのとき、先生AI診断結果がクラウドに保存されます。</p>
        )}
        {showDiag && (
          <button type="button" className="secondary-button" onClick={onStartTeacherDiagnosis}>
            先生AI診断を受ける
          </button>
        )}
      </div>

      {showDiag && previousDiag && latestDiag?.score_json && previousDiag.score_json && (
        <div className="cloud-diagnosis-diff">
          <h4>前回との変化</h4>
          <p>前回: {formatDate(previousDiag.created_at)}</p>
          <p>今回: {formatDate(latestDiag.created_at)}</p>
          <TeacherScoreDiff latest={latestDiag.score_json} previous={previousDiag.score_json} />
        </div>
      )}

      <div className="teaching-journey-proyoga">
        <span className="eyebrow">Pro Yoga</span>
        {proYoga ? (
          <div className="proyoga-status-card">
            <div className="proyoga-status-row">
              <span>ステータス</span>
              <strong>{statusLabels[proYoga.status] ?? proYoga.status}</strong>
            </div>
            {proYoga.status === 'learning' && (
              <div className="proyoga-progress-bar" aria-hidden="true">
                <span style={{ width: `${proYoga.learning_progress}%` }} />
              </div>
            )}
            {proYoga.started_at && (
              <p>学習開始: {formatDate(proYoga.started_at)}</p>
            )}
            {proYoga.certified_at && (
              <p>認定日: {formatDate(proYoga.certified_at)}</p>
            )}
          </div>
        ) : (
          <p>Pro Yoga学習をまだ開始していません。</p>
        )}

        <div className="hero-actions">
          {proYoga?.status === 'not_started' && (
            <button type="button" className="gold-button" onClick={onOpenProYoga}>
              Pro Yogaの学習を始める
            </button>
          )}
          {proYoga?.status === 'learning' && (
            <button type="button" className="secondary-button" onClick={onOpenProYoga}>
              Pro Yogaの学習を続ける
            </button>
          )}
          {proYoga?.status === 'certified' && (
            <p className="proyoga-certified-label">Pro Yoga認定済み</p>
          )}
          {!proYoga && (
            <button type="button" className="gold-button" onClick={onOpenProYoga}>
              Pro Yogaの学習を始める
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
