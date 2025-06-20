import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

// Define interfaz para People (ajusta si agregas más campos)
export interface People {
  employeeId?: number;
  username?: string;
  UserId: number;
  firstname: string;
  lastname: string;
  role?: string;
  phone?: string;
  email?: string;
  createdBy?: number;
  updatedBy?: number;
}

@Injectable({
  providedIn: 'root'
})
export class PeopleService {
  private apiUrl = environment.peopleServiceUrl;

  constructor(private http: HttpClient) {}

  // Obtener lista de todos los empleados
  getAllPeople(): Observable<People[]> {
    return this.http.get<People[]>(this.apiUrl);
  }

  // Obtener un empleado por ID
  getPeopleById(employeeId: number): Observable<People> {
    return this.http.get<People>(`${this.apiUrl}/${employeeId}`);
  }

  // Crear un nuevo empleado
  createPeople(person: People): Observable<People> {
    return this.http.post<People>(this.apiUrl, person);
  }

  // Actualizar un empleado por ID
  updatePeople(employeeId: number, person: Partial<People>): Observable<People> {
    return this.http.put<People>(`${this.apiUrl}/${employeeId}`, person);
  }

  // Eliminar un empleado por ID
  deletePeople(employeeId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${employeeId}`);
  }
}
