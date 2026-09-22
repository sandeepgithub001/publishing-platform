import { Component, effect, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FeedStore } from '../../core/stores/feed.store';
import { ArticleService } from '../../core/services/article.service';
import { SearchService } from '../../core/services/search.service';
import { ArticleCardComponent } from '../../shared/components/article-card.component';
import { ArticleCard, SortOption } from '../../core/models/article.model';
import { CATEGORIES } from '../../core/config/categories';
import { IndexedArticle } from '../../core/workers/search-index.worker';

const SORTS: { key: SortOption; label: string }[] = [
  { key: 'latest', label: 'Latest' },
  { key: 'popular', label: 'Most popular' },
  { key: 'editors-pick', label: "Editor's pick" },
];

@Component({
  selector: 'app-home',
  imports: [RouterLink, ArticleCardComponent],
  template: `
    @if (featured().length > 0) {
      <section class="featured" aria-label="Editor's picks">
        @for (a of featured(); track a.id) {
          <app-article-card [card]="a" />
        }
      </section>
    }

    <div class="toolbar">
      <div class="sorts" role="tablist">
        @for (s of sorts; track s.key) {
          <button class="chip" role="tab" [class.active]="feed.filters().sort === s.key" (click)="setSort(s.key)">
            {{ s.label }}
          </button>
        }
      </div>
      <div class="cats">
        <button class="chip" [class.active]="feed.filters().category === null" (click)="setCategory(null)">All</button>
        @for (c of categories; track c) {
          <button class="chip" [class.active]="feed.filters().category === c" (click)="setCategory(c)">{{ c }}</button>
        }
      </div>
    </div>

    @if (feed.loading() && feed.items().length === 0) {
      <div class="grid">
        @for (i of [1, 2, 3, 4, 5, 6]; track i) {
          <div class="skeleton card" style="height: 260px;"></div>
        }
      </div>
    } @else if (feed.empty()) {
      <div class="empty card">
        <p>No articles match. Try a different sort or category.</p>
        <p class="muted">New here? Authors can publish in minutes — hit <strong>Write</strong>.</p>
      </div>
    } @else {
      <div class="grid">
        @for (a of feed.items(); track a.id) {
          <app-article-card [card]="a" />
        }
      </div>
      <div class="load-more">
        @if (feed.hasMore()) {
          <button class="btn btn-secondary" (click)="feed.loadMore()" [disabled]="feed.loading()">
            {{ feed.loading() ? 'Loading…' : 'Load more' }}
          </button>
        } @else if (feed.items().length > 0) {
          <span class="muted">You're all caught up.</span>
        }
      </div>
    }
  `,
  styles: `
    .featured { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
    .toolbar { display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
    .sorts, .cats { display: flex; gap: 0.4rem; flex-wrap: wrap; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }
    .empty { padding: 2.5rem; text-align: center; }
    .load-more { display: grid; place-items: center; padding: 1.5rem 0; }
  `,
})
export class HomeComponent implements OnInit {
  readonly feed = inject(FeedStore);
  private readonly articles = inject(ArticleService);
  private readonly search = inject(SearchService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly featured = signal<ArticleCard[]>([]);
  readonly sorts = SORTS;
  readonly categories = CATEGORIES;

  constructor() {
    effect(() => {
      // Push loaded pages into the worker index (spec §4.3).
      const items = this.feed.items();
      if (items.length) {
        this.search.index(
          items.map((c): IndexedArticle => ({ id: c.id, title: c.title, excerpt: c.excerpt, tags: c.tags, authorName: c.authorName })),
        );
      }
    });
  }

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParamMap;
    const tag = qp.get('tag');
    const category = qp.get('category');
    if (tag || category) {
      this.feed.setFilters({ tag: tag ?? null, category: category ?? null });
    } else {
      void this.feed.load(true);
    }
    void this.articles.getFeatured(3).then((cards) => this.featured.set(cards));
  }

  setSort(sort: SortOption): void {
    this.feed.setFilters({ sort });
  }

  setCategory(category: string | null): void {
    // Category filters go through the URL so Discover/home can share state.
    void this.router.navigate([], { queryParamsHandling: 'merge', queryParams: category ? { category } : { category: null } });
    this.feed.setFilters({ category });
  }
}
