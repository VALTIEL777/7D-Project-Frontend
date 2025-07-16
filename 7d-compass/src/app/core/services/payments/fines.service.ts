import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface Fine {
  fineid?: number;
  ticketid: number;
  finenumber: string;
  finedate: string;      // formato 'YYYY-MM-DD'
  paymentdate?: string;  // opcional
  amount: string;        // Nota: según el ejemplo viene como string "300.00"
  status: string;        // Ej: "Paid" | "Outstanding"
  fineurl?: string;
  createdby: number;
  updatedby: number;
  createdat?: string;
  updatedat?: string;
  deletedat?: string | null;
}


@Injectable({
  providedIn: 'root'
})
export class FinesService {
  private apiUrl = environment.fineServiceUrl; // ✅ Ajusta a tu URL real

  constructor(private http: HttpClient) {}

  /** Crear multa */
  createFine(fine: Fine): Observable<Fine> {
    return this.http.post<Fine>(this.apiUrl, fine);
  }

  /** Obtener multa por ID */
  getFineById(fineId: number): Observable<Fine> {
    return this.http.get<Fine>(`${this.apiUrl}/${fineId}`);
  }

  /** Obtener todas las multas */
  getAllFines(): Observable<Fine[]> {
    return this.http.get<Fine[]>(this.apiUrl);
  }

  /** Actualizar multa */
  updateFine(fineId: number, fine: Partial<Fine>): Observable<Fine> {
    return this.http.put<Fine>(`${this.apiUrl}/${fineId}`, fine);
  }

  /** Eliminar multa (Soft delete) */
  deleteFine(fineId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${fineId}`);
  }
}
