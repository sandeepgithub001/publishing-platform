import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { StorageService } from '../../core/services/storage.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-profile',
  imports: [FormsModule],
  template: `
    <div class="profile-wrap">
      <div class="card profile-card">
        <h1>Your profile</h1>
        <div class="avatar-row">
          <img class="avatar" [src]="photoUrl()" alt="Avatar" referrerpolicy="no-referrer" />
          <div>
            <label class="btn btn-secondary">
              Change avatar
              <input type="file" accept="image/*" hidden (change)="onAvatar($event)" />
            </label>
            @if (uploadPct() !== null) {
              <div class="muted upload-status">Uploading… {{ uploadPct() }}%</div>
            }
          </div>
        </div>

        <form (ngSubmit)="save()" #f="ngForm">
          <label>Display name
            <input class="input" name="displayName" [(ngModel)]="displayName" required maxlength="80" />
          </label>
          <label>Bio <span class="muted">({{ bio.length }}/500)</span>
            <textarea class="textarea" name="bio" [(ngModel)]="bio" rows="4" maxlength="500"></textarea>
          </label>
          <button class="btn" type="submit" [disabled]="busy() || !displayName.trim()">Save profile</button>
          <p class="muted role-note">Role: <strong>{{ auth.role() ?? 'reader' }}</strong> — authors can write; editors moderate.</p>
        </form>
      </div>
    </div>
  `,
  styles: `
    .profile-wrap { display: grid; place-items: center; padding: 2rem 1rem; }
    .profile-card { max-width: 480px; width: 100%; padding: 1.6rem; display: grid; gap: 1rem; }
    h1 { margin: 0; font-size: 1.3rem; }
    label { display: grid; gap: 0.25rem; font-size: 0.85rem; margin-bottom: 0.8rem; }
    .avatar-row { display: flex; gap: 1rem; align-items: center; }
    .avatar { width: 64px; height: 64px; border-radius: 50%; }
    .upload-status { font-size: 0.8rem; }
    .role-note { font-size: 0.8rem; }
  `,
})
export class ProfileComponent {
  readonly auth = inject(AuthService);
  private readonly storage = inject(StorageService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly displayName = this.auth.currentProfile()?.displayName ?? '';
  bio = this.auth.currentProfile()?.bio ?? '';
  readonly busy = signal(false);
  readonly uploadPct = signal<number | null>(null);

  readonly photoUrl = computed(
    () => this.auth.currentProfile()?.photoURL || 'https://i.pravatar.cc/96?u=pubhub-guest',
  );

  async onAvatar(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    const uid = this.auth.user()?.uid;
    if (!file || !uid) return;
    try {
      this.uploadPct.set(0);
      const url = await this.storage.uploadAvatar(file, uid, (pct) => this.uploadPct.set(pct));
      await this.auth.updateProfile({ photoURL: url });
      this.toast.success('Avatar updated');
    } catch (e) {
      this.toast.error(e instanceof Error ? e.message : 'Avatar upload failed');
    } finally {
      this.uploadPct.set(null);
    }
  }

  async save(): Promise<void> {
    this.busy.set(true);
    try {
      await this.auth.updateProfile({ displayName: this.displayName.trim(), bio: this.bio.trim() });
      this.toast.success('Profile saved');
      void this.router.navigate(['/home']);
    } catch (e) {
      this.toast.error(e instanceof Error ? e.message : 'Save failed');
    } finally {
      this.busy.set(false);
    }
  }
}
