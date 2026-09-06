/*
 * Resource identity by URL (EKG-SPEC-25): two resource mentions with the same normalized
 * URL are the same resource and share one ekgId.
 */

const TRACKING_PARAMS = new Set(['gclid', 'fbclid', 'ref']);
const DEFAULT_PORTS: Record<string, string> = { 'http:': '80', 'https:': '443' };

/**
 * Normalize a resource URL: scheme and host lowercased, default port removed, tracking
 * query parameters (`utm_*`, `gclid`, `fbclid`, `ref`) removed, trailing slash removed,
 * fragment removed. Throws on a string that is not an absolute URL.
 */
export function normalizeResourceUrl(input: string): string {
  const url = new URL(input.trim());
  const protocol = url.protocol.toLowerCase();
  let host = url.hostname.toLowerCase();
  if (url.port && url.port !== DEFAULT_PORTS[protocol]) host = `${host}:${url.port}`;

  const params = new URLSearchParams();
  for (const [key, value] of url.searchParams) {
    if (key.toLowerCase().startsWith('utm_') || TRACKING_PARAMS.has(key.toLowerCase())) continue;
    params.append(key, value);
  }
  const query = params.toString();

  let path = url.pathname;
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
  if (path === '/') path = '';

  return `${protocol}//${host}${path}${query ? `?${query}` : ''}`;
}

/** True when two URLs identify the same resource under EKG-SPEC-25. */
export function sameResourceUrl(a: string, b: string): boolean {
  try {
    return normalizeResourceUrl(a) === normalizeResourceUrl(b);
  } catch {
    return false;
  }
}
