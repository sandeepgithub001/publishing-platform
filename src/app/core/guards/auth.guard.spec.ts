import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { authGuard } from './auth.guard';

function stubAuth(signedIn: boolean) {
  return {
    ready: () => true,
    isSignedIn: () => signedIn,
    isAuthor: () => signedIn,
    isEditor: () => false,
    user: () => (signedIn ? { uid: 'u1' } : null),
  };
}

describe('authGuard (spec §5.2 routing map)', () => {
  const state = { url: '/editor/new' } as RouterStateSnapshot;
  const route = {} as ActivatedRouteSnapshot;

  it('allows signed-in users through', async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: stubAuth(true) }],
    });
    const result = await TestBed.runInInjectionContext(() => authGuard(route, state));
    expect(result).toBe(true);
  });

  it('redirects anonymous users to /login with a returnUrl', async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: stubAuth(false) }],
    });
    const router = TestBed.inject(Router);
    const result = await TestBed.runInInjectionContext(() => authGuard(route, state));
    expect(result instanceof UrlTree).toBe(true);
    const url = router.serializeUrl(result as UrlTree);
    expect(url).toContain('/login');
    expect(url).toContain('returnUrl');
    expect(url).toContain('%2Feditor%2Fnew');
  });

  it('waits for the first auth resolution before deciding', async () => {
    let ready = false;
    const pendingAuth = {
      ready: () => ready,
      isSignedIn: () => true,
      isEditor: () => false,
      user: () => ({ uid: 'u1' }),
    };
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: pendingAuth }],
    });
    setTimeout(() => (ready = true), 60);
    const result = await TestBed.runInInjectionContext(() => authGuard(route, state));
    expect(result).toBe(true);
  });
});
