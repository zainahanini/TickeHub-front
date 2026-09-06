import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Department, User, UserType } from '../core/models';
import { apiErrorMessage } from '../core/api-error';
import { DepartmentService } from '../core/services/department.service';
import { UserService } from '../core/services/user.service';

interface UserDraft {
  displayName: string;
  email: string;
  phone: string;
  userType: UserType;
  departmentId: number | null;
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './users.component.html',
  styleUrl: './users.component.css',
})
export class UsersComponent {
  private readonly usersService = inject(UserService);
  private readonly departmentsService = inject(DepartmentService);

  readonly users = signal<User[]>([]);
  readonly departments = signal<Department[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly message = signal<string | null>(null);
  readonly pendingId = signal<number | null>(null);
  readonly editingId = signal<number | null>(null);
  readonly creating = signal(false);
  readonly roles = Object.values(UserType);

  readonly createDraft: UserDraft & { password: string } = {
    displayName: '',
    email: '',
    phone: '',
    userType: UserType.Citizen,
    departmentId: null,
    password: '',
  };
  readonly editDraft: UserDraft = {
    displayName: '',
    email: '',
    phone: '',
    userType: UserType.Citizen,
    departmentId: null,
  };

  constructor() {
    this.load();
    this.departmentsService.list().subscribe({
      next: (departments) => this.departments.set(departments),
      error: () => undefined,
    });
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.usersService.list().subscribe({
      next: (users) => {
        this.users.set(users);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.error.set(apiErrorMessage(error, 'Could not load users.'));
        this.loading.set(false);
      },
    });
  }

  beginCreate(): void {
    this.creating.set(true);
    this.createDraft.displayName = '';
    this.createDraft.email = '';
    this.createDraft.phone = '';
    this.createDraft.userType = UserType.Citizen;
    this.createDraft.departmentId = null;
    this.createDraft.password = '';
    this.error.set(null);
    this.message.set(null);
  }

  create(): void {
    if (!this.validCreateDraft() || this.pendingId() !== null) {
      return;
    }

    this.pendingId.set(0);
    this.error.set(null);
    this.message.set(null);
    this.usersService.create({
      displayName: this.createDraft.displayName.trim(),
      email: this.createDraft.email.trim(),
      phone: this.createDraft.phone.trim() || null,
      userType: this.createDraft.userType,
      departmentId: this.createDraft.departmentId,
      password: this.createDraft.password,
    }).subscribe({
      next: (created) => {
        this.users.update((users) => [created, ...users]);
        this.creating.set(false);
        this.message.set('User created.');
        this.pendingId.set(null);
      },
      error: (error: unknown) => {
        this.error.set(apiErrorMessage(error, 'Could not create user.'));
        this.pendingId.set(null);
      },
    });
  }

  beginEdit(user: User): void {
    this.editingId.set(user.id);
    this.editDraft.displayName = user.displayName ?? '';
    this.editDraft.email = user.email ?? '';
    this.editDraft.phone = user.phone ?? '';
    this.editDraft.userType = this.userRole(user);
    this.editDraft.departmentId = user.departmentId ?? null;
    this.error.set(null);
    this.message.set(null);
  }

  save(user: User): void {
    if (!this.validUserDraft(this.editDraft) || this.pendingId() !== null) {
      return;
    }

    this.pendingId.set(user.id);
    this.error.set(null);
    this.message.set(null);
    this.usersService.update(user.id, {
      displayName: this.editDraft.displayName.trim(),
      email: this.editDraft.email.trim(),
      phone: this.editDraft.phone.trim() || null,
      userType: this.editDraft.userType,
      departmentId: this.editDraft.departmentId,
    }).subscribe({
      next: (updated) => {
        this.users.update((users) => users.map((item) => item.id === updated.id ? updated : item));
        this.editingId.set(null);
        this.message.set('User updated.');
        this.pendingId.set(null);
      },
      error: (error: unknown) => {
        this.error.set(apiErrorMessage(error, 'Could not update user.'));
        this.pendingId.set(null);
      },
    });
  }

  deactivate(user: User): void {
    if (this.pendingId() !== null || !confirm(`Deactivate ${this.userDisplayName(user)}?`)) {
      return;
    }

    this.pendingId.set(user.id);
    this.error.set(null);
    this.message.set(null);
    this.usersService.deactivate(user.id).subscribe({
      next: () => {
        this.users.update((users) => users.filter((item) => item.id !== user.id));
        this.message.set('User deactivated.');
        this.pendingId.set(null);
      },
      error: (error: unknown) => {
        this.error.set(apiErrorMessage(error, 'Could not deactivate user.'));
        this.pendingId.set(null);
      },
    });
  }

  userDisplayName(user: User): string {
    return user.displayName?.trim() || user.email?.trim() || `User #${user.id}`;
  }

  userRole(user: User): UserType {
    const role = user.userType || user.role || user.roles?.[0] || UserType.Citizen;
    return this.roles.find((item) => item.toLowerCase() === String(role).toLowerCase()) ?? UserType.Citizen;
  }

  departmentName(user: User): string {
    if (user.departmentName) {
      return user.departmentName;
    }
    if (!user.departmentId) {
      return '-';
    }
    return this.departments().find((department) => department.id === user.departmentId)?.name
      ?? `Department #${user.departmentId}`;
  }

  private validCreateDraft(): boolean {
    return this.validUserDraft(this.createDraft) && this.createDraft.password.length >= 8;
  }

  private validUserDraft(draft: UserDraft): boolean {
    return !!draft.displayName.trim() && !!draft.email.trim() && !!draft.userType;
  }
}
