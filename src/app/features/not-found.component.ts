import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  template: `
    <div class="nf">
      <h1>404</h1>
      <p class="muted">That page wandered off. It happens to the best of drafts.</p>
      <a class="btn" routerLink="/home">Back to the feed</a>
    </div>
  `,
  styles: `
    .nf { display: grid; place-items: center; gap: 0.5rem; padding: 5rem 1rem; text-align: center; }
    h1 { font-size: 4rem; margin: 0; }
  `,
})
export class NotFoundComponent {}
