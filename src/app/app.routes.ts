import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { ownerGuard } from './core/guards/owner.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'home' },
  { path: 'home', title: 'Online Publishing Platform — Latest', loadComponent: () => import('./features/home/home.component').then((m) => m.HomeComponent) },
  { path: 'discover', title: 'Online Publishing Platform — Discover', loadComponent: () => import('./features/discover/discover.component').then((m) => m.DiscoverComponent) },
  { path: 'articles/:id', title: 'Online Publishing Platform — Article', loadComponent: () => import('./features/article-detail/article-detail.component').then((m) => m.ArticleDetailComponent) },
  { path: 'authors', title: 'Online Publishing Platform — Authors', loadComponent: () => import('./features/authors/author-directory.component').then((m) => m.AuthorDirectoryComponent) },
  { path: 'authors/:id', title: 'Online Publishing Platform — Author', loadComponent: () => import('./features/authors/author-profile.component').then((m) => m.AuthorProfileComponent) },
  { path: 'editor/preview', canActivate: [authGuard], title: 'Online Publishing Platform — Preview', loadComponent: () => import('./features/editor/preview.component').then((m) => m.PreviewComponent) },
  { path: 'editor', canActivate: [authGuard], title: 'Online Publishing Platform — Write', loadComponent: () => import('./features/editor/editor.component').then((m) => m.EditorComponent) },
  { path: 'editor/:id', canActivate: [authGuard, ownerGuard], title: 'Online Publishing Platform — Edit', loadComponent: () => import('./features/editor/editor.component').then((m) => m.EditorComponent) },
  { path: 'my-posts', canActivate: [authGuard], title: 'Online Publishing Platform — My Posts', loadComponent: () => import('./features/my-posts/my-posts.component').then((m) => m.MyPostsComponent) },
  { path: 'login', title: 'Online Publishing Platform — Sign in', loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent) },
  { path: 'profile', canActivate: [authGuard], title: 'Online Publishing Platform — Profile', loadComponent: () => import('./features/auth/profile.component').then((m) => m.ProfileComponent) },
  { path: '**', title: 'Online Publishing Platform — Not found', loadComponent: () => import('./features/not-found.component').then((m) => m.NotFoundComponent) },
];

