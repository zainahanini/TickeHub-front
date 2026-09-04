import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  CreateTicketRequest,
  Rating,
  Ticket,
  TicketListItem,
  TicketQuery,
  TicketStatus,
  PagedTickets,
  TicketHistoryEntry,
  TicketWorkflowAction,
  UpdateTicketRequest,
  ChangeTicketStatusRequest,
} from '../models';

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

  mine(): Observable<TicketListItem[]> {
    return this.http.get<unknown>(`${this.base}/mine`).pipe(
      map((response) => this.extractItems(response)),
    );
  }

  listPage(query?: TicketQuery): Observable<PagedTickets> {
    let params = new HttpParams();
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key, String(value));
        }
      }
    }
    return this.http.get<unknown>(this.base, { params }).pipe(
      map((response) => this.normalizePage(response)),
    );
  }

  getById(id: number): Observable<Ticket> {
    return this.http.get<Ticket>(`${this.base}/${id}`);
  }

  workflow(id: number): Observable<TicketWorkflowAction[] | { allowedActions?: TicketWorkflowAction[] }> {
    return this.http.get<TicketWorkflowAction[] | { allowedActions?: TicketWorkflowAction[] }>(`${this.base}/${id}/workflow`);
  }

  history(id: number): Observable<TicketHistoryEntry[]> {
    return this.http.get<TicketHistoryEntry[]>(`${this.base}/${id}/history`);
  }

  create(ticket: CreateTicketRequest): Observable<Ticket> {
    return this.http.post<Ticket>(this.base, ticket);
  }

  update(id: number, ticket: UpdateTicketRequest): Observable<Ticket> {
    return this.http.put<Ticket>(`${this.base}/${id}`, ticket);
  }

  updateStatus(id: number, request: ChangeTicketStatusRequest): Observable<Ticket> {
    return this.http.patch<Ticket>(`${this.base}/${id}/status`, request);
  }

  reopen(id: number, reason?: string, rowVersion?: string | null): Observable<Ticket> {
    return this.http.post<Ticket>(`${this.base}/${id}/reopen`, { reason, rowVersion });
  }

  assign(id: number, agentId: number): Observable<Ticket> {
  assign(id: number, agentId: number): Observable<Ticket> {
    return this.http.patch<Ticket>(`${this.base}/${id}/assign`, { agentId });
  }

  rate(id: number, score: number, comment?: string): Observable<Rating> {
    return this.http.post<Rating>(`${this.base}/${id}/rating`, { score, comment });
  }

  getRating(id: number): Observable<Rating | null> {
    return this.http.get<Rating | null>(`${this.base}/${id}/rating`);
  }

  private extractItems(response: unknown): TicketListItem[] {
    if (Array.isArray(response)) {
      return response as TicketListItem[];
    }
    if (response && typeof response === 'object') {
      const data = response as Record<string, unknown>;
      const items = data['items'] ?? data['data'] ?? data['tickets'];
      return Array.isArray(items) ? items as TicketListItem[] : [];
    }
    return [];
  }

  private normalizePage(response: unknown): PagedTickets {
    const data = response && typeof response === 'object' ? response as Record<string, unknown> : {};
    const items = this.extractItems(response);
    const totalCount = Number(data['totalCount'] ?? data['TotalCount'] ?? items.length);
    const page = Number(data['page'] ?? data['Page'] ?? 1);
    const pageSize = Number((data['pageSize'] ?? data['PageSize'] ?? items.length) || 10);
    return { items, totalCount, page, pageSize };
  }
}
