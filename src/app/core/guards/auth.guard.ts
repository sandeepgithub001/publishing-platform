import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Wait (max ~4 s) for the first onAuthStateChanged resolution. */
export async function waitForAuthReady(auth: AuthService): Promise<void> {
  const deadline = Date.now() + 4000;
  while (!auth.ready() && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 50));
  }
}

/** Signed-in gate → /login?returnUrl=<attempted> (spec §5.2 routing map). */
export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await waitForAuthReady(auth);
  if (auth.isSignedIn()) return true;
  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};
