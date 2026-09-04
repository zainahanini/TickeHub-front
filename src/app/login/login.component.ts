import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { applyValidationErrors } from '../core/api-error';
import { emailValidators, passwordValidators } from '../core/auth-validation';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['../shared/auth-page.css', '../shared/auth-forms.css', './login.component.css'],
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly submitting = signal(false);
  readonly serverError = signal<string | null>(null);

  readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: emailValidators }),
    password: new FormControl('', { nonNullable: true, validators: passwordValidators }),
  });

  openReportProblem(): void {
    void this.router.navigate(['/report-problem']);
  }

  submit(): void {
    this.serverError.set(null);
    this.form.markAllAsTouched();
    if (this.form.invalid || this.submitting()) {
      return;
    }

    this.submitting.set(true);
    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => {
        void this.router.navigate(['/sessions']);
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        if (error instanceof HttpErrorResponse && error.status === 401) {
          this.serverError.set('Invalid email or password.');
          return;
        }
        this.serverError.set(
          applyValidationErrors(this.form, error) ?? 'Could not sign in. Please try again.',
        );
      },
    });
  }
}
