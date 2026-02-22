const cache = new Map();

function makeKey(req) {
  // Use URL + query string as key (assumes req.url exists)
  return req.url || '';
}

export function getCached(req) {
  const key = makeKey(req);
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

export function setCached(req, value, ttl = 30000) {
  const key = makeKey(req);
  cache.set(key, { value, expires: Date.now() + ttl });
}

export default { getCached, setCached };
