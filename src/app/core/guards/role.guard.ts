import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserType } from '../models';
import { CurrentUserService } from '../services/current-user.service';

export const roleGuard: CanActivateFn = (route) => {
  const currentUser = inject(CurrentUserService);
  const router = inject(Router);
  const user = currentUser.snapshot();

  if (!user) {
    return router.createUrlTree(['/login']);
  }

  const roles = route.data['roles'] as UserType[] | undefined;
  if (!roles?.length || roles.includes(user.userType)) {
    return true;
  }

  return router.createUrlTree(['/login']);
};
