import DOMPurify from 'dompurify';

/**
 * Rich-text pipeline (spec §4.4): sanitize-on-save with DOMPurify allow-list,
 * iframe host restriction, then derivations (excerpt, reading time).
 * SafeHtmlPipe re-applies sanitizeHtml at render as a second layer.
 */
const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'em', 'u', 's', 'ul', 'ol', 'li', 'a', 'img', 'iframe',
  'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'figure', 'figcaption',
  'span', 'pre', 'code', 'hr',
];
const ALLOWED_ATTR = ['href', 'src', 'alt', 'target', 'rel', 'class', 'title', 'width', 'height', 'allow', 'allowfullscreen', 'frameborder', 'loading'];
const IFRAME_HOSTS = ['youtube.com', 'youtube-nocookie.com', 'player.vimeo.com'];

export function sanitizeHtml(html: string): string {
  const clean = DOMPurify.sanitize(html ?? '', {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    FORBID_ATTR: ['style'],
    KEEP_CONTENT: true,
  });
  if (!clean) return '';
  const doc = new DOMParser().parseFromString(clean, 'text/html');

  doc.querySelectorAll('iframe').forEach((f) => {
    const src = f.getAttribute('src') ?? '';
    try {
      const url = new URL(src);
      const ok = IFRAME_HOSTS.some((h) => url.hostname === h || url.hostname.endsWith('.' + h));
      if (!ok) f.remove();
    } catch {
      f.remove();
    }
  });
  doc.querySelectorAll('a').forEach((a) => {
    if ((a.getAttribute('href') ?? '').startsWith('http')) {
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
    }
  });
  return doc.body.innerHTML;
}

export function stripHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html ?? '', 'text/html');
  return (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim();
}

export function deriveExcerpt(html: string, max = 300): string {
  const text = stripHtml(html);
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd() + '…';
}

export function readingMinutes(html: string): number {
  const words = stripHtml(html).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80)
    .replace(/-+$/, '');
}
