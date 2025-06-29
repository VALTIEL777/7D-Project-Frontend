import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface Supplier {
  supplierid?: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  createdat?: string;
  updatedat?: string;
  deletedat?: string | null;
  createdby?: number;
  updatedby?: number;
}

@Injectable({
  providedIn: 'root'
})
export class SupplierService {
  private baseUrl = `${environment.apiUrl}/suppliers`;

  constructor(private http: HttpClient) {}

  // Get all suppliers
  getAllSuppliers(): Observable<Supplier[]> {
    return this.http.get<Supplier[]>(this.baseUrl);
  }

  // Get a supplier by ID
  getSupplierById(id: number): Observable<Supplier> {
    return this.http.get<Supplier>(`${this.baseUrl}/${id}`);
  }

  // Create a new supplier
  createSupplier(supplier: Supplier): Observable<Supplier> {
    return this.http.post<Supplier>(this.baseUrl, supplier);
  }

  // Update a supplier
  updateSupplier(id: number, supplier: Partial<Supplier>): Observable<Supplier> {
    return this.http.put<Supplier>(`${this.baseUrl}/${id}`, supplier);
  }

  // Delete a supplier
  deleteSupplier(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }
}
