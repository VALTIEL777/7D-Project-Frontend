import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface Employee {
  employeeId: number;
  fullName: string;
  crewLeader: boolean;
}

export interface Crew {
  crewId?: number;
  type: string;
  workedHours: number;
  photo?: string;
  createdBy?: number;
  updatedBy?: number;
  employees?: Employee[];
}

@Injectable({
  providedIn: 'root'
})
export class CrewsService {
  private baseUrl = environment.crewServiceUrl;

  constructor(private http: HttpClient) {}

  // Obtener todos los crews
  getAllCrews(): Observable<Crew[]> {
    return this.http.get<Crew[]>(`${this.baseUrl}`);
  }

  // Obtener crews con sus empleados
  getCrewsWithEmployees(): Observable<Crew[]> {
    return this.http.get<Crew[]>(`${this.baseUrl}/employees`);
  }

  // Obtener un crew por ID
  getCrewById(crewId: number): Observable<Crew> {
    return this.http.get<Crew>(`${this.baseUrl}/${crewId}`);
  }

  // Crear un nuevo crew
  createCrew(crew: Crew): Observable<Crew> {
    return this.http.post<Crew>(`${this.baseUrl}`, crew);
  }

  // Actualizar un crew por ID
  updateCrew(crewId: number, updatedCrew: Partial<Crew>): Observable<Crew> {
    return this.http.put<Crew>(`${this.baseUrl}/${crewId}`, updatedCrew);
  }

  // Eliminar un crew por ID
  deleteCrew(crewId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/${crewId}`);
  }
}
