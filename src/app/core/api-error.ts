import { HttpErrorResponse } from '@angular/common/http';
import { FormGroup } from '@angular/forms';

export function apiErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof HttpErrorResponse)) {
    return fallback;
  }

  const body = error.error as
    | string
    | {
        title?: string;
        detail?: string;
        errors?: Record<string, string[]>;
      }
    | null;

  if (typeof body === 'string' && body.trim()) {
    return body;
  }

  if (body && typeof body === 'object') {
    if (body.errors) {
      const messages = Object.values(body.errors).flat().filter(Boolean);
      if (messages.length) {
        return messages.join(' ');
      }
    }
    if (body.detail?.trim()) {
      return body.detail;
    }
    if (body.title?.trim()) {
      return body.title;
    }
  }

  switch (error.status) {
    case 400:
      return 'Please check the information and try again.';
    case 401:
      return 'Please sign in again.';
    case 403:
      return 'You do not have permission to do that.';
    case 404:
      return 'The requested item could not be found.';
    case 409:
      return 'This item changed while you were working. Refresh and try again.';
    case 413:
      return 'That upload is too large. Choose a smaller file.';
    default:
      break;
  }

  return fallback;
}

export function applyValidationErrors(form: FormGroup, error: unknown): string | null {
  if (!(error instanceof HttpErrorResponse) || error.status !== 400) {
    return apiErrorMessage(error, 'Something went wrong. Please try again.');
  }

  const errors = (error.error as { errors?: Record<string, string[]> } | null)?.errors;
  if (!errors) {
    return apiErrorMessage(error, 'Please fix the highlighted fields.');
  }

  const unmatched: string[] = [];
  for (const [key, messages] of Object.entries(errors)) {
    const text = messages.join(' ');
    const camelKey = key.charAt(0).toLowerCase() + key.slice(1);
    const control = form.get(camelKey) ?? form.get(key);
    if (control) {
      const nextErrors = { ...(control.errors ?? {}) } as Record<string, unknown>;
      nextErrors['server'] = text;
      control.setErrors(nextErrors as any);
      control.markAsTouched();
    } else {
      unmatched.push(text);
    }
  }

  return unmatched.length ? unmatched.join(' ') : Object.keys(errors).length ? null : apiErrorMessage(error, 'Please fix the highlighted fields.');
}
