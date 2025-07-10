import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';


@Injectable({
  providedIn: 'root'
})
export class ContractUnitsPhasesService {
  private baseUrl = environment.contractUnitPhasesServiceUrl;

  constructor(private http: HttpClient) {}

  // POST individual
  create(data: any): Observable<any> {
    return this.http.post(this.baseUrl, data);
  }

  // Opcional: GET all
  getAll(): Observable<any[]> {
    return this.http.get<any[]>(this.baseUrl);
  }

  // Opcional: GET by IDs
  getById(contractUnitId: number, necessaryPhaseId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${contractUnitId}/${necessaryPhaseId}`);
  }

 getByContractUnitId(contractUnitId: number): Observable<any[]> {
  return this.http.get<any[]>(`${this.baseUrl}/byContractUnit/${contractUnitId}`);
}



  // Opcional: DELETE
  delete(contractUnitId: number, necessaryPhaseId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${contractUnitId}/${necessaryPhaseId}`);
  }
}
