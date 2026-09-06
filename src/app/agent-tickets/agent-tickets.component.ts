import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { Agent, Category, Department, PagedTickets, TicketListItem, TicketPriority, TicketQuery, TicketStatus } from '../core/models';
import { CategoryService } from '../core/services/category.service';
import { DepartmentService } from '../core/services/department.service';
import { TicketService } from '../core/services/ticket.service';
import { apiErrorMessage } from '../core/api-error';
import { AgentService } from '../core/services/agent.service';

@Component({
  selector: 'app-agent-tickets',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule, RouterLink],
  templateUrl: './agent-tickets.component.html',
  styleUrl: './agent-tickets.component.css',
})
export class AgentTicketsComponent {
  private readonly tickets = inject(TicketService);
  private readonly categoriesService = inject(CategoryService);
  private readonly departmentsService = inject(DepartmentService);
  private readonly agentsService = inject(AgentService);

  readonly results = signal<PagedTickets | null>(null);
  readonly items = signal<TicketListItem[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly departments = signal<Department[]>([]);
  readonly agents = signal<Agent[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly page = signal(1);
  readonly pageSize = 20;
  readonly statuses = Object.values(TicketStatus);
  readonly priorities = Object.values(TicketPriority);
  readonly status = new FormControl('', { nonNullable: true });
  readonly priority = new FormControl('', { nonNullable: true });
  readonly categoryId = new FormControl('', { nonNullable: true });
  readonly departmentId = new FormControl('', { nonNullable: true });
  readonly assignedAgentId = new FormControl('', { nonNullable: true });
  readonly unassigned = new FormControl(false, { nonNullable: true });
  readonly overdue = new FormControl(false, { nonNullable: true });
  readonly createdFrom = new FormControl('', { nonNullable: true });
  readonly createdTo = new FormControl('', { nonNullable: true });
  readonly sortBy = new FormControl('createdAt', { nonNullable: true });
  readonly sortDescending = new FormControl('true', { nonNullable: true });

  constructor() {
    this.categoriesService.lookup().subscribe({ next: (items) => this.categories.set(items) });
    this.departmentsService.list().subscribe({ next: (items) => this.departments.set(items) });
    this.agentsService.list().subscribe({ next: (items) => this.agents.set(items) });
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    const query = this.query();
    this.tickets.listPage(query).pipe(
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: (results) => {
        this.results.set(results);
        this.items.set(results.items);
        this.page.set(results.page);
      },
      error: (error: unknown) => {
        this.error.set(apiErrorMessage(error, 'Tickets could not be loaded.'));
        this.items.set([]);
      },
    });
  }

  applyFilters(): void { this.page.set(1); this.load(); }
  reset(): void {
    this.status.reset(''); this.priority.reset(''); this.categoryId.reset('');
    this.departmentId.reset(''); this.assignedAgentId.reset(''); this.unassigned.reset(false); this.overdue.reset(false);
    this.createdFrom.reset(''); this.createdTo.reset('');
    this.sortBy.reset('createdAt'); this.sortDescending.reset('true'); this.applyFilters();
  }
  next(): void { if (this.results()?.hasNext || (this.results() && this.page() * this.results()!.pageSize < this.results()!.totalCount)) { this.page.update((value) => value + 1); this.load(); } }
  previous(): void { if (this.page() > 1) { this.page.update((value) => value - 1); this.load(); } }
  pageCount(total: number, size: number): number { return Math.max(1, Math.ceil(total / size)); }

  private query(): TicketQuery {
    const query: TicketQuery = {
      page: this.page(),
      pageSize: this.pageSize,
      sortBy: this.sortBy.value,
      sortDescending: this.sortDescending.value === 'true',
    };

    if (this.status.value) query.status = this.status.value as TicketStatus;
    if (this.priority.value) query.priority = this.priority.value as TicketPriority;
    if (this.categoryId.value) query.categoryId = Number(this.categoryId.value);
    if (this.departmentId.value) query.departmentId = Number(this.departmentId.value);
    if (this.assignedAgentId.value) query.assignedAgentId = Number(this.assignedAgentId.value);
    if (this.unassigned.value) query.unassigned = true;
    if (this.overdue.value) query.overdue = true;
    if (this.createdFrom.value) query.createdFrom = this.createdFrom.value;
    if (this.createdTo.value) query.createdTo = this.createdTo.value;

    return query;
  }
}
