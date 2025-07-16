import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class EmployeeSkillsService {
  private baseUrl = environment.employeeSkillsServiceUrl;

  constructor(private http: HttpClient) {}

  createEmployeeSkill(data: any): Observable<any> {
    return this.http.post<any>(this.baseUrl, data);
  }

  getEmployeeSkill(employeeId: number, skillId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${employeeId}/${skillId}`);
  }

  getEmployeeSkillsByEmployee(employeeId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/employee/${employeeId}`);
  }

  getAllEmployeeSkills(): Observable<any[]> {
    return this.http.get<any[]>(this.baseUrl);
  }

  updateEmployeeSkill(employeeId: number, skillId: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/${employeeId}/${skillId}`, data);
  }

  deleteEmployeeSkill(employeeId: number, skillId: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/${employeeId}/${skillId}`);
  }
}
