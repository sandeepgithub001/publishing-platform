import { ApplicationConfig, provideBrowserGlobalErrorListeners, ErrorHandler, inject } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';
import { ToastService } from './core/services/toast.service';

/** Global error handler → toast + console (graceful failure, spec §6.5). */
class AppErrorHandler implements ErrorHandler {
  private readonly toast = inject(ToastService);
  handleError(error: unknown): void {
    console.error(error);
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes('FirebaseError')) this.toast.error(message.slice(0, 140));
  }
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    { provide: ErrorHandler, useClass: AppErrorHandler },
  ],
};

