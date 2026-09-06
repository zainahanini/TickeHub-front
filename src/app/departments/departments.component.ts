import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Department } from '../core/models';
import { apiErrorMessage } from '../core/api-error';
import { DepartmentService } from '../core/services/department.service';

@Component({
  selector: 'app-departments',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './departments.component.html',
  styleUrl: './departments.component.css',
})
export class DepartmentsComponent {
  private readonly departmentsService = inject(DepartmentService);

  readonly departments = signal<Department[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly message = signal<string | null>(null);
  readonly pendingId = signal<number | null>(null);
  readonly editingId = signal<number | null>(null);
  readonly createDraft = { name: '' };
  readonly editDraft = { name: '' };

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.departmentsService.list().subscribe({
      next: (departments) => {
        this.departments.set(departments);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.error.set(apiErrorMessage(error, 'Could not load departments.'));
        this.loading.set(false);
      },
    });
  }

  create(): void {
    const name = this.createDraft.name.trim();
    if (!name || this.pendingId() !== null) {
      return;
    }

    this.pendingId.set(0);
    this.error.set(null);
    this.message.set(null);
    this.departmentsService.create({ name }).subscribe({
      next: (department) => {
        this.departments.update((departments) => [department, ...departments]);
        this.createDraft.name = '';
        this.message.set('Department created.');
        this.pendingId.set(null);
      },
      error: (error: unknown) => {
        this.error.set(apiErrorMessage(error, 'Could not create department.'));
        this.pendingId.set(null);
      },
    });
  }

  beginEdit(department: Department): void {
    this.editingId.set(department.id);
    this.editDraft.name = department.name ?? '';
    this.error.set(null);
    this.message.set(null);
  }

  save(department: Department): void {
    const name = this.editDraft.name.trim();
    if (!name || this.pendingId() !== null) {
      return;
    }

    this.pendingId.set(department.id);
    this.error.set(null);
    this.message.set(null);
    this.departmentsService.update(department.id, { name }).subscribe({
      next: (updated) => {
        this.departments.update((departments) => departments.map((item) => item.id === updated.id ? updated : item));
        this.editingId.set(null);
        this.message.set('Department updated.');
        this.pendingId.set(null);
      },
      error: (error: unknown) => {
        this.error.set(apiErrorMessage(error, 'Could not update department.'));
        this.pendingId.set(null);
      },
    });
  }

  remove(department: Department): void {
    if (this.pendingId() !== null || !confirm(`Delete ${department.name}?`)) {
      return;
    }

    this.pendingId.set(department.id);
    this.error.set(null);
    this.message.set(null);
    this.departmentsService.delete(department.id).subscribe({
      next: () => {
        this.departments.update((departments) => departments.filter((item) => item.id !== department.id));
        this.message.set('Department deleted.');
        this.pendingId.set(null);
      },
      error: (error: unknown) => {
        this.error.set(apiErrorMessage(error, 'Could not delete department.'));
        this.pendingId.set(null);
      },
    });
  }
}
