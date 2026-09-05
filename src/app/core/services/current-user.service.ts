import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { User, UserType } from '../models';

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

  hasRole(...roles: Array<UserType | string>): boolean {
    const user = this.userSubject.value;
    if (!user) {
      return false;
    }

    const allowedRoles = roles.map((role) => this.normalizeRole(role));
    return this.userRoles(user).some((role) => allowedRoles.includes(role));
  }

  private userRoles(user: User): string[] {
    const values = [
      user.userType,
      user.role,
      ...(Array.isArray(user.roles) ? user.roles : []),
    ];

    return values
      .filter((role): role is string => typeof role === 'string' && role.trim().length > 0)
      .map((role) => this.normalizeRole(role));
  }

  private normalizeRole(role: string): string {
    return role.trim().toLowerCase();
  }
}
