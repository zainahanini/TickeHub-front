import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AppNotification } from '../core/models';
import { NotificationService } from '../core/services/notification.service';
import { apiErrorMessage } from '../core/api-error';

@Component({ selector: 'app-notifications', standalone: true, imports: [DatePipe, RouterLink], templateUrl: './notifications.component.html', styleUrl: './notifications.component.css' })
export class NotificationsComponent {
  private readonly service = inject(NotificationService);
  readonly notifications = signal<AppNotification[]>([]);
  readonly error = signal<string | null>(null);
  readonly loading = signal(true);
  readonly pendingId = signal<number | null>(null);
  readonly markAllPending = signal(false);

  constructor() { this.load(); }
  load(): void { this.service.list().subscribe({ next: (items) => { this.notifications.set(items); this.loading.set(false); }, error: (error: unknown) => { this.error.set(apiErrorMessage(error, 'Could not load notifications.')); this.loading.set(false); } }); }
  markRead(item: AppNotification): void { if (item.isRead) return; this.pendingId.set(item.id); this.service.markRead(item.id).subscribe({ next: () => { this.notifications.update((items) => items.map((current) => current.id === item.id ? { ...current, isRead: true } : current)); this.pendingId.set(null); }, error: (error: unknown) => { this.error.set(apiErrorMessage(error, 'Could not mark notification as read.')); this.pendingId.set(null); } }); }
  markAllRead(): void {
    if (this.markAllPending()) return;
    this.markAllPending.set(true);
    this.service.markAllRead().subscribe({
      next: () => {
        this.notifications.update((items) => items.map((item) => ({ ...item, isRead: true })));
        this.markAllPending.set(false);
      },
      error: (error: unknown) => {
        this.error.set(apiErrorMessage(error, 'Could not mark notifications as read.'));
        this.markAllPending.set(false);
      },
    });
  }
}
