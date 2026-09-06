import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Category, Department, UserType } from '../core/models';
import { apiErrorMessage } from '../core/api-error';
import { CategoryService } from '../core/services/category.service';
import { CurrentUserService } from '../core/services/current-user.service';
import { DepartmentService } from '../core/services/department.service';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './categories.component.html',
  styleUrl: './categories.component.css',
})
export class CategoriesComponent {
  private readonly categoriesService = inject(CategoryService);
  private readonly departmentsService = inject(DepartmentService);
  private readonly currentUser = inject(CurrentUserService);

  readonly categories = signal<Category[]>([]);
  readonly departments = signal<Department[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly message = signal<string | null>(null);
  readonly pendingId = signal<number | null>(null);
  readonly editingId = signal<number | null>(null);
  readonly isAdmin = this.currentUser.hasRole(UserType.Admin);

  readonly createDraft = { name: '', departmentId: null as number | null };
  readonly editDraft = { name: '', departmentId: null as number | null };

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
    this.categoriesService.list().subscribe({
      next: (categories) => {
        this.categories.set(categories);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.error.set(apiErrorMessage(error, 'Could not load categories.'));
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
    this.categoriesService.create({
      name,
      departmentId: this.createDraft.departmentId || null,
    }).subscribe({
      next: (category) => {
        this.categories.update((items) => [category, ...items]);
        this.createDraft.name = '';
        this.createDraft.departmentId = null;
        this.message.set('Category created.');
        this.pendingId.set(null);
      },
      error: (error: unknown) => {
        this.error.set(apiErrorMessage(error, 'Could not create category.'));
        this.pendingId.set(null);
      },
    });
  }

  beginEdit(category: Category): void {
    this.editingId.set(category.id);
    this.editDraft.name = category.name ?? '';
    this.editDraft.departmentId = category.departmentId ?? null;
    this.error.set(null);
    this.message.set(null);
  }

  save(category: Category): void {
    const name = this.editDraft.name.trim();
    if (!name || this.pendingId() !== null) {
      return;
    }

    this.pendingId.set(category.id);
    this.error.set(null);
    this.message.set(null);
    this.categoriesService.update(category.id, {
      name,
      departmentId: this.editDraft.departmentId || null,
    }).subscribe({
      next: (updated) => {
        this.categories.update((items) => items.map((item) => item.id === updated.id ? updated : item));
        this.editingId.set(null);
        this.message.set('Category updated.');
        this.pendingId.set(null);
      },
      error: (error: unknown) => {
        this.error.set(apiErrorMessage(error, 'Could not update category.'));
        this.pendingId.set(null);
      },
    });
  }

  remove(category: Category): void {
    if (!this.isAdmin || this.pendingId() !== null || !confirm(`Delete ${category.name}?`)) {
      return;
    }

    this.pendingId.set(category.id);
    this.error.set(null);
    this.message.set(null);
    this.categoriesService.delete(category.id).subscribe({
      next: () => {
        this.categories.update((items) => items.filter((item) => item.id !== category.id));
        this.message.set('Category deleted.');
        this.pendingId.set(null);
      },
      error: (error: unknown) => {
        this.error.set(apiErrorMessage(error, 'Could not delete category.'));
        this.pendingId.set(null);
      },
    });
  }

  departmentName(category: Category): string {
    if (!category.departmentId) {
      return 'No department';
    }
    return this.departments().find((department) => department.id === category.departmentId)?.name
      ?? `Department #${category.departmentId}`;
  }
}
