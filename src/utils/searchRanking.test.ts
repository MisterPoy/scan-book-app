import { describe, expect, it } from 'vitest';
import { deduplicateAndRankBooks, scoreSearchResult } from './searchRanking';

describe('search ranking', () => {
  it('places an exact French title before a partial foreign result', () => {
    const results = deduplicateAndRankBooks(
      [
        { title: 'Le Petit Prince illustré', language: 'en' },
        { title: 'Le Petit Prince', language: 'fr', description: 'Conte' },
      ],
      'Le Petit Prince',
    );

    expect(results[0]?.title).toBe('Le Petit Prince');
  });

  it('prioritizes an exact ISBN match', () => {
    const score = scoreSearchResult(
      { title: 'Un livre', isbn: '978-2-1234-5678-9' },
      '9782123456789',
    );

    expect(score).toBeGreaterThanOrEqual(120);
  });

  it('keeps only the richest duplicate edition', () => {
    const results = deduplicateAndRankBooks(
      [
        { title: 'Dune', authors: ['Frank Herbert'], publishedDate: '1965' },
        {
          title: 'Dune',
          authors: ['Frank Herbert'],
          publishedDate: '1965',
          imageLinks: { thumbnail: 'https://example.test/dune.jpg' },
        },
      ],
      'Dune',
    );

    expect(results).toHaveLength(1);
    expect(results[0]?.imageLinks?.thumbnail).toBeTruthy();
  });
});
