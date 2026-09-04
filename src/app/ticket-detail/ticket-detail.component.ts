import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Ticket, TicketHistoryEntry, TicketWorkflowAction } from '../core/models';
import { TicketService } from '../core/services/ticket.service';
import { CurrentUserService } from '../core/services/current-user.service';
import { TokenService } from '../core/services/token.service';
import { apiErrorMessage } from '../core/api-error';
import { Attachment, Comment, Rating } from '../core/models';
import { CommentService } from '../core/services/comment.service';
import { AttachmentService } from '../core/services/attachment.service';

@Component({
  selector: 'app-ticket-detail',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule, RouterLink],
  templateUrl: './ticket-detail.component.html',
  styleUrls: ['../shared/auth-page.css', './ticket-detail.component.css'],
})
export class TicketDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly tickets = inject(TicketService);
  private readonly currentUser = inject(CurrentUserService);
  private readonly tokens = inject(TokenService);
  private readonly commentsService = inject(CommentService);
  private readonly attachmentsService = inject(AttachmentService);

  readonly isAuthenticated = !!this.currentUser.snapshot() || !!this.tokens.accessToken || !!this.tokens.refreshToken;
  readonly ticket = signal<Ticket | null>(null);
  readonly ticketNumber = signal(this.route.snapshot.queryParamMap.get('ticketNumber') || null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly history = signal<TicketHistoryEntry[]>([]);
  readonly workflow = signal<TicketWorkflowAction[]>([]);
  readonly workflowLoading = signal(true);
  readonly pendingAction = signal<string | null>(null);
  readonly comments = signal<Comment[]>([]);
  readonly attachments = signal<Attachment[]>([]);
  readonly rating = signal<Rating | null>(null);
  readonly commentsLoading = signal(true);
  readonly attachmentsLoading = signal(true);
  readonly interactionError = signal<string | null>(null);
  readonly commentBody = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(1), Validators.maxLength(2000)] });
  readonly editingCommentId = signal<number | null>(null);
  readonly attachmentDescription = new FormControl('', { nonNullable: true, validators: [Validators.maxLength(300)] });
  readonly uploadPending = signal(false);
  readonly ratingScore = new FormControl<number | null>(null, { validators: [Validators.required, Validators.min(1), Validators.max(5)] });
  readonly ratingComment = new FormControl('', { nonNullable: true, validators: [Validators.maxLength(1000)] });
  readonly ratingPending = signal(false);

  constructor() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isInteger(id) || id <= 0) {
      this.loading.set(false);
      this.error.set('This ticket link is not valid.');
      return;
    }

    this.tickets.getById(id).subscribe({
      next: (ticket) => {
        this.ticket.set(ticket);
        this.ticketNumber.set(ticket.ticketNumber ?? this.ticketNumber());
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.error.set(apiErrorMessage(error, 'The ticket details could not be loaded.'));
      },
    });
    this.tickets.workflow(id).subscribe({
      next: (workflow) => {
        this.workflow.set(Array.isArray(workflow) ? workflow : workflow.allowedActions ?? []);
        this.workflowLoading.set(false);
      },
      error: () => this.workflowLoading.set(false),
    });
    this.tickets.history(id).subscribe({
      next: (history) => this.history.set(history),
    });
    this.loadInteractions(id);
  }

  applyWorkflowAction(action: TicketWorkflowAction): void {
    const targetStatus = action.toStatus ?? action.status;
    if (!targetStatus || this.pendingAction()) {
      return;
    }
    const id = Number(this.route.snapshot.paramMap.get('id'));
    const actionKey = action.action ?? action.name ?? targetStatus;
    this.pendingAction.set(actionKey);
    this.tickets.updateStatus(id, targetStatus).subscribe({
      next: (ticket) => {
        this.ticket.set(ticket);
        this.pendingAction.set(null);
      },
      error: () => this.pendingAction.set(null),
    });
  }

  addComment(): void {
    if (this.commentBody.invalid) { this.commentBody.markAsTouched(); return; }
    const id = this.ticketId();
    if (!id) return;
    this.commentsService.create(id, this.commentBody.value.trim()).subscribe({
      next: (comment) => { this.comments.update((items) => [...items, comment]); this.commentBody.reset(''); },
      error: (error: unknown) => this.interactionError.set(apiErrorMessage(error, 'Could not add comment.')),
    });
  }

  beginCommentEdit(comment: Comment): void { this.editingCommentId.set(comment.id); this.commentBody.setValue(comment.body); }

  saveComment(): void {
    const commentId = this.editingCommentId();
    const id = this.ticketId();
    if (!commentId || !id || this.commentBody.invalid) { this.commentBody.markAsTouched(); return; }
    this.commentsService.update(id, commentId, this.commentBody.value.trim()).subscribe({
      next: (comment) => { this.comments.update((items) => items.map((item) => item.id === comment.id ? comment : item)); this.editingCommentId.set(null); this.commentBody.reset(''); },
      error: (error: unknown) => this.interactionError.set(apiErrorMessage(error, 'Could not update comment.')),
    });
  }

  deleteComment(comment: Comment): void {
    const id = this.ticketId();
    if (!id || !comment.canDelete || !confirm('Delete this comment?')) return;
    this.commentsService.delete(id, comment.id).subscribe({
      next: () => this.comments.update((items) => items.filter((item) => item.id !== comment.id)),
      error: (error: unknown) => this.interactionError.set(apiErrorMessage(error, 'Could not delete comment.')),
    });
  }

  uploadAttachment(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const id = this.ticketId();
    if (!file || !id || this.uploadPending()) return;
    this.uploadPending.set(true);
    this.attachmentsService.upload(id, file, this.attachmentDescription.value).subscribe({
      next: (attachment) => { this.attachments.update((items) => [...items, attachment]); this.attachmentDescription.reset(''); input.value = ''; this.uploadPending.set(false); },
      error: (error: unknown) => { this.interactionError.set(apiErrorMessage(error, 'Could not upload attachment.')); this.uploadPending.set(false); },
    });
  }

  downloadAttachment(attachment: Attachment): void {
    const id = this.ticketId();
    if (!id) return;
    this.attachmentsService.download(id, attachment.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = attachment.fileName;
        link.click();
        URL.revokeObjectURL(url);
      },
      error: (error: unknown) => this.interactionError.set(apiErrorMessage(error, 'Could not download attachment.')),
    });
  }

  submitRating(): void {
    if (this.ratingScore.invalid || this.ratingPending()) { this.ratingScore.markAsTouched(); return; }
    const id = this.ticketId();
    if (!id) return;
    this.ratingPending.set(true);
    this.tickets.rate(id, this.ratingScore.value as number, this.ratingComment.value.trim() || undefined).subscribe({
      next: (rating) => { this.rating.set(rating); this.ratingPending.set(false); },
      error: (error: unknown) => { this.interactionError.set(apiErrorMessage(error, 'Could not submit rating.')); this.ratingPending.set(false); },
    });
  }

  private ticketId(): number | null {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    return Number.isInteger(id) && id > 0 ? id : null;
  }

  private loadInteractions(id: number): void {
    this.commentsService.getByTicket(id).subscribe({ next: (comments) => { this.comments.set(comments); this.commentsLoading.set(false); }, error: () => this.commentsLoading.set(false) });
    this.attachmentsService.getByTicket(id).subscribe({ next: (attachments) => { this.attachments.set(attachments); this.attachmentsLoading.set(false); }, error: () => this.attachmentsLoading.set(false) });
    this.tickets.getRating(id).subscribe({ next: (rating) => this.rating.set(rating) });
  }
}
