import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { CurrentUserService } from '../core/services/current-user.service';

@Component({
  selector: 'app-account-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './account-shell.component.html',
  styleUrl: './account-shell.component.css',
})
export class AccountShellComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly user = toSignal(inject(CurrentUserService).user$, { initialValue: null });

  logout(): void {
    this.auth.logout().subscribe(() => {
      void this.router.navigate(['/login']);
    });
  }
}
