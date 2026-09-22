import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { ownerGuard } from './core/guards/owner.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'home' },
  { path: 'home', title: 'PubHub — Latest', loadComponent: () => import('./features/home/home.component').then((m) => m.HomeComponent) },
  { path: 'discover', title: 'PubHub — Discover', loadComponent: () => import('./features/discover/discover.component').then((m) => m.DiscoverComponent) },
  { path: 'articles/:id', title: 'PubHub — Article', loadComponent: () => import('./features/article-detail/article-detail.component').then((m) => m.ArticleDetailComponent) },
  { path: 'authors', title: 'PubHub — Authors', loadComponent: () => import('./features/authors/author-directory.component').then((m) => m.AuthorDirectoryComponent) },
  { path: 'authors/:id', title: 'PubHub — Author', loadComponent: () => import('./features/authors/author-profile.component').then((m) => m.AuthorProfileComponent) },
  { path: 'editor/preview', canActivate: [authGuard], title: 'PubHub — Preview', loadComponent: () => import('./features/editor/preview.component').then((m) => m.PreviewComponent) },
  { path: 'editor', canActivate: [authGuard], title: 'PubHub — Write', loadComponent: () => import('./features/editor/editor.component').then((m) => m.EditorComponent) },
  { path: 'editor/:id', canActivate: [authGuard, ownerGuard], title: 'PubHub — Edit', loadComponent: () => import('./features/editor/editor.component').then((m) => m.EditorComponent) },
  { path: 'my-posts', canActivate: [authGuard], title: 'PubHub — My Posts', loadComponent: () => import('./features/my-posts/my-posts.component').then((m) => m.MyPostsComponent) },
  { path: 'login', title: 'PubHub — Sign in', loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent) },
  { path: 'profile', canActivate: [authGuard], title: 'PubHub — Profile', loadComponent: () => import('./features/auth/profile.component').then((m) => m.ProfileComponent) },
  { path: '**', title: 'PubHub — Not found', loadComponent: () => import('./features/not-found.component').then((m) => m.NotFoundComponent) },
];

