import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PhotoEvidenceService {
  private readonly baseUrl = environment.photoEvidenceServiceUrl;

  constructor(private http: HttpClient) {}

  uploadPhotoEvidence(data: FormData): Observable<any> {
    return this.http.post(`${this.baseUrl}`, data);
  }

  getPhotoEvidenceById(photoId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/${photoId}`);
  }

  getAllPhotoEvidence(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}`);
  }

  updatePhotoEvidence(photoId: number, data: FormData): Observable<any> {
    return this.http.put(`${this.baseUrl}/${photoId}`, data);
  }

  deletePhotoEvidence(photoId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${photoId}`);
  }
}
