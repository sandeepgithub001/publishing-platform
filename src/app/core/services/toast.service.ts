import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  kind: 'success' | 'error' | 'info';
  message: string;
}

/** App-wide toast notifications (graceful failure UX, spec §6.5). */
@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);
  private seq = 0;

  show(kind: Toast['kind'], message: string, ttl = 4000): void {
    const toast: Toast = { id: ++this.seq, kind, message: message.slice(0, 200) };
    this.toasts.update((list) => [...list.slice(-4), toast]);
    setTimeout(() => this.dismiss(toast.id), ttl);
  }

  success(message: string): void { this.show('success', message); }
  error(message: string): void { this.show('error', message, 6000); }
  info(message: string): void { this.show('info', message); }

  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }
}
