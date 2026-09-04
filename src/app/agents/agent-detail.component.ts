import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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
  readonly isAdmin = this.currentUser.snapshot()?.userType === UserType.Admin;
  readonly isSupervisor = this.currentUser.snapshot()?.userType === UserType.Supervisor;
  readonly isProfileRoute = this.route.snapshot.routeConfig?.path === 'agent/profile';
  readonly managementDraft = { firstName: '', lastName: '', departmentId: 0, isAvailable: true };
  readonly profileDraft = { firstName: '', lastName: '', skillIds: new Set<number>() };

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

  toggleSkill(id: number, checked: boolean): void {
    if (checked) {
      this.profileDraft.skillIds.add(id);
    } else {
      this.profileDraft.skillIds.delete(id);
    }
  }

  hasSkill(id: number): boolean {
    return this.profileDraft.skillIds.has(id);
  }

  skillText(agent: Agent): string {
    const skills = (agent.skills ?? []).map((skill) => typeof skill === 'string' ? skill : skill.name);
    return skills.length ? skills.join(', ') : 'No skills listed';
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
      firstName: this.profileDraft.firstName.trim(),
      lastName: this.profileDraft.lastName.trim(),
      skills: [...this.profileDraft.skillIds],
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
    if (!this.isAdmin || !agent || !confirm(`Delete ${agent.firstName} ${agent.lastName}?`)) return;
    this.pending.set(true);
    this.agentsService.delete(agent.id).subscribe({
      next: () => void this.router.navigate(['/agent/agents']),
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
    const userId = this.currentUser.snapshot()?.id;
    if (!userId) {
      this.loading.set(false);
      this.error.set('Your staff profile could not be identified.');
      return;
    }

    this.agentsService.list().subscribe({
      next: (agents) => {
        const agent = agents.find((item) => item.userId === userId) ?? null;
        this.agent.set(agent);
        if (agent) {
          this.setDrafts(agent);
        } else {
          this.error.set('No agent profile was found for your account.');
        }
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.error.set(apiErrorMessage(error, 'Could not load your agent profile.'));
        this.loading.set(false);
      },
    });
  }

  private setDrafts(agent: Agent): void {
    this.managementDraft.firstName = agent.firstName;
    this.managementDraft.lastName = agent.lastName;
    this.managementDraft.departmentId = agent.departmentId;
    this.managementDraft.isAvailable = agent.isAvailable;
    this.profileDraft.firstName = agent.firstName;
    this.profileDraft.lastName = agent.lastName;
    this.profileDraft.skillIds = new Set(this.selectedSkillIds(agent));
  }

  private selectedSkillIds(agent: Agent): number[] {
    const explicitIds = (agent.skills ?? [])
      .filter((skill): skill is AgentSkill => typeof skill !== 'string')
      .map((skill) => skill.id);
    if (explicitIds.length) {
      return explicitIds;
    }
    const names = new Set((agent.skills ?? [])
      .filter((skill): skill is string => typeof skill === 'string')
      .map((skill) => skill.toLowerCase()));
    return this.skills().filter((skill) => names.has(skill.name.toLowerCase())).map((skill) => skill.id);
  }
}
