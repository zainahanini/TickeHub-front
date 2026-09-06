import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { User } from '../models';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/users`;

  list(): Observable<User[]> {
    return this.http.get<unknown>(this.base).pipe(
      map((response) => this.extractItems(response)),
    );
  }

  getById(id: number): Observable<User> {
    return this.http.get<User>(`${this.base}/${id}`);
  }

  create(user: Partial<User> & { password?: string }): Observable<User> {
    return this.http.post<User>(this.base, user);
  }

  update(id: number, user: Partial<User>): Observable<User> {
    return this.http.put<User>(`${this.base}/${id}`, user);
  }

  deactivate(id: number): Observable<void> {
    return this.http.post<void>(`${this.base}/${id}/deactivate`, {});
  }

  private extractItems(response: unknown): User[] {
    if (Array.isArray(response)) {
      return response as User[];
    }
    if (response && typeof response === 'object') {
      const data = response as Record<string, unknown>;
      const items = data['items'] ?? data['data'] ?? data['users'];
      return Array.isArray(items) ? items as User[] : [];
    }
    return [];
  }
}
