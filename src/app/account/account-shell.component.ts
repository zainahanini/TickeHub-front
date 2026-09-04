import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { CurrentUserService } from '../core/services/current-user.service';
import { NotificationService } from '../core/services/notification.service';

@Component({
  selector: 'app-account-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './account-shell.component.html',
  styleUrl: './account-shell.component.css',
})
export class AccountShellComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);
  readonly user = toSignal(inject(CurrentUserService).user$, { initialValue: null });
  readonly unreadCount = signal(0);

  constructor() {
    this.notifications.unreadCount$
      .pipe(takeUntilDestroyed())
      .subscribe((count) => this.unreadCount.set(count));
    this.notifications.unreadCount().subscribe();
  }

  logout(): void {
    this.auth.logout().subscribe(() => {
      void this.router.navigate(['/login']);
    });
  }
}
