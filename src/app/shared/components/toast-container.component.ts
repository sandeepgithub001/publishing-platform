import { Component, inject } from '@angular/core';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-toast-container',
  template: `
    <div class="toast-stack" aria-live="polite">
      @for (t of toast.toasts(); track t.id) {
        <div class="toast" [class]="'toast-' + t.kind" (click)="toast.dismiss(t.id)" role="status">
          {{ t.message }}
        </div>
      }
    </div>
  `,
  styles: `
    .toast-stack { position: fixed; right: 1rem; bottom: 1rem; display: grid; gap: 0.5rem; z-index: 100; max-width: 22rem; }
    .toast { padding: 0.65rem 1rem; border-radius: 10px; color: #fff; font-size: 0.875rem; cursor: pointer; box-shadow: var(--shadow); }
    .toast-success { background: #16a34a; }
    .toast-error { background: #dc2626; }
    .toast-info { background: #2563eb; }
  `,
})
export class ToastContainerComponent {
  readonly toast = inject(ToastService);
}
