/**
 * Fixed category catalog (spec §2.1 — no Firestore collection needed) and
 * tag normalization helpers (spec §2.2 articles.tags: ≤ 5, lowercase).
 */
export const CATEGORIES = [
  'Technology',
  'Design',
  'Business',
  'Science',
  'Culture',
  'Tutorials',
  'Opinion',
  'Travel',
] as const;

export type Category = (typeof CATEGORIES)[number];

export function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value);
}

/** Normalize a tag: trim, lowercase, collapse spaces/dashes to single dash. */
export function normalizeTag(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/^-|-$/g, '');
}

/** Normalize a list of tags: dedupe, cap at 5, drop empties. */
export function normalizeTags(raw: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const tag of raw.map(normalizeTag).filter(Boolean)) {
    if (!seen.has(tag)) {
      seen.add(tag);
      out.push(tag);
      if (out.length >= 5) break;
    }
  }
  return out;
}
