import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AgentPerformance, TicketStatusCount } from '../models';

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
}
