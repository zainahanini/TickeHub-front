import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Comment } from '../models';

@Injectable({ providedIn: 'root' })
export class CommentService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiBaseUrl;

  getByTicket(ticketId: number): Observable<Comment[]> {
    return this.http.get<Comment[]>(`${this.api}/tickets/${ticketId}/comments`);
  }

  create(ticketId: number, body: string, isInternal = false): Observable<Comment> {
    return this.http.post<Comment>(`${this.api}/tickets/${ticketId}/comments`, { body, isInternal });
  }

  update(ticketId: number, commentId: number, body: string, isInternal = false): Observable<Comment> {
    return this.http.put<Comment>(`${this.api}/tickets/${ticketId}/comments/${commentId}`, {
      body,
      isInternal,
    });
  }

  delete(ticketId: number, commentId: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/tickets/${ticketId}/comments/${commentId}`);
  }
}
