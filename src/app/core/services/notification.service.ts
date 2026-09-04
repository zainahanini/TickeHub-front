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
    return this.http.get<AppNotification[]>(this.base).pipe(
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
}
