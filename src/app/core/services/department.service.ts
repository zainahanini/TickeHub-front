import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Department } from '../models';

@Injectable({ providedIn: 'root' })
export class DepartmentService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/departments`;

  list(): Observable<Department[]> {
    return this.http.get<Department[]>(this.base);
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
}
