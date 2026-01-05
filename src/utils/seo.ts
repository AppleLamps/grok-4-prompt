type JsonObject = Record<string, unknown>;

export function normalizeSiteUrl(input: string): string {
  const trimmed = (input || '').trim();
  if (!trimmed) return '';
  return trimmed.replace(/\/+$/, '');
}

export function getSiteUrl(): string {
  // NEXT_PUBLIC_SITE_URL is safe to expose to the browser and should be set in production.
  const configured = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL || '');
  if (configured) return configured;
  // Production fallback to avoid emitting relative canonicals/OG URLs.
  // Keep in sync with `.env.local.example`.
  if (process.env.NODE_ENV === 'production') return 'https://www.grokifyprompt.com';
  return '';
}

export function isAbsoluteUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

export function joinUrl(baseUrl: string, path: string): string {
  const base = normalizeSiteUrl(baseUrl);
  const p = (path || '').startsWith('/') ? path : `/${path || ''}`;
  if (!base) return p;
  return `${base}${p}`;
}

export function toCanonicalUrl(pathOrUrl: string, siteUrl?: string): string {
  const value = (pathOrUrl || '').trim();
  if (!value) return '';
  if (isAbsoluteUrl(value)) return value;
  return joinUrl(siteUrl || getSiteUrl(), value);
}

// Prevents embedding "</script>" sequences via JSON-LD (defense-in-depth).
export function stringifyJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export function replacePlaceholdersDeep<T>(
  value: T,
  replacements: Record<string, string>
): T {
  const replaceInString = (s: string): string => {
    let out = s;
    for (const [key, repl] of Object.entries(replacements)) {
      out = out.split(key).join(repl);
    }
    return out;
  };

  const visit = (node: unknown): unknown => {
    if (typeof node === 'string') return replaceInString(node);
    if (Array.isArray(node)) return node.map(visit);
    if (node && typeof node === 'object') {
      const obj = node as JsonObject;
      const next: JsonObject = {};
      for (const [k, v] of Object.entries(obj)) {
        next[k] = visit(v);
      }
      return next;
    }
    return node;
  };

  return visit(value) as T;
}

