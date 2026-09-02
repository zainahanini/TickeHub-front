import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Attachment } from '../models';

@Injectable({ providedIn: 'root' })
export class AttachmentService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiBaseUrl;

  getByTicket(ticketId: number): Observable<Attachment[]> {
    return this.http.get<Attachment[]>(`${this.api}/tickets/${ticketId}/attachments`);
  }

  upload(ticketId: number, file: File): Observable<Attachment> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<Attachment>(`${this.api}/tickets/${ticketId}/attachments`, formData);
  }

  download(ticketId: number, attachmentId: number): Observable<Blob> {
    return this.http.get(`${this.api}/tickets/${ticketId}/attachments/${attachmentId}`, {
      responseType: 'blob',
    });
  }

  delete(ticketId: number, attachmentId: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/tickets/${ticketId}/attachments/${attachmentId}`);
  }
}
