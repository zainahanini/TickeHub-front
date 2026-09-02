import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, finalize, map, shareReplay, switchMap, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { SKIP_AUTH_REFRESH } from '../http-context';
import {
  AuthResponse,
  AuthSession,
  ChangePasswordRequest,
  LoginRequest,
  RefreshRequest,
  RegisterRequest,
  ResetPasswordRequest,
  UpdateProfileRequest,
  User,
} from '../models';
import { CurrentUserService } from './current-user.service';
import { TokenService } from './token.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly tokens = inject(TokenService);
  private readonly currentUser = inject(CurrentUserService);
  private readonly base = `${environment.apiBaseUrl}/auth`;
  private refreshInFlight$: Observable<AuthResponse> | null = null;

  restoreSession(): Observable<void> {
    if (!this.tokens.refreshToken) {
      return of(undefined);
    }

    return this.refresh().pipe(
      switchMap(() => this.me()),
      catchError(() => {
        this.clearSession();
        return of(undefined);
      }),
      map(() => undefined),
    );
  }

  login(request: LoginRequest): Observable<User> {
    return this.http.post<AuthResponse>(`${this.base}/login`, request).pipe(
      tap((response) => this.applyTokens(response)),
      switchMap(() => this.me()),
    );
  }

  register(request: RegisterRequest): Observable<User> {
    return this.http.post<AuthResponse>(`${this.base}/register`, request).pipe(
      tap((response) => this.applyTokens(response)),
      switchMap(() => this.me()),
    );
  }

  refresh(): Observable<AuthResponse> {
    const refreshToken = this.tokens.refreshToken;
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token'));
    }

    if (!this.refreshInFlight$) {
      const body: RefreshRequest = { refreshToken };
      this.refreshInFlight$ = this.http
        .post<AuthResponse>(`${this.base}/refresh`, body, {
          context: new HttpContext().set(SKIP_AUTH_REFRESH, true),
        })
        .pipe(
          tap((response) => this.applyTokens(response)),
          finalize(() => {
            this.refreshInFlight$ = null;
          }),
          shareReplay(1),
        );
    }

    return this.refreshInFlight$;
  }

  me(): Observable<User> {
    return this.http
      .get<User>(`${this.base}/me`)
      .pipe(tap((user) => this.currentUser.setUser(user)));
  }

  updateMe(request: UpdateProfileRequest): Observable<User> {
    return this.http
      .put<User>(`${this.base}/me`, request)
      .pipe(tap((user) => this.currentUser.setUser(user)));
  }

  changePassword(request: ChangePasswordRequest): Observable<void> {
    return this.http.post(`${this.base}/change-password`, request).pipe(map(() => undefined));
  }

  forgotPassword(email: string): Observable<void> {
    return this.http.post(`${this.base}/forgot-password`, { email }).pipe(map(() => undefined));
  }

  resetPassword(request: ResetPasswordRequest): Observable<void> {
    return this.http.post(`${this.base}/reset-password`, request).pipe(map(() => undefined));
  }

  sessions(): Observable<AuthSession[]> {
    return this.http.get<AuthSession[]>(`${this.base}/sessions`);
  }

  revokeSession(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/sessions/${id}`);
  }

  logout(): Observable<void> {
    const refreshToken = this.tokens.refreshToken;
    return this.http.post(`${this.base}/logout`, { refreshToken }).pipe(
      catchError(() => of(null)),
      tap(() => this.clearSession()),
      map(() => undefined),
    );
  }

  logoutAll(): Observable<void> {
    return this.http.post(`${this.base}/logout-all`, {}).pipe(
      catchError(() => of(null)),
      tap(() => this.clearSession()),
      map(() => undefined),
    );
  }

  clearSession(): void {
    this.tokens.clear();
    this.currentUser.setUser(null);
  }

  private applyTokens(response: AuthResponse): void {
    this.tokens.setTokens(response.accessToken, response.refreshToken);
    if (response.user) {
      this.currentUser.setUser(response.user);
    }
  }
}
