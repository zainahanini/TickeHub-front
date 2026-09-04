import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { HubConnection } from '@microsoft/signalr';
import { BehaviorSubject, Observable, Subject, from } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  ChatConversation,
  ChatMessage,
  CreateConversationRequest,
  SendChatMessageRequest,
} from '../models';
import { TokenService } from './token.service';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly http = inject(HttpClient);
  private readonly tokens = inject(TokenService);
  private readonly base = `${environment.apiBaseUrl}/chat`;
  private connection: HubConnection | null = null;
  private startPromise: Promise<void> | null = null;
  private readonly incoming = new Subject<ChatMessage>();
  private readonly unreadCountSubject = new BehaviorSubject(0);

  readonly messages$ = this.incoming.asObservable();
  readonly unreadCount$ = this.unreadCountSubject.asObservable();

  conversations(): Observable<ChatConversation[]> {
    return this.http.get<unknown>(`${this.base}/conversations`).pipe(
      map((response) => this.extractConversations(response)),
      tap((items) => this.unreadCountSubject.next(this.sumUnread(items))),
    );
  }

  createConversation(request: CreateConversationRequest = {}): Observable<ChatConversation> {
    return this.http.post<ChatConversation>(`${this.base}/conversations`, request);
  }

  ticketConversation(ticketId: number): Observable<ChatConversation> {
    return this.http.post<ChatConversation>(`${this.base}/tickets/${ticketId}/conversation`, {});
  }

  messages(conversationId: number): Observable<ChatMessage[]> {
    return this.http.get<unknown>(`${this.base}/conversations/${conversationId}/messages`).pipe(
      map((response) => this.extractMessages(response)),
    );
  }

  sendMessage(conversationId: number, body: string): Observable<ChatMessage | void> {
    const request: SendChatMessageRequest = { body };
    if (this.connection?.state === 'Connected') {
      return from(this.connection.invoke<ChatMessage | void>('SendMessage', conversationId, body));
    }
    return this.http.post<ChatMessage>(`${this.base}/conversations/${conversationId}/messages`, request);
  }

  sendMessageRest(conversationId: number, body: string): Observable<ChatMessage> {
    return this.http.post<ChatMessage>(`${this.base}/conversations/${conversationId}/messages`, { body });
  }

  markRead(conversationId: number): Observable<void> {
    return this.http.post<void>(`${this.base}/conversations/${conversationId}/read`, {}).pipe(
      tap(() => this.refreshUnreadCount()),
    );
  }

  async connect(): Promise<void> {
    if (!this.tokens.accessToken) {
      return;
    }
    if (this.connection?.state === 'Connected') {
      return;
    }
    if (this.startPromise) {
      return this.startPromise;
    }

    if (!this.connection) {
      const { HubConnectionBuilder } = await import('@microsoft/signalr');
      this.connection = new HubConnectionBuilder()
        .withUrl(environment.hubUrl, {
          accessTokenFactory: () => this.tokens.accessToken ?? '',
        })
        .withAutomaticReconnect()
        .build();

      this.connection.on('ReceiveMessage', (message: ChatMessage) => {
        this.incoming.next(message);
      });
    }

    this.startPromise = this.connection.start().finally(() => {
      this.startPromise = null;
    });

    return this.startPromise;
  }

  async disconnect(): Promise<void> {
    if (!this.connection) {
      return;
    }
    this.connection.off('ReceiveMessage');
    await this.connection.stop();
    this.connection = null;
    this.startPromise = null;
  }

  applyIncomingUnread(message: ChatMessage, activeConversationId: number | null): void {
    if (message.conversationId && message.conversationId !== activeConversationId) {
      this.unreadCountSubject.next(this.unreadCountSubject.value + 1);
    }
  }

  private refreshUnreadCount(): void {
    this.conversations().subscribe({ error: () => undefined });
  }

  private extractConversations(response: unknown): ChatConversation[] {
    if (Array.isArray(response)) {
      return response as ChatConversation[];
    }
    if (response && typeof response === 'object') {
      const data = response as Record<string, unknown>;
      const items = data['items'] ?? data['data'] ?? data['conversations'];
      return Array.isArray(items) ? items as ChatConversation[] : [];
    }
    return [];
  }

  private extractMessages(response: unknown): ChatMessage[] {
    if (Array.isArray(response)) {
      return response as ChatMessage[];
    }
    if (response && typeof response === 'object') {
      const data = response as Record<string, unknown>;
      const items = data['items'] ?? data['data'] ?? data['messages'];
      return Array.isArray(items) ? items as ChatMessage[] : [];
    }
    return [];
  }

  private sumUnread(conversations: ChatConversation[]): number {
    return conversations.reduce((total, conversation) => total + Number(conversation.unreadCount ?? 0), 0);
  }
}
