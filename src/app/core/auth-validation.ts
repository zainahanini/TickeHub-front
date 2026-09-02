import { AbstractControl, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';

export const PASSWORD_MIN_LENGTH = 8;

export const emailValidators = [Validators.required, Validators.email];

export const passwordValidators = [Validators.required, Validators.minLength(PASSWORD_MIN_LENGTH)];

export function passwordsMatch(passwordKey: string, confirmKey: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const password = control.get(passwordKey)?.value;
    const confirm = control.get(confirmKey)?.value;
    if (!confirm) {
      return null;
    }
    return password === confirm ? null : { passwordsMismatch: true };
  };
}
