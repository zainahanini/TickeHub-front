import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Ticket } from '../core/models';
import { TicketService } from '../core/services/ticket.service';

@Component({
  selector: 'app-ticket-detail',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './ticket-detail.component.html',
  styleUrls: ['../shared/auth-page.css', './ticket-detail.component.css'],
})
export class TicketDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly tickets = inject(TicketService);

  readonly ticket = signal<Ticket | null>(null);
  readonly ticketNumber = signal(this.route.snapshot.queryParamMap.get('ticketNumber') || null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  constructor() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isInteger(id) || id <= 0) {
      this.loading.set(false);
      this.error.set('This ticket link is not valid.');
      return;
    }

    if (this.ticketNumber()) {
      this.loading.set(false);
      return;
    }

    this.tickets.getById(id).subscribe({
      next: (ticket) => {
        this.ticket.set(ticket);
        this.ticketNumber.set(ticket.ticketNumber ?? this.ticketNumber());
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('The report was submitted, but its details could not be loaded. Keep the reference number above.');
      },
    });
  }
}
