import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class EquipmentService {
  private readonly baseUrl = environment.equipmentServiceUrl;

  constructor(private http: HttpClient) {}

  // GET /equipment
  getAllEquipment(): Observable<any[]> {
    return this.http.get<any[]>(this.baseUrl);
  }

  // GET /equipment/:id
  getEquipmentById(equipmentid: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${equipmentid}`);
  }

  // POST /equipment
  createEquipment(equipment: any): Observable<any> {
    return this.http.post<any>(this.baseUrl, equipment);
  }

  // PUT /equipment/:id
  updateEquipment(equipmentid: number, equipment: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/${equipmentid}`, equipment);
  }

  // DELETE /equipment/:id
  deleteEquipment(equipmentid: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/${equipmentid}`);
  }
}
