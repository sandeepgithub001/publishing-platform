import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  imports: [RouterLink],
  template: `
    <footer class="footer">
      <div class="container footer-inner">
        <span>Online Publishing Platform — a demo publishing platform built with Angular + Firebase.</span>
        <nav>
          <a routerLink="/home">Home</a>
          <a routerLink="/discover">Discover</a>
          <a routerLink="/authors">Authors</a>
        </nav>
      </div>
    </footer>
  `,
  styles: `
    .footer { border-top: 1px solid var(--border); background: var(--surface); padding: 1.2rem 0; margin-top: 2rem; }
    .footer-inner { display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center; justify-content: space-between; color: var(--text-muted); font-size: 0.85rem; }
    .footer nav { display: flex; gap: 0.9rem; }
  `,
})
export class FooterComponent {}
