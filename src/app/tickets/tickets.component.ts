import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TicketListItem } from '../core/models';
import { TicketService } from '../core/services/ticket.service';

@Component({
  selector: 'app-tickets',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './tickets.component.html',
  styleUrl: './tickets.component.css',
})
export class TicketsComponent {
  private readonly tickets = inject(TicketService);

  readonly mine = signal<TicketListItem[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  constructor() {
    this.loadMine();
  }

  private loadMine(): void {
    this.loading.set(true);
    this.error.set(null);
    this.tickets.mine().subscribe({
      next: (tickets) => {
        this.mine.set(tickets);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Your tickets could not be loaded.');
        this.loading.set(false);
      },
    });
  }
}
