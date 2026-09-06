import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { User, UserType } from '../models';

type RoleValue = UserType | string | null | undefined;

@Injectable({ providedIn: 'root' })
export class CurrentUserService {
  private readonly userSubject = new BehaviorSubject<User | null>(null);
  readonly user$ = this.userSubject.asObservable();

  snapshot(): User | null {
    return this.userSubject.value;
  }

  setUser(user: User | null): void {
    this.userSubject.next(user);
  }

  hasRole(...roles: RoleValue[]): boolean {
    const user = this.userSubject.value;
    if (!user) {
      return false;
    }

    const allowedRoles = roles.map((role) => this.normalizeRole(role)).filter((role): role is string => !!role);
    return this.userRoles(user).some((role) => allowedRoles.includes(role));
  }

  private userRoles(user: User): string[] {
    const roles = (Array.isArray(user.roles) ? user.roles : [])
      .map((role) => this.normalizeRole(role))
      .filter((role): role is string => !!role);

    if (roles.length) {
      return roles;
    }

    const userType = this.normalizeRole(user.userType);
    return userType ? [userType] : [];
  }

  private normalizeRole(role: RoleValue): string | null {
    if (typeof role !== 'string') {
      return null;
    }

    const normalized = role.trim().toLowerCase();
    return this.isAuthorizationRole(normalized) ? normalized : null;
  }

  private isAuthorizationRole(role: string): boolean {
    return Object.values(UserType).some((userType) => userType.toLowerCase() === role);
  }
}
