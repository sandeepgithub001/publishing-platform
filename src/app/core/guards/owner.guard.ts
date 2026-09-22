import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ArticleService } from '../services/article.service';
import { waitForAuthReady } from './auth.guard';

/** /editor/:id only for the article's owner or an editor (spec §5.2). */
export const ownerGuard: CanActivateFn = async (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const articleService = inject(ArticleService);
  await waitForAuthReady(auth);

  if (!auth.isSignedIn()) {
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: route.url.map((s) => s.path).join('/') } });
  }
  const id = route.paramMap.get('id');
  if (!id) return true; // /editor (create) — ownership checked at write time

  const article = await articleService.getArticle(id);
  if (!article) return router.createUrlTree(['/home']);
  if (auth.isEditor() || article.authorId === auth.user()?.uid) return true;
  return router.createUrlTree(['/articles', id]);
};
