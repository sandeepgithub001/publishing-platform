import { Component, inject, Input, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { QuillEditorComponent } from 'ngx-quill';
import { Timestamp } from 'firebase/firestore';
import { ArticleService } from '../../core/services/article.service';
import { AuthService } from '../../core/services/auth.service';
import { StorageService } from '../../core/services/storage.service';
import { TagService } from '../../core/services/tag.service';
import { ToastService } from '../../core/services/toast.service';
import { EditorDraftService } from '../../core/stores/editor-draft.service';
import { CATEGORIES } from '../../core/config/categories';

const QUILL_MODULES = {
  toolbar: [
    ['bold', 'italic', 'underline'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link', 'image', 'video'],
    ['blockquote'],
    [{ header: 2 }, { header: 3 }],
    ['clean'],
  ],
};

@Component({
  selector: 'app-editor',
  imports: [FormsModule, QuillEditorComponent, DatePipe],
  template: `
    <div class="editor-wrap">
      <div class="editor-bar card">
        <span class="saved muted">
          @if (saving()) { Saving… }
          @else if (lastSaved(); as at) { Saved {{ at | date:'shortTime' }} }
          @else { Unsaved }
        </span>
        <div class="bar-actions">
          <button class="btn btn-ghost" (click)="saveNow()" [disabled]="saving()">Save draft</button>
          <button class="btn btn-secondary" (click)="preview()" [disabled]="saving() || !title.trim()">Preview</button>
          @if (isScheduled()) {
            <button class="btn btn-secondary" (click)="unschedule()" [disabled]="saving()">Unschedule</button>
            <button class="btn" (click)="publishNow()" [disabled]="saving()">Publish now</button>
          } @else {
            <button class="btn" (click)="publishNow()" [disabled]="saving() || !title.trim()">Publish now</button>
            <input class="input dt" type="datetime-local" [(ngModel)]="scheduleAt" name="scheduleAt" aria-label="Schedule time" />
            <button class="btn btn-secondary" (click)="schedule()" [disabled]="saving() || !scheduleAt">Schedule</button>
          }
          @if (draftId() && status() === 'draft') {
            <button class="btn btn-danger" (click)="deleteDraft()" [disabled]="saving()">Delete draft</button>
          }
        </div>
      </div>

      <div class="card editor-card">
        <input class="input title-input" placeholder="Article title (10–200 chars)" maxlength="200"
          name="title" [(ngModel)]="title" (ngModelChange)="queueAutosave()" />
        @if (title.length > 0 && title.trim().length < 10) {
          <p class="field-error">Title needs at least 10 characters.</p>
        }
        <div class="meta-row">
          <select class="select" name="category" [(ngModel)]="category" (ngModelChange)="queueAutosave()" aria-label="Category">
            <option [ngValue]="''">Category…</option>
            @for (c of categories; track c) {<option [value]="c">{{ c }}</option>}
          </select>
          <input class="input tags-input" name="tags" placeholder="Tags (comma separated, up to 5)"
            [(ngModel)]="tagsText" (ngModelChange)="queueAutosave()" />
        </div>
        <div class="tag-suggestions">
          @for (t of popularTags(); track t) {
            <button type="button" class="chip" (click)="addTag(t)">+{{ t }}</button>
          }
        </div>

        <div class="cover-row">
          @if (coverImageUrl) { <img [src]="coverImageUrl" alt="Cover preview" class="cover-preview" /> }
          <label class="btn btn-secondary">
            {{ coverImageUrl ? 'Replace cover' : 'Upload cover' }}
            <input type="file" accept="image/*" hidden (change)="onCover($event)" />
          </label>
          @if (coverPct() !== null) { <span class="muted mono">{{ coverPct() }}%</span> }
        </div>

        <quill-editor [styles]="editorStyles" [modules]="modules" name="content" [(ngModel)]="contentHtml"
          (ngModelChange)="queueAutosave()" style="display: block; min-height: 320px;"></quill-editor>
      </div>
    </div>
  `,
  styles: `
    .editor-wrap { display: grid; gap: 0.8rem; max-width: 860px; margin: 0 auto; }
    .editor-bar { display: flex; flex-wrap: wrap; gap: 0.6rem; align-items: center; justify-content: space-between; padding: 0.6rem 0.9rem; }
    .bar-actions { display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: center; }
    .dt { width: auto; font-size: 0.8rem; padding: 0.35rem 0.5rem; }
    .editor-card { padding: 1rem; display: grid; gap: 0.8rem; }
    .title-input { font-size: 1.15rem; font-weight: 700; }
    .meta-row { display: flex; gap: 0.6rem; flex-wrap: wrap; }
    .tags-input { flex: 1; }
    .tag-suggestions { display: flex; gap: 0.35rem; flex-wrap: wrap; }
    .cover-row { display: flex; gap: 0.8rem; align-items: center; }
    .cover-preview { width: 180px; border-radius: 8px; }
  `,
})
export class EditorComponent implements OnInit {
  @Input() id?: string;

  private readonly articles = inject(ArticleService);
  readonly auth = inject(AuthService);
  private readonly storage = inject(StorageService);
  private readonly tagService = inject(TagService);
  private readonly toast = inject(ToastService);
  private readonly drafts = inject(EditorDraftService);
  private readonly router = inject(Router);

  readonly modules = QUILL_MODULES;
  readonly editorStyles = { minHeight: '320px' };
  readonly categories = CATEGORIES;

  title = '';
  category = '';
  tagsText = '';
  contentHtml = '';
  coverImageUrl = '';
  scheduleAt = '';

  readonly draftId = signal<string | null>(null);
  readonly status = signal<'draft' | 'published'>('draft');
  readonly publishedAtMs = signal<number | null>(null);
  readonly saving = signal(false);
  readonly lastSaved = signal<Date | null>(null);
  readonly coverPct = signal<number | null>(null);
  readonly popularTags = signal<string[]>([]);

  private autosaveTimer: ReturnType<typeof setTimeout> | null = null;
  private dirty = false;

  constructor() {
    window.addEventListener('beforeunload', (e) => {
      if (this.dirty) e.preventDefault();
    });
  }

  ngOnInit(): void {
    if (this.id) {
      void this.loadExisting(this.id);
    }
    const pending = this.drafts.current();
    if (pending && (!this.id || pending.id === this.id)) {
      this.draftId.set(pending.id);
      this.title = pending.title;
      this.category = pending.category;
      this.tagsText = pending.tags.join(', ');
      this.contentHtml = pending.contentHtml;
      this.coverImageUrl = pending.coverImageUrl;
    }
    void this.tagService.getPopularTags(8).then((tags) => this.popularTags.set(tags.map((t) => t.name)));
  }

  private async loadExisting(id: string): Promise<void> {
    const a = await this.articles.getArticle(id);
    if (!a) {
      this.toast.error('Article not found');
      void this.router.navigate(['/my-posts']);
      return;
    }
    this.draftId.set(id);
    this.status.set(a.status);
    this.publishedAtMs.set(a.publishAt?.toMillis() ?? null);
    this.title = a.title;
    this.category = a.category;
    this.tagsText = a.tags.join(', ');
    this.contentHtml = a.contentHtml;
    this.coverImageUrl = a.coverImageUrl;
  }

  isScheduled(): boolean {
    const ms = this.publishedAtMs();
    return this.status() === 'published' && !!ms && ms > Date.now();
  }

  addTag(tag: string): void {
    const list = tagList(this.tagsText);
    if (!list.includes(tag) && list.length < 5) {
      list.push(tag);
      this.tagsText = list.join(', ');
      this.queueAutosave();
    }
  }

  queueAutosave(): void {
    this.dirty = true;
    if (this.autosaveTimer) clearTimeout(this.autosaveTimer);
    this.autosaveTimer = setTimeout(() => void this.saveNow(true), 2500);
  }

  async saveNow(silent = false): Promise<boolean> {
    const user = this.auth.currentProfile();
    if (!user) {
      this.toast.info('Sign in to write.');
      return false;
    }
    if (!this.title.trim()) {
      if (!silent) this.toast.error('Add a title before saving.');
      return false;
    }
    this.saving.set(true);
    try {
      let id = this.draftId();
      if (!id) {
        id = await this.articles.createDraft(user);
        this.draftId.set(id);
      }
      await this.articles.saveDraft(id, {
        title: this.title,
        contentHtml: this.contentHtml,
        category: this.category,
        tags: tagList(this.tagsText),
        coverImageUrl: this.coverImageUrl,
      });
      this.lastSaved.set(new Date());
      this.dirty = false;
      if (!silent) this.toast.success('Draft saved');
      return true;
    } catch (e) {
      this.toast.error(e instanceof Error ? e.message : 'Save failed');
      return false;
    } finally {
      this.saving.set(false);
    }
  }
  async preview(): Promise<void> {
    if (!(await this.saveNow(true))) return;
    const id = this.draftId();
    if (!id) return;
    this.drafts.set({
      id,
      title: this.title,
      category: this.category,
      tags: tagList(this.tagsText),
      contentHtml: this.contentHtml,
      coverImageUrl: this.coverImageUrl,
      savedAt: Date.now(),
    });
    void this.router.navigate(['/editor/preview']);
  }

  async publishNow(): Promise<void> {
    if (!(await this.saveNow(true))) return;
    const id = this.draftId();
    if (!id) return;
    this.saving.set(true);
    try {
      await this.articles.publish(id);
      this.drafts.set(null);
      this.toast.success('Published!');
      void this.router.navigate(['/articles', id]);
    } catch (e) {
      this.toast.error(e instanceof Error ? e.message : 'Publish failed');
    } finally {
      this.saving.set(false);
    }
  }

  async schedule(): Promise<void> {
    if (!this.scheduleAt) return;
    const when = Timestamp.fromDate(new Date(this.scheduleAt));
    if (when.toMillis() <= Date.now()) {
      this.toast.error('Pick a future time to schedule.');
      return;
    }
    if (!(await this.saveNow(true))) return;
    const id = this.draftId();
    if (!id) return;
    try {
      await this.articles.publish(id, when);
      this.status.set('published');
      this.publishedAtMs.set(when.toMillis());
      this.toast.success('Scheduled — it will appear in the feed automatically.');
      void this.router.navigate(['/my-posts']);
    } catch (e) {
      this.toast.error(e instanceof Error ? e.message : 'Schedule failed');
    }
  }

  async unschedule(): Promise<void> {
    const id = this.draftId();
    if (!id) return;
    try {
      await this.articles.unpublish(id);
      this.status.set('draft');
      this.publishedAtMs.set(null);
      this.toast.info('Moved back to drafts');
    } catch (e) {
      this.toast.error(e instanceof Error ? e.message : 'Unschedule failed');
    }
  }

  async deleteDraft(): Promise<void> {
    const id = this.draftId();
    if (!id) return;
    try {
      await this.articles.deleteDraft(id);
      this.drafts.set(null);
      this.toast.success('Draft deleted');
      void this.router.navigate(['/my-posts']);
    } catch (e) {
      this.toast.error(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  async onCover(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const user = this.auth.currentProfile();
    let id = this.draftId();
    if (!id && user) {
      id = await this.articles.createDraft(user);
      this.draftId.set(id);
    }
    if (!id) return;
    try {
      this.coverPct.set(0);
      this.coverImageUrl = await this.storage.uploadForArticle(file, id, 'cover', (pct) => this.coverPct.set(pct));
      this.queueAutosave();
      this.toast.success('Cover uploaded');
    } catch (e) {
      this.toast.error(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      this.coverPct.set(null);
    }
  }
}

function tagList(raw: string): string[] {
  return raw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 5);
}

