import { deriveExcerpt, readingMinutes, sanitizeHtml, slugify, stripHtml } from './text';

describe('text utilities (rich-text pipeline, spec §4.4)', () => {
  it('keeps allow-listed formatting tags', () => {
    const out = sanitizeHtml('<p><strong>Bold</strong> and <em>italic</em> and <u>under</u></p><ul><li>item</li></ul>');
    expect(out).toContain('<strong>Bold</strong>');
    expect(out).toContain('<em>italic</em>');
    expect(out).toContain('<li>item</li>');
  });

  it('strips scripts, event handlers and disallowed nodes', () => {
    const out = sanitizeHtml('<p onclick="steal()">Hi</p><script>alert(1)</script><style>p{color:red}</style>');
    expect(out).not.toContain('<script');
    expect(out).not.toContain('onclick');
    expect(out).not.toContain('<style');
    expect(out).toContain('Hi');
  });

  it('drops inline style attributes from formatted content', () => {
    const out = sanitizeHtml('<p style="color:red">Red text</p>');
    expect(out).not.toContain('style=');
    expect(out).toContain('Red text');
  });

  it('only keeps iframes from allow-listed embed hosts', () => {
    const ok = sanitizeHtml('<iframe src="https://www.youtube.com/embed/abc123"></iframe>');
    const bad = sanitizeHtml('<iframe src="https://evil.example.com/track"></iframe>');
    expect(ok).toContain('youtube.com/embed/abc123');
    expect(bad).not.toContain('evil.example.com');
    expect(bad).not.toContain('<iframe');
  });

  it('hardens external links with noopener/noreferrer and target=_blank', () => {
    const out = sanitizeHtml('<a href="https://example.com/post">link</a>');
    expect(out).toContain('rel="noopener noreferrer"');
    expect(out).toContain('target="_blank"');
  });

  it('derives a plain-text excerpt capped near the limit without breaking words', () => {
    const html = '<p>' + 'word '.repeat(80) + '</p>';
    const excerpt = deriveExcerpt(html, 100);
    expect(excerpt.length).toBeLessThanOrEqual(101);
    expect(excerpt.endsWith('…')).toBe(true);
    expect(stripHtml(html)).not.toContain('<');
  });

  it('computes reading time at 200 words per minute (min 1)', () => {
    expect(readingMinutes('<p>short</p>')).toBe(1);
    expect(readingMinutes('<p>' + 'word '.repeat(401) + '</p>')).toBe(3);
  });

  it('slugifies titles for stable seed lookups', () => {
    expect(slugify('Signals Change How We Build Angular Apps!')).toBe('signals-change-how-we-build-angular-apps');
    expect(slugify('  Weird   Spacing  ')).toBe('weird-spacing');
  });
});
