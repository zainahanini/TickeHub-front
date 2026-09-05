import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { apiErrorMessage, applyValidationErrors } from '../core/api-error';
import { AuthService } from '../core/services/auth.service';
import { CurrentUserService } from '../core/services/current-user.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['../shared/auth-forms.css', './profile.component.css'],
})
export class ProfileComponent {
  private readonly auth = inject(AuthService);
  private readonly currentUser = inject(CurrentUserService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal(false);

  readonly form = new FormGroup({
    displayName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2), Validators.maxLength(80)],
    }),
    phone: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(30)],
    }),
  });

  constructor() {
    const user = this.currentUser.snapshot();
    if (user) {
      this.setForm(user.displayName, user.phone);
      this.loading.set(false);
      return;
    }

    this.auth.me().subscribe({
      next: (loadedUser) => {
        this.setForm(loadedUser.displayName, loadedUser.phone);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.error.set(apiErrorMessage(error, 'Could not load your profile.'));
        this.loading.set(false);
      },
    });
  }

  save(): void {
    this.error.set(null);
    this.success.set(false);
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving()) {
      return;
    }

    const { displayName, phone } = this.form.getRawValue();
    this.saving.set(true);
    this.auth.updateMe({
      displayName: displayName.trim(),
      phone: phone.trim() || null,
    }).subscribe({
      next: (updatedUser) => {
        this.setForm(updatedUser.displayName, updatedUser.phone);
        this.success.set(true);
        this.saving.set(false);
      },
      error: (error: unknown) => {
        this.error.set(applyValidationErrors(this.form, error) ?? 'Could not save your profile.');
        this.saving.set(false);
      },
    });
  }

  private setForm(displayName: string, phone: string | null): void {
    this.form.setValue({
      displayName,
      phone: phone ?? '',
    });
  }
}
