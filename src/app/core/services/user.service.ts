import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User, UserType } from '../models';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/users`;

  list(): Observable<User[]> {
    return this.http.get<User[]>(this.base);
  }

  getById(id: number): Observable<User> {
    return this.http.get<User>(`${this.base}/${id}`);
  }

  update(id: number, user: Partial<User>): Observable<User> {
    return this.http.put<User>(`${this.base}/${id}`, user);
  }

  updateRole(id: number, userType: UserType): Observable<User> {
    return this.http.patch<User>(`${this.base}/${id}/role`, { userType });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
