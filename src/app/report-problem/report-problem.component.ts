import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { apiErrorMessage, applyValidationErrors } from '../core/api-error';
import { Category, CreateTicketRequest, TicketPriority } from '../core/models';
import { CategoryService } from '../core/services/category.service';
import { TicketService } from '../core/services/ticket.service';
import { CurrentUserService } from '../core/services/current-user.service';
import { TokenService } from '../core/services/token.service';
import { AttachmentService } from '../core/services/attachment.service';

function reportValidator(anonymous: boolean): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const errors: ValidationErrors = {};
    const latitude = control.get('latitude')?.value as number | null;
    const longitude = control.get('longitude')?.value as number | null;
    const priority = control.get('priority')?.value;
    const locationAddress = String(control.get('locationAddress')?.value ?? '').trim();
    if ((latitude === null) !== (longitude === null)) errors['coordinatesTogether'] = true;
    if (anonymous && !String(control.get('reporterEmail')?.value ?? '').trim() && !String(control.get('reporterPhone')?.value ?? '').trim()) errors['anonymousContact'] = true;
    if (priority === TicketPriority.Urgent && !locationAddress) errors['urgentLocation'] = true;
    return Object.keys(errors).length ? errors : null;
  };
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
  private readonly tokens = inject(TokenService);
  private readonly attachments = inject(AttachmentService);

  readonly user = this.currentUser.snapshot();
  readonly isAuthenticated = !!this.user || !!this.tokens.accessToken || !!this.tokens.refreshToken;

  readonly categories = signal<Category[]>([]);
  readonly loadingCategories = signal(true);
  readonly submitting = signal(false);
  readonly serverError = signal<string | null>(null);
  readonly categoryError = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly submittedTicketNumber = signal<string | null>(null);
  readonly selectedFileName = signal<string | null>(null);
  readonly attachmentPending = signal(false);
  readonly priorities = Object.values(TicketPriority);

  readonly form = new FormGroup(
    {
      title: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(5), Validators.maxLength(120)] }),
      description: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(10), Validators.maxLength(4000)] }),
      categoryId: new FormControl<number | null>(null, { validators: [Validators.required] }),
      priority: new FormControl<TicketPriority | null>(TicketPriority.Medium, { validators: [Validators.required] }),
      location: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(200)] }),
      locationAddress: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(300)] }),
      latitude: new FormControl<number | null>(null, { validators: [Validators.min(-90), Validators.max(90)] }),
      longitude: new FormControl<number | null>(null, { validators: [Validators.min(-180), Validators.max(180)] }),
      reporterName: new FormControl(this.user?.displayName ?? '', { nonNullable: true, validators: [Validators.required, Validators.minLength(2), Validators.maxLength(80)] }),
      reporterPhone: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(30)] }),
      reporterEmail: new FormControl('', { nonNullable: true, validators: [Validators.email, Validators.maxLength(254)] }),
    },
    { validators: reportValidator(!this.isAuthenticated) },
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

  selectAttachment(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (!file) {
      this.selectedFileName.set(null);
      return;
    }
    if (!file.type.startsWith('image/')) {
      this.serverError.set('Please select an image file.');
      input.value = '';
      this.selectedFileName.set(null);
      return;
    }
    this.selectedFileName.set(file.name);
  }

  submit(): void {
    this.serverError.set(null);
    this.successMessage.set(null);
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
      locationAddress: values.locationAddress.trim() || null,
      latitude: values.latitude,
      longitude: values.longitude,
      reporterName: values.reporterName.trim(),
      reporterEmail: this.isAuthenticated ? null : values.reporterEmail.trim() || null,
      reporterPhone: this.isAuthenticated ? null : values.reporterPhone.trim() || null,
    };

    this.submitting.set(true);
    this.tickets.create(request).subscribe({
      next: (ticket) => {
        if (this.isAuthenticated) {
          const input = document.querySelector<HTMLInputElement>('#report-attachment');
          const file = input?.files?.[0];
          if (file) {
            this.attachmentPending.set(true);
            this.attachments.upload(ticket.id, file).subscribe({
              next: () => this.navigateAfterCreation(ticket.id, ticket.ticketNumber),
              error: (error: unknown) => {
                this.submitting.set(false);
                this.attachmentPending.set(false);
                this.serverError.set(apiErrorMessage(error, 'The ticket was created, but the picture could not be uploaded.'));
              },
            });
            return;
          }
          this.navigateAfterCreation(ticket.id, ticket.ticketNumber);
          return;
        }
        this.submitting.set(false);
        this.submittedTicketNumber.set(ticket.ticketNumber ?? null);
        this.successMessage.set('Your report was submitted successfully. Keep the reference number below for follow-up.');
        this.form.reset({ priority: TicketPriority.Medium });
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        this.serverError.set(applyValidationErrors(this.form, error) ?? 'Could not submit the report.');
      },
    });
  }

  private navigateAfterCreation(id: number, ticketNumber?: string): void {
    this.attachmentPending.set(false);
    void this.router.navigate(['/tickets', id], {
      queryParams: { ticketNumber: ticketNumber ?? '' },
    });
  }
}
