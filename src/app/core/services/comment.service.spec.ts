import { Timestamp } from 'firebase/firestore';
import { CommentNode } from '../models/comment.model';
import { collectDescendants, flattenTree, sortNodes } from './comment.service';

/** Pure tree helpers used by CommentService (no Firestore access needed). */
const node = (id: string, parent: string | null, minutesAgo: number, likes = 0): CommentNode => ({
  id,
  articleId: 'art1',
  parentCommentId: parent,
  authorId: `u-${id}`,
  authorName: `Author ${id}`,
  authorPhoto: '',
  message: `Message ${id}`,
  likeCount: likes,
  likedBy: [],
  createdAt: Timestamp.fromMillis(1_700_000_000_000 - minutesAgo * 60_000),
  replies: [],
  depth: 0,
});

function buildTree(): CommentNode[] {
  const roots = [node('r1', null, 50), node('r2', null, 10)];
  const flat = [...roots, node('c1', 'r1', 40), node('c2', 'r1', 30), node('gc1', 'c1', 20)];
  // minimal tree assembly mirroring the service's buildTree behaviour
  const byId = new Map(flat.map((n) => [n.id, n]));
  for (const n of flat) {
    if (n.parentCommentId) byId.get(n.parentCommentId)?.replies.push(n);
  }
  return roots;
}

describe('CommentService tree helpers (spec §4.5)', () => {
  it('flattens a tree depth-first', () => {
    const ids = flattenTree(buildTree()).map((n) => n.id);
    expect(ids).toContain('r1');
    expect(ids).toContain('gc1');
    expect(ids.indexOf('r1')).toBeLessThan(ids.indexOf('c1'));
    expect(ids.indexOf('c1')).toBeLessThan(ids.indexOf('gc1'));
  });

  it('sorts roots by newest first and keeps replies sorted too', () => {
    const sorted = sortNodes(buildTree(), 'newest');
    expect(sorted[0].id).toBe('r2'); // 10 minutes ago is newest
    const r1 = sorted.find((n) => n.id === 'r1')!;
    expect(r1.replies[0].id).toBe('c2'); // 30m before 40m
  });

  it('sorts by oldest and by most-liked', () => {
    const nodes = [node('a', null, 5, 1), node('b', null, 30, 9), node('c', null, 20, 4)];
    expect(sortNodes(nodes, 'oldest')[0].id).toBe('b');
    expect(sortNodes(nodes, 'most-liked')[0].id).toBe('b');
  });

  it('collects a comment together with all of its descendants', () => {
    const tree = buildTree();
    const flat = flattenTree(tree);
    const r1 = flat.find((n) => n.id === 'r1')!;
    const doomed = collectDescendants(flat, r1).map((n) => n.id).sort();
    expect(doomed).toEqual(['c1', 'c2', 'gc1', 'r1']);
  });

  it('a leaf comment collects only itself (counter delta of 1)', () => {
    const flat = flattenTree(buildTree());
    const leaf = flat.find((n) => n.id === 'gc1')!;
    expect(collectDescendants(flat, leaf).length).toBe(1);
  });
});
