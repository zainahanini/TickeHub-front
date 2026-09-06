import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { ChatService } from '../core/services/chat.service';
import { CurrentUserService } from '../core/services/current-user.service';
import { NotificationService } from '../core/services/notification.service';
import { AppNotification, UserType } from '../core/models';

@Component({
  selector: 'app-account-shell',
  standalone: true,
  imports: [DatePipe, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './account-shell.component.html',
  styleUrl: './account-shell.component.css',
})
export class AccountShellComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);
  private readonly chat = inject(ChatService);
  private readonly currentUser = inject(CurrentUserService);
  readonly user = toSignal(this.currentUser.user$, { initialValue: null });
  readonly unreadCount = signal(0);
  readonly chatUnreadCount = signal(0);
  readonly notificationPanelOpen = signal(false);
  readonly notificationItems = signal<AppNotification[]>([]);
  readonly notificationsLoading = signal(false);
  readonly notificationsError = signal<string | null>(null);
  readonly notificationPendingId = signal<number | null>(null);
  readonly markAllNotificationsPending = signal(false);

  constructor() {
    this.notifications.unreadCount$
      .pipe(takeUntilDestroyed())
      .subscribe((count) => this.unreadCount.set(count));
    this.chat.unreadCount$
      .pipe(takeUntilDestroyed())
      .subscribe((count) => this.chatUnreadCount.set(count));
    this.notifications.unreadCount().subscribe();
    void this.chat.connect().catch(() => undefined);
    this.chat.notifications$
      .pipe(takeUntilDestroyed())
      .subscribe((notification) => {
        this.notifications.applyIncoming(notification);
        this.notificationItems.update((items) => [notification, ...items.filter((item) => item.id !== notification.id)]);
      });
    this.chat.conversations().subscribe({ error: () => undefined });
  }

  logout(): void {
    void this.chat.disconnect();
    this.auth.logout().subscribe(() => {
      void this.router.navigate(['/login']);
    });
  }

  canSeeReportProblem(): boolean {
    return this.currentUser.hasRole(UserType.Citizen);
  }

  canSeeMyTickets(): boolean {
    return this.currentUser.hasRole(UserType.Citizen);
  }

  canSeeTicketQueue(): boolean {
    return this.currentUser.hasRole(UserType.Agent, UserType.Supervisor, UserType.Admin);
  }

  canSeeTeam(): boolean {
    return this.currentUser.hasRole(UserType.Supervisor, UserType.Admin);
  }

  canSeeAdminLinks(): boolean {
    return this.currentUser.hasRole(UserType.Admin);
  }

  toggleNotifications(): void {
    const nextOpen = !this.notificationPanelOpen();
    this.notificationPanelOpen.set(nextOpen);
    if (nextOpen && this.notificationItems().length === 0) {
      this.loadNotifications();
    }
  }

  loadNotifications(): void {
    this.notificationsLoading.set(true);
    this.notificationsError.set(null);
    this.notifications.list().subscribe({
      next: (items) => {
        this.notificationItems.set(items);
        this.notificationsLoading.set(false);
      },
      error: () => {
        this.notificationsError.set('Could not load notifications.');
        this.notificationsLoading.set(false);
      },
    });
  }

  markNotificationRead(notification: AppNotification): void {
    if (notification.isRead || this.notificationPendingId()) {
      return;
    }
    this.notificationPendingId.set(notification.id);
    this.notifications.markRead(notification.id).subscribe({
      next: () => {
        this.notificationItems.update((items) => items.map((item) => item.id === notification.id ? { ...item, isRead: true } : item));
        this.notificationPendingId.set(null);
      },
      error: () => {
        this.notificationsError.set('Could not mark notification as read.');
        this.notificationPendingId.set(null);
      },
    });
  }

  markAllNotificationsRead(): void {
    if (this.markAllNotificationsPending()) {
      return;
    }
    this.markAllNotificationsPending.set(true);
    this.notifications.markAllRead().subscribe({
      next: () => {
        this.notificationItems.update((items) => items.map((item) => ({ ...item, isRead: true })));
        this.markAllNotificationsPending.set(false);
      },
      error: () => {
        this.notificationsError.set('Could not mark notifications as read.');
        this.markAllNotificationsPending.set(false);
      },
    });
  }
}
