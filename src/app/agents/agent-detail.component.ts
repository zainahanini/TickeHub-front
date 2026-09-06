import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { Agent, AgentSkill, Department, UserType } from '../core/models';
import { apiErrorMessage } from '../core/api-error';
import { AgentService } from '../core/services/agent.service';
import { CurrentUserService } from '../core/services/current-user.service';
import { DepartmentService } from '../core/services/department.service';

@Component({
  selector: 'app-agent-detail',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './agent-detail.component.html',
  styleUrl: './agent-detail.component.css',
})
export class AgentDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly agentsService = inject(AgentService);
  private readonly departmentsService = inject(DepartmentService);
  private readonly currentUser = inject(CurrentUserService);

  readonly agent = signal<Agent | null>(null);
  readonly departments = signal<Department[]>([]);
  readonly skills = signal<AgentSkill[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly message = signal<string | null>(null);
  readonly pending = signal(false);
  readonly isAdmin = this.currentUser.hasRole(UserType.Admin);
  readonly isSupervisor = this.currentUser.hasRole(UserType.Supervisor);
  readonly isProfileRoute = ['agent/profile', 'profile'].includes(this.route.snapshot.routeConfig?.path ?? '');
  readonly managementDraft = { firstName: '', lastName: '', departmentId: 0, isAvailable: true };
  readonly profileDraft = { bio: '', avatarUrl: '', officePhone: '' };

  constructor() {
    this.departmentsService.list().subscribe({ next: (items) => this.departments.set(items) });
    this.agentsService.skills().subscribe({
      next: (items) => {
        this.skills.set(items);
        const agent = this.agent();
        if (agent) {
          this.setDrafts(agent);
        }
      },
    });
    this.load();
  }

  skillText(agent: Agent): string {
    const skills = (agent.skills ?? []).map((skill) => typeof skill === 'string' ? skill : skill.name);
    return skills.length ? skills.join(', ') : 'No skills listed';
  }

  agentDisplayName(agent: Agent): string {
    const firstLast = [agent.firstName, agent.lastName]
      .map((part) => part?.trim())
      .filter((part): part is string => !!part)
      .join(' ');
    return agent.displayName?.trim()
      || agent.fullName?.trim()
      || agent.name?.trim()
      || firstLast
      || agent.email?.trim()
      || 'Agent';
  }

  saveManagement(): void {
    const agent = this.agent();
    if (!agent || this.pending()) return;
    this.pending.set(true);
    this.error.set(null);
    this.agentsService.update(agent.id, {
      firstName: this.managementDraft.firstName.trim(),
      lastName: this.managementDraft.lastName.trim(),
      departmentId: Number(this.managementDraft.departmentId),
      isAvailable: this.managementDraft.isAvailable,
    }).subscribe({
      next: (updated) => {
        this.agent.set(updated);
        this.setDrafts(updated);
        this.message.set('Agent updated.');
        this.pending.set(false);
      },
      error: (error: unknown) => {
        this.error.set(apiErrorMessage(error, 'Could not update agent.'));
        this.pending.set(false);
      },
    });
  }

  saveProfile(): void {
    const agent = this.agent();
    if (!agent || this.pending()) return;
    this.pending.set(true);
    this.error.set(null);
    this.agentsService.updateProfile(agent.id, {
      bio: this.profileDraft.bio.trim() || null,
      avatarUrl: this.profileDraft.avatarUrl.trim() || null,
      officePhone: this.profileDraft.officePhone.trim() || null,
    }).subscribe({
      next: (updated) => {
        this.agent.set(updated);
        this.setDrafts(updated);
        this.message.set('Profile updated.');
        this.pending.set(false);
      },
      error: (error: unknown) => {
        this.error.set(apiErrorMessage(error, 'Could not update profile.'));
        this.pending.set(false);
      },
    });
  }

  deleteAgent(): void {
    const agent = this.agent();
    if (!this.isAdmin || !agent || !confirm(`Delete ${this.agentDisplayName(agent)}?`)) return;
    this.pending.set(true);
    this.agentsService.delete(agent.id).subscribe({
      next: () => void this.router.navigate(['/agents']),
      error: (error: unknown) => {
        this.error.set(apiErrorMessage(error, 'Could not delete agent.'));
        this.pending.set(false);
      },
    });
  }

  private load(): void {
    if (this.isProfileRoute) {
      this.loadProfile();
      return;
    }

    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isInteger(id) || id <= 0) {
      this.loading.set(false);
      this.error.set('This agent link is not valid.');
      return;
    }

    this.agentsService.getById(id).subscribe({
      next: (agent) => {
        this.agent.set(agent);
        this.setDrafts(agent);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.error.set(apiErrorMessage(error, 'Could not load agent.'));
        this.loading.set(false);
      },
    });
  }

  private loadProfile(): void {
    const user = this.currentUser.snapshot();
    if (!user?.id) {
      this.loading.set(false);
      this.error.set('Your staff profile could not be identified.');
      return;
    }

    if (user.agentId) {
      this.agentsService.getById(user.agentId).pipe(
        finalize(() => this.loading.set(false)),
      ).subscribe({
        next: (agent) => {
          this.agent.set(agent);
          this.setDrafts(agent);
        },
        error: (error: unknown) => {
          this.error.set(error instanceof Error ? apiErrorMessage(error, 'Agent profile not found.') : 'Agent profile not found.');
        },
      });
      return;
    }

    this.agentsService.list().pipe(
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: (agents) => {
        const agent = agents.find((item) => item.userId === user.id) ?? null;
        this.agent.set(agent);
        if (agent) {
          this.setDrafts(agent);
        } else {
          this.error.set('Agent profile not found.');
        }
      },
      error: (error: unknown) => {
        this.error.set(apiErrorMessage(error, 'Could not load your agent profile.'));
      },
    });
  }

  private setDrafts(agent: Agent): void {
    this.managementDraft.firstName = agent.firstName ?? '';
    this.managementDraft.lastName = agent.lastName ?? '';
    this.managementDraft.departmentId = agent.departmentId ?? 0;
    this.managementDraft.isAvailable = agent.isAvailable ?? true;
    this.profileDraft.bio = agent.bio ?? '';
    this.profileDraft.avatarUrl = agent.avatarUrl ?? '';
    this.profileDraft.officePhone = agent.officePhone ?? '';
  }
}
