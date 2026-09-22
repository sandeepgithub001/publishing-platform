import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DocumentSnapshot } from 'firebase/firestore';
import { AuthorService } from '../../core/services/author.service';
import { AppUser } from '../../core/models/user.model';
import { debounceTime, Subject } from 'rxjs';

@Component({
  selector: 'app-author-directory',
  imports: [RouterLink, FormsModule],
  template: `
    <h1>Authors</h1>
    <input class="input search" type="search" placeholder="Search authors by name…" aria-label="Search authors"
      [ngModel]="term" (ngModelChange)="onTerm($event)" />
    @if (loading()) {
      <div class="authors">@for (i of [1,2,3]; track i) {<div class="skeleton" style="height:110px"></div>}</div>
    } @else if (authors().length === 0) {
      <div class="card empty"><p class="muted">No authors found{{ term ? ' for “' + term + '”' : '' }} yet.</p></div>
    } @else {
      <div class="authors">
        @for (u of authors(); track u.uid) {
          <a class="card author" [routerLink]="['/authors', u.uid]">
            <img class="avatar" [src]="u.photoURL || 'https://i.pravatar.cc/72?u=' + u.uid" alt="" referrerpolicy="no-referrer" />
            <div>
              <strong>{{ u.displayName }}</strong>
              <p class="muted">{{ u.bio?.slice(0, 120) || 'Writing on PubHub.' }}</p>
              <span class="chip mono">{{ u.publishedCount }} published</span>
            </div>
          </a>
        }
      </div>
      @if (hasMore()) { <div class="more"><button class="btn btn-secondary" (click)="loadMore()">Load more</button></div> }
    }
  `,
  styles: `
    .search { max-width: 340px; margin-bottom: 1.2rem; }
    .authors { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1rem; }
    .author { display: flex; gap: 0.8rem; padding: 0.9rem; color: var(--text); text-decoration: none; }
    .author:hover { border-color: var(--accent); text-decoration: none; }
    .author p { margin: 0.2rem 0 0.5rem; font-size: 0.82rem; }
    .avatar { width: 48px; height: 48px; border-radius: 50%; flex-shrink: 0; }
    .empty { padding: 2rem; text-align: center; }
    .more { display: grid; place-items: center; padding: 1.2rem 0; }
  `,
})
export class AuthorDirectoryComponent implements OnInit {
  private readonly authorService = inject(AuthorService);

  readonly authors = signal<AppUser[]>([]);
  readonly loading = signal(true);
  readonly hasMore = signal(false);
  term = '';

  private cursor: DocumentSnapshot | null = null;
  private readonly input$ = new Subject<string>();

  constructor() {
    this.input$.pipe(debounceTime(300)).subscribe((t) => void this.load(t, true));
  }

  ngOnInit(): void {
    void this.load('', true);
  }

  onTerm(value: string): void {
    this.term = value;
    this.input$.next(value);
  }

  loadMore(): void {
    void this.load(this.term, false);
  }

  private async load(search: string, reset: boolean): Promise<void> {
    this.loading.set(true);
    try {
      const page = await this.authorService.getAuthors(search || null, 12, reset ? null : this.cursor);
      this.cursor = page.cursor;
      this.hasMore.set(page.hasMore);
      this.authors.update((prev) => (reset ? page.items : [...prev, ...page.items]));
    } finally {
      this.loading.set(false);
    }
  }
}
