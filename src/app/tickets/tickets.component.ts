import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { apiErrorMessage } from '../core/api-error';
import { Category, PagedTickets, TicketListItem, TicketPriority, TicketQuery, TicketStatus } from '../core/models';
import { CategoryService } from '../core/services/category.service';
import { TicketService } from '../core/services/ticket.service';

@Component({
  selector: 'app-tickets',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule, RouterLink],
  templateUrl: './tickets.component.html',
  styleUrl: './tickets.component.css',
})
export class TicketsComponent {
  private readonly tickets = inject(TicketService);
  private readonly categoriesService = inject(CategoryService);

  readonly mine = signal<TicketListItem[]>([]);
  readonly results = signal<PagedTickets | null>(null);
  readonly categories = signal<Category[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly mode = signal<'mine' | 'search'>('mine');
  readonly page = signal(1);
  readonly pageSize = 10;
  readonly pageCount = (totalCount: number, size: number): number => Math.max(1, Math.ceil(totalCount / size));
  readonly priorities = Object.values(TicketPriority);
  readonly statuses = Object.values(TicketStatus);
  readonly search = new FormControl('', { nonNullable: true });
  readonly status = new FormControl('', { nonNullable: true });
  readonly priority = new FormControl('', { nonNullable: true });
  readonly categoryId = new FormControl('', { nonNullable: true });
  readonly sortBy = new FormControl('createdAt', { nonNullable: true });
  readonly sortDescending = new FormControl('true', { nonNullable: true });

  constructor() {
    this.categoriesService.lookup().subscribe({ next: (categories) => this.categories.set(categories) });
    this.loadMine();
  }

  showMine(): void {
    this.mode.set('mine');
    this.results.set(null);
    this.loadMine();
  }

  showSearch(): void {
    this.mode.set('search');
    this.mine.set([]);
    this.page.set(1);
    this.searchTickets();
  }

  searchTickets(): void {
    this.loading.set(true);
    this.error.set(null);
    const query: TicketQuery = {
      search: this.search.value.trim() || undefined,
      status: (this.status.value || undefined) as TicketStatus | undefined,
      priority: (this.priority.value || undefined) as TicketPriority | undefined,
      categoryId: this.categoryId.value ? Number(this.categoryId.value) : undefined,
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

  applyFilters(): void {
    this.page.set(1);
    this.searchTickets();
  }
  resetFilters(): void {
    this.search.reset('');
    this.status.reset('');
    this.priority.reset('');
    this.categoryId.reset('');
    this.sortBy.reset('createdAt');
    this.sortDescending.reset('true');
    this.page.set(1);
    this.searchTickets();
  }

  nextPage(): void {
    if (this.results() && this.page() * this.pageSize < this.results()!.totalCount) {
      this.page.update((page) => page + 1);
      this.searchTickets();
    }
  }

  previousPage(): void {
    if (this.page() > 1) {
      this.page.update((page) => page - 1);
      this.searchTickets();
    }
  }

  private loadMine(): void {
    this.loading.set(true);
    this.error.set(null);
    this.tickets.mine().subscribe({
      next: (tickets) => { this.mine.set(tickets); this.loading.set(false); },
      error: () => { this.error.set('Your tickets could not be loaded.'); this.loading.set(false); },
    });
  }
}
