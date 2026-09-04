import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { applyValidationErrors } from '../core/api-error';
import { emailValidators, passwordValidators, passwordsMatch } from '../core/auth-validation';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrls: ['../shared/auth-page.css', '../shared/auth-forms.css', './register.component.css'],
})
export class RegisterComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly submitting = signal(false);
  readonly serverError = signal<string | null>(null);

  readonly form = new FormGroup(
    {
      displayName: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(2), Validators.maxLength(80)],
      }),
      email: new FormControl('', { nonNullable: true, validators: emailValidators }),
      phone: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(30)] }),
      password: new FormControl('', { nonNullable: true, validators: passwordValidators }),
      confirmPassword: new FormControl('', { nonNullable: true, validators: passwordValidators }),
    },
    { validators: passwordsMatch('password', 'confirmPassword') },
  );

  submit(): void {
    this.serverError.set(null);
    this.form.markAllAsTouched();
    if (this.form.invalid || this.submitting()) {
      return;
    }

    const { displayName, email, phone, password, confirmPassword } = this.form.getRawValue();
    this.submitting.set(true);
    this.auth
      .register({
        displayName,
        email,
        phone: phone.trim() ? phone.trim() : null,
        password,
        confirmPassword,
      })
      .subscribe({
        next: () => {
          void this.router.navigate(['/sessions']);
        },
        error: (error: unknown) => {
          this.submitting.set(false);
          this.serverError.set(
            applyValidationErrors(this.form, error) ?? 'Could not create the account.',
          );
        },
      });
  }
}
