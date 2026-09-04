import { inject } from '@angular/core';
import { CanMatchFn } from '@angular/router';
import { CurrentUserService } from '../services/current-user.service';
import { TokenService } from '../services/token.service';

export const publicReportGuard: CanMatchFn = () => {
  const currentUser = inject(CurrentUserService);
  const tokens = inject(TokenService);

  return !currentUser.snapshot() && !tokens.accessToken;
};
