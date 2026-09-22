import { DocumentSnapshot, Timestamp } from 'firebase/firestore';

export type ArticleStatus = 'draft' | 'published';
export type SortOption = 'latest' | 'popular' | 'editors-pick';

/** articles/{articleId} document — spec §2.2. */
export interface Article {
  id: string;
  slug: string;
  authorId: string;
  authorName: string;
  authorPhoto: string;
  title: string;
  excerpt: string;
  contentHtml: string;
  coverImageUrl: string;
  category: string;
  tags: string[];
  status: ArticleStatus;
  isFeatured: boolean;
  publishAt: Timestamp | null;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  readingMinutes: number;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  popularityScore: number;
  likedBy: string[];
  authorNameLower: string;
}

/** Feed/card projection — contentHtml deliberately excluded. */
export type ArticleCard = Omit<Article, 'contentHtml'>;

/** Cursor-paginated feed result — spec §5.3. */
export interface PagedArticles {
  items: ArticleCard[];
  cursor: DocumentSnapshot | null;
  hasMore: boolean;
  page: number;
}

export interface HomeFilters {
  sort: SortOption;
  category: string | null;
  tag: string | null;
  pageSize: number;
}

export const defaultFilters: HomeFilters = { sort: 'latest', category: null, tag: null, pageSize: 9 };
