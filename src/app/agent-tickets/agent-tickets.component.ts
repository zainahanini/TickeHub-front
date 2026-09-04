import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Category, Department, PagedTickets, TicketPriority, TicketQuery, TicketStatus } from '../core/models';
import { CategoryService } from '../core/services/category.service';
import { DepartmentService } from '../core/services/department.service';
import { TicketService } from '../core/services/ticket.service';
import { apiErrorMessage } from '../core/api-error';

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

  readonly results = signal<PagedTickets | null>(null);
  readonly categories = signal<Category[]>([]);
  readonly departments = signal<Department[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly page = signal(1);
  readonly pageSize = 20;
  readonly statuses = Object.values(TicketStatus);
  readonly priorities = Object.values(TicketPriority);
  readonly search = new FormControl('', { nonNullable: true });
  readonly status = new FormControl('', { nonNullable: true });
  readonly priority = new FormControl('', { nonNullable: true });
  readonly categoryId = new FormControl('', { nonNullable: true });
  readonly departmentId = new FormControl('', { nonNullable: true });
  readonly assignedAgentId = new FormControl('', { nonNullable: true });
  readonly unassigned = new FormControl(false, { nonNullable: true });
  readonly overdue = new FormControl(false, { nonNullable: true });
  readonly sortBy = new FormControl('createdAt', { nonNullable: true });
  readonly sortDescending = new FormControl('true', { nonNullable: true });

  constructor() {
    this.categoriesService.lookup().subscribe({ next: (items) => this.categories.set(items) });
    this.departmentsService.list().subscribe({ next: (items) => this.departments.set(items) });
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    const query: TicketQuery = {
      search: this.search.value.trim() || undefined,
      status: (this.status.value || undefined) as TicketStatus | undefined,
      priority: (this.priority.value || undefined) as TicketPriority | undefined,
      categoryId: this.categoryId.value ? Number(this.categoryId.value) : undefined,
      departmentId: this.departmentId.value ? Number(this.departmentId.value) : undefined,
      assignedAgentId: this.assignedAgentId.value ? Number(this.assignedAgentId.value) : undefined,
      unassigned: this.unassigned.value || undefined,
      overdue: this.overdue.value || undefined,
      sortBy: this.sortBy.value,
      sortDescending: this.sortDescending.value === 'true',
      page: this.page(),
      pageSize: this.pageSize,
    };
    this.tickets.listPage(query).subscribe({
      next: (results) => { this.results.set(results); this.loading.set(false); },
      error: (error: unknown) => { this.error.set(apiErrorMessage(error, 'Tickets could not be loaded.')); this.loading.set(false); },
    });
  }

  applyFilters(): void { this.page.set(1); this.load(); }
  reset(): void {
    this.search.reset(''); this.status.reset(''); this.priority.reset(''); this.categoryId.reset('');
    this.departmentId.reset(''); this.assignedAgentId.reset(''); this.unassigned.reset(false); this.overdue.reset(false);
    this.sortBy.reset('createdAt'); this.sortDescending.reset('true'); this.applyFilters();
  }
  next(): void { if (this.results() && this.page() * this.pageSize < this.results()!.totalCount) { this.page.update((value) => value + 1); this.load(); } }
  previous(): void { if (this.page() > 1) { this.page.update((value) => value - 1); this.load(); } }
  pageCount(total: number, size: number): number { return Math.max(1, Math.ceil(total / size)); }
}
