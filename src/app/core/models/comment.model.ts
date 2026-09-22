import { Timestamp } from 'firebase/firestore';

export type CommentSort = 'newest' | 'oldest' | 'most-liked';

/** comments/{commentId} document — spec §2.2. */
export interface CommentDoc {
  id: string;
  articleId: string;
  parentCommentId: string | null;
  authorId: string;
  authorName: string;
  authorPhoto: string;
  message: string;
  likeCount: number;
  likedBy: string[];
  createdAt: Timestamp | null;
}

/** Client-built tree node — spec §4.5. */
export interface CommentNode extends CommentDoc {
  replies: CommentNode[];
  depth: number;
}
