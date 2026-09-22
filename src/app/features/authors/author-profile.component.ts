import { Component, inject, Input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthorService } from '../../core/services/author.service';
import { ArticleService } from '../../core/services/article.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { AppUser } from '../../core/models/user.model';
import { ArticleCard } from '../../core/models/article.model';
import { ArticleCardComponent } from '../../shared/components/article-card.component';

@Component({
  selector: 'app-author-profile',
  imports: [RouterLink, ArticleCardComponent],
  template: `
    @if (profile(); as u) {
      <header class="head card">
        <img class="avatar" [src]="u.photoURL || 'https://i.pravatar.cc/96?u=' + u.uid" alt="" referrerpolicy="no-referrer" />
        <div class="who">
          <h1>{{ u.displayName }}</h1>
          <p class="muted">{{ u.bio || 'Writing on PubHub.' }}</p>
          <div class="stats muted">
            <span class="mono">{{ u.publishedCount }} published</span>
            <span class="mono">· {{ u.followerCount }} followers</span>
          </div>
        </div>
        @if (auth.user()?.uid !== u.uid) {
          <button class="btn" (click)="toggleFollow()" [disabled]="busy()">
            {{ following() ? 'Following ✓' : 'Follow' }}
          </button>
        }
      </header>
    } @else if (notFound()) {
      <div class="card empty"><h1>Author not found</h1><a routerLink="/authors" class="btn btn-secondary">All authors</a></div>
    }

    <h2 class="section-title">Published articles</h2>
    <div class="grid">
      @for (a of articles(); track a.id) {
        <app-article-card [card]="a" />
      }
    </div>
    @if (articles().length === 0 && profile()) {
      <p class="muted">No published articles yet.</p>
    }
  `,
  styles: `
    .head { display: flex; gap: 1rem; align-items: flex-start; padding: 1.2rem; margin-bottom: 1rem; }
    .avatar { width: 72px; height: 72px; border-radius: 50%; }
    .who { flex: 1; }
    h1 { margin: 0 0 0.2rem; font-size: 1.3rem; }
    .stats { font-size: 0.82rem; display: flex; gap: 0.4rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }
    .empty { padding: 2.5rem; text-align: center; display: grid; gap: 0.6rem; justify-items: center; }
  `,
})
export class AuthorProfileComponent {
  @Input({ required: true }) set id(value: string) {
    void this.load(value);
  }

  private readonly authorService = inject(AuthorService);
  private readonly articles_ = inject(ArticleService);
  readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly profile = signal<AppUser | null>(null);
  readonly articles = signal<ArticleCard[]>([]);
  readonly following = signal(false);
  readonly busy = signal(false);
  readonly notFound = signal(false);

  async load(uid: string): Promise<void> {
    this.notFound.set(false);
    const [profile, cards] = await Promise.all([this.authorService.getUserProfile(uid), this.articles_.getByAuthor(uid)]);
    if (!profile) {
      this.notFound.set(true);
      return;
    }
    this.profile.set(profile);
    this.articles.set(cards);
    const me = this.auth.user()?.uid;
    if (me && me !== uid) {
      this.following.set(await this.authorService.isFollowing(me, uid));
    }
  }

  async toggleFollow(): Promise<void> {
    const me = this.auth.currentProfile();
    const target = this.profile();
    if (!me || !target) {
      this.toast.info('Sign in to follow authors.');
      return;
    }
    this.busy.set(true);
    try {
      if (this.following()) {
        await this.authorService.unfollow(me.uid, target.uid);
        this.following.set(false);
      } else {
        await this.authorService.follow(me, target.uid);
        this.following.set(true);
      }
    } catch (e) {
      this.toast.error(e instanceof Error ? e.message : 'Follow failed');
    } finally {
      this.busy.set(false);
    }
  }
}
