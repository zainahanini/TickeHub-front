import { Routes } from '@angular/router';
import { AccountShellComponent } from './account/account-shell.component';
import { ChangePasswordComponent } from './account/change-password.component';
import { SessionsComponent } from './account/sessions.component';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { ForgotPasswordComponent } from './forgot-password/forgot-password.component';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { ResetPasswordComponent } from './reset-password/reset-password.component';
import { ReportProblemComponent } from './report-problem/report-problem.component';
import { TicketDetailComponent } from './ticket-detail/ticket-detail.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'report-problem', component: ReportProblemComponent },
  { path: 'tickets/:id', component: TicketDetailComponent },
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
  { path: 'register', component: RegisterComponent, canActivate: [guestGuard] },
  { path: 'forgot-password', component: ForgotPasswordComponent, canActivate: [guestGuard] },
  { path: 'reset-password', component: ResetPasswordComponent },
  {
    path: '',
    component: AccountShellComponent,
    canActivate: [authGuard],
    children: [
      { path: 'sessions', component: SessionsComponent },
      { path: 'change-password', component: ChangePasswordComponent },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
