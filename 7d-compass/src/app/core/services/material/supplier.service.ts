import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface Supplier {
  supplierId?: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  createdBy: number;
  updatedBy: number;
}

@Injectable({
  providedIn: 'root'
})
export class SupplierService {
  private baseUrl = environment.supplierServiceUrl;

  constructor(private http: HttpClient) {}

  // Get all suppliers
  getAllSuppliers(): Observable<Supplier[]> {
    return this.http.get<any[]>(this.baseUrl);
  }

  // Get a supplier by ID
  getSupplierById(id: number): Observable<Supplier> {
    return this.http.get<any>(`${this.baseUrl}/${id}`);
  }

  // Create a new supplier
  createSupplier(supplier: Supplier): Observable<Supplier> {
    return this.http.post<any>(this.baseUrl, supplier);
  }

  // Update a supplier
  updateSupplier(id: number, supplier: Partial<Supplier>): Observable<Supplier> {
    return this.http.put<any>(`${this.baseUrl}/${id}`, supplier);
  }

  // Delete a supplier
  deleteSupplier(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }
}
