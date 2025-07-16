import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class QuadrantsService {
  private baseUrl = environment.quadrantsServiceUrl; // Ajusta si usas proxy o variable de entorno

  constructor(private http: HttpClient) {}

  /** ✅ Crear un nuevo cuadrante */
  createQuadrant(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}`, data);
  }

  /** ✅ Obtener todos los cuadrantes */
  getAllQuadrants(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}`);
  }

  /** ✅ Obtener cuadrante por ID */
  getQuadrantById(quadrantId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${quadrantId}`);
  }

  /** ✅ Obtener cuadrantes por supervisor */
  getQuadrantsBySupervisor(supervisorId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/supervisor/${supervisorId}`);
  }

  /** ✅ Obtener cuadrantes por zone manager */
  getQuadrantsByZoneManager(zoneManagerId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/zone-manager/${zoneManagerId}`);
  }

  /** ✅ Actualizar cuadrante */
  updateQuadrant(quadrantId: number, data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/${quadrantId}`, data);
  }

  /** ✅ Eliminar cuadrante */
  deleteQuadrant(quadrantId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${quadrantId}`);
  }
}
