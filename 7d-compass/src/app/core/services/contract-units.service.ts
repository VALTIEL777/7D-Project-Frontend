import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { map } from 'rxjs/operators';

export interface ContractUnit {
  contractUnitId?: number;
  neededMobilization?: number | null;
  neededContractUnit?: number | null;
  itemCode: string;
  name: string;
  unit: string;
  description?: string;
  workNotIncluded?: string | null;
  cdotStandardImg?: string | null;
  costPerUnit: number | null;
  zone?: string;
  paymentClause?: string;
  createdBy?: number;
  updatedBy?: number;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface ContractUnitResponse {
  contractUnitId: number;
  name: string;
}

export interface DeleteResponse {
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class ContractUnitsService {
  private baseUrl = `${environment.apiUrl}/contractunits`;

  constructor(private http: HttpClient) { }

  // Get all contract units
  getAllContractUnits(): Observable<ContractUnit[]> {
    return this.http.get<ContractUnit[]>(this.baseUrl);
  }

  // Get contract unit by ID
  getContractUnitById(contractUnitId: number): Observable<ContractUnit> {
    return this.http.get<ContractUnit>(`${this.baseUrl}/${contractUnitId}`);
  }

  // Create new contract unit
  createContractUnit(contractUnit: ContractUnit): Observable<ContractUnitResponse> {
    return this.http.post<ContractUnitResponse>(this.baseUrl, contractUnit);
  }

  // Update contract unit
  updateContractUnit(contractunitid: number, contractUnit: Partial<ContractUnit>): Observable<ContractUnitResponse> {
    return this.http.put<ContractUnitResponse>(`${this.baseUrl}/${contractunitid}`, contractUnit);
  }

  // Delete contract unit
  deleteContractUnit(contractunitid: number): Observable<DeleteResponse> {
    return this.http.delete<DeleteResponse>(`${this.baseUrl}/${contractunitid}`);
  }
}
