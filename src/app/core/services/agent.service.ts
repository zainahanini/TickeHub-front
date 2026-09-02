import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Agent } from '../models';

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

  updateAvailability(id: number, isAvailable: boolean): Observable<Agent> {
    return this.http.patch<Agent>(`${this.base}/${id}/availability`, { isAvailable });
  }
}
