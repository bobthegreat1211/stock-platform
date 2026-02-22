const RENDER_BASE = 'https://stock-platform-backend-43qn.onrender.com';
const DEFAULT_TIMEOUT = 5000;

function buildUrl(base, path) {
  if (!path) return base;
  // If path is an absolute URL, return as-is
  try {
    const p = new URL(path, 'http://example');
    if (p.protocol === 'http:' || p.protocol === 'https:') return path;
  } catch {}
  // Ensure path begins with '/'
  if (!path.startsWith('/')) path = '/' + path;
  return base.replace(/\/$/, '') + path;
}

export default async function fetchWithFallback(path, fetchOptions = {}) {
  const timeout = fetchOptions.timeout || DEFAULT_TIMEOUT;
  // remove custom option before passing to fetch
  const options = { ...fetchOptions };
  delete options.timeout;

  // Primary: relative /api path (Vercel)
  const primary = path;
  const secondary = buildUrl(RENDER_BASE, path);

  const tryFetch = async (url) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(id);
      return res;
    } catch (err) {
      clearTimeout(id);
      throw err;
    }
  };

  // 1) Try primary
  try {
    const res = await tryFetch(primary);
    if (res && res.ok) return res;
    // If non-ok, attempt fallback
  } catch (e) {
    // fallthrough to secondary
  }

  // 2) Try secondary (Render)
  try {
    const res2 = await tryFetch(secondary);
    return res2;
  } catch (e) {
    // rethrow the original error if desired, but return a rejected promise
    throw new Error('Both primary and fallback API requests failed');
  }
}
