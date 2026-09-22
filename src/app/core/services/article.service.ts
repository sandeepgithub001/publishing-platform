import { Injectable } from '@angular/core';
import {
  DocumentSnapshot,
  FieldValue,
  QueryConstraint,
  Timestamp,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { fb } from '../firebase';
import { Article, ArticleCard, HomeFilters, PagedArticles } from '../models/article.model';
import { AppUser } from '../models/user.model';
import { normalizeTags } from '../config/categories';
import { deriveExcerpt, readingMinutes, sanitizeHtml, slugify } from '../util/text';
import { toArticle, toCard } from './article.mapper';
import { buildFeedPlan, hasMoreAfter } from './article.query';
import { TagService } from './tag.service';

const ARTICLES = 'articles';

/** Feed queries, drafts, publish/schedule lifecycle, counters (spec §4.1–4.2). */
@Injectable({ providedIn: 'root' })
export class ArticleService {
  private readonly db = fb().db;

  constructor(private readonly tags: TagService) {}

  async getFeed(f: HomeFilters, cursor: DocumentSnapshot | null): Promise<PagedArticles> {
    const cs: QueryConstraint[] = [...buildFeedPlan(f).conditions];
    if (cursor) cs.push(startAfter(cursor));
    cs.push(limit(f.pageSize));

    const snap = await getDocs(query(collection(this.db, ARTICLES), ...cs));
    const items = snap.docs.map((d) => toCard(toArticle(d)));
    return { items, cursor: snap.docs.at(-1) ?? null, hasMore: hasMoreAfter(snap.docs.length, f.pageSize), page: 1 };
  }

  async getArticle(id: string): Promise<Article | null> {
    const snap = await getDoc(doc(this.db, ARTICLES, id));
    return snap.exists() ? toArticle(snap) : null;
  }

  async getByAuthor(authorId: string, max = 50): Promise<ArticleCard[]> {
    const snap = await getDocs(query(
      collection(this.db, ARTICLES),
      where('status', '==', 'published'),
      where('publishAt', '<=', Timestamp.now()),
      where('authorId', '==', authorId),
      orderBy('publishAt', 'desc'),
      limit(max),
    ));
    return snap.docs.map((d) => toCard(toArticle(d)));
  }

  /** All of the user's articles (any status) — My Posts buckets client-side. */
  async getMyArticles(uid: string): Promise<Article[]> {
    const snap = await getDocs(query(
      collection(this.db, ARTICLES),
      where('authorId', '==', uid),
      orderBy('createdAt', 'desc'),
      limit(200),
    ));
    return snap.docs.map((d) => toArticle(d));
  }


  async getFeatured(max = 5): Promise<ArticleCard[]> {
    const snap = await getDocs(query(
      collection(this.db, ARTICLES),
      where('status', '==', 'published'),
      where('publishAt', '<=', Timestamp.now()),
      where('isFeatured', '==', true),
      orderBy('publishAt', 'desc'),
      limit(max),
    ));
    return snap.docs.map((d) => toCard(toArticle(d)));
  }

  async getRelated(article: Article, max = 4): Promise<ArticleCard[]> {
    const base: QueryConstraint[] = [
      where('status', '==', 'published'),
      where('publishAt', '<=', Timestamp.now()),
      orderBy('publishAt', 'desc'),
      limit(max + 2),
    ];
    const out: ArticleCard[] = [];
    const seen = new Set<string>([article.id]);
    const tryAdd = (docs: DocumentSnapshot[]) => {
      for (const d of docs) {
        if (out.length >= max) break;
        const a = toArticle(d);
        if (!seen.has(a.id)) {
          seen.add(a.id);
          out.push(toCard(a));
        }
      }
    };
    for (const tag of article.tags.slice(0, 2)) {
      tryAdd((await getDocs(query(collection(this.db, ARTICLES), ...base, where('tags', 'array-contains', tag)))).docs);
      if (out.length >= max) return out;
    }
    if (article.category) {
      tryAdd((await getDocs(query(collection(this.db, ARTICLES), ...base, where('category', '==', article.category)))).docs);
    }
    return out;
  }

  async createDraft(user: AppUser): Promise<string> {
    const ref = doc(collection(this.db, ARTICLES));
    await setDoc(ref, {
      authorId: user.uid,
      slug: '',
      authorName: user.displayName,
      authorPhoto: user.photoURL,
      authorNameLower: user.displayName.trim().toLowerCase(),
      title: '',
      excerpt: '',
      contentHtml: '',
      coverImageUrl: '',
      category: '',
      tags: [],
      status: 'draft',
      isFeatured: false,
      publishAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      readingMinutes: 1,
      viewCount: 0,
      likeCount: 0,
      commentCount: 0,
      popularityScore: 0,
      likedBy: [],
    });
    return ref.id;
  }

  async saveDraft(
    id: string,
    patch: { title: string; contentHtml: string; category: string; tags: string[]; coverImageUrl: string },
  ): Promise<void> {
    const contentHtml = sanitizeHtml(patch.contentHtml);
    await updateDoc(doc(this.db, ARTICLES, id), {
      title: patch.title.trim(),
      slug: slugify(patch.title),
      contentHtml,
      excerpt: deriveExcerpt(contentHtml),
      readingMinutes: readingMinutes(contentHtml),
      category: patch.category,
      tags: normalizeTags(patch.tags),
      coverImageUrl: patch.coverImageUrl,
      updatedAt: serverTimestamp(),
    });
  }

  /** Publish now or schedule. Bumps counters exactly once per publish journey. */
  async publish(id: string, publishAt?: Timestamp): Promise<Timestamp | null> {
    const ref = doc(this.db, ARTICLES, id);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Article not found');
    const a = toArticle(snap);
    const bump = a.status !== 'published';

    const batch = writeBatch(this.db);
    batch.update(ref, {
      status: 'published',
      publishAt: publishAt ?? serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    if (bump) {
      batch.update(doc(this.db, 'users', a.authorId), { publishedCount: increment(1) });
      await this.tags.bumpTags(a.tags, 1, batch);
    }
    await batch.commit();
    return publishAt ?? Timestamp.now();
  }

  async unpublish(id: string): Promise<void> {
    const ref = doc(this.db, ARTICLES, id);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Article not found');
    const a = toArticle(snap);
    const batch = writeBatch(this.db);
    batch.update(ref, { status: 'draft', publishAt: null, updatedAt: serverTimestamp() });
    batch.update(doc(this.db, 'users', a.authorId), { publishedCount: increment(-1) });
    await this.tags.bumpTags(a.tags, -1, batch);
    await batch.commit();
  }

  async deleteDraft(id: string): Promise<void> {
    await deleteDoc(doc(this.db, ARTICLES, id));
  }

  async bumpView(id: string): Promise<void> {
    const key = `pubhub-viewed-${id}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
      await updateDoc(doc(this.db, ARTICLES, id), {
        viewCount: increment(1) as FieldValue,
        popularityScore: increment(1) as FieldValue,
      });
    } catch {
      /* non-critical */
    }
  }

  async toggleLike(article: Article | ArticleCard, uid: string): Promise<void> {
    const liked = article.likedBy.includes(uid);
    const patch: Record<string, FieldValue | string[]> = {
      likeCount: increment(liked ? -1 : 1) as FieldValue,
      popularityScore: increment(liked ? -5 : 5) as FieldValue,
    };
    if (liked) patch['likedBy'] = arrayRemove(uid);
    else if (article.likedBy.length < 100) patch['likedBy'] = arrayUnion(uid);
    await updateDoc(doc(this.db, ARTICLES, article.id), patch);
  }

  async toggleFeatured(id: string, featured: boolean): Promise<void> {
    await updateDoc(doc(this.db, ARTICLES, id), { isFeatured: featured });
  }

  async adjustCommentCount(id: string, delta: number): Promise<void> {
    await updateDoc(doc(this.db, ARTICLES, id), {
      commentCount: increment(delta) as FieldValue,
      popularityScore: increment(2 * delta) as FieldValue,
    });
  }
}

