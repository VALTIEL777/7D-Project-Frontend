import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface Invoice {
  invoiceId?: number;
  ticketId: number;
  invoiceNumber: string;
  invoiceDateRequested: string;
  amountRequested: number;
  status: string;
  invoiceURL?: string;
  createdBy?: number;
  updatedBy?: number;
}

@Injectable({
  providedIn: 'root'
})
export class InvoiceService {
  private baseUrl = environment.invoiceServiceUrl;

  constructor(private http: HttpClient) {}

  // GET all invoices
  getAllInvoices(): Observable<Invoice[]> {
    return this.http.get<Invoice[]>(this.baseUrl);
  }

  // GET invoice by ID
  getInvoiceById(invoiceId: number): Observable<Invoice> {
    return this.http.get<Invoice>(`${this.baseUrl}/${invoiceId}`);
  }

  // POST create a new invoice
  createInvoice(invoice: Invoice): Observable<Invoice> {
    return this.http.post<Invoice>(this.baseUrl, invoice);
  }

  // PUT update an existing invoice
  updateInvoice(invoiceId: number, invoice: Partial<Invoice>): Observable<Invoice> {
    return this.http.put<Invoice>(`${this.baseUrl}/${invoiceId}`, invoice);
  }

  // DELETE an invoice
  deleteInvoice(invoiceId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${invoiceId}`);
  }
}
