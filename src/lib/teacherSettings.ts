import type { AITeacherPersona, AITeacherPrefs } from './aiTeacherStorage';

export interface TeacherSettings { persona: AITeacherPersona | null; prefs: AITeacherPrefs }
export interface StoredTeacherSettings { settings: TeacherSettings; revision: number }
export const defaultTeacherPrefs = (): AITeacherPrefs => ({ explanation: 'standard', cue: 'as_needed', praise: 'normal' });
export const emptyTeacherSettings = (): TeacherSettings => ({ persona: null, prefs: defaultTeacherPrefs() });
const confirmed = new Map<string, TeacherSettings>();
export function readConfirmedTeacherSettings(userId: string): TeacherSettings | null {
  const value = confirmed.get(userId); return value ? structuredClone(value) : null;
}
export function forgetConfirmedTeacherSettings(userId: string): void { confirmed.delete(userId); }
const oneOf = (value: unknown, options: string[]) => typeof value === 'string' && options.includes(value);
export function validTeacherSettings(value: unknown): value is TeacherSettings {
  if (!value || typeof value !== 'object') return false;
  const { persona: p, prefs } = value as TeacherSettings;
  if (!prefs || !oneOf(prefs.explanation, ['short', 'standard', 'detailed']) || !oneOf(prefs.cue, ['more', 'as_needed', 'minimal']) || !oneOf(prefs.praise, ['more', 'normal', 'less'])) return false;
  return p === null || Boolean(p && typeof p.name === 'string' && p.name.trim().length > 0 && p.name.length <= 80 &&
    typeof p.avatar === 'string' && p.avatar.length > 0 && p.avatar.length <= 32 &&
    oneOf(p.personality, ['gentle', 'encouraging', 'precise', 'philosophical', 'strict']) &&
    oneOf(p.specialty, ['pranayama', 'hatha', 'vinyasa', 'yin', 'meditation', 'philosophy']) &&
    oneOf(p.uiLanguage, ['ja', 'en', 'zh', 'ko']) && oneOf(p.teachingLanguage, ['ja', 'en', 'zh', 'ko']) &&
    typeof p.createdAt === 'string' && Number.isFinite(Date.parse(p.createdAt)));
}
// Project only settings. Never serialize growth facts, conversations, or Memory.
export function copyTeacherSettings(value: TeacherSettings): TeacherSettings {
  const p = value.persona;
  return { persona: p ? { name: p.name, avatar: p.avatar, personality: p.personality, specialty: p.specialty,
    uiLanguage: p.uiLanguage, teachingLanguage: p.teachingLanguage, createdAt: p.createdAt } : null,
    prefs: { explanation: value.prefs.explanation, cue: value.prefs.cue, praise: value.prefs.praise } };
}
export interface TeacherSettingsRepository {
  load(userId: string, signal: AbortSignal): Promise<StoredTeacherSettings | null>;
  save(userId: string, settings: TeacherSettings, revision: number | null, signal: AbortSignal): Promise<StoredTeacherSettings>;
}
export interface TeacherSettingsState {
  owner: string | null | undefined;
  settings: TeacherSettings;
  revision: number | null;
  status: 'loading' | 'ready' | 'saving' | 'error';
  message: string | null;
}
export class TeacherSettingsController {
  private generation = 0;
  private abort = new AbortController();
  private listeners = new Set<() => void>();
  private state: TeacherSettingsState = { owner: undefined, settings: emptyTeacherSettings(), revision: null, status: 'loading', message: null };
  constructor(private repository: TeacherSettingsRepository, private guest: { load(): TeacherSettings; save(value: TeacherSettings): void }) {}
  snapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private publish(patch: Partial<TeacherSettingsState>) { this.state = { ...this.state, ...patch }; this.listeners.forEach(fn => fn()); }
  private confirm(settings: TeacherSettings) {
    if (this.state.owner) confirmed.set(this.state.owner, copyTeacherSettings(settings));
  }
  async switchOwner(owner: string | null | undefined) {
    const previous = this.state.owner;
    if (previous) forgetConfirmedTeacherSettings(previous);
    this.abort.abort(); this.abort = new AbortController(); const generation = ++this.generation;
    this.publish({ owner, settings: emptyTeacherSettings(), revision: null, status: 'loading', message: null });
    if (owner === undefined) return;
    try {
      const stored = owner ? await this.repository.load(owner, this.abort.signal) : null;
      if (generation !== this.generation) return;
      const settings = owner ? stored?.settings ?? emptyTeacherSettings() : this.guest.load();
      if (!validTeacherSettings(settings)) throw new Error('invalid settings');
      this.confirm(settings);
      this.publish({ settings: copyTeacherSettings(settings), revision: stored?.revision ?? null, status: 'ready' });
    } catch {
      if (generation === this.generation) this.publish({ status: 'error', message: '先生設定を読み込めませんでした。再読み込みしてください。既存の設定は上書きしません。' });
    }
  }
  async save(settings: TeacherSettings): Promise<boolean> {
    if (this.state.status !== 'ready' || !validTeacherSettings(settings)) return false;
    const generation = this.generation, owner = this.state.owner;
    if (owner === undefined) return false;
    const safe = copyTeacherSettings(settings);
    this.publish({ status: 'saving', message: null });
    try {
      const saved = owner ? await this.repository.save(owner, safe, this.state.revision, this.abort.signal) : (this.guest.save(safe), { settings: safe, revision: 0 });
      if (generation !== this.generation) return false;
      if (!validTeacherSettings(saved.settings)) throw new Error('invalid settings');
      this.confirm(saved.settings);
      this.publish({ settings: copyTeacherSettings(saved.settings), revision: owner ? saved.revision : null, status: 'ready',
        message: owner ? 'アカウントに先生設定を保存しました。' : 'このブラウザに保存しました。アカウントへの自動移行は行いません。' });
      return true;
    } catch {
      if (generation === this.generation) this.publish({ status: 'ready', message: '先生設定を保存できませんでした。入力を保持しています。再試行してください。別画面で変更した場合は再読み込みしてください。' });
      return false;
    }
  }
  dispose() { this.generation++; this.abort.abort(); if (this.state.owner) forgetConfirmedTeacherSettings(this.state.owner); }
}
