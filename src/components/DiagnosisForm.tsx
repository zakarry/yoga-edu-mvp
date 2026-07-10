import { FormEvent, useMemo, useState } from 'react';
import { AREAS, LANGUAGES, StudentDiagnosisInput } from '../data';
import { TopBackLink } from './TopBackLink';

interface DiagnosisFormProps {
  initialValue: StudentDiagnosisInput;
  onSubmit: (value: StudentDiagnosisInput) => void;
  onBackHome: () => void;
}

const goalOptions = ['リラックス', '運動不足解消', 'ダイエット', '姿勢改善', '肩こり改善', '腰痛改善', '睡眠改善', 'ストレス軽減', '柔軟性向上', '瞑想・呼吸法', '本格的に学びたい', '資格取得に興味がある'];
const bodyOptions = ['肩こり', '首こり', '腰痛', '膝の不安', '股関節の硬さ', '冷え', 'むくみ', '疲れやすい', '睡眠の悩み', '自律神経の乱れ', '産後ケア', 'シニア向け配慮', '医師から運動制限あり'];
const styleOptions = ['ゆったり', 'バランス型', 'しっかり動く', '瞑想重視', '呼吸法重視', '少人数', '個別指導', '仲間と続けたい'];
const participationOptions = ['先生に習いたい', 'スクールに通いたい', 'イベントで試したい', 'ヨガクラブに入りたい', 'オンラインで受けたい', '自宅動画で始めたい'];

function toggleItem(list: string[], value: string) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export function DiagnosisForm({ initialValue, onSubmit, onBackHome }: DiagnosisFormProps) {
  const [form, setForm] = useState<StudentDiagnosisInput>(initialValue);

  const selectedCount = useMemo(
    () => form.goals.length + form.bodyConditions.length + form.preferredStyles.length + form.participationModes.length,
    [form],
  );

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(form);
  };

  return (
    <form className="page-shell" onSubmit={handleSubmit}>
      <div className="section-heading">
        <TopBackLink onBackHome={onBackHome} />
        <span className="eyebrow">Free Diagnosis</span>
        <h2>無料診断を始める</h2>
        <p>
          条件・目的・身体状態・国際対応ニーズをまとめて診断し、スクールを最優先におすすめを返します。
          現在の選択数は <strong>{selectedCount}</strong> 項目です。
        </p>
      </div>

      <div className="form-grid two-column">
        <section className="panel form-panel">
          <h3>基本情報</h3>
          <div className="field-grid two-column">
            <label className="field"><span>年代</span><select value={form.ageRange} onChange={(e) => setForm({ ...form, ageRange: e.target.value })}><option>10代</option><option>20代</option><option>30代</option><option>40代</option><option>50代</option><option>60代以上</option></select></label>
            <label className="field"><span>性別</span><select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}><option>女性</option><option>男性</option><option>ノンバイナリー</option><option>回答しない</option></select></label>
            <label className="field"><span>居住エリア</span><select value={form.residentArea} onChange={(e) => setForm({ ...form, residentArea: e.target.value })}>{AREAS.map((area) => <option key={area}>{area}</option>)}</select></label>
            <label className="field"><span>希望エリア</span><select value={form.preferredArea} onChange={(e) => setForm({ ...form, preferredArea: e.target.value })}>{AREAS.map((area) => <option key={area}>{area}</option>)}</select></label>
            <label className="field"><span>ヨガ経験</span><select value={form.yogaExperience} onChange={(e) => setForm({ ...form, yogaExperience: e.target.value })}><option>未経験</option><option>少しある</option><option>継続中</option><option>深く学んでいる</option></select></label>
            <label className="field"><span>運動習慣</span><select value={form.exerciseHabit} onChange={(e) => setForm({ ...form, exerciseHabit: e.target.value })}><option>ほとんどない</option><option>週1回程度</option><option>週2-3回</option><option>日常的にある</option></select></label>
            <label className="field"><span>オンライン受講可否</span><select value={form.onlineAvailable} onChange={(e) => setForm({ ...form, onlineAvailable: e.target.value })}><option>可能</option><option>対面希望</option><option>どちらでもよい</option></select></label>
          </div>
        </section>

        <section className="panel form-panel">
          <h3>国際対応</h3>
          <div className="field-grid">
            <label className="field"><span>希望言語</span><select value={form.preferredLanguage} onChange={(e) => setForm({ ...form, preferredLanguage: e.target.value })}>{LANGUAGES.map((lang) => <option key={lang}>{lang}</option>)}</select></label>
            <label className="field"><span>日本語での受講不安</span><select value={form.japaneseAnxiety} onChange={(e) => setForm({ ...form, japaneseAnxiety: e.target.value })}><option>ない</option><option>少しある</option><option>かなりある</option></select></label>
            <label className="field"><span>外国人対応可能な先生・スクール希望</span><select value={form.wantsForeignFriendly} onChange={(e) => setForm({ ...form, wantsForeignFriendly: e.target.value })}><option>希望する</option><option>どちらでもよい</option></select></label>
          </div>
          <div className="status-card soft-green">
            <strong>診断のポイント</strong>
            <p>希望言語が英語・中国語・イタリア語の場合は、国際対応可能な先生・スクール・イベント・クラブを上位表示します。</p>
          </div>
        </section>
      </div>

      <div className="form-grid">
        <MultiSection title="目的" description="複数選択可" options={goalOptions} values={form.goals} onToggle={(value) => setForm({ ...form, goals: toggleItem(form.goals, value) })} />
        <MultiSection title="身体状態" description="複数選択可" options={bodyOptions} values={form.bodyConditions} onToggle={(value) => setForm({ ...form, bodyConditions: toggleItem(form.bodyConditions, value) })} />
        <MultiSection title="希望スタイル" description="複数選択可" options={styleOptions} values={form.preferredStyles} onToggle={(value) => setForm({ ...form, preferredStyles: toggleItem(form.preferredStyles, value) })} />
        <MultiSection title="参加形態" description="複数選択可" options={participationOptions} values={form.participationModes} onToggle={(value) => setForm({ ...form, participationModes: toggleItem(form.participationModes, value) })} />
      </div>

      <div className="cta-bar">
        <button type="submit" className="primary-button">診断結果を見る</button>
      </div>
    </form>
  );
}

function MultiSection({
  title,
  description,
  options,
  values,
  onToggle,
}: {
  title: string;
  description: string;
  options: string[];
  values: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <section className="panel form-panel">
      <div className="section-inline-header">
        <h3>{title}</h3>
        <span>{description}</span>
      </div>
      <div className="chip-grid">
        {options.map((option) => {
          const active = values.includes(option);
          return (
            <button
              type="button"
              key={option}
              className={active ? 'select-chip active' : 'select-chip'}
              onClick={() => onToggle(option)}
            >
              {option}
            </button>
          );
        })}
      </div>
    </section>
  );
}
