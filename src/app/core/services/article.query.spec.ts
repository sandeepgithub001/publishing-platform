import { QueryConstraint, Timestamp } from 'firebase/firestore';
import { buildFeedPlan, hasMoreAfter, popularityScore } from './article.query';
import { HomeFilters } from '../models/article.model';

/** Firestore constraint internals are private; expose them for assertions. */
interface ConstraintInternals {
  type: string;
  _field?: { segments: string[] };
  _op?: string;
  _value?: unknown;
}
const internals = (c: QueryConstraint): ConstraintInternals => c as unknown as ConstraintInternals;

describe('article.query (feed query construction)', () => {
  const now = Timestamp.fromMillis(1_700_000_000_000);

  const filters = (patch: Partial<HomeFilters> = {}): HomeFilters => ({
    sort: 'latest',
    category: null,
    tag: null,
    pageSize: 9,
    ...patch,
  });

  it('always constrains to published + due articles', () => {
    const plan = buildFeedPlan(filters(), now);
    const fields = plan.conditions.map((c) => internals(c)._field?.segments.join('/') ?? internals(c).type);
    expect(fields).toContain('status');
    expect(fields).toContain('publishAt');
    expect(plan.sortField).toBe('publishAt');
    expect(plan.sortDirection).toBe('desc');
  });

  it('sorts by popularityScore for the popular tab', () => {
    const plan = buildFeedPlan(filters({ sort: 'popular' }), now);
    expect(plan.sortField).toBe('popularityScore');
    expect(plan.sortDirection).toBe('desc');
  });

  it('adds an isFeatured constraint for editors-pick', () => {
    const plan = buildFeedPlan(filters({ sort: 'editors-pick' }), now);
    const hasFeatured = plan.conditions.some((c) => internals(c)._field?.segments.includes('isFeatured'));
    expect(hasFeatured).toBe(true);
    expect(plan.sortField).toBe('publishAt');
  });

  it('adds category equality and tag array-contains filters', () => {
    const plan = buildFeedPlan(filters({ category: 'Technology', tag: 'angular' }), now);
    const withFields = plan.conditions.filter((c) => internals(c)._field);
    const fields = withFields.map((c) => internals(c)._field!.segments.join('/'));
    expect(fields).toContain('category');
    expect(fields).toContain('tags');
    expect(plan.conditions.some((c) => internals(c)._op === 'array-contains')).toBe(true);
  });

  it('emits exactly one orderBy clause', () => {
    const plan = buildFeedPlan(filters({ sort: 'popular', category: 'Design', tag: 'ux' }), now);
    const orderBys = plan.conditions.filter((c) => internals(c).type === 'orderBy');
    expect(orderBys.length).toBe(1);
  });

  it('computes popularity and hasMore consistently', () => {
    expect(popularityScore(10, 2, 3)).toBe(10 + 10 + 6);
    expect(hasMoreAfter(9, 9)).toBe(true);
    expect(hasMoreAfter(4, 9)).toBe(false);
  });
});

