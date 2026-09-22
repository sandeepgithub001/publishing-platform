import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Timestamp } from 'firebase/firestore';
import { ArticleCardComponent } from './article-card.component';
import { ArticleCard } from '../../core/models/article.model';

const card: ArticleCard = {
  id: 'a1',
  slug: 'signals-change-how-we-build',
  authorId: 'u1',
  authorName: 'Ava Chen',
  authorPhoto: '',
  title: 'Signals Change How We Build Angular Apps',
  excerpt: 'Fine-grained reactivity as the default mental model.',
  coverImageUrl: '',
  category: 'Technology',
  tags: ['angular', 'signals', 'frontend', 'extra'],
  status: 'published',
  isFeatured: true,
  publishAt: Timestamp.fromMillis(Date.now() - 3_600_000),
  createdAt: null,
  updatedAt: null,
  readingMinutes: 4,
  viewCount: 12,
  likeCount: 3,
  commentCount: 2,
  popularityScore: 31,
  likedBy: [],
  authorNameLower: 'ava chen',
};

describe('ArticleCardComponent (feed card, spec §5.2)', () => {
  let fixture: ComponentFixture<ArticleCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ArticleCardComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(ArticleCardComponent);
    fixture.componentRef.setInput('card', card);
    fixture.detectChanges();
  });

  it('renders title, excerpt, author and metadata', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Signals Change How We Build Angular Apps');
    expect(el.textContent).toContain('Fine-grained reactivity');
    expect(el.textContent).toContain('Ava Chen');
    expect(el.textContent).toContain('min read');
  });

  it('shows the editor’s-pick badge only for featured articles', () => {
    expect((fixture.nativeElement as HTMLElement).textContent).toContain("Editor's pick");
    fixture.componentRef.setInput('card', { ...card, isFeatured: false });
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain("Editor's pick");
  });

  it('caps displayed tags at three', () => {
    const chips = (fixture.nativeElement as HTMLElement).querySelectorAll('.tags .chip');
    expect(chips.length).toBe(3);
    expect(chips[0].textContent).toContain('#angular');
  });

  it('links the whole card to the article route', () => {
    const anchor = (fixture.nativeElement as HTMLElement).querySelector('a') as HTMLAnchorElement;
    expect(anchor.getAttribute('href')).toContain('/articles/a1');
  });

  it('falls back to a gradient when no cover image exists', () => {
    expect((fixture.nativeElement as HTMLElement).querySelector('.cover')?.getAttribute('style')).toContain('gradient');
    expect((fixture.nativeElement as HTMLElement).querySelector('.cover img')).toBeNull();
  });
});
