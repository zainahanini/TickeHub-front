import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Agent, AgentSkill, Department, UserType } from '../core/models';
import { AgentService } from '../core/services/agent.service';
import { DepartmentService } from '../core/services/department.service';
import { CurrentUserService } from '../core/services/current-user.service';
import { apiErrorMessage } from '../core/api-error';

@Component({
  selector: 'app-agents',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './agents.component.html',
  styleUrl: './agents.component.css',
})
export class AgentsComponent {
  private readonly agentsService = inject(AgentService);
  private readonly departmentsService = inject(DepartmentService);
  private readonly currentUser = inject(CurrentUserService);

  readonly agents = signal<Agent[]>([]);
  readonly departments = signal<Department[]>([]);
  readonly skills = signal<AgentSkill[]>([]);
  readonly error = signal<string | null>(null);
  readonly loading = signal(true);
  readonly pendingId = signal<number | null>(null);
  readonly isAdmin = this.currentUser.snapshot()?.userType === UserType.Admin;
  readonly isSupervisor = this.currentUser.snapshot()?.userType === UserType.Supervisor;
  readonly editingId = signal<number | null>(null);
  readonly creating = signal(false);
  readonly draft = { firstName: '', lastName: '', departmentId: 0, isAvailable: true };
  readonly createDraft = { userId: 0, firstName: '', lastName: '', departmentId: 0, isAvailable: true };

  constructor() {
    this.load();
    this.departmentsService.list().subscribe({ next: (items) => this.departments.set(items) });
    this.agentsService.skills().subscribe({ next: (items) => this.skills.set(items) });
  }

  load(): void {
    this.loading.set(true);
    this.agentsService.list().subscribe({ next: (items) => { this.agents.set(items); this.loading.set(false); }, error: (error: unknown) => { this.error.set(apiErrorMessage(error, 'Could not load agents.')); this.loading.set(false); } });
  }

  beginEdit(agent: Agent): void {
    this.editingId.set(agent.id);
    this.draft.firstName = agent.firstName;
    this.draft.lastName = agent.lastName;
    this.draft.departmentId = agent.departmentId;
    this.draft.isAvailable = agent.isAvailable;
  }

  beginCreate(): void {
    const firstDepartment = this.departments()[0]?.id ?? 0;
    this.createDraft.userId = 0;
    this.createDraft.firstName = '';
    this.createDraft.lastName = '';
    this.createDraft.departmentId = firstDepartment;
    this.createDraft.isAvailable = true;
    this.creating.set(true);
  }

  create(): void {
    if (!this.isAdmin || this.pendingId() || !this.createDraft.userId || !this.createDraft.departmentId) {
      return;
    }
    this.pendingId.set(0);
    this.error.set(null);
    this.agentsService.create({
      userId: Number(this.createDraft.userId),
      firstName: this.createDraft.firstName.trim(),
      lastName: this.createDraft.lastName.trim(),
      departmentId: Number(this.createDraft.departmentId),
      isAvailable: this.createDraft.isAvailable,
    }).subscribe({
      next: (created) => {
        this.agents.update((items) => [created, ...items]);
        this.creating.set(false);
        this.pendingId.set(null);
      },
      error: (error: unknown) => {
        this.error.set(apiErrorMessage(error, 'Could not create agent.'));
        this.pendingId.set(null);
      },
    });
  }

  save(agent: Agent): void {
    this.pendingId.set(agent.id);
    this.agentsService.update(agent.id, this.draft).subscribe({ next: (updated) => { this.agents.update((items) => items.map((item) => item.id === updated.id ? updated : item)); this.editingId.set(null); this.pendingId.set(null); }, error: (error: unknown) => { this.error.set(apiErrorMessage(error, 'Could not update agent.')); this.pendingId.set(null); } });
  }

  remove(agent: Agent): void {
    if (!this.isAdmin || !confirm(`Delete ${agent.firstName} ${agent.lastName}?`)) return;
    this.pendingId.set(agent.id);
    this.agentsService.delete(agent.id).subscribe({ next: () => { this.agents.update((items) => items.filter((item) => item.id !== agent.id)); this.pendingId.set(null); }, error: (error: unknown) => { this.error.set(apiErrorMessage(error, 'Could not delete agent.')); this.pendingId.set(null); } });
  }

  skillText(agent: Agent): string {
    const skills = (agent.skills ?? []).map((skill) => typeof skill === 'string' ? skill : skill.name);
    return skills.length ? skills.join(', ') : 'No skills listed';
  }
}
