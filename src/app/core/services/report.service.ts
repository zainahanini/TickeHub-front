import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AgentPerformance, CategorySatisfaction, DailyVolume, ReportFilters, TicketStatistics, TicketStatusCount } from '../models';

@Injectable({ providedIn: 'root' })
export class ReportService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/reports`;

  ticketsByStatus(): Observable<TicketStatusCount[]> {
    return this.http.get<TicketStatusCount[]>(`${this.base}/tickets-by-status`);
  }

  agentPerformance(): Observable<AgentPerformance[]> {
    return this.http.get<AgentPerformance[]>(`${this.base}/agent-performance`);
  }

  ticketStatistics(filters?: ReportFilters): Observable<TicketStatistics> {
    return this.http.get<unknown>(`${environment.apiBaseUrl}/tickets/statistics`, { params: this.params(filters) }).pipe(
      map((response) => this.normalizeStatistics(response)),
    );
  }

  categorySatisfaction(filters?: ReportFilters): Observable<CategorySatisfaction[]> {
    return this.http.get<unknown>(`${this.base}/category-satisfaction`, { params: this.params(filters) }).pipe(
      map((response) => this.extractItems(response) as CategorySatisfaction[]),
    );
  }

  dailyVolume(filters?: ReportFilters): Observable<DailyVolume[]> {
    return this.http.get<unknown>(`${this.base}/daily-volume`, { params: this.params(filters) }).pipe(
      map((response) => this.extractItems(response) as DailyVolume[]),
    );
  }

  private params(filters?: ReportFilters): HttpParams {
    let params = new HttpParams();
    if (!filters) {
      return params;
    }
    if (filters.from) params = params.set('from', filters.from);
    if (filters.to) params = params.set('to', filters.to);
    if (filters.departmentId) params = params.set('departmentId', String(filters.departmentId));
    return params;
  }

  private normalizeStatistics(response: unknown): TicketStatistics {
    const data = response && typeof response === 'object' ? response as Record<string, unknown> : {};
    return {
      openTickets: Number(data['openTickets'] ?? data['openTicketCount'] ?? data['open'] ?? 0),
      overdueTickets: Number(data['overdueTickets'] ?? data['overdueTicketCount'] ?? data['overdue'] ?? 0),
      unassignedTickets: Number(data['unassignedTickets'] ?? data['unassignedTicketCount'] ?? data['unassigned'] ?? 0),
    };
  }

  private extractItems(response: unknown): unknown[] {
    if (Array.isArray(response)) {
      return response;
    }
    if (response && typeof response === 'object') {
      const data = response as Record<string, unknown>;
      const items = data['items'] ?? data['data'] ?? data['results'];
      return Array.isArray(items) ? items : [];
    }
    return [];
  }
}
