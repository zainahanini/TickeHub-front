import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { applyValidationErrors } from '../core/api-error';
import { Category, CreateTicketRequest, TicketPriority } from '../core/models';
import { CategoryService } from '../core/services/category.service';
import { TicketService } from '../core/services/ticket.service';
import { CurrentUserService } from '../core/services/current-user.service';

function anonymousContactValidator(control: AbstractControl): ValidationErrors | null {
  const name = String(control.get('reporterName')?.value ?? '').trim();
  const email = String(control.get('reporterEmail')?.value ?? '').trim();
  const phone = String(control.get('reporterPhone')?.value ?? '').trim();
  return name && (email || phone) ? null : { anonymousContact: true };
}

@Component({
  selector: 'app-report-problem',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './report-problem.component.html',
  styleUrls: ['../shared/auth-page.css', '../shared/auth-forms.css', './report-problem.component.css'],
})
export class ReportProblemComponent {
  private readonly categoriesService = inject(CategoryService);
  private readonly tickets = inject(TicketService);
  private readonly router = inject(Router);
  private readonly currentUser = inject(CurrentUserService);

  readonly user = this.currentUser.snapshot();
  readonly isAuthenticated = !!this.user;

  readonly categories = signal<Category[]>([]);
  readonly loadingCategories = signal(true);
  readonly submitting = signal(false);
  readonly serverError = signal<string | null>(null);
  readonly categoryError = signal<string | null>(null);
  readonly priorities = Object.values(TicketPriority);

  readonly form = new FormGroup(
    {
      title: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(5), Validators.maxLength(120)] }),
      description: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(10), Validators.maxLength(4000)] }),
      categoryId: new FormControl<number | null>(null, { validators: [Validators.required] }),
      priority: new FormControl<TicketPriority>(TicketPriority.Medium, { nonNullable: true, validators: [Validators.required] }),
      location: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(200)] }),
      address: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(300)] }),
      latitude: new FormControl<number | null>(null, { validators: [Validators.min(-90), Validators.max(90)] }),
      longitude: new FormControl<number | null>(null, { validators: [Validators.min(-180), Validators.max(180)] }),
      reporterName: new FormControl('', { nonNullable: true, validators: [Validators.minLength(2), Validators.maxLength(80)] }),
      reporterEmail: new FormControl('', { nonNullable: true, validators: [Validators.email, Validators.maxLength(254)] }),
      reporterPhone: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(30)] }),
    },
    { validators: this.isAuthenticated ? [] : anonymousContactValidator },
  );

  constructor() {
    this.categoriesService.lookup().subscribe({
      next: (categories) => {
        this.categories.set(categories);
        this.loadingCategories.set(false);
      },
      error: () => {
        this.categoryError.set('Categories could not be loaded. Please try again.');
        this.loadingCategories.set(false);
      },
    });
  }

  submit(): void {
    this.serverError.set(null);
    this.form.markAllAsTouched();
    if (this.form.invalid || this.submitting()) {
      return;
    }

    const values = this.form.getRawValue();
    const request: CreateTicketRequest = {
      title: values.title.trim(),
      description: values.description.trim(),
      categoryId: values.categoryId as number,
      priority: values.priority,
      location: values.location.trim() || null,
      address: values.address.trim() || null,
      latitude: values.latitude,
      longitude: values.longitude,
    };

    if (!this.isAuthenticated) {
      request.reporterName = values.reporterName.trim() || null;
      request.reporterEmail = values.reporterEmail.trim() || null;
      request.reporterPhone = values.reporterPhone.trim() || null;
    }

    this.submitting.set(true);
    this.tickets.create(request).subscribe({
      next: (ticket) => {
        void this.router.navigate(['/tickets', ticket.id], {
          queryParams: { ticketNumber: ticket.ticketNumber ?? '' },
        });
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        this.serverError.set(applyValidationErrors(this.form, error) ?? 'Could not submit the report.');
      },
    });
  }
}
