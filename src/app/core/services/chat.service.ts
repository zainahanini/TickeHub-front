import { Injectable, inject } from '@angular/core';
import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
} from '@microsoft/signalr';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ChatMessage } from '../models';
import { TokenService } from './token.service';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly tokens = inject(TokenService);
  private connection: HubConnection | null = null;
  private readonly incoming = new Subject<ChatMessage>();
  readonly messages$ = this.incoming.asObservable();

  async connect(ticketId: number): Promise<void> {
    await this.disconnect();

    this.connection = new HubConnectionBuilder()
      .withUrl(environment.hubUrl, {
        accessTokenFactory: () => this.tokens.accessToken ?? '',
      })
      .withAutomaticReconnect()
      .build();

    this.connection.on('ReceiveMessage', (message: ChatMessage) => {
      this.incoming.next(message);
    });

    await this.connection.start();
    await this.connection.invoke('JoinTicket', ticketId);
  }

  sendMessage(ticketId: number, body: string): Observable<void> {
    return new Observable<void>((subscriber) => {
      const connection = this.connection;
      if (!connection || connection.state !== HubConnectionState.Connected) {
        subscriber.error(new Error('Chat is not connected'));
        return;
      }

      connection
        .invoke('SendMessage', ticketId, body)
        .then(() => {
          subscriber.next();
          subscriber.complete();
        })
        .catch((error) => subscriber.error(error));
    });
  }

  async disconnect(): Promise<void> {
    if (!this.connection) {
      return;
    }
    this.connection.off('ReceiveMessage');
    await this.connection.stop();
    this.connection = null;
  }
}
