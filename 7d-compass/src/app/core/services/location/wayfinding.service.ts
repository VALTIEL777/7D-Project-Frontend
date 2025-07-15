import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface Wayfinding {
  wayfindingid?: number;
    wayfindingId?: number;
  location: string;
  fromaddressnumber: string;
  fromaddresscardinal: string;
  fromaddressstreet: string;
  fromaddresssuffix: string;
  toaddressnumber: string;
  toaddresscardinal: string;
  toaddressstreet: string;
  toaddresssuffix: string;
  width: number;
  length: number;
  surfacetotal: number;
  createdby?: number;
  updatedby?: number;
}



@Injectable({
  providedIn: 'root'
})
export class WayfindingService {
  private apiUrl = environment.wayfindingServiceUrl; // ✅ Ajusta si usas un prefijo diferente

  constructor(private http: HttpClient) {}

  /** ✅ Obtener todos los wayfinding */
  getAllWayfinding(): Observable<Wayfinding[]> {
    return this.http.get<Wayfinding[]>(this.apiUrl);
  }

  /** ✅ Obtener un wayfinding por ID */
  getWayfindingById(wayfindingId: number): Observable<Wayfinding> {
    return this.http.get<Wayfinding>(`${this.apiUrl}/${wayfindingId}`);
  }

  /** ✅ Crear un nuevo wayfinding */
  createWayfinding(data: Wayfinding): Observable<Wayfinding> {
    return this.http.post<Wayfinding>(this.apiUrl, data);
  }

  /** ✅ Actualizar un wayfinding existente */
  updateWayfinding(wayfindingId: number, data: Partial<Wayfinding>): Observable<Wayfinding> {
    return this.http.put<Wayfinding>(`${this.apiUrl}/${wayfindingId}`, data);
  }

  /** ✅ Eliminar un wayfinding */
  deleteWayfinding(wayfindingId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${wayfindingId}`);
  }
}
