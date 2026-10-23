// Exact HTTPS origins only. Missing or malformed configuration fails closed.
export function allowedLineRedirect(value: string | null, configured: string | undefined): URL | null {
  if (!value || !configured || value !== value.trim() || /[\\\s]/u.test(value)) return null;
  try {
    const entries = configured.split(',').map(entry => entry.trim());
    if (entries.some(entry => {
      const url = new URL(entry);
      return url.protocol !== 'https:' || url.username !== '' || url.password !== '' ||
        url.pathname !== '/' || url.search !== '' || url.hash !== '' ||
        entry.includes('*') || entry !== url.origin;
    })) return null;
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' ||
        url.search || url.hash || !entries.includes(url.origin)) return null;
    return new URL(url.origin);
  } catch {
    return null;
  }
}
