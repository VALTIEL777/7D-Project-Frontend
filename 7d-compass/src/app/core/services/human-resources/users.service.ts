import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PeopleService {
  private apiUrl = environment.peopleServiceUrl;

  constructor(private http: HttpClient) {}

  // Get all people with user accounts
  getAllPeople(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/with-users`);
  }

  // Get a person by ID
  getPeopleById(employeeId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${employeeId}`);
  }

  // Create a new person with user account
  createPeople(person: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/with-user`, person);
  }

  // Update a person with user account
  updatePeople(employeeId: number, person: Partial<any>): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${employeeId}/with-user`, person);
  }

  // Soft delete a person with user account
  deletePeople(employeeId: number, deletePayload?: any): Observable<{ message: string }> {
    const payload = deletePayload || { deleteUser: true, updatedBy: 1 };
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${employeeId}/soft-delete`, { body: payload });
  }
}
