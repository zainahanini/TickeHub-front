import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { shareReplay } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { WorkflowStatus, WorkflowTransition } from '../models';

@Injectable({ providedIn: 'root' })
export class WorkflowService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/workflow`;
  private statuses$?: Observable<WorkflowStatus[]>;
  private transitions$?: Observable<WorkflowTransition[]>;

  statuses(): Observable<WorkflowStatus[]> {
    if (!this.statuses$) {
      this.statuses$ = this.http.get<WorkflowStatus[]>(`${this.base}/statuses`).pipe(shareReplay(1));
    }
    return this.statuses$;
  }

  transitions(): Observable<WorkflowTransition[]> {
    if (!this.transitions$) {
      this.transitions$ = this.http.get<WorkflowTransition[]>(`${this.base}/transitions`).pipe(shareReplay(1));
    }
    return this.transitions$;
  }
}
