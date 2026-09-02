import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { apiErrorMessage } from '../core/api-error';
import { AuthSession } from '../core/models';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-sessions',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './sessions.component.html',
  styleUrl: './sessions.component.css',
})
export class SessionsComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly sessions = signal<AuthSession[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly pendingId = signal<string | null>(null);
  readonly loggingOutAll = signal(false);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.auth.sessions().subscribe({
      next: (sessions) => {
        this.sessions.set(sessions);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.error.set(apiErrorMessage(error, 'Could not load sessions.'));
      },
    });
  }

  revoke(session: AuthSession): void {
    this.pendingId.set(session.id);
    this.auth.revokeSession(session.id).subscribe({
      next: () => {
        this.pendingId.set(null);
        if (session.isCurrent) {
          this.auth.clearSession();
          void this.router.navigate(['/login']);
          return;
        }
        this.sessions.update((list) => list.filter((item) => item.id !== session.id));
      },
      error: (error: unknown) => {
        this.pendingId.set(null);
        this.error.set(apiErrorMessage(error, 'Could not revoke that session.'));
      },
    });
  }

  logoutAll(): void {
    this.loggingOutAll.set(true);
    this.auth.logoutAll().subscribe({
      next: () => {
        void this.router.navigate(['/login']);
      },
      error: () => {
        this.loggingOutAll.set(false);
        this.auth.clearSession();
        void this.router.navigate(['/login']);
      },
    });
  }
}
