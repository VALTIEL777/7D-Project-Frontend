import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Ticket {
  ticketId?: number;
  ticketid?: number;
  incidentId?: number;
  incidentName?: string;
  quadrantId?: number;
  contractUnitId?: number;
  contractUnitName?: string;
  wayfindingId?: number;
    wayfindingid?: number;
  paymentId?: number | null;
  mobilizationId?: number | null;
  ticketCode: string;
  ticketcode: string;
  quantity: number;
  daysOutstanding: number | null;
  comment7d: string | null;
  partnerComment: string | null;
  partnerSupervisorComment: string | null;
  contractNumber: string | null;
  amountToPay: number | null;
  ticketType: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  createdBy?: number;
  updatedBy?: number;
}

export interface TicketResponse {
  ticketid: number;
  ticketcode: string;
}

export interface DeleteResponse {
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class TicketService {
  private baseUrl = environment.ticketServiceUrl;

  constructor(private http: HttpClient) {}

  // Get all tickets
  getAllTickets(): Observable<Ticket[]> {
    return this.http.get<Ticket[]>(`${this.baseUrl}`);
  }

  // Get ticket by ID
  getTicketById(id: number): Observable<Ticket> {
    return this.http.get<Ticket>(`${this.baseUrl}/${id}`);
  }

  // Create ticket
  createTicket(ticket: Ticket): Observable<Ticket> {
    return this.http.post<Ticket>(`${this.baseUrl}`, ticket);
  }

  // Update ticket by ID
  updateTicket(id: number, ticket: Ticket): Observable<Ticket> {
    return this.http.put<Ticket>(`${this.baseUrl}/${id}`, ticket);
  }

  // Delete ticket by ID
  deleteTicket(id: number): Observable<DeleteResponse> {
    return this.http.delete<DeleteResponse>(`${this.baseUrl}/${id}`);
  }
}
