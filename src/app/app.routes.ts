import { Routes } from '@angular/router';
import { AccountShellComponent } from './account/account-shell.component';
import { ChangePasswordComponent } from './account/change-password.component';
import { ProfileComponent } from './account/profile.component';
import { SessionsComponent } from './account/sessions.component';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { publicReportGuard } from './core/guards/public-report.guard';
import { roleGuard } from './core/guards/role.guard';
import { UserType } from './core/models';
import { ForgotPasswordComponent } from './forgot-password/forgot-password.component';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { ReportsDashboardComponent } from './reports/reports-dashboard.component';
import { ResetPasswordComponent } from './reset-password/reset-password.component';
import { ReportProblemComponent } from './report-problem/report-problem.component';
import { TicketDetailComponent } from './ticket-detail/ticket-detail.component';
import { TicketsComponent } from './tickets/tickets.component';
import { AgentTicketsComponent } from './agent-tickets/agent-tickets.component';
import { AgentDetailComponent } from './agents/agent-detail.component';
import { AgentsComponent } from './agents/agents.component';
import { CategoriesComponent } from './categories/categories.component';
import { DepartmentsComponent } from './departments/departments.component';
import { NotificationsComponent } from './notifications/notifications.component';
import { UsersComponent } from './users/users.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'report-problem', component: ReportProblemComponent, canMatch: [publicReportGuard] },
  { path: 'tickets/:id', component: TicketDetailComponent, canActivate: [authGuard] },
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
      { path: 'report-problem', component: ReportProblemComponent },
      { path: 'profile', component: ProfileComponent },
      { path: 'categories', component: CategoriesComponent, canActivate: [roleGuard], data: { roles: [UserType.Supervisor, UserType.Admin] } },
      { path: 'agents', component: AgentsComponent, canActivate: [roleGuard], data: { roles: [UserType.Supervisor, UserType.Admin] } },
      { path: 'agents/:id', component: AgentDetailComponent, canActivate: [roleGuard], data: { roles: [UserType.Supervisor, UserType.Admin] } },
      { path: 'users', component: UsersComponent, canActivate: [roleGuard], data: { roles: [UserType.Admin] } },
      { path: 'departments', component: DepartmentsComponent, canActivate: [roleGuard], data: { roles: [UserType.Admin] } },
      {
        path: 'agent',
        children: [
          { path: 'tickets', component: AgentTicketsComponent, canActivate: [roleGuard], data: { roles: [UserType.Agent, UserType.Supervisor, UserType.Admin] } },
          { path: 'profile', component: AgentDetailComponent, canActivate: [roleGuard], data: { roles: [UserType.Agent, UserType.Supervisor, UserType.Admin] } },
          { path: 'agents', component: AgentsComponent, canActivate: [roleGuard], data: { roles: [UserType.Supervisor, UserType.Admin] } },
          { path: 'agents/:id', component: AgentDetailComponent, canActivate: [roleGuard], data: { roles: [UserType.Supervisor, UserType.Admin] } },
        ],
      },
      { path: 'sessions', component: SessionsComponent },
      { path: 'change-password', component: ChangePasswordComponent },
      { path: 'notifications', component: NotificationsComponent },
      { path: 'chat', loadComponent: () => import('./chat/chat.component').then((m) => m.ChatComponent) },
      { path: 'chat/:id', loadComponent: () => import('./chat/chat.component').then((m) => m.ChatComponent) },
      { path: 'reports', component: ReportsDashboardComponent, canActivate: [roleGuard], data: { roles: [UserType.Supervisor, UserType.Admin] } },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
