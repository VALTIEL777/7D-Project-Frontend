import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PhotoEvidenceService {
  private readonly baseUrl = environment.photoEvidenceServiceUrl;

  constructor(private http: HttpClient) {
    console.log('🔧 PhotoEvidenceService inicializado con URL:', this.baseUrl);
  }

  uploadPhotoEvidence(data: FormData): Observable<any> {
    console.log('🚀 PhotoEvidenceService.uploadPhotoEvidence() llamado');
    console.log('📡 URL de la API:', `${this.baseUrl}`);
    console.log('📦 FormData recibido:', data);

    // Log del contenido del FormData
    console.log('📋 Contenido del FormData:');
    for (let [key, value] of data.entries()) {
      if (value instanceof File) {
        console.log(`  ${key}: File(${value.name}, ${value.type}, ${value.size} bytes)`);
      } else {
        console.log(`  ${key}:`, value);
      }
    }

    return this.http.post(`${this.baseUrl}`, data);
  }

  getPhotoEvidenceById(photoId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/${photoId}`);
  }

  getAllPhotoEvidence(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}`);
  }

  getPhotoEvidenceByTicketId(ticketId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/ticket/${ticketId}`);
  }

  updatePhotoEvidence(photoId: number, data: FormData): Observable<any> {
    return this.http.put(`${this.baseUrl}/${photoId}`, data);
  }

  deletePhotoEvidence(photoId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${photoId}`);
  }

  getPhotoEvidenceFile(photoId: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${photoId}/file`, { responseType: 'blob' });
  }

  // Método para obtener información del archivo (tipo, nombre, etc.)
  getPhotoEvidenceInfo(photoId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/${photoId}`);
  }

  // Método para descargar archivo con nombre específico
  downloadPhotoEvidenceFile(photoId: number, fileName?: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${photoId}/file`, {
      responseType: 'blob',
      headers: {
        'Accept': 'application/octet-stream'
      }
    });
  }

  // Método alternativo para probar diferentes endpoints
  getPhotoEvidenceFileAlternative(photoId: number): Observable<Blob> {
    // Probar con diferentes endpoints comunes
    return this.http.get(`${this.baseUrl}/${photoId}/file`, { responseType: 'blob' });
  }

  /**
   * Batch method to get multiple photo URLs at once
   *
   * API Spec:
   * - Endpoint: POST /api/photoevidence/files
   * - Body: { "photoIds": number[] }
   * - Response: { results: [{ photoId, exists, url?, error? }], notFoundIds: number[] }
   *
   * @param photoIds Array of photo IDs to fetch
   * @returns Observable with batch response containing results and notFoundIds
   *
   * Note: Prefer the returned url values; do not use the stored photoURL
   */
  getBatchPhotoUrls(photoIds: number[]): Observable<any> {
    console.log('📦 Requesting batch URLs for', photoIds.length, 'photos');
    return this.http.post(`${this.baseUrl}/files`, { photoIds });
  }
}
