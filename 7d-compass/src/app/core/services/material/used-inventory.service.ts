import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UsedInventoryService {
  private apiUrl = environment.usedinventoryServiceUrl ;

  constructor(private http: HttpClient) {}

  // Crear registro de inventario usado
  createUsedInventory(data: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, data);
  }

  // Obtener todos los registros
  getAllUsedInventory(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  // Obtener un registro por CrewId e inventoryId
  getUsedInventoryById(crewId: number, inventoryId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${crewId}/${inventoryId}`);
  }

  // Actualizar un registro
  updateUsedInventory(crewId: number, inventoryId: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${crewId}/${inventoryId}`, data);
  }

  // Eliminar un registro
  deleteUsedInventory(crewId: number, inventoryId: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${crewId}/${inventoryId}`);
  }
}
