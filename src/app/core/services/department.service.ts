import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Department } from '../models';

@Injectable({ providedIn: 'root' })
export class DepartmentService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/departments`;

  list(): Observable<Department[]> {
    return this.http.get<unknown>(this.base).pipe(
      map((response) => this.extractItems(response)),
    );
  }

  getById(id: number): Observable<Department> {
    return this.http.get<Department>(`${this.base}/${id}`);
  }

  create(department: Partial<Department>): Observable<Department> {
    return this.http.post<Department>(this.base, department);
  }

  update(id: number, department: Partial<Department>): Observable<Department> {
    return this.http.put<Department>(`${this.base}/${id}`, department);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  private extractItems(response: unknown): Department[] {
    if (Array.isArray(response)) {
      return response as Department[];
    }
    if (response && typeof response === 'object') {
      const data = response as Record<string, unknown>;
      const items = data['items'] ?? data['data'] ?? data['departments'];
      return Array.isArray(items) ? items as Department[] : [];
    }
    return [];
  }
}
