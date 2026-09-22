import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './shared/components/navbar.component';
import { FooterComponent } from './shared/components/footer.component';
import { ToastContainerComponent } from './shared/components/toast-container.component';

@Component({
  imports: [RouterOutlet, NavbarComponent, FooterComponent, ToastContainerComponent],
  selector: 'app-root',
  styleUrl: './app.scss',
  template: `
    <app-navbar />
    <main><router-outlet /></main>
    <app-footer />
    <app-toast-container />
  `,
})
export class App {
  protected readonly title = signal('Online Publishing Platform');
}

