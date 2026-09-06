import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AppNotification } from '../models';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/notifications`;
  private readonly unreadCountSubject = new BehaviorSubject(0);
  readonly unreadCount$ = this.unreadCountSubject.asObservable();

  list(): Observable<AppNotification[]> {
    return this.http.get<unknown>(this.base).pipe(
      map((response) => this.extractNotifications(response)),
      tap((items) => this.unreadCountSubject.next(items.filter((item) => !item.isRead).length)),
    );
  }

  unreadCount(): Observable<number> {
    return this.http.get<number | { count?: number; unreadCount?: number }>(`${this.base}/unread-count`).pipe(
      map((response) => typeof response === 'number' ? response : Number(response.count ?? response.unreadCount ?? 0)),
      tap((count) => this.unreadCountSubject.next(count)),
    );
  }

  markRead(id: number): Observable<void> {
    return this.http.post<void>(`${this.base}/${id}/read`, {}).pipe(
      tap(() => this.unreadCountSubject.next(Math.max(0, this.unreadCountSubject.value - 1))),
    );
  }

  markAllRead(): Observable<void> {
    return this.http.post<void>(`${this.base}/read-all`, {}).pipe(
      tap(() => this.unreadCountSubject.next(0)),
    );
  }

  applyIncoming(notification: AppNotification): void {
    const normalized = this.normalizeNotification(notification);
    if (!normalized.isRead) {
      this.unreadCountSubject.next(this.unreadCountSubject.value + 1);
    }
  }

  private extractNotifications(response: unknown): AppNotification[] {
    if (Array.isArray(response)) {
      return response.map((item) => this.normalizeNotification(item));
    }
    if (response && typeof response === 'object') {
      const data = response as Record<string, unknown>;
      const items = data['items'] ?? data['data'] ?? data['notifications'];
      return Array.isArray(items) ? items.map((item) => this.normalizeNotification(item)) : [];
    }
    return [];
  }

  private normalizeNotification(item: unknown): AppNotification {
    const data = item && typeof item === 'object' ? item as Record<string, unknown> : {};
    return {
      id: Number(data['id']),
      userId: Number(data['userId'] ?? 0),
      title: String(data['title'] ?? data['subject'] ?? 'Notification'),
      body: String(data['body'] ?? data['message'] ?? data['description'] ?? ''),
      isRead: Boolean(data['isRead'] ?? data['read'] ?? false),
      createdAt: String(data['createdAt'] ?? data['createdDate'] ?? data['sentAt'] ?? ''),
      ticketId: data['ticketId'] == null ? null : Number(data['ticketId']),
    };
  }
}
