import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserType } from '../models';
import { CurrentUserService } from '../services/current-user.service';
import { TokenService } from '../services/token.service';

export const roleGuard: CanActivateFn = (route) => {
  const currentUser = inject(CurrentUserService);
  const tokens = inject(TokenService);
  const router = inject(Router);
  const user = currentUser.snapshot();

  if (!user || !tokens.accessToken) {
    return router.createUrlTree(['/login']);
  }

  const roles = route.data['roles'] as UserType[] | undefined;
  if (!roles?.length || roles.includes(user.userType)) {
    return true;
  }

  return router.createUrlTree(['/login']);
};
