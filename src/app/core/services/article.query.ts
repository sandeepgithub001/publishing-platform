import { QueryConstraint, Timestamp, orderBy, where } from 'firebase/firestore';
import { HomeFilters } from '../models/article.model';

/**
 * Pure query-construction for the article feed (extracted from ArticleService
 * so it can be unit-tested without Firestore — see article.query.spec.ts).
 */
export interface FeedQueryPlan {
  conditions: QueryConstraint[];
  sortField: 'publishAt' | 'popularityScore';
  sortDirection: 'asc' | 'desc';
}

export function buildFeedPlan(f: HomeFilters, now: Timestamp = Timestamp.now()): FeedQueryPlan {
  const conditions: QueryConstraint[] = [
    where('status', '==', 'published'),
    where('publishAt', '<=', now),
  ];

  if (f.sort === 'editors-pick') conditions.push(where('isFeatured', '==', true));
  if (f.category) conditions.push(where('category', '==', f.category));
  if (f.tag) conditions.push(where('tags', 'array-contains', f.tag));

  const sortField = f.sort === 'popular' ? 'popularityScore' : 'publishAt';
  conditions.push(orderBy(sortField, 'desc'));
  return { conditions, sortField, sortDirection: 'desc' };
}

/** Popularity score = views + 5×likes + 2×comments (spec §4.2). */
export function popularityScore(viewCount: number, likeCount: number, commentCount: number): number {
  return viewCount + 5 * likeCount + 2 * commentCount;
}

/** Pages of `pageSize` are "more available" only when the page came back full. */
export function hasMoreAfter(returnedCount: number, pageSize: number): boolean {
  return returnedCount === pageSize;
}
