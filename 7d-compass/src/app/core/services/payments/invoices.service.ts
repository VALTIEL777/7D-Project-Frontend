import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface Invoice {
  invoiceId?: number;
  ticketId?: number;
  invoiceNumber: string;
  invoiceDateRequested: string;
  amountRequested: number;
  status: string;
  invoiceURL?: string;
  paymentDate?: string | null;
  createdBy?: number;
  updatedBy?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface InvoiceResponse {
  invoiceId: number;
  invoiceNumber: string;
}

export interface DeleteResponse {
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class InvoiceService {
  private baseUrl = `${environment.apiUrl}/invoices`;

  constructor(private http: HttpClient) { }

  // Get all invoices
  getAllInvoices(): Observable<Invoice[]> {
    return this.http.get<Invoice[]>(this.baseUrl);
  }

  // Get invoice by ID
  getInvoiceById(invoiceId: number): Observable<Invoice> {
    return this.http.get<Invoice>(`${this.baseUrl}/${invoiceId}`);
  }

  // Create new invoice
  createInvoice(invoice: Invoice): Observable<InvoiceResponse> {
    return this.http.post<InvoiceResponse>(this.baseUrl, invoice);
  }

  // Update invoice
  updateInvoice(invoiceId: number, invoice: Partial<Invoice>): Observable<InvoiceResponse> {
    return this.http.put<InvoiceResponse>(`${this.baseUrl}/${invoiceId}`, invoice);
  }

  // Delete invoice
  deleteInvoice(invoiceId: number): Observable<DeleteResponse> {
    return this.http.delete<DeleteResponse>(`${this.baseUrl}/${invoiceId}`);
  }
}
