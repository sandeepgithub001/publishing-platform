import { Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CommentService, flattenTree, sortNodes } from '../../core/services/comment.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { Article } from '../../core/models/article.model';
import { CommentNode, CommentSort } from '../../core/models/comment.model';
import { CommentNodeComponent } from './comment-node.component';

const SORTS: { key: CommentSort; label: string }[] = [
  { key: 'newest', label: 'Newest' },
  { key: 'oldest', label: 'Oldest' },
  { key: 'most-liked', label: 'Most liked' },
];

/** Threaded discussion (spec §4.5, §5.5): one fetch → client-built tree. */
@Component({
  selector: 'app-comment-thread',
  imports: [FormsModule, RouterLink, CommentNodeComponent],
  template: `
    <section class="thread">
      <h2 class="section-title">Discussion <span class="muted mono">({{ flat.length }})</span></h2>

      <div class="sorts">
        @for (s of sorts; track s.key) {
          <button class="chip" [class.active]="sort() === s.key" (click)="setSort(s.key)">{{ s.label }}</button>
        }
      </div>

      @if (auth.isSignedIn()) {
        <form class="composer card" (ngSubmit)="postRoot()">
          <textarea class="textarea" name="message" [(ngModel)]="composerInput" rows="3" maxlength="2000"
            placeholder="Share your thoughts…" required></textarea>
          <div class="row">
            <span class="muted mono">{{ composerInput.length }}/2000</span>
            <button class="btn" type="submit" [disabled]="busy() || !composerInput.trim()">Comment</button>
          </div>
        </form>
      } @else {
        <p class="signin card">
          <a routerLink="/login" [queryParams]="{ returnUrl: '/articles/' + article().id }">Sign in</a> to join the discussion.
        </p>
      }

      @if (loading()) {
        @for (i of [1, 2, 3]; track i) {<div class="skeleton" style="height: 64px; margin: 0.6rem 0"></div>}
      } @else if (roots().length === 0) {
        <p class="muted">No comments yet — be the first.</p>
      } @else {
        @for (node of roots(); track node.id) {
          <app-comment-node [node]="node" [currentUid]="auth.user()?.uid ?? null" [isEditor]="auth.isEditor()"
            (liked)="onLike($event)" (replied)="onReply($event.node, $event.message)" (removed)="onDelete($event)" />
        }
      }
    </section>
  `,
  styles: `
    .sorts { display: flex; gap: 0.4rem; margin: 0.6rem 0 1rem; }
    .composer { padding: 0.8rem; margin-bottom: 1.2rem; display: grid; gap: 0.5rem; }
    .row { display: flex; justify-content: space-between; align-items: center; }
    .signin { padding: 0.8rem 1rem; }
  `,
})
export class CommentThreadComponent {
  readonly article = input.required<Article>();

  private readonly comments = inject(CommentService);
  readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly roots = signal<CommentNode[]>([]);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly sort = signal<CommentSort>('newest');
  readonly sorts = SORTS;
  composerInput = '';
  flat: CommentNode[] = [];

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      const tree = await this.comments.getThread(this.article().id);
      this.flat = flattenTree(tree);
      this.roots.set(sortNodes(tree, this.sort()));
    } finally {
      this.loading.set(false);
    }
  }

  setSort(sort: CommentSort): void {
    this.sort.set(sort);
    this.roots.set(sortNodes(this.roots(), sort));
  }

  async postRoot(): Promise<void> {
    await this.post(null, this.composerInput);
    this.composerInput = '';
  }

  async post(parent: CommentNode | null, message: string): Promise<void> {
    const trimmed = message.trim();
    const user = this.auth.currentProfile();
    if (!trimmed || !user) {
      if (!user) this.toast.info('Sign in to comment.');
      return;
    }
    this.busy.set(true);
    try {
      const node = await this.comments.add(this.article(), user, trimmed, parent);
      this.flat = [...this.flat, node];
      if (parent) {
        parent.replies = [...parent.replies, node];
        this.roots.set(sortNodes([...this.roots()], this.sort()));
      } else {
        this.roots.set(sortNodes([node, ...this.roots()], this.sort()));
      }
      this.toast.success('Comment posted');
    } catch (e) {
      this.toast.error(e instanceof Error ? e.message : 'Comment failed');
    } finally {
      this.busy.set(false);
    }
  }

  async onLike(node: CommentNode): Promise<void> {
    const uid = this.auth.user()?.uid;
    if (!uid) {
      this.toast.info('Sign in to like comments.');
      return;
    }
    try {
      const liked = node.likedBy.includes(uid);
      await this.comments.toggleLike(node, uid);
      node.likedBy = liked ? node.likedBy.filter((x) => x !== uid) : [...node.likedBy, uid];
      node.likeCount += liked ? -1 : 1;
      this.roots.set(sortNodes([...this.roots()], this.sort()));
    } catch {
      this.toast.error('Like failed');
    }
  }

  onReply(parent: CommentNode, message: string): void {
    void this.post(parent, message);
  }

  async onDelete(node: CommentNode): Promise<void> {
    const user = this.auth.currentProfile();
    if (!user) return;
    try {
      await this.comments.remove(this.article(), this.flat, node, user);
      this.toast.success('Comment deleted');
      await this.load();
    } catch (e) {
      this.toast.error(e instanceof Error ? e.message : 'Delete failed');
    }
  }
}
