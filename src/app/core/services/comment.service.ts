import { Injectable, inject } from '@angular/core';
import {
  collection,
  doc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { fb } from '../firebase';
import { Article } from '../models/article.model';
import { CommentDoc, CommentNode, CommentSort } from '../models/comment.model';
import { AppUser } from '../models/user.model';
import { ArticleService } from './article.service';

const COMMENTS = 'comments';

/** Thread fetch + client-built tree, add/delete/likes (spec §4.5). */
@Injectable({ providedIn: 'root' })
export class CommentService {
  private readonly db = fb().db;
  private readonly articles = inject(ArticleService);

  async getThread(articleId: string): Promise<CommentNode[]> {
    const snap = await getDocs(query(
      collection(this.db, COMMENTS),
      where('articleId', '==', articleId),
      orderBy('createdAt', 'asc'),
      limit(500),
    ));
    const flat: CommentNode[] = snap.docs.map((d) => {
      const data = d.data() as Partial<CommentDoc>;
      return {
        id: d.id,
        articleId,
        parentCommentId: data.parentCommentId ?? null,
        authorId: data.authorId ?? '',
        authorName: data.authorName ?? 'Unknown',
        authorPhoto: data.authorPhoto ?? '',
        message: data.message ?? '',
        likeCount: data.likeCount ?? 0,
        likedBy: data.likedBy ?? [],
        createdAt: data.createdAt ?? null,
        replies: [],
        depth: 0,
      };
    });
    return buildTree(flat);
  }

  async add(article: Article, user: AppUser, message: string, parent: CommentNode | null): Promise<CommentNode> {
    const ref = doc(collection(this.db, COMMENTS));
    const node: CommentNode = {
      id: ref.id,
      articleId: article.id,
      parentCommentId: parent?.id ?? null,
      authorId: user.uid,
      authorName: user.displayName,
      authorPhoto: user.photoURL,
      message,
      likeCount: 0,
      likedBy: [],
      createdAt: null,
      replies: [],
      depth: (parent?.depth ?? -1) + 1,
    };
    const batch = writeBatch(this.db);
    batch.set(ref, {
      articleId: article.id,
      parentCommentId: node.parentCommentId,
      authorId: node.authorId,
      authorName: node.authorName,
      authorPhoto: node.authorPhoto,
      message,
      likeCount: 0,
      likedBy: [],
      createdAt: serverTimestamp(),
    });
    batch.update(doc(this.db, 'articles', article.id), {
      commentCount: increment(1),
      popularityScore: increment(2),
    });
    await batch.commit();
    return node;
  }

  async toggleLike(comment: CommentNode, uid: string): Promise<void> {
    const liked = comment.likedBy.includes(uid);
    if (!liked && comment.likedBy.length >= 100) {
      await this.bump(comment.id, 1);
      return;
    }
    await this.bump(comment.id, liked ? -1 : 1, liked ? uid : null, liked ? null : uid);
  }

  private async bump(id: string, delta: number, remove?: string | null, add?: string | null): Promise<void> {
    const patch: Record<string, unknown> = { likeCount: increment(delta) };
    if (add) patch['likedBy'] = arrayUnion(add);
    if (remove) patch['likedBy'] = arrayRemove(remove);
    await updateDoc(doc(this.db, COMMENTS, id), patch);
  }

  /** Delete a comment + its descendants; adjust the article counter by -n. */
  async remove(article: Article, flat: CommentNode[], target: CommentNode, user: AppUser): Promise<number> {
    const doomed = collectDescendants(flat, target);
    const batch = writeBatch(this.db);
    for (const n of doomed) batch.delete(doc(this.db, COMMENTS, n.id));
    batch.update(doc(this.db, 'articles', article.id), {
      commentCount: increment(-doomed.length),
      popularityScore: increment(-2 * doomed.length),
    });
    await batch.commit();
    void user;
    return doomed.length;
  }
}

function buildTree(flat: CommentNode[]): CommentNode[] {
  const byId = new Map<string, CommentNode>(flat.map((n) => [n.id, { ...n, replies: [] }]));
  const roots: CommentNode[] = [];
  for (const node of byId.values()) {
    const parent = node.parentCommentId ? byId.get(node.parentCommentId) : undefined;
    if (parent) {
      node.depth = parent.depth + 1;
      if (node.depth <= 5) parent.replies.push(node);
      else roots.push(node); // depth overflow renders as root
    } else {
      roots.push(node);
    }
  }
  return roots;
}

export function collectDescendants(flat: CommentNode[], target: CommentNode): CommentNode[] {
  const out: CommentNode[] = [target];
  let frontier = [target.id];
  while (frontier.length) {
    const next = flat.filter((n) => n.parentCommentId && frontier.includes(n.parentCommentId));
    out.push(...next);
    frontier = next.map((n) => n.id);
  }
  return out;
}

export function sortNodes(nodes: CommentNode[], sort: CommentSort): CommentNode[] {
  const dir = sort === 'newest' ? -1 : sort === 'oldest' ? 1 : -1;
  const key = (n: CommentNode) => (sort === 'most-liked' ? n.likeCount : n.createdAt?.toMillis() ?? 0);
  const sorted = [...nodes].sort((a, b) => dir * (key(a) - key(b)));
  for (const n of sorted) n.replies = sortNodes(n.replies, sort === 'most-liked' ? 'oldest' : sort);
  return sorted;
}

export function flattenTree(nodes: CommentNode[]): CommentNode[] {
  const out: CommentNode[] = [];
  const walk = (list: CommentNode[]) => {
    for (const n of list) {
      out.push(n);
      walk(n.replies);
    }
  };
  walk(nodes);
  return out;
}
