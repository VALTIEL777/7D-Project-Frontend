import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface Payment {
  checkId?: number;
  paymentNumber: string;
  datePaid: string;
  amountPaid: number;
  status: string;
  paymentURL?: string;
  createdBy?: number;
  updatedBy?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaymentResponse {
  checkId: number;
  paymentNumber: string;
}

export interface DeleteResponse {
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentsService {
  private baseUrl = `${environment.apiUrl}/payments`;

  constructor(private http: HttpClient) { }

  // Get all payments
  getAllPayments(): Observable<Payment[]> {
    return this.http.get<Payment[]>(this.baseUrl);
  }

  // Get payment by ID
  getPaymentById(checkId: number): Observable<Payment> {
    return this.http.get<Payment>(`${this.baseUrl}/${checkId}`);
  }

  // Create new payment
  createPayment(payment: Payment): Observable<PaymentResponse> {
    return this.http.post<PaymentResponse>(this.baseUrl, payment);
  }

  // Update payment
  updatePayment(checkId: number, payment: Partial<Payment>): Observable<PaymentResponse> {
    return this.http.put<PaymentResponse>(`${this.baseUrl}/${checkId}`, payment);
  }

  // Delete payment
  deletePayment(checkId: number): Observable<DeleteResponse> {
    return this.http.delete<DeleteResponse>(`${this.baseUrl}/${checkId}`);
  }
}
