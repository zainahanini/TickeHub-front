import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Injectable, Injector, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AUTH_RETRIED, SKIP_AUTH_REFRESH } from '../http-context';
import { AuthService } from '../services/auth.service';
import { TokenService } from '../services/token.service';

const ANONYMOUS_AUTH_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/refresh',
];

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private readonly tokens = inject(TokenService);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const authReq = this.withAuthHeader(req);

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        if (!this.shouldAttemptRefresh(authReq, error)) {
          return throwError(() => error);
        }

        const authService = this.injector.get(AuthService);
        return authService.refresh().pipe(
          switchMap(() => next.handle(this.retryRequest(authReq))),
          catchError((refreshError) => {
            authService.clearSession();
            void this.router.navigate(['/login']);
            return throwError(() => refreshError);
          }),
        );
      }),
    );
  }

  private withAuthHeader(req: HttpRequest<unknown>): HttpRequest<unknown> {
    if (ANONYMOUS_AUTH_PATHS.some((path) => req.url.includes(path))) {
      return req;
    }

    const token = this.tokens.accessToken;
    if (!token || req.headers.has('Authorization')) {
      return req;
    }
    return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }

  private retryRequest(req: HttpRequest<unknown>): HttpRequest<unknown> {
    const token = this.tokens.accessToken;
    const headers = token
      ? req.headers.set('Authorization', `Bearer ${token}`)
      : req.headers.delete('Authorization');

    return req.clone({
      headers,
      context: req.context.set(AUTH_RETRIED, true),
    });
  }

  private shouldAttemptRefresh(req: HttpRequest<unknown>, error: HttpErrorResponse): boolean {
    if (error.status !== 401) {
      return false;
    }
    if (req.context.get(SKIP_AUTH_REFRESH) || req.context.get(AUTH_RETRIED)) {
      return false;
    }
    return !ANONYMOUS_AUTH_PATHS.some((path) => req.url.includes(path));
  }
}
