import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { CurrentUserService } from '../services/current-user.service';
import { TokenService } from '../services/token.service';

export const guestGuard: CanActivateFn = () => {
  const currentUser = inject(CurrentUserService);
  const tokens = inject(TokenService);
  const router = inject(Router);

  if (currentUser.snapshot() || tokens.accessToken) {
    return router.createUrlTree(['/sessions']);
  }

  return true;
};
