import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface Fine {
  fineId?: number;
  ticketId: number;
  fineNumber: string;
  fineDate: string;
  paymentDate?: string;
  amount: number;
  status: string;
  fineURL?: string;
  createdBy: number;
  updatedBy: number;
}

@Injectable({
  providedIn: 'root'
})
export class FinesService {
  private apiUrl = environment.fineServiceUrl;

  constructor(private http: HttpClient) {}

  getAllFines(): Observable<Fine[]> {
    return this.http.get<Fine[]>(this.apiUrl);
  }

  getFineById(fineId: number): Observable<Fine> {
    return this.http.get<Fine>(`${this.apiUrl}/${fineId}`);
  }

  createFine(fine: Fine): Observable<Fine> {
    return this.http.post<Fine>(this.apiUrl, fine);
  }

  updateFine(fineId: number, fine: Partial<Fine>): Observable<Fine> {
    return this.http.put<Fine>(`${this.apiUrl}/${fineId}`, fine);
  }

  deleteFine(fineId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${fineId}`);
  }
}
