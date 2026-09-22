/**
 * Pure search-index core (no `self`, no DOM) — unit-tested in
 * search-index.core.spec.ts and used by the worker entry file.
 */
export interface IndexedArticle {
  id: string;
  title: string;
  excerpt: string;
  tags: string[];
  authorName: string;
}

export type SearchField = 'any' | 'title' | 'author';

export interface SearchHit {
  id: string;
  score: number;
}

/** Message protocol shared by the worker entry and the main-thread facade. */
export type WorkerRequest =
  | { type: 'index'; articles: IndexedArticle[] }
  | { type: 'clear' }
  | { type: 'search'; term: string; field: SearchField; requestId: number };

export type WorkerResponse = { type: 'results'; requestId: number; hits: SearchHit[] };

export function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 2);
}

export function fieldTokens(a: IndexedArticle, field: SearchField): string[] {
  switch (field) {
    case 'title':
      return tokenize(a.title);
    case 'author':
      return tokenize(a.authorName);
    default:
      return [
        ...tokenize(a.title),
        ...a.tags.map((t) => t.toLowerCase()),
        ...a.tags.flatMap((t) => tokenize(t)),
        ...tokenize(a.excerpt),
        ...tokenize(a.authorName),
      ];
  }
}

/** Query tokens: raw words plus the canonical (dash-joined) form for tags. */
export function queryTokens(term: string): string[] {
  const canonical = term.trim().toLowerCase().replace(/\s+/g, '-');
  return [...new Set([...tokenize(term), canonical])].filter(Boolean);
}

export class SearchIndex {
  private readonly index = new Map<string, Set<string>>();
  private readonly docs = new Map<string, IndexedArticle>();

  upsert(article: IndexedArticle): void {
    this.remove(article.id);
    this.docs.set(article.id, article);
    for (const token of new Set(fieldTokens(article, 'any'))) {
      let bucket = this.index.get(token);
      if (!bucket) {
        bucket = new Set<string>();
        this.index.set(token, bucket);
      }
      bucket.add(article.id);
    }
  }

  remove(id: string): void {
    const previous = this.docs.get(id);
    if (!previous) return;
    for (const token of new Set(fieldTokens(previous, 'any'))) {
      this.index.get(token)?.delete(id);
    }
    this.docs.delete(id);
  }

  clear(): void {
    this.index.clear();
    this.docs.clear();
  }

  get size(): number {
    return this.docs.size;
  }

  search(term: string, field: SearchField = 'any', max = 30): SearchHit[] {
    const tokens = queryTokens(term);
    if (!tokens.length) return [];
    const scores = new Map<string, number>();

    for (const token of tokens) {
      for (const id of this.index.get(token) ?? []) {
        const doc = this.docs.get(id);
        if (!doc) continue;
        const scopedTokens = fieldTokens(doc, field);
        // Field-scoped searches only score when the requested field matches.
        if (!scopedTokens.includes(token)) continue;
        let score = (scores.get(id) ?? 0) + 1; // per-token presence
        if (field === 'any' && doc.title.toLowerCase().includes(token)) score += 5;
        if (doc.tags.some((t) => t.toLowerCase() === token)) score += 3;
        score += 1;
        scores.set(id, score);
      }
    }

    return [...scores.entries()]
      .filter(([, score]) => score > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, max)
      .map(([id, score]) => ({ id, score }));
  }
}
