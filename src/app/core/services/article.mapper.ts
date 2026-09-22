import { DocumentSnapshot } from 'firebase/firestore';
import { Article, ArticleCard, ArticleStatus } from '../models/article.model';

/** Firestore doc ⇄ model mappers (keeps ArticleService lean). */
export function toArticle(snap: DocumentSnapshot): Article {
  const d = (snap.data() ?? {}) as Partial<Article>;
  return {
    id: snap.id,
    slug: d.slug ?? '',
    authorId: d.authorId ?? '',
    authorName: d.authorName ?? 'Unknown author',
    authorPhoto: d.authorPhoto ?? '',
    title: d.title ?? '',
    excerpt: d.excerpt ?? '',
    contentHtml: d.contentHtml ?? '',
    coverImageUrl: d.coverImageUrl ?? '',
    category: d.category ?? '',
    tags: d.tags ?? [],
    status: (d.status as ArticleStatus) ?? 'draft',
    isFeatured: d.isFeatured ?? false,
    publishAt: d.publishAt ?? null,
    createdAt: d.createdAt ?? null,
    updatedAt: d.updatedAt ?? null,
    readingMinutes: d.readingMinutes ?? 1,
    viewCount: d.viewCount ?? 0,
    likeCount: d.likeCount ?? 0,
    commentCount: d.commentCount ?? 0,
    popularityScore: d.popularityScore ?? 0,
    likedBy: d.likedBy ?? [],
    authorNameLower: d.authorNameLower ?? (d.authorName ?? '').toLowerCase(),
  };
}

export function toCard(a: Article): ArticleCard {
  const { contentHtml: _contentHtml, ...card } = a;
  void _contentHtml;
  return card;
}
