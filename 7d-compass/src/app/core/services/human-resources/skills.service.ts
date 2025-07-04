import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SkillsService {
  private apiUrl = environment.skillsServiceUrl;

  constructor(private http: HttpClient) {}

  // Crear una nueva habilidad
  createSkill(data: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, data);
  }

  // Obtener todas las habilidades
  getAllSkills(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  // Obtener una habilidad por ID
  getSkillById(skillId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${skillId}`);
  }

  // Actualizar una habilidad por ID
  updateSkill(skillId: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${skillId}`, data);
  }

  // Eliminar una habilidad por ID
  deleteSkill(skillId: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${skillId}`);
  }
}
