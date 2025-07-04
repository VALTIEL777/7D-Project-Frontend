import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UsedEquipmentService {
  private apiUrl = environment.usedequipmentServiceUrl;

  constructor(private http: HttpClient) {}

  // Crear un registro de equipo usado
  createUsedEquipment(equipment: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, equipment);
  }

  // Obtener todos los registros
  getAllUsedEquipment(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  // Obtener un registro por CrewId y equipmentId
  getUsedEquipmentById(crewId: number, equipmentId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${crewId}/${equipmentId}`);
  }

  // Actualizar un registro
  updateUsedEquipment(crewId: number, equipmentId: number, updatedData: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${crewId}/${equipmentId}`, updatedData);
  }

  // Eliminar un registro
  deleteUsedEquipment(crewId: number, equipmentId: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${crewId}/${equipmentId}`);
  }
}
