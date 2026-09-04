import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { applyValidationErrors } from '../core/api-error';
import { passwordValidators, passwordsMatch } from '../core/auth-validation';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './change-password.component.html',
  styleUrls: ['../shared/auth-forms.css', './change-password.component.css'],
})
export class ChangePasswordComponent {
  private readonly auth = inject(AuthService);

  readonly submitting = signal(false);
  readonly serverError = signal<string | null>(null);
  readonly success = signal(false);

  readonly form = new FormGroup(
    {
      currentPassword: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(128)] }),
      newPassword: new FormControl('', { nonNullable: true, validators: passwordValidators }),
      confirmPassword: new FormControl('', { nonNullable: true, validators: passwordValidators }),
    },
    { validators: passwordsMatch('newPassword', 'confirmPassword') },
  );

  submit(): void {
    this.serverError.set(null);
    this.success.set(false);
    this.form.markAllAsTouched();
    if (this.form.invalid || this.submitting()) {
      return;
    }

    const { currentPassword, newPassword } = this.form.getRawValue();
    this.submitting.set(true);
    this.auth.changePassword({ currentPassword, newPassword }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.success.set(true);
        this.form.reset();
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        this.serverError.set(
          applyValidationErrors(this.form, error) ?? 'Could not change the password.',
        );
      },
    });
  }
}
