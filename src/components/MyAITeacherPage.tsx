import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../lib/auth';
import { savePracticeLog } from '../services/practiceLogService';
import {
  loadPersona, savePersona, clearPersona,
  loadTodayProgram, saveTodayProgram,
  loadGrowth, saveGrowth,
  saveLocalPracticeLog, loadLocalPracticeLogs,
  type AITeacherPersona, type TodayProgram, type ProgramItem,
  type AITeacherGrowth, type LocalPracticeLog,
} from '../lib/aiTeacherStorage';
import type { DiagnosisRecord, SafetyState } from '../services/diagnosisService';

interface MyAITeacherPageProps {
  onBackHome: () => void;
  onOpenDiagnosis: () => void;
  onOpenMyPage: () => void;
  onOpenProYoga: () => void;
  latestDiagnosis: DiagnosisRecord | null;
}

type StepId = 'home' | 'step1' | 'step2' | 'step3' | 'step4' | 'step5' | 'step6' | 'step7' | 'step8';

const AVATAR_OPTIONS = ['🧘', '🌸', '🌿', '🌅', '🪷', '⚡'];

const PERSONALITY_OPTIONS = [
  { v: 'gentle', label: 'やさしく寄り添う' },
  { v: 'encouraging', label: '前向きに励ます' },
  { v: 'calm', label: '静かで落ち着いた' },
  { v: 'precise', label: '丁寧に説明する' },
];

const SPECIALTY_OPTIONS = [
  { v: 'relax', label: 'リラックス・呼吸法' },
  { v: 'flow', label: 'フロー・体を動かす' },
  { v: 'meditation', label: '瞑想・マインドフルネス' },
  { v: 'alignment', label: 'アライメント・姿勢' },
];

// ── Program generation (rule-based, non-medical) ──

function generateProgram(opts: {
  preferredStyle: string | null;
  recentTypes: string[];
  sessionCount: number;
}): TodayProgram {
  const items: ProgramItem[] = [];
  const { preferredStyle, recentTypes } = opts;

  // Asana
  const asanaPool: Record<string, ProgramItem> = {
    relax: { name: 'やさしいストレッチ', type: 'asana', durationMin: 10 },
    flow: { name: 'サンフロウ', type: 'asana', durationMin: 15 },
    alignment: { name: '山のポーズから立ち木のポーズ', type: 'asana', durationMin: 10 },
    default: { name: '初心者向けアーサナ', type: 'asana', durationMin: 10 },
  };
  const asanaKey = preferredStyle && asanaPool[preferredStyle] ? preferredStyle : 'default';
  items.push(asanaPool[asanaKey]);

  // Pranayama
  const pranayamaRecent = recentTypes.filter((t) => t === 'pranayama').length;
  items.push({
    name: pranayamaRecent > 0 ? 'ボックスブリージング' : '腹式呼吸',
    type: 'pranayama',
    durationMin: 5,
  });

  // Dhyana
  items.push({
    name: '1分間マインドフルネス',
    type: 'dhyana',
    durationMin: 3,
  });

  return {
    items,
    generatedAt: new Date().toISOString(),
    basedOn: opts.sessionCount > 0 ? 'history' : 'default',
  };
}

// ── Safety check ──

function isSafetyBlocked(safetyState: SafetyState | undefined | null): boolean {
  return safetyState === 'stop_and_refer';
}

function isSafetyCautioned(safetyState: SafetyState | undefined | null): boolean {
  return safetyState === 'caution';
}

// ── Rule-based chat (safety-modified) ──

interface ChatMessage {
  role: 'user' | 'teacher';
  text: string;
  isSafety?: boolean;
}

const SAFETY_KEYWORDS = ['痛い', '怪我', '妊娠', '既往症', '病気', '腰痛', '膝が', '肩が痛', '高血圧', '診断', '治療', '薬', 'めまい', 'しびれ'];

function detectSafetyKeyword(text: string): string | null {
  for (const kw of SAFETY_KEYWORDS) {
    if (text.includes(kw)) return kw;
  }
  return null;
}

function generateChatResponse(userText: string, persona: AITeacherPersona | null): ChatMessage {
  const safetyHit = detectSafetyKeyword(userText);
  if (safetyHit) {
    return {
      role: 'teacher',
      text: 'ありがとうございます。ただし、痛みや怪我、妊娠や既往症などについては、私から個別の判断や実践提案を行うことはできません。まずは医療専門家やヨガの先生にご相談ください。一般的なリラックス法として、深い呼吸を数回行うことならできます。よろしければご案内しますか？',
      isSafety: true,
    };
  }

  const name = persona?.name ?? 'AI先生';
  const lower = userText.toLowerCase();

  if (userText.includes('短く') || userText.includes('時間がない')) {
    return { role: 'teacher', text: `${name}です。では今日は5分の呼吸と3分の瞑想にしましょう。短くても毎日続けることが大切です。` };
  }
  if (userText.includes('瞑想')) {
    return { role: 'teacher', text: `${name}です。瞑想を取り入れましょう。静かな場所で座り、呼吸に意識を向けます。3分から始めましょう。` };
  }
  if (userText.includes('呼吸') || lower.includes('pranayama')) {
    return { role: 'teacher', text: `${name}です。呼吸法を中心にしましょう。4秒吸って4秒止めて4秒吐いて4秒止めるボックスブリージングから始めます。` };
  }
  if (userText.includes('疲れ') || userText.includes('つかれた')) {
    return { role: 'teacher', text: `${name}です。お疲れ様です。今日は無理をせず、やさしいストレッチと深呼吸で体を休めましょう。` };
  }
  if (userText.includes('リラックス') || userText.includes('落ち着')) {
    return { role: 'teacher', text: `${name}です。リラックス重視でいきましょう。仰向けで膝を曲げるポーズから始め、ゆっくり呼吸を整えます。` };
  }
  return { role: 'teacher', text: `${name}です。今日の実践を始めましょう。アーサナ・呼吸法・瞑想のどれから始めても大丈夫です。あなたのペースで進めましょう。` };
}

// ── Component ──

export function MyAITeacherPage({ onBackHome, onOpenDiagnosis, onOpenMyPage, onOpenProYoga, latestDiagnosis }: MyAITeacherPageProps) {
  const auth = useAuth();
  const [step, setStep] = useState<StepId>('home');
  const [persona, setPersona] = useState<AITeacherPersona | null>(null);
  const [program, setProgram] = useState<TodayProgram | null>(null);
  const [growth, setGrowth] = useState<AITeacherGrowth>(loadGrowth());
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [cameraOn, setCameraOn] = useState(false);
  const [practiceActive, setPracticeActive] = useState(false);
  const [practiceType, setPracticeType] = useState<'asana' | 'pranayama' | 'dhyana' | null>(null);
  const [moodBefore, setMoodBefore] = useState<string>('');
  const [moodAfter, setMoodAfter] = useState<string>('');
  const [practiceDuration, setPracticeDuration] = useState<number>(10);
  const [localLogs, setLocalLogs] = useState<LocalPracticeLog[]>(loadLocalPracticeLogs());
  const [saveStatus, setSaveStatus] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Persona form state
  const [editingPersona, setEditingPersona] = useState(false);
  const [formName, setFormName] = useState('');
  const [formAvatar, setFormAvatar] = useState('🧘');
  const [formPersonality, setFormPersonality] = useState('gentle');
  const [formSpecialty, setFormSpecialty] = useState('relax');
  const [formUiLang, setFormUiLang] = useState<'ja' | 'en'>('ja');
  const [formTeachingLang, setFormTeachingLang] = useState<'ja' | 'en'>('ja');

  useEffect(() => {
    const p = loadPersona();
    setPersona(p);
    if (p) {
      setFormName(p.name);
      setFormAvatar(p.avatar);
      setFormPersonality(p.personality);
      setFormSpecialty(p.specialty);
      setFormUiLang(p.uiLanguage);
      setFormTeachingLang(p.teachingLanguage);
    }
    setProgram(loadTodayProgram());
  }, []);

  // Camera management
  useEffect(() => {
    if (cameraOn) {
      (async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
          }
        } catch {
          setCameraOn(false);
        }
      })();
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [cameraOn]);

  const safetyBlocked = isSafetyBlocked(latestDiagnosis?.safety_state);
  const safetyCautioned = isSafetyCautioned(latestDiagnosis?.safety_state);

  const handleGenerateProgram = useCallback(() => {
    if (safetyBlocked) return;
    const recentTypes = localLogs.slice(0, 10).map((l) => l.practice_type);
    const newProgram = generateProgram({
      preferredStyle: growth.preferredStyle,
      recentTypes,
      sessionCount: growth.sessions,
    });
    setProgram(newProgram);
    saveTodayProgram(newProgram);
    setStep('step2');
  }, [safetyBlocked, localLogs, growth]);

  const handleSavePersona = useCallback(() => {
    const newPersona: AITeacherPersona = {
      name: formName || 'MAYA',
      avatar: formAvatar,
      personality: formPersonality,
      specialty: formSpecialty,
      uiLanguage: formUiLang,
      teachingLanguage: formTeachingLang,
      createdAt: persona?.createdAt ?? new Date().toISOString(),
    };
    savePersona(newPersona);
    setPersona(newPersona);
    setEditingPersona(false);
  }, [formName, formAvatar, formPersonality, formSpecialty, formUiLang, formTeachingLang, persona]);

  const handleSendChat = useCallback(() => {
    if (!chatInput.trim()) return;
    const userMsg: ChatMessage = { role: 'user', text: chatInput };
    const reply = generateChatResponse(chatInput, persona);
    setChatMessages((prev) => [...prev, userMsg, reply]);
    setChatInput('');
  }, [chatInput, persona]);

  const handleCompletePractice = useCallback(async () => {
    if (!practiceType) return;
    const practiceName = program?.items.find((i) => i.type === practiceType)?.name ?? '実践';
    const logParams = {
      practice_type: practiceType,
      practice_name: practiceName,
      duration_min: practiceDuration,
      mood_before: moodBefore || null,
      mood_after: moodAfter || null,
      ai_teacher_used: true,
    };

    if (auth.user) {
      const { error } = await savePracticeLog(auth.user.id, auth.privacy, logParams);
      if (error) {
        setSaveStatus('クラウド保存に失敗しました。ローカルに保存します。');
        saveLocalPracticeLog(logParams);
      } else {
        setSaveStatus('クラウドに保存しました');
      }
    } else {
      saveLocalPracticeLog(logParams);
      setSaveStatus('ローカルに保存しました（ログインするとクラウド保存できます）');
    }

    // Update growth (non-sensitive)
    const newGrowth: AITeacherGrowth = {
      ...growth,
      sessions: growth.sessions + 1,
      favoriteTypes: updateFavoriteTypes(growth.favoriteTypes, practiceType),
      preferredStyle: growth.preferredStyle ?? formSpecialty,
      relationshipLevel: Math.min(10, growth.relationshipLevel + 0.5),
      understandingLevel: Math.min(10, growth.understandingLevel + 0.3),
      facts: updateFacts(growth.facts, practiceType, practiceDuration),
      streakDays: updateStreak(growth.streakDays, growth.lastPracticeDate),
      lastPracticeDate: new Date().toISOString().slice(0, 10),
    };
    saveGrowth(newGrowth);
    setGrowth(newGrowth);
    setLocalLogs(loadLocalPracticeLogs());

    setPracticeActive(false);
    setPracticeType(null);
    setMoodBefore('');
    setMoodAfter('');
    setStep('step7');
  }, [practiceType, program, practiceDuration, moodBefore, moodAfter, auth, growth, formSpecialty]);

  const steps: Array<{ id: StepId; label: string; n: string }> = [
    { id: 'step1', label: '今の状態', n: '1' },
    { id: 'step2', label: '今日のプログラム', n: '2' },
    { id: 'step3', label: '保存', n: '3' },
    { id: 'step4', label: 'AI先生設定', n: '4' },
    { id: 'step5', label: '対話', n: '5' },
    { id: 'step6', label: '実践', n: '6' },
    { id: 'step7', label: '記録', n: '7' },
    { id: 'step8', label: '先生の成長', n: '8' },
  ];

  return (
    <div className="page-shell ai-teacher-shell">
      <section className="hero-panel compact-hero ai-teacher-hero">
        <div>
          <button className="ghost-button" onClick={onBackHome}>TOPへ戻る</button>
          <span className="eyebrow">My AI Teacher</span>
          <h2>今日のヨガをAI先生と始める</h2>
          <p>あなたの目的や記録に合わせて、アーサナ・呼吸・瞑想の実践をサポートします。</p>
          {persona && (
            <div className="ai-teacher-persona-badge">
              <span className="ai-teacher-avatar">{persona.avatar}</span>
              <span>{persona.name}</span>
            </div>
          )}
        </div>
      </section>

      {/* Step navigation */}
      <nav className="ai-teacher-step-nav">
        <button className={step === 'home' ? 'active' : ''} onClick={() => setStep('home')}>Home</button>
        {steps.map((s) => (
          <button key={s.id} className={step === s.id ? 'active' : ''} onClick={() => setStep(s.id)}>
            <span className="step-num">{s.n}</span> {s.label}
          </button>
        ))}
      </nav>

      {/* Home / shortcut cards */}
      {step === 'home' && (
        <section className="panel ai-teacher-pillars-panel">
          <div className="section-inline-header tight">
            <h3>今日の実践を選ぶ</h3>
          </div>
          <div className="ai-teacher-pillar-grid">
            {(['asana', 'pranayama', 'dhyana'] as const).map((pt) => {
              const labels = { asana: 'Asana', pranayama: 'Pranayama', dhyana: 'Dhyana' };
              const subs = { asana: 'アーサナ', pranayama: '呼吸法', dhyana: '瞑想' };
              const descs = {
                asana: '目的や体調に合わせて、今日のポーズを選んで実践します。',
                pranayama: 'ボックスブリージングなど、リズムを整える呼吸を案内します。',
                dhyana: '1分の静かな時間で、心を落ち着かせます。',
              };
              return (
                <article key={pt} className="ai-teacher-pillar-card"
                  onClick={() => { setPracticeType(pt); setStep('step6'); }}
                  role="button" tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') { setPracticeType(pt); setStep('step6'); } }}
                >
                  <span className="ai-teacher-pillar-label">{labels[pt]}</span>
                  <strong>{subs[pt]}</strong>
                  <p>{descs[pt]}</p>
                  <button type="button" className="secondary-button ai-teacher-pillar-button">実践を始める</button>
                </article>
              );
            })}
          </div>
          <div className="ai-teacher-home-actions">
            <button className="primary-button" onClick={handleGenerateProgram} disabled={safetyBlocked}>
              {safetyBlocked ? '安全のため現在プログラム生成を制限しています' : '今日のプログラムを生成する'}
            </button>
            {!persona && (
              <button className="secondary-button" onClick={() => setStep('step4')}>AI先生をつくる</button>
            )}
          </div>
          {safetyCautioned && !safetyBlocked && (
            <p className="ai-teacher-safety-note">
              診断結果に注意フラグがあります。無理のない範囲で、一般的な実践のみ行ってください。
            </p>
          )}
          {safetyBlocked && (
            <p className="ai-teacher-safety-note safety-blocked">
              診断結果により個別実践の制限が必要です。専門家にご相談ください。一般的なリラックス呼吸のみ案内できます。
            </p>
          )}
        </section>
      )}

      {/* STEP 1: Diagnosis status */}
      {step === 'step1' && (
        <section className="panel ai-teacher-step-panel">
          <h3>STEP 1 — 今の状態</h3>
          {latestDiagnosis ? (
            <div className="ai-teacher-diagnosis-summary">
              <span className="eyebrow">最新AI診断</span>
              <strong>{new Date(latestDiagnosis.created_at).toLocaleDateString('ja-JP')}</strong>
              <p>診断タイプ: {latestDiagnosis.diagnosis_type === 'student' ? '生徒' : '先生'}</p>
              {latestDiagnosis.result_type && <p>結果: {latestDiagnosis.result_type}</p>}
              {latestDiagnosis.safety_state !== 'normal' && (
                <p className="safety-badge" data-state={latestDiagnosis.safety_state}>
                  安全状態: {latestDiagnosis.safety_state === 'caution' ? '注意' : '実践停止・専門家相談推奨'}
                </p>
              )}
              <button className="secondary-button" onClick={onOpenDiagnosis}>もう一度診断する</button>
            </div>
          ) : (
            <div className="ai-teacher-no-diagnosis">
              <p>まだAI診断を受けていません。まずは診断から始めましょう。</p>
              <button className="primary-button" onClick={onOpenDiagnosis}>AI診断を受ける</button>
            </div>
          )}
        </section>
      )}

      {/* STEP 2: Today's program */}
      {step === 'step2' && (
        <section className="panel ai-teacher-step-panel">
          <h3>STEP 2 — 今日のプログラム</h3>
          {safetyBlocked ? (
            <p className="ai-teacher-safety-note safety-blocked">
              診断結果により個別プログラムの生成を制限しています。専門家にご相談ください。
            </p>
          ) : program ? (
            <div className="ai-teacher-program-list">
              {program.items.map((item, idx) => (
                <div key={idx} className="ai-teacher-program-item">
                  <span className={`type-pill ${item.type}`}>
                    {item.type === 'asana' ? 'アーサナ' : item.type === 'pranayama' ? '呼吸法' : '瞑想'}
                  </span>
                  <strong>{item.name}</strong>
                  <span className="ai-teacher-duration">約{item.durationMin}分</span>
                  <button className="secondary-button" onClick={() => {
                    setPracticeType(item.type);
                    setPracticeDuration(item.durationMin);
                    setStep('step6');
                  }}>実践する</button>
                </div>
              ))}
              <p className="ai-teacher-program-meta">
                生成日時: {new Date(program.generatedAt).toLocaleString('ja-JP')} / 元: {program.basedOn === 'diagnosis' ? '診断' : program.basedOn === 'history' ? '履歴' : 'デフォルト'}
              </p>
              <button className="primary-button" onClick={() => setStep('step3')}>プログラムを保存する</button>
            </div>
          ) : (
            <div>
              <p>プログラムがまだありません。</p>
              <button className="primary-button" onClick={handleGenerateProgram} disabled={safetyBlocked}>生成する</button>
            </div>
          )}
        </section>
      )}

      {/* STEP 3: Save */}
      {step === 'step3' && (
        <section className="panel ai-teacher-step-panel">
          <h3>STEP 3 — 保存</h3>
          {program ? (
            <div>
              <p>今日のプログラムを保存します。次回アクセス時に同じ内容が表示されます。</p>
              <button className="primary-button" onClick={() => {
                saveTodayProgram(program);
                setSaveStatus('保存しました');
                setTimeout(() => setSaveStatus(''), 3000);
              }}>保存する</button>
              {saveStatus && <p className="ai-teacher-save-status">{saveStatus}</p>}
            </div>
          ) : (
            <p>保存するプログラムがありません。STEP 2で生成してください。</p>
          )}
        </section>
      )}

      {/* STEP 4: AI Teacher persona */}
      {step === 'step4' && (
        <section className="panel ai-teacher-step-panel">
          <h3>STEP 4 — My AI Teacher設定</h3>
          {persona && !editingPersona ? (
            <div className="ai-teacher-persona-display">
              <span className="ai-teacher-avatar-lg">{persona.avatar}</span>
              <div className="ai-teacher-persona-fields">
                <div><strong>名前</strong><span>{persona.name}</span></div>
                <div><strong>性格</strong><span>{PERSONALITY_OPTIONS.find((p) => p.v === persona.personality)?.label ?? persona.personality}</span></div>
                <div><strong>得意分野</strong><span>{SPECIALTY_OPTIONS.find((s) => s.v === persona.specialty)?.label ?? persona.specialty}</span></div>
                <div><strong>画面言語</strong><span>{persona.uiLanguage === 'ja' ? '日本語' : 'English'}</span></div>
                <div><strong>指導言語</strong><span>{persona.teachingLanguage === 'ja' ? '日本語' : 'English'}</span></div>
              </div>
              <div className="ai-teacher-persona-actions">
                <button className="secondary-button" onClick={() => setEditingPersona(true)}>変更する</button>
                <button className="ghost-button" onClick={() => {
                  clearPersona();
                  setPersona(null);
                  setEditingPersona(true);
                  setFormName('');
                  setFormAvatar('🧘');
                  setFormPersonality('gentle');
                  setFormSpecialty('relax');
                }}>削除する</button>
              </div>
              <p className="ai-teacher-memory-note">
                AI先生を変更・削除しても、診断履歴や実践記録はmyYOGAカルテに残ります。
              </p>
            </div>
          ) : (
            <div className="ai-teacher-persona-form">
              <div className="field">
                <label>先生の名前</label>
                <input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="MAYA" />
              </div>
              <div className="field">
                <label>見た目（アバター）</label>
                <div className="chip-grid">
                  {AVATAR_OPTIONS.map((a) => (
                    <button key={a} className={`select-chip ${formAvatar === a ? 'active' : ''}`} onClick={() => setFormAvatar(a)}>{a}</button>
                  ))}
                </div>
              </div>
              <div className="field">
                <label>性格</label>
                <select value={formPersonality} onChange={(e) => setFormPersonality(e.target.value)}>
                  {PERSONALITY_OPTIONS.map((p) => <option key={p.v} value={p.v}>{p.label}</option>)}
                </select>
              </div>
              <div className="field">
                <label>得意分野</label>
                <select value={formSpecialty} onChange={(e) => setFormSpecialty(e.target.value)}>
                  {SPECIALTY_OPTIONS.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
                </select>
              </div>
              <div className="field-grid">
                <div className="field">
                  <label>画面言語</label>
                  <select value={formUiLang} onChange={(e) => setFormUiLang(e.target.value as 'ja' | 'en')}>
                    <option value="ja">日本語</option>
                    <option value="en">English</option>
                  </select>
                </div>
                <div className="field">
                  <label>指導言語</label>
                  <select value={formTeachingLang} onChange={(e) => setFormTeachingLang(e.target.value as 'ja' | 'en')}>
                    <option value="ja">日本語</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </div>
              <button className="primary-button" onClick={handleSavePersona}>保存する</button>
            </div>
          )}
        </section>
      )}

      {/* STEP 5: Chat */}
      {step === 'step5' && (
        <section className="panel ai-teacher-step-panel">
          <h3>STEP 5 — 先生と対話</h3>
          <div className="ai-teacher-chat">
            <div className="ai-teacher-chat-messages">
              {chatMessages.length === 0 && (
                <p className="ai-teacher-chat-empty">
                  {persona?.name ?? 'AI先生'}に話しかけてみましょう。「今日は短く」「瞑想をしたい」「呼吸中心にしたい」など、一般的な希望なら対応できます。
                </p>
              )}
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`chat-message ${msg.role} ${msg.isSafety ? 'safety' : ''}`}>
                  <span className="chat-role">{msg.role === 'teacher' ? (persona?.name ?? 'AI先生') : 'あなた'}</span>
                  <p>{msg.text}</p>
                </div>
              ))}
            </div>
            <div className="ai-teacher-chat-input-row">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSendChat(); }}
                placeholder="メッセージを入力…"
              />
              <button className="primary-button" onClick={handleSendChat}>送信</button>
            </div>
            <p className="ai-teacher-safety-note">
              痛み・怪我・妊娠・既往症などについては個別提案を行いません。専門家にご相談ください。
            </p>
          </div>
        </section>
      )}

      {/* STEP 6: Practice with camera */}
      {step === 'step6' && (
        <section className="panel ai-teacher-step-panel">
          <h3>STEP 6 — 実践AI先生</h3>
          <div className="ai-teacher-practice-setup">
            <div className="field-grid">
              <div className="field">
                <label>実践の種類</label>
                <select
                  value={practiceType ?? ''}
                  onChange={(e) => setPracticeType(e.target.value as 'asana' | 'pranayama' | 'dhyana')}
                >
                  <option value="asana">アーサナ</option>
                  <option value="pranayama">呼吸法</option>
                  <option value="dhyana">瞑想</option>
                </select>
              </div>
              <div className="field">
                <label>目安時間（分）</label>
                <input type="number" min={1} max={120} value={practiceDuration}
                  onChange={(e) => setPracticeDuration(Number(e.target.value))} />
              </div>
            </div>
            <div className="field-grid">
              <div className="field">
                <label>実践前の気分</label>
                <input value={moodBefore} onChange={(e) => setMoodBefore(e.target.value)} placeholder="例: ぼんやりしている" />
              </div>
              <div className="field">
                <label>実践後の気分</label>
                <input value={moodAfter} onChange={(e) => setMoodAfter(e.target.value)} placeholder="実践後に記入" />
              </div>
            </div>
          </div>

          <div className="ai-teacher-camera-section">
            <div className="ai-teacher-camera-header">
              <button
                className={cameraOn ? 'secondary-button' : 'primary-button'}
                onClick={() => setCameraOn((v) => !v)}
              >
                {cameraOn ? 'カメラをOFFにする' : 'カメラをONにする'}
              </button>
              {cameraOn && (
                <span className="ai-teacher-camera-status">My AI Teacherがあなたの実践を見守っています</span>
              )}
            </div>
            {cameraOn && (
              <div className="ai-teacher-video-wrap">
                <video ref={videoRef} autoPlay muted playsInline className="ai-teacher-video" />
                <p className="ai-teacher-demo-note">
                  現在はデモ機能です。姿勢や安全性を医学的・専門的に判定するものではありません。
                </p>
              </div>
            )}
          </div>

          <div className="ai-teacher-practice-actions">
            {!practiceActive ? (
              <button className="primary-button" onClick={() => setPracticeActive(true)} disabled={!practiceType}>
                実践スタート
              </button>
            ) : (
              <button className="gold-button" onClick={handleCompletePractice}>
                実践を完了して記録する
              </button>
            )}
          </div>
          {saveStatus && <p className="ai-teacher-save-status">{saveStatus}</p>}
        </section>
      )}

      {/* STEP 7: Records */}
      {step === 'step7' && (
        <section className="panel ai-teacher-step-panel">
          <h3>STEP 7 — 今日の記録</h3>
          {auth.user ? (
            <p>実践記録はクラウドに保存されています。myYOGAカルテで確認できます。</p>
          ) : (
            <p>実践記録はこの端末のローカルに保存されています。ログインするとクラウド保存が可能です。</p>
          )}
          {localLogs.length > 0 && (
            <div className="ai-teacher-local-logs">
              <h4>ローカル実践履歴（最新5件）</h4>
              {localLogs.slice(0, 5).map((log) => (
                <div key={log.id} className="ai-teacher-log-row">
                  <span className={`type-pill ${log.practice_type}`}>
                    {log.practice_type === 'asana' ? 'アーサナ' : log.practice_type === 'pranayama' ? '呼吸法' : '瞑想'}
                  </span>
                  <strong>{log.practice_name}</strong>
                  <span>{log.duration_min ?? '-'}分</span>
                  <small>{new Date(log.created_at).toLocaleDateString('ja-JP')}</small>
                </div>
              ))}
            </div>
          )}
          <button className="secondary-button" onClick={onOpenMyPage}>myYOGAカルテを見る</button>
        </section>
      )}

      {/* STEP 8: Growth */}
      {step === 'step8' && (
        <section className="panel ai-teacher-step-panel">
          <h3>STEP 8 — 先生が育つ</h3>
          <div className="ai-teacher-growth-grid">
            <div className="ai-teacher-growth-stat">
              <strong>{growth.sessions}</strong>
              <span>累計実践回数</span>
            </div>
            <div className="ai-teacher-growth-stat">
              <strong>{growth.streakDays}</strong>
              <span>継続日数</span>
            </div>
            <div className="ai-teacher-growth-stat">
              <strong>{growth.relationshipLevel.toFixed(1)}</strong>
              <span>関係性レベル</span>
            </div>
            <div className="ai-teacher-growth-stat">
              <strong>{growth.understandingLevel.toFixed(1)}</strong>
              <span>理解度レベル</span>
            </div>
          </div>
          {growth.favoriteTypes.length > 0 && (
            <div className="ai-teacher-growth-section">
              <h4>よく実践している種類</h4>
              <div className="chip-grid">
                {growth.favoriteTypes.map((t) => (
                  <span key={t} className="select-chip active">
                    {t === 'asana' ? 'アーサナ' : t === 'pranayama' ? '呼吸法' : '瞑想'}
                  </span>
                ))}
              </div>
            </div>
          )}
          {growth.facts.length > 0 && (
            <div className="ai-teacher-growth-section">
              <h4>先生が知っていること</h4>
              <ul className="ai-teacher-facts-list">
                {growth.facts.map((f, idx) => <li key={idx}>{f}</li>)}
              </ul>
            </div>
          )}
          <p className="ai-teacher-safety-note">
            成長データに医療・身体情報は保存されません。
          </p>
        </section>
      )}

      {/* Quick links */}
      <section className="panel ai-teacher-quick-links">
        <div className="section-inline-header tight">
          <h3>関連する機能</h3>
        </div>
        <div className="quick-link-grid">
          <button className="quick-link-card" onClick={onOpenMyPage}><strong>myYOGAカルテ</strong><span>実践記録と診断履歴を見る</span></button>
          <button className="quick-link-card" onClick={onOpenProYoga}><strong>Pro Yoga</strong><span>資格・検定の学習を始める</span></button>
        </div>
      </section>
    </div>
  );
}

// ── Helpers ──

function updateFavoriteTypes(current: string[], type: string): string[] {
  const counts: Record<string, number> = {};
  for (const t of current) counts[t] = (counts[t] ?? 0) + 1;
  counts[type] = (counts[type] ?? 0) + 1;
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => k);
}

function updateFacts(current: string[], type: string, duration: number): string[] {
  const facts = [...current];
  if (duration <= 5) facts.push('短い練習を好む');
  if (type === 'pranayama') facts.push('呼吸法をよく選ぶ');
  if (type === 'dhyana') facts.push('瞑想をよく実践する');
  if (type === 'asana') facts.push('アーサナをよく実践する');
  // Deduplicate, keep last 10
  return [...new Set(facts)].slice(-10);
}

function updateStreak(currentStreak: number, lastDate: string | null): number {
  const today = new Date().toISOString().slice(0, 10);
  if (!lastDate) return 1;
  if (lastDate === today) return currentStreak;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yKey = yesterday.toISOString().slice(0, 10);
  if (lastDate === yKey) return currentStreak + 1;
  return 1;
}
