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

  // POST
  create(data: any): Observable<any> {
    return this.http.post(this.baseUrl, data);
  }

  // GET all
  getAll(): Observable<any[]> {
    return this.http.get<any[]>(this.baseUrl);
  }

  // GET by composite key
  getById(contractUnitId: number, taskStatusId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${contractUnitId}/${taskStatusId}`);
  }

  // GET by contractUnitId
  getByContractUnitId(contractUnitId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/byContractUnit/${contractUnitId}`);
  }

  // DELETE by composite key
  delete(contractUnitId: number, taskStatusId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${contractUnitId}/${taskStatusId}`);
  }
}
