import { Injectable } from '@angular/core';

const REFRESH_TOKEN_KEY = 'refresh_token';

@Injectable({ providedIn: 'root' })
export class TokenService {
  private accessTokenValue: string | null = null;

  get accessToken(): string | null {
    return this.accessTokenValue;
  }

  get refreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  setTokens(accessToken: string, refreshToken?: string | null): void {
    this.accessTokenValue = accessToken;
    if (refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
  }

  clear(): void {
    this.accessTokenValue = null;
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}
