import { HttpClient, HttpEvent, HttpEventType, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Attachment } from '../models';

export type AttachmentUploadProgress =
  | { state: 'progress'; progress: number }
  | { state: 'done'; attachment: Attachment };

@Injectable({ providedIn: 'root' })
export class AttachmentService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiBaseUrl;

  getByTicket(ticketId: number): Observable<Attachment[]> {
    return this.http.get<Attachment[]>(`${this.api}/tickets/${ticketId}/attachments`);
  }

  upload(ticketId: number, file: File, description?: string): Observable<Attachment> {
    const formData = new FormData();
    formData.append('file', file);
    if (description?.trim()) {
      formData.append('description', description.trim());
    }
    return this.http.post<Attachment>(`${this.api}/tickets/${ticketId}/attachments`, formData);
  }

  uploadWithProgress(ticketId: number, file: File, description?: string): Observable<AttachmentUploadProgress> {
    const formData = new FormData();
    formData.append('file', file);
    if (description?.trim()) {
      formData.append('description', description.trim());
    }
    return this.http.post<Attachment>(`${this.api}/tickets/${ticketId}/attachments`, formData, {
      observe: 'events',
      reportProgress: true,
    }).pipe(
      filter((event: HttpEvent<Attachment>) => event.type === HttpEventType.UploadProgress || event.type === HttpEventType.Response),
      map((event: HttpEvent<Attachment>) => {
        if (event.type === HttpEventType.UploadProgress) {
          const progress = event.total ? Math.round((event.loaded / event.total) * 100) : 0;
          return { state: 'progress', progress } as AttachmentUploadProgress;
        }
        return { state: 'done', attachment: (event as HttpResponse<Attachment>).body as Attachment };
      }),
    );
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
