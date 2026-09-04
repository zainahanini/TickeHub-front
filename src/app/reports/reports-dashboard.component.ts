import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { apiErrorMessage } from '../core/api-error';
import { CategorySatisfaction, DailyVolume, Department, ReportFilters, TicketStatistics } from '../core/models';
import { DepartmentService } from '../core/services/department.service';
import { ReportService } from '../core/services/report.service';

@Component({
  selector: 'app-reports-dashboard',
  standalone: true,
  imports: [DatePipe, DecimalPipe, ReactiveFormsModule],
  templateUrl: './reports-dashboard.component.html',
  styleUrl: './reports-dashboard.component.css',
})
export class ReportsDashboardComponent {
  private readonly reports = inject(ReportService);
  private readonly departmentsService = inject(DepartmentService);

  readonly statistics = signal<TicketStatistics | null>(null);
  readonly satisfaction = signal<CategorySatisfaction[]>([]);
  readonly dailyVolume = signal<DailyVolume[]>([]);
  readonly departments = signal<Department[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly from = new FormControl(this.defaultFrom(), { nonNullable: true });
  readonly to = new FormControl(this.today(), { nonNullable: true });
  readonly departmentId = new FormControl('', { nonNullable: true });

  constructor() {
    this.departmentsService.list().subscribe({ next: (items) => this.departments.set(items) });
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    const filters = this.filters();
    forkJoin({
      statistics: this.reports.ticketStatistics(filters),
      satisfaction: this.reports.categorySatisfaction(filters),
      dailyVolume: this.reports.dailyVolume(filters),
    }).subscribe({
      next: (result) => {
        this.statistics.set(result.statistics);
        this.satisfaction.set(result.satisfaction);
        this.dailyVolume.set(result.dailyVolume);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.error.set(apiErrorMessage(error, 'Could not load reports.'));
        this.loading.set(false);
      },
    });
  }

  reset(): void {
    this.from.setValue(this.defaultFrom());
    this.to.setValue(this.today());
    this.departmentId.setValue('');
    this.load();
  }

  satisfactionScore(item: CategorySatisfaction): number {
    const data = item as CategorySatisfaction & Record<string, unknown>;
    return Number(data['averageScore'] ?? data['averageRating'] ?? data['score'] ?? 0);
  }

  satisfactionCount(item: CategorySatisfaction): number {
    const data = item as CategorySatisfaction & Record<string, unknown>;
    return Number(data['responseCount'] ?? data['ratingCount'] ?? data['count'] ?? 0);
  }

  satisfactionWidth(item: CategorySatisfaction): string {
    return `${Math.min(100, Math.max(0, (this.satisfactionScore(item) / 5) * 100))}%`;
  }

  createdCount(item: DailyVolume): number {
    const data = item as DailyVolume & Record<string, unknown>;
    return Number(data['createdCount'] ?? data['created'] ?? data['createdTickets'] ?? 0);
  }

  resolvedCount(item: DailyVolume): number {
    const data = item as DailyVolume & Record<string, unknown>;
    return Number(data['resolvedCount'] ?? data['resolved'] ?? data['resolvedTickets'] ?? 0);
  }

  volumeWidth(value: number): string {
    const max = Math.max(1, ...this.dailyVolume().flatMap((item) => [this.createdCount(item), this.resolvedCount(item)]));
    return `${Math.max(4, (value / max) * 100)}%`;
  }

  private filters(): ReportFilters {
    return {
      from: this.from.value || null,
      to: this.to.value || null,
      departmentId: this.departmentId.value ? Number(this.departmentId.value) : null,
    };
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private defaultFrom(): string {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().slice(0, 10);
  }
}
