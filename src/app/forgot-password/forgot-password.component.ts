import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { applyValidationErrors } from '../core/api-error';
import { emailValidators } from '../core/auth-validation';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['../shared/auth-page.css', '../shared/auth-forms.css', './forgot-password.component.css'],
})
export class ForgotPasswordComponent {
  private readonly auth = inject(AuthService);

  readonly submitting = signal(false);
  readonly sent = signal(false);
  readonly serverError = signal<string | null>(null);

  readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: emailValidators }),
  });

  submit(): void {
    this.serverError.set(null);
    this.form.markAllAsTouched();
    if (this.form.invalid || this.submitting()) {
      return;
    }

    this.submitting.set(true);
    this.auth.forgotPassword(this.form.controls.email.getRawValue()).subscribe({
      next: () => {
        this.submitting.set(false);
        this.sent.set(true);
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        this.serverError.set(
          applyValidationErrors(this.form, error) ?? 'Could not send the reset email.',
        );
      },
    });
  }
}
