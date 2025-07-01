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

  // Obtener lista de todos los empleados
  getAllPeople(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  // Obtener un empleado por ID
  getPeopleById(employeeId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${employeeId}`);
  }

  // Crear un nuevo empleado
  createPeople(person: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, person);
  }

  // Actualizar un empleado por ID
  updatePeople(employeeId: number, person: Partial<any>): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${employeeId}`, person);
  }

  // Eliminar un empleado por ID
  deletePeople(employeeId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${employeeId}`);
  }
}
