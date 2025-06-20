import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  private baseUrl = environment.inventoryServiceUrl;

  constructor(private http: HttpClient) {}

  // Obtener todos los inventarios
  getAllInventory(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}`);
  }

  // Obtener inventario por ID
  getInventoryById(id: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${id}`);
  }

  // Crear inventario
  createInventory(inventory: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}`, inventory);
  }

  // Actualizar inventario por ID
  updateInventory(id: number, inventory: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/${id}`, inventory);
  }

  // Eliminar inventario por ID
  deleteInventory(id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/${id}`);
  }
}
