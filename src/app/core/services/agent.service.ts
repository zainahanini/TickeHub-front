import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Agent, AgentSkill, CreateAgentRequest, UpdateAgentProfileRequest, UpdateAgentRequest } from '../models';

@Injectable({ providedIn: 'root' })
export class AgentService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/agents`;

  list(): Observable<Agent[]> {
    return this.http.get<Agent[]>(this.base);
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
