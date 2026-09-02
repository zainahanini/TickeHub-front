import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Rating, Ticket, TicketListItem, TicketQuery, TicketStatus } from '../models';

@Injectable({ providedIn: 'root' })
export class TicketService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/tickets`;

  list(query?: TicketQuery): Observable<TicketListItem[]> {
    let params = new HttpParams();
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key, String(value));
        }
      }
    }
    return this.http.get<TicketListItem[]>(this.base, { params });
  }

  getById(id: number): Observable<Ticket> {
    return this.http.get<Ticket>(`${this.base}/${id}`);
  }

  create(ticket: Partial<Ticket>): Observable<Ticket> {
    return this.http.post<Ticket>(this.base, ticket);
  }

  update(id: number, ticket: Partial<Ticket>): Observable<Ticket> {
    return this.http.put<Ticket>(`${this.base}/${id}`, ticket);
  }

  updateStatus(id: number, status: TicketStatus): Observable<Ticket> {
    return this.http.patch<Ticket>(`${this.base}/${id}/status`, { status });
  }

  assign(id: number, agentId: number): Observable<Ticket> {
    return this.http.patch<Ticket>(`${this.base}/${id}/assign`, { agentId });
  }

  rate(id: number, score: number, comment?: string): Observable<Rating> {
    return this.http.post<Rating>(`${this.base}/${id}/rating`, { score, comment });
  }
}
