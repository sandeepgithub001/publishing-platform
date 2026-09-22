import { normalizeTags } from '../config/categories';

/** Pure seed content types + helpers (spec §7) — no Firebase imports. */
export interface SeedArticle {
  slug: string;
  title: string;
  category: string;
  tags: string[];
  featured?: boolean;
  scheduledDaysFromNow?: number;
  draft?: boolean;
  daysAgo: number;
  paragraphs: string[];
}

export interface SeedAuthorDef {
  key: string;
  email: string;
  password: string;
  displayName: string;
  bio: string;
  role: 'author' | 'editor';
  articles: SeedArticle[];
}

export interface SeedCommentDef {
  articleSlug: string;
  authorKey: string;
  message: string;
  replyTo?: string;
}

export const coverUrl = (i: number): string => `https://picsum.photos/seed/pubhub-${i}/800/450`;

export const articleHtml = (paragraphs: string[]): string => paragraphs.map((p) => `<p>${p}</p>`).join('');

export const seedTagList = (a: SeedArticle): string[] => normalizeTags(a.tags);
