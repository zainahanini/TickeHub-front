import { DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, debounceTime } from 'rxjs';
import { apiErrorMessage } from '../core/api-error';
import { ChatConversation, ChatMessage } from '../core/models';
import { ChatService, TypingNotification } from '../core/services/chat.service';
import { CurrentUserService } from '../core/services/current-user.service';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule, RouterLink],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.css',
})
export class ChatComponent {
  private readonly chat = inject(ChatService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly currentUser = inject(CurrentUserService);
  private readonly destroyRef = inject(DestroyRef);

  readonly conversations = signal<ChatConversation[]>([]);
  readonly activeConversation = signal<ChatConversation | null>(null);
  readonly messages = signal<ChatMessage[]>([]);
  readonly loadingConversations = signal(true);
  readonly loadingMessages = signal(false);
  readonly sending = signal(false);
  readonly creating = signal(false);
  readonly error = signal<string | null>(null);
  readonly messageBody = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(2000)],
  });
  readonly subject = new FormControl('', {
    nonNullable: true,
    validators: [Validators.maxLength(160)],
  });
  readonly typingName = signal<string | null>(null);
  private readonly typingInput = new Subject<void>();
  private typingTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.loadConversations();

    this.route.paramMap
      .pipe(takeUntilDestroyed())
      .subscribe((params) => {
        const id = Number(params.get('id'));
        if (Number.isInteger(id) && id > 0) {
          this.openConversation(id);
        } else {
          this.activeConversation.set(null);
          this.messages.set([]);
        }
      });

    this.chat.messages$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((message) => this.handleIncomingMessage(message));

    this.chat.typing$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((typing) => this.handleTyping(typing));

    this.typingInput
      .pipe(debounceTime(700), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const active = this.activeConversation();
        if (active) {
          this.chat.userTyping(active.id);
        }
      });
  }

  createConversation(): void {
    if (this.creating()) return;
    this.creating.set(true);
    this.error.set(null);
    this.chat.createConversation({ subject: this.subject.value.trim() || null }).subscribe({
      next: (conversation) => {
        this.conversations.update((items) => [conversation, ...items.filter((item) => item.id !== conversation.id)]);
        this.subject.reset('');
        this.creating.set(false);
        void this.router.navigate(['/chat', conversation.id]);
      },
      error: (error: unknown) => {
        this.error.set(apiErrorMessage(error, 'Could not create conversation.'));
        this.creating.set(false);
      },
    });
  }

  selectConversation(conversation: ChatConversation): void {
    void this.router.navigate(['/chat', conversation.id]);
  }

  send(): void {
    const active = this.activeConversation();
    const body = this.messageBody.value.trim();
    if (!active || !body || this.messageBody.invalid || this.sending()) {
      this.messageBody.markAsTouched();
      return;
    }

    this.sending.set(true);
    this.error.set(null);
    this.chat.sendMessage(active.id, body).subscribe({
      next: (message) => {
        if (message) {
          this.appendMessage(message);
        }
        this.messageBody.reset('');
        this.sending.set(false);
      },
      error: (error: unknown) => {
        this.error.set(apiErrorMessage(error, 'Could not send message.'));
        this.sending.set(false);
      },
    });
  }

  notifyTyping(): void {
    if (this.activeConversation()) {
      this.typingInput.next();
    }
  }

  title(conversation: ChatConversation): string {
    return conversation.title
      ?? conversation.subject
      ?? conversation.ticketNumber
      ?? (conversation.ticketId ? `Ticket ${conversation.ticketId}` : `Conversation ${conversation.id}`);
  }

  timestamp(conversation: ChatConversation): string | null {
    return conversation.lastMessageAt ?? conversation.updatedAt ?? conversation.createdAt ?? null;
  }

  isMine(message: ChatMessage): boolean {
    const userId = this.currentUser.snapshot()?.id;
    return message.isMine === true || (!!userId && message.senderUserId === userId);
  }

  private loadConversations(): void {
    this.loadingConversations.set(true);
    this.chat.conversations().subscribe({
      next: (items) => {
        this.conversations.set(items);
        this.loadingConversations.set(false);
        const id = Number(this.route.snapshot.paramMap.get('id'));
        if (Number.isInteger(id) && id > 0) {
          this.setActiveFromList(id);
        }
      },
      error: (error: unknown) => {
        this.error.set(apiErrorMessage(error, 'Could not load conversations.'));
        this.loadingConversations.set(false);
      },
    });
  }

  private openConversation(id: number): void {
    this.setActiveFromList(id);
    this.loadingMessages.set(true);
    this.error.set(null);
    this.chat.messages(id).subscribe({
      next: (messages) => {
        this.messages.set(messages);
        this.loadingMessages.set(false);
        this.markRead(id);
      },
      error: (error: unknown) => {
        this.error.set(apiErrorMessage(error, 'Could not load messages.'));
        this.loadingMessages.set(false);
      },
    });
  }

  private setActiveFromList(id: number): void {
    const active = this.conversations().find((conversation) => conversation.id === id) ?? this.activeConversation();
    if (!active || active.id !== id) {
      this.activeConversation.set({ id });
      return;
    }
    this.activeConversation.set(active);
  }

  private markRead(id: number): void {
    this.chat.markRead(id).subscribe({
      next: () => {
        this.conversations.update((items) => items.map((item) => item.id === id ? { ...item, unreadCount: 0 } : item));
      },
      error: () => undefined,
    });
  }

  private handleIncomingMessage(message: ChatMessage): void {
    const active = this.activeConversation();
    const activeId = active?.id ?? null;
    const messageConversationId = message.conversationId
      ?? this.conversations().find((conversation) => conversation.ticketId === message.ticketId)?.id
      ?? null;

    if (messageConversationId === activeId || (!messageConversationId && active?.ticketId === message.ticketId)) {
      this.appendMessage(message);
      if (activeId) {
        this.markRead(activeId);
      }
      return;
    }

    this.chat.applyIncomingUnread({ ...message, conversationId: messageConversationId ?? undefined }, activeId);
    if (messageConversationId) {
      this.conversations.update((items) => items.map((item) => item.id === messageConversationId
        ? { ...item, unreadCount: Number(item.unreadCount ?? 0) + 1, lastMessagePreview: message.body, lastMessageAt: message.sentAt }
        : item));
    }
  }

  private handleTyping(typing: TypingNotification): void {
    const active = this.activeConversation();
    const user = this.currentUser.snapshot();
    if (!active || typing.conversationId !== active.id || typing.userId === user?.id) {
      return;
    }

    this.typingName.set(typing.userName ?? typing.displayName ?? 'Someone');
    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
    }
    this.typingTimer = setTimeout(() => this.typingName.set(null), 2500);
  }

  private appendMessage(message: ChatMessage): void {
    this.messages.update((items) => items.some((item) => item.id === message.id)
      ? items
      : [...items, message]);
  }
}
