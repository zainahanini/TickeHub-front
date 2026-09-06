import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Agent, Ticket, TicketHistoryEntry, TicketWorkflowAction, TicketPriority, UpdateTicketRequest, UserType } from '../core/models';
import { TicketService } from '../core/services/ticket.service';
import { CurrentUserService } from '../core/services/current-user.service';
import { TokenService } from '../core/services/token.service';
import { apiErrorMessage } from '../core/api-error';
import { Attachment, Comment, Rating } from '../core/models';
import { CommentService } from '../core/services/comment.service';
import { AttachmentService } from '../core/services/attachment.service';
import { CategoryService } from '../core/services/category.service';
import { Category } from '../core/models';
import { AgentService } from '../core/services/agent.service';
import { ChatService } from '../core/services/chat.service';
import { WorkflowService } from '../core/services/workflow.service';

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const ALLOWED_ATTACHMENT_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'txt', 'docx'];

@Component({
  selector: 'app-ticket-detail',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule, RouterLink],
  templateUrl: './ticket-detail.component.html',
  styleUrls: ['../shared/auth-page.css', './ticket-detail.component.css'],
})
export class TicketDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly tickets = inject(TicketService);
  private readonly currentUser = inject(CurrentUserService);
  private readonly tokens = inject(TokenService);
  private readonly commentsService = inject(CommentService);
  private readonly attachmentsService = inject(AttachmentService);
  private readonly categoriesService = inject(CategoryService);
  private readonly agentService = inject(AgentService);
  private readonly chatService = inject(ChatService);
  private readonly workflowService = inject(WorkflowService);

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
  readonly ratingScore = new FormControl<number | null>(null, { validators: [Validators.required, Validators.min(1), Validators.max(5)] });
  readonly ratingComment = new FormControl('', { nonNullable: true, validators: [Validators.maxLength(1000)] });
  readonly ratingPending = signal(false);
  readonly priorities = Object.values(TicketPriority);
  readonly categories = signal<Category[]>([]);
  readonly isStaff = this.currentUser.hasRole(UserType.Agent, UserType.Supervisor, UserType.Admin);
  readonly canAssign = this.currentUser.hasRole(UserType.Supervisor, UserType.Admin);
  readonly agents = signal<Agent[]>([]);
  readonly assignmentPending = signal(false);
  readonly chatPending = signal(false);
  readonly selectedAgentId = new FormControl<number | null>(null);
  readonly selectedAttachment = signal<File | null>(null);
  readonly attachmentDescription = new FormControl('', { nonNullable: true, validators: [Validators.maxLength(200)] });
  readonly attachmentUploadPending = signal(false);
  readonly attachmentUploadProgress = signal<number | null>(null);
  readonly internalComment = new FormControl(false, { nonNullable: true });
  readonly editingTicket = signal(false);
  readonly editError = signal<string | null>(null);
  readonly editPending = signal(false);
  readonly workflowReason = new FormControl('', { nonNullable: true, validators: [Validators.maxLength(1000)] });
  readonly editForm = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(5), Validators.maxLength(120)] }),
    description: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(10), Validators.maxLength(4000)] }),
    categoryId: new FormControl<number | null>(null, { validators: [Validators.required] }),
    priority: new FormControl<TicketPriority>(TicketPriority.Medium, { nonNullable: true, validators: [Validators.required] }),
    locationAddress: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(300)] }),
  });

  constructor() {
    this.categoriesService.lookup().subscribe({ next: (categories) => this.categories.set(categories) });
    this.workflowService.statuses().subscribe({ error: () => undefined });
    this.workflowService.transitions().subscribe({ error: () => undefined });
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isInteger(id) || id <= 0) {
      this.loading.set(false);
      this.error.set('This ticket link is not valid.');
      return;
    }

    this.loadTicket(id);
    this.loadWorkflow(id);
    this.loadHistory(id);
    this.loadInteractions(id);
  }

  applyWorkflowAction(action: TicketWorkflowAction): void {
    const id = this.ticketId();
    const targetStatus = action.toStatus ?? action.status ?? action.newStatus ?? action.targetStatus;
    if (!id || action.canExecute === false || this.pendingAction()) {
      return;
    }
    const actionKey = this.workflowActionKey(action);
    const reason = this.workflowReason.value.trim();
    if (this.requiresReason(action) && !reason) {
      this.workflowReason.markAsTouched();
      return;
    }
    if (this.isReopenAction(action)) {
      this.reopenTicket(action);
      return;
    }
    if (!targetStatus) {
      return;
    }
    this.pendingAction.set(actionKey);
    this.tickets.updateStatus(id, { newStatus: targetStatus, reason: reason || null, rowVersion: this.ticket()?.rowVersion }).subscribe({
      next: () => {
        this.workflowReason.reset('');
        this.refreshTicketWorkflowHistory(id);
        this.pendingAction.set(null);
      },
      error: (error: unknown) => {
        this.editError.set(this.conflictMessage(error) ?? apiErrorMessage(error, 'Could not update ticket status.'));
        this.refreshAfterConflict(error);
        this.pendingAction.set(null);
      },
    });
  }

  beginTicketEdit(): void {
    const ticket = this.ticket();
    if (!ticket) return;
    this.editForm.setValue({ title: ticket.title, description: ticket.description, categoryId: ticket.categoryId, priority: ticket.priority, locationAddress: ticket.locationAddress ?? '' });
    this.editingTicket.set(true);
  }

  saveTicket(): void {
    const id = this.ticketId();
    const ticket = this.ticket();
    if (!id || !ticket || this.editForm.invalid || this.editPending()) { this.editForm.markAllAsTouched(); return; }
    const values = this.editForm.getRawValue();
    const request: UpdateTicketRequest = { title: values.title.trim(), description: values.description.trim(), categoryId: values.categoryId as number, priority: values.priority, locationAddress: values.locationAddress.trim() || null, rowVersion: ticket.rowVersion };
    this.editPending.set(true);
    this.editError.set(null);
    this.tickets.update(id, request).subscribe({
      next: (updated) => { this.ticket.set(updated); this.editPending.set(false); this.editingTicket.set(false); },
      error: (error: unknown) => {
        this.editPending.set(false);
        this.editError.set(error instanceof HttpErrorResponse && error.status === 409
          ? 'Another user edited this ticket first. The latest ticket details have been reloaded.'
          : apiErrorMessage(error, 'Could not update the ticket.'));
        this.refreshAfterConflict(error);
      },
    });
  }

  reopenTicket(action?: TicketWorkflowAction): void {
    const id = this.ticketId();
    if (!id || !this.ticket() || this.pendingAction()) return;
    const reason = this.workflowReason.value.trim();
    if (action && this.requiresReason(action) && !reason) {
      this.workflowReason.markAsTouched();
      return;
    }
    this.pendingAction.set(action ? this.workflowActionKey(action) : 'reopen');
    this.tickets.reopen(id, reason || undefined, this.ticket()?.rowVersion).subscribe({
      next: () => { this.workflowReason.reset(''); this.refreshTicketWorkflowHistory(id); this.pendingAction.set(null); },
      error: (error: unknown) => { this.pendingAction.set(null); this.editError.set(this.conflictMessage(error) ?? apiErrorMessage(error, 'Could not reopen the ticket.')); this.refreshAfterConflict(error); },
    });
  }

  addComment(): void {
    if (this.commentBody.invalid) { this.commentBody.markAsTouched(); return; }
    const id = this.ticketId();
    if (!id) return;
    this.commentsService.create(id, this.commentBody.value.trim(), this.isStaff && this.internalComment.value).subscribe({
      next: (comment) => { this.comments.update((items) => [...items, comment]); this.commentBody.reset(''); },
      error: (error: unknown) => this.interactionError.set(apiErrorMessage(error, 'Could not add comment.')),
    });
  }

  beginCommentEdit(comment: Comment): void { this.editingCommentId.set(comment.id); this.commentBody.setValue(comment.body); }

  saveComment(): void {
    const commentId = this.editingCommentId();
    const id = this.ticketId();
    if (!commentId || !id || this.commentBody.invalid) { this.commentBody.markAsTouched(); return; }
    this.commentsService.update(id, commentId, this.commentBody.value.trim(), this.isStaff && this.internalComment.value).subscribe({
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

  deleteAttachment(attachment: Attachment): void {
    const id = this.ticketId();
    if (!id || !this.isStaff || !confirm('Delete this attachment?')) return;
    this.attachmentsService.delete(id, attachment.id).subscribe({
      next: () => this.attachments.update((items) => items.filter((item) => item.id !== attachment.id)),
      error: (error: unknown) => this.interactionError.set(apiErrorMessage(error, 'Could not delete attachment.')),
    });
  }

  assignTicket(): void {
    const id = this.ticketId();
    const agentId = this.selectedAgentId.value;
    if (!id || this.assignmentPending()) return;
    this.assignmentPending.set(true);
    this.tickets.assign(id, agentId).subscribe({
      next: () => { this.refreshTicketWorkflow(id); this.assignmentPending.set(false); },
      error: (error: unknown) => {
        this.assignmentPending.set(false);
        this.interactionError.set(this.conflictMessage(error) ?? apiErrorMessage(error, 'Could not assign this ticket.'));
        this.refreshAfterConflict(error);
      },
    });
  }

  autoAssignTicket(): void {
    const id = this.ticketId();
    if (!id || this.assignmentPending()) return;
    this.assignmentPending.set(true);
    this.agentService.autoAssign(id).subscribe({
      next: () => { this.assignmentPending.set(false); this.refreshTicketWorkflow(id); },
      error: (error: unknown) => {
        this.assignmentPending.set(false);
        this.interactionError.set(this.conflictMessage(error) ?? apiErrorMessage(error, 'Could not auto-assign this ticket.'));
        this.refreshAfterConflict(error);
      },
    });
  }

  selectAttachment(event: Event): void {
    this.interactionError.set(null);
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (!file) {
      this.selectedAttachment.set(null);
      return;
    }
    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!ALLOWED_ATTACHMENT_EXTENSIONS.includes(extension)) {
      this.interactionError.set('Allowed attachment types: jpg, jpeg, png, gif, webp, pdf, txt, docx.');
      input.value = '';
      this.selectedAttachment.set(null);
      return;
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      this.interactionError.set('Attachment must be 10 MB or smaller.');
      input.value = '';
      this.selectedAttachment.set(null);
      return;
    }
    this.selectedAttachment.set(file);
  }

  uploadAttachment(): void {
    const id = this.ticketId();
    const file = this.selectedAttachment();
    if (!id || !file || this.attachmentUploadPending()) return;
    this.attachmentUploadPending.set(true);
    this.attachmentUploadProgress.set(0);
    this.interactionError.set(null);
    this.attachmentsService.uploadWithProgress(id, file, this.attachmentDescription.value).subscribe({
      next: (event) => {
        if (event.state === 'progress') {
          this.attachmentUploadProgress.set(event.progress);
          return;
        }
        this.selectedAttachment.set(null);
        this.attachmentDescription.reset('');
        this.attachmentUploadPending.set(false);
        this.attachmentUploadProgress.set(null);
        this.loadAttachments(id);
      },
      error: (error: unknown) => {
        this.interactionError.set(apiErrorMessage(error, 'Could not upload attachment.'));
        this.attachmentUploadPending.set(false);
        this.attachmentUploadProgress.set(null);
      },
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
      next: () => { this.ratingPending.set(false); this.loadRating(id); },
      error: (error: unknown) => { this.interactionError.set(apiErrorMessage(error, 'Could not submit rating.')); this.ratingPending.set(false); },
    });
  }

  canRateTicket(): boolean {
    const ticket = this.ticket();
    const user = this.currentUser.snapshot();
    return !!ticket
      && !!user
      && this.currentUser.hasRole(UserType.Citizen)
      && ticket.createdByUserId === user.id
      && (ticket.status === 'Resolved' || ticket.status === 'Closed');
  }

  formatBytes(size: number): string {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  private ticketId(): number | null {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    return Number.isInteger(id) && id > 0 ? id : null;
  }

  private loadInteractions(id: number): void {
    this.commentsService.getByTicket(id).subscribe({ next: (comments) => { this.comments.set(comments); this.commentsLoading.set(false); }, error: () => this.commentsLoading.set(false) });
    this.loadAttachments(id);
    this.loadRating(id);
  }

  messageAgent(): void {
    const id = this.ticketId();
    if (!id || this.chatPending()) return;
    this.chatPending.set(true);
    this.interactionError.set(null);
    this.chatService.ticketConversation(id).subscribe({
      next: (conversation) => {
        this.chatPending.set(false);
        void this.router.navigate(['/chat', conversation.id]);
      },
      error: (error: unknown) => {
        this.interactionError.set(apiErrorMessage(error, 'Could not open chat for this ticket.'));
        this.chatPending.set(false);
      },
    });
  }

  private loadWorkflow(id: number): void {
    this.workflowLoading.set(true);
    this.tickets.workflow(id).subscribe({
      next: (workflow) => {
        this.workflow.set(Array.isArray(workflow) ? workflow : workflow.allowedActions ?? []);
        this.workflowLoading.set(false);
      },
      error: () => this.workflowLoading.set(false),
    });
  }

  private loadTicket(id: number): void {
    this.tickets.getById(id).subscribe({
      next: (ticket) => {
        this.ticket.set(ticket);
        this.workflowReason.reset('');
        this.ticketNumber.set(ticket.ticketNumber ?? this.ticketNumber());
        this.selectedAgentId.setValue(ticket.assignedAgentId ?? null, { emitEvent: false });
        if (this.canAssign) {
          this.loadAgentsForTicket(ticket);
        }
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.error.set(apiErrorMessage(error, 'The ticket details could not be loaded.'));
      },
    });
  }

  private loadAgentsForTicket(ticket: Ticket): void {
    this.agentService.list(ticket.departmentId).subscribe({
      next: (agents) => this.agents.set(agents),
      error: () => this.agents.set([]),
    });
  }

  private loadAttachments(id: number): void {
    this.attachmentsLoading.set(true);
    this.attachmentsService.getByTicket(id).subscribe({
      next: (attachments) => { this.attachments.set(attachments); this.attachmentsLoading.set(false); },
      error: () => this.attachmentsLoading.set(false),
    });
  }

  private loadRating(id: number): void {
    this.tickets.getRating(id).subscribe({
      next: (rating) => this.rating.set(rating),
      error: (error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 404) {
          this.rating.set(null);
          return;
        }
        this.interactionError.set(apiErrorMessage(error, 'Could not load rating.'));
      },
    });
  }

  private refreshTicketWorkflow(id: number): void {
    this.loadTicket(id);
    this.loadWorkflow(id);
  }

  private refreshTicketWorkflowHistory(id: number): void {
    this.refreshTicketWorkflow(id);
    this.loadHistory(id);
  }

  private workflowActionKey(action: TicketWorkflowAction): string {
    return action.action ?? action.name ?? action.label ?? action.toStatus ?? action.status ?? action.newStatus ?? action.targetStatus ?? 'workflow';
  }

  private requiresReason(action: TicketWorkflowAction): boolean {
    return action.requiresReason === true || action.reasonRequired === true;
  }

  private isReopenAction(action: TicketWorkflowAction): boolean {
    const key = `${action.action ?? ''} ${action.name ?? ''} ${action.label ?? ''}`.toLowerCase();
    return key.includes('reopen');
  }

  private conflictMessage(error: unknown): string | null {
    return error instanceof HttpErrorResponse && error.status === 409
      ? 'Another user edited this ticket first. The latest ticket details have been reloaded.'
      : null;
  }

  private loadHistory(id: number): void {
    this.tickets.history(id).subscribe({
      next: (history) => this.history.set(history),
    });
  }

  private refreshAfterConflict(error: unknown): void {
    if (!(error instanceof HttpErrorResponse) || error.status !== 409) {
      return;
    }
    const id = this.ticketId();
    if (!id) {
      return;
    }
    this.refreshTicketWorkflowHistory(id);
  }
}
