import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { SeedService } from '../../core/services/seed.service';
import { ToastService } from '../../core/services/toast.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  template: `
    <div class="login-wrap">
      <div class="card login-card">
        <h1>Welcome to PubHub</h1>
        <p class="muted">Sign in to comment, like, and write. Reading works without an account.</p>

        <button class="btn google" (click)="signIn('google')" [disabled]="busy()">
          <span aria-hidden="true">G</span> Continue with Google
        </button>
        <button class="btn facebook" (click)="signIn('facebook')" [disabled]="busy()">
          <span aria-hidden="true">f</span> Continue with Facebook
        </button>

        <div class="divider"><span>or demo account</span></div>

        <form (ngSubmit)="demoSignIn()">
          <label>Email
            <input class="input" type="email" name="email" [(ngModel)]="demoEmail" placeholder="author&#64;demo.com" required />
          </label>
          <label>Password
            <input class="input" type="password" name="password" [(ngModel)]="demoPassword" placeholder="••••••••" required />
          </label>
          <button class="btn" type="submit" [disabled]="busy()">Sign in</button>
        </form>

        <p class="muted hint">
          Demo: <code>author@demo.com / Author@123!</code> ·
          <code>editor@demo.com / Editor@123!</code>
        </p>

        @if (isDev) {
          <div class="dev-tools">
            <button class="btn btn-ghost" (click)="runSeed()" [disabled]="busy()">Run seeder</button>
            <button class="btn btn-ghost" (click)="applyPicks()" [disabled]="busy()">Apply editor picks</button>
          </div>
        }
      </div>
    </div>
  `,
  styles: `
    .login-wrap { display: grid; place-items: center; padding: 3rem 1rem; }
    .login-card { max-width: 400px; width: 100%; padding: 1.6rem; display: grid; gap: 0.75rem; }
    h1 { margin: 0; font-size: 1.3rem; }
    label { display: grid; gap: 0.25rem; font-size: 0.85rem; }
    .google { background: #fff; color: var(--text); border-color: var(--border); }
    .facebook { background: #1877f2; }
    .divider { display: flex; align-items: center; gap: 0.75rem; color: var(--text-muted); font-size: 0.78rem; margin: 0.4rem 0; }
    .divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: var(--border); }
    .hint { font-size: 0.75rem; }
    .dev-tools { border-top: 1px dashed var(--border); padding-top: 0.75rem; display: flex; gap: 0.5rem; }
  `,
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly seed = inject(SeedService);

  readonly isDev = !environment.production;
  readonly busy = signal(false);
  demoEmail = '';
  demoPassword = '';

  async signIn(provider: 'google' | 'facebook'): Promise<void> {
    this.busy.set(true);
    try {
      if (provider === 'google') await this.auth.signInWithGoogle();
      else await this.auth.signInWithFacebook();
      this.navigateBack();
    } catch (e) {
      this.toast.error(friendlyAuthError(e));
    } finally {
      this.busy.set(false);
    }
  }

  async demoSignIn(): Promise<void> {
    this.busy.set(true);
    try {
      await this.auth.signInDemo(this.demoEmail.trim(), this.demoPassword);
      this.navigateBack();
    } catch {
      this.toast.error('Sign-in failed — check the demo credentials.');
    } finally {
      this.busy.set(false);
    }
  }

  async runSeed(): Promise<void> {
    this.busy.set(true);
    this.toast.info('Seeding demo content…');
    try {
      this.toast.show('info', await this.seed.run(), 8000);
    } catch (e) {
      this.toast.error(seedError(e));
    } finally {
      this.busy.set(false);
    }
  }

  async applyPicks(): Promise<void> {
    this.busy.set(true);
    try {
      this.toast.show('info', await this.seed.ensureFeaturedApplied(), 8000);
    } catch (e) {
      this.toast.error(seedError(e));
    } finally {
      this.busy.set(false);
    }
  }

  private navigateBack(): void {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    void this.router.navigateByUrl(returnUrl ?? '/home');
  }
}

function friendlyAuthError(e: unknown): string {
  const code = (e as { code?: string }).code ?? '';
  if (code.includes('popup-blocked')) return 'Popup blocked — allow popups for this site and retry.';
  if (code.includes('cancelled-popup-request') || code.includes('popup-closed-by-user')) return 'Sign-in cancelled.';
  if (code.includes('operation-not-allowed')) return 'This provider is not enabled in the Firebase console yet.';
  if (code.includes('unauthorized-domain')) return 'This domain is not authorized in Firebase Auth settings.';
  return 'Sign-in failed. Please retry.';
}

function seedError(e: unknown): string {
  return `Seed failed: ${e instanceof Error ? e.message : String(e)}`.slice(0, 190);
}
