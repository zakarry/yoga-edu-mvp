// Navigation intent only: no credentials, user data or externally supplied URLs.
const KEY = 'yogaai.surya.account-return';
const MAX_AGE = 30 * 60 * 1000;
export type SuryaAccountTarget = 'surya-namaskar' | 'ai-teacher' | 'my-page';

export function rememberSuryaAccountTarget(target: SuryaAccountTarget): void {
  try { sessionStorage.setItem(KEY, JSON.stringify({ target, at: Date.now() })); } catch { /* Storage may be disabled. */ }
}

export function readSuryaAccountTarget(): SuryaAccountTarget | null {
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY) || 'null');
    if (saved && typeof saved.at === 'number' && saved.at <= Date.now() && Date.now() - saved.at < MAX_AGE
      && ['surya-namaskar', 'ai-teacher', 'my-page'].includes(saved.target)) return saved.target;
    clearSuryaAccountTarget();
  } catch { /* Invalid or unavailable storage must not block the public page. */ }
  return null;
}

export function clearSuryaAccountTarget(): void {
  try { sessionStorage.removeItem(KEY); } catch { /* Storage may be disabled. */ }
}
