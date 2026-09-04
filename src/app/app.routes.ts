import { Routes } from '@angular/router';
import { AccountShellComponent } from './account/account-shell.component';
import { ChangePasswordComponent } from './account/change-password.component';
import { SessionsComponent } from './account/sessions.component';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { roleGuard } from './core/guards/role.guard';
import { UserType } from './core/models';
import { ForgotPasswordComponent } from './forgot-password/forgot-password.component';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { ResetPasswordComponent } from './reset-password/reset-password.component';
import { ReportProblemComponent } from './report-problem/report-problem.component';
import { TicketDetailComponent } from './ticket-detail/ticket-detail.component';
import { TicketsComponent } from './tickets/tickets.component';
import { AgentTicketsComponent } from './agent-tickets/agent-tickets.component';
import { AgentDetailComponent } from './agents/agent-detail.component';
import { AgentsComponent } from './agents/agents.component';
import { NotificationsComponent } from './notifications/notifications.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'report-problem', component: ReportProblemComponent },
  { path: 'tickets/:id', component: TicketDetailComponent, canActivate: [authGuard] },
  { path: 'agent/tickets', component: AgentTicketsComponent, canActivate: [authGuard, roleGuard], data: { roles: [UserType.Agent, UserType.Supervisor, UserType.Admin] } },
  { path: 'agent/profile', component: AgentDetailComponent, canActivate: [authGuard, roleGuard], data: { roles: [UserType.Agent, UserType.Supervisor, UserType.Admin] } },
  { path: 'agent/agents', component: AgentsComponent, canActivate: [authGuard, roleGuard], data: { roles: [UserType.Supervisor, UserType.Admin] } },
  { path: 'agent/agents/:id', component: AgentDetailComponent, canActivate: [authGuard, roleGuard], data: { roles: [UserType.Supervisor, UserType.Admin] } },
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
  { path: 'register', component: RegisterComponent, canActivate: [guestGuard] },
  { path: 'forgot-password', component: ForgotPasswordComponent, canActivate: [guestGuard] },
  { path: 'reset-password', component: ResetPasswordComponent },
  {
    path: '',
    component: AccountShellComponent,
    canActivate: [authGuard],
    children: [
      { path: 'tickets', component: TicketsComponent },
      { path: 'sessions', component: SessionsComponent },
      { path: 'change-password', component: ChangePasswordComponent },
      { path: 'notifications', component: NotificationsComponent },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
