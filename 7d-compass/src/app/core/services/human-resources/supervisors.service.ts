import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface AssignedQuadrant {
  quadrantId: number;
  name: string;
  shop?: string | null;
  zone: string;
  relationship: string;
}

export interface Supervisor {
  employeeId?: number;
  userId?: number | null;
  firstname: string;
  lastname: string;
  role: string;
  phone: string;
  email: string;
  createdBy?: number | null;
  updatedBy?: number | null;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  assignedQuadrants?: AssignedQuadrant[];
}

export interface SupervisorResponse {
  employeeId: number;
  firstname: string;
  lastname: string;
}

export interface DeleteResponse {
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class SupervisorsService {
  private baseUrl = `${environment.apiUrl}/people`;

  constructor(private http: HttpClient) { }

  // Get all supervisors with their assigned quadrants
  getAllSupervisors(): Observable<Supervisor[]> {
    return this.http.get<Supervisor[]>(`${this.baseUrl}/with-quadrants`);
  }

  // Get supervisor by ID
  getSupervisorById(employeeId: number): Observable<Supervisor> {
    return this.http.get<Supervisor>(`${this.baseUrl}/${employeeId}`);
  }

  // Create new supervisor
  createSupervisor(supervisor: Supervisor): Observable<SupervisorResponse> {
    return this.http.post<SupervisorResponse>(this.baseUrl, supervisor);
  }

  // Update supervisor
  updateSupervisor(employeeId: number, supervisor: Partial<Supervisor>): Observable<SupervisorResponse> {
    return this.http.put<SupervisorResponse>(`${this.baseUrl}/${employeeId}`, supervisor);
  }

  // Delete supervisor
  deleteSupervisor(employeeId: number): Observable<DeleteResponse> {
    return this.http.delete<DeleteResponse>(`${this.baseUrl}/${employeeId}`);
  }
}
