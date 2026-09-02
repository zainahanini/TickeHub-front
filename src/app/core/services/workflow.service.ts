import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Workflow } from '../models';

@Injectable({ providedIn: 'root' })
export class WorkflowService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/workflows`;

  list(): Observable<Workflow[]> {
    return this.http.get<Workflow[]>(this.base);
  }

  getById(id: number): Observable<Workflow> {
    return this.http.get<Workflow>(`${this.base}/${id}`);
  }

  create(workflow: Partial<Workflow>): Observable<Workflow> {
    return this.http.post<Workflow>(this.base, workflow);
  }

  update(id: number, workflow: Partial<Workflow>): Observable<Workflow> {
    return this.http.put<Workflow>(`${this.base}/${id}`, workflow);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
