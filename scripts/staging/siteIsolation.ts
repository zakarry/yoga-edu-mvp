// This entry point is used only by the isolated staging builder, never by the product build.
const backend = 'https://htnouayipmqvpckppbzv.supabase.co';
if (import.meta.env.VITE_SUPABASE_URL !== backend || import.meta.env.VITE_STAGING_EMAIL_ONLY !== 'true') {
  throw new Error('Independent email-only staging configuration required');
}
const originalFetch = window.fetch.bind(window);
window.fetch = (input, init) => {
  const target = new URL(input instanceof Request ? input.url : String(input), window.location.href);
  const allowedBackend = target.origin === backend &&
    ['/auth/v1/', '/rest/v1/', '/storage/v1/'].some(prefix => target.pathname.startsWith(prefix));
  if (target.username || target.password || (target.origin !== window.location.origin && !allowedBackend)) {
    return Promise.reject(new Error('検証環境ではこの外部通信を利用できません'));
  }
  return originalFetch(input, init);
};
const open = window.open.bind(window);
window.open = (url, target, features) => {
  if (!url) return null;
  const destination = new URL(String(url), window.location.href);
  if (destination.origin !== window.location.origin || destination.username || destination.password) return null;
  return open(destination.toString(), target, features);
};
document.addEventListener('click', event => {
  const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
  if (!link) return;
  const destination = new URL(link.getAttribute('href')!, window.location.href);
  if (destination.origin !== window.location.origin || destination.username || destination.password) {
    event.preventDefault(); event.stopImmediatePropagation();
  }
}, true);
