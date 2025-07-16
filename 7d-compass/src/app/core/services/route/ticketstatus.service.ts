import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';



@Injectable({
  providedIn: 'root'
})
export class TicketStatusService {
  private baseUrl = environment.ticketStatusServiceUrl;  // Ajusta según tu configuración

  constructor(private http: HttpClient) {}

  create(ticketStatus: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}`, ticketStatus);
  }

  getByTicketAndCrew(ticketId: number, crewId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/ticket/${ticketId}/crew/${crewId}`);
  }

  getById(taskStatusId: number, ticketId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${taskStatusId}/${ticketId}`);
  }

  getByTicket(ticketId: number): Observable<any[]> {
  return this.http.get<any[]>(`${this.baseUrl}/ticket/${ticketId}`);
}


  getAll(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}`);
  }

 getCompletedTickets(): Observable<any[]> {
  return this.http.get<any[]>(`${this.baseUrl}/completed`);
}


  update(taskStatusId: number, ticketId: number, ticketStatus: Partial<any>): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/${taskStatusId}/${ticketId}`, ticketStatus);
  }

  delete(taskStatusId: number, ticketId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/${taskStatusId}/${ticketId}`);
  }
}
