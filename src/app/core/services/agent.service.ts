import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Agent, AgentSkill, CreateAgentRequest, UpdateAgentProfileRequest, UpdateAgentRequest } from '../models';

type AgentListResponse = Agent[] | { items?: Agent[] };

@Injectable({ providedIn: 'root' })
export class AgentService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/agents`;

  list(departmentId?: number | null): Observable<Agent[]> {
    const options = departmentId
      ? { params: new HttpParams().set('departmentId', String(departmentId)) }
      : {};
    return this.http.get<AgentListResponse>(this.base, options).pipe(
      map((response) => Array.isArray(response) ? response : response.items ?? []),
    );
  }

  getById(id: number): Observable<Agent> {
    return this.http.get<Agent>(`${this.base}/${id}`);
  }

  skills(): Observable<AgentSkill[]> {
    return this.http.get<AgentSkill[]>(`${this.base}/skills`);
  }

  create(request: CreateAgentRequest): Observable<Agent> {
    return this.http.post<Agent>(this.base, request);
  }

  update(id: number, request: UpdateAgentRequest): Observable<Agent> {
    return this.http.put<Agent>(`${this.base}/${id}`, request);
  }

  updateProfile(id: number, request: UpdateAgentProfileRequest): Observable<Agent> {
    return this.http.put<Agent>(`${this.base}/${id}/profile`, request);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  updateAvailability(id: number, isAvailable: boolean): Observable<Agent> {
    return this.http.patch<Agent>(`${this.base}/${id}/availability`, { isAvailable });
  }

  autoAssign(ticketId: number): Observable<Agent> {
    return this.http.post<Agent>(`${environment.apiBaseUrl}/tickets/${ticketId}/auto-assign`, {});
  }
}
