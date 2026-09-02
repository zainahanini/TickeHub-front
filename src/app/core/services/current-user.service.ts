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

  hasRole(...roles: UserType[]): boolean {
    const user = this.userSubject.value;
    return !!user && roles.includes(user.userType);
  }
}
