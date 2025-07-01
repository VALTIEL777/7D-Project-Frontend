import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

const baseUrl = environment.crewEmployeesServiceUrl;

@Injectable({
  providedIn: 'root'
})
export class CrewEmployeesService {
  constructor(private http: HttpClient) {}

  // POST /crewemployees
  createCrewEmployee(data: any): Observable<any> {
    return this.http.post<any>(baseUrl, data);
  }

  // GET /crewemployees/:crewId/:peopleId
  getCrewEmployee(crewId: number, peopleId: number): Observable<any> {
    return this.http.get<any>(`${baseUrl}/${crewId}/${peopleId}`);
  }

  // GET /crewemployees
  getAllCrewEmployees(): Observable<any[]> {
    return this.http.get<any[]>(baseUrl);
  }

  // PUT /crewemployees/:crewId/:peopleId
  updateCrewEmployee(crewId: number, peopleId: number, updatedData: any): Observable<any> {
    return this.http.put<any>(`${baseUrl}/${crewId}/${peopleId}`, updatedData);
  }

  // DELETE /crewemployees/:crewId/:peopleId
  deleteCrewEmployee(crewId: number, peopleId: number): Observable<any> {
    return this.http.delete<any>(`${baseUrl}/${crewId}/${peopleId}`);
  }
}
