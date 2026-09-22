import { SearchIndex, tokenize } from './search-index.core';

const article = (id: string, title: string, tags: string[], authorName: string, excerpt = '') => ({
  id,
  title,
  tags,
  authorName,
  excerpt,
});

describe('SearchIndex (web-worker search core)', () => {
  it('tokenizes lowercase alphanumeric tokens of length >= 2', () => {
    expect(tokenize('Signals, Change! the World')).toEqual(['signals', 'change', 'the', 'world']);
    expect(tokenize('a b')).toEqual([]);
  });

  it('indexes and finds articles by title token', () => {
    const index = new SearchIndex();
    index.upsert(article('a1', 'Signals Change Angular Apps', ['angular'], 'Ava Chen'));
    index.upsert(article('a2', 'Climate Numbers Read Carefully', ['climate'], 'Marcus Reid'));

    const hits = index.search('signals');
    expect(hits.length).toBe(1);
    expect(hits[0].id).toBe('a1');
    expect(hits[0].score).toBeGreaterThan(1);
  });

  it('matches on tags and author names', () => {
    const index = new SearchIndex();
    index.upsert(article('a1', 'Some Title', ['web-workers'], 'Ava Chen'));
    expect(index.search('web-workers')[0].id).toBe('a1');
    expect(index.search('ava', 'author')[0].id).toBe('a1');
    expect(index.search('ava', 'title').length).toBe(0);
  });

  it('re-uploading the same id replaces stale tokens (no ghost hits)', () => {
    const index = new SearchIndex();
    index.upsert(article('a1', 'Original Title About Falcons', [], 'Ava'));
    index.upsert(article('a1', 'Renamed Piece About Signals', [], 'Ava'));

    expect(index.search('falcons').length).toBe(0);
    expect(index.search('signals')[0].id).toBe('a1');
    expect(index.size).toBe(1);
  });

  it('ranks title matches above excerpt matches', () => {
    const index = new SearchIndex();
    index.upsert(article('title-hit', 'Angular Signals Guide', [], 'Ava'));
    index.upsert(article('excerpt-hit', 'Unrelated Headline', [], 'Ava', 'A passing mention of angular.'));

    const hits = index.search('angular');
    expect(hits[0].id).toBe('title-hit');
    expect(hits[0].score).toBeGreaterThan(hits[1].score);
  });

  it('returns nothing for empty queries and supports clear()', () => {
    const index = new SearchIndex();
    index.upsert(article('a1', 'Signals', [], 'Ava'));
    expect(index.search('')).toEqual([]);
    expect(index.search('x')).toEqual([]);
    index.clear();
    expect(index.search('signals')).toEqual([]);
    expect(index.size).toBe(0);
  });

  it('removes a document and its tokens', () => {
    const index = new SearchIndex();
    index.upsert(article('a1', 'Signals Deep Dive', [], 'Ava'));
    index.remove('a1');
    expect(index.search('signals')).toEqual([]);
  });
});
