import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { applyValidationErrors } from '../core/api-error';
import { emailValidators, passwordValidators, passwordsMatch } from '../core/auth-validation';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.component.html',
  styleUrls: ['../shared/auth-page.css', '../shared/auth-forms.css', '../login/login.component.css'],
})
export class ResetPasswordComponent {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  readonly submitting = signal(false);
  readonly done = signal(false);
  readonly serverError = signal<string | null>(null);
  readonly token = this.route.snapshot.queryParamMap.get('token') ?? '';

  readonly form = new FormGroup(
    {
      email: new FormControl(this.route.snapshot.queryParamMap.get('email') ?? '', {
        nonNullable: true,
        validators: emailValidators,
      }),
      password: new FormControl('', { nonNullable: true, validators: passwordValidators }),
      confirmPassword: new FormControl('', { nonNullable: true, validators: passwordValidators }),
    },
    { validators: passwordsMatch('password', 'confirmPassword') },
  );

  submit(): void {
    this.serverError.set(null);
    this.form.markAllAsTouched();
    if (!this.token) {
      this.serverError.set('This reset link is missing a token. Request a new email.');
      return;
    }
    if (this.form.invalid || this.submitting()) {
      return;
    }

    const { email, password } = this.form.getRawValue();
    this.submitting.set(true);
    this.auth.resetPassword({ token: this.token, email, password }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.done.set(true);
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        this.serverError.set(
          applyValidationErrors(this.form, error) ?? 'Could not reset the password.',
        );
      },
    });
  }
}
