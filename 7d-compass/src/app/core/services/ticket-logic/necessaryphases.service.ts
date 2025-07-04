import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class NecessaryPhasesService {

  private apiUrl = environment.necessaryPhasesServiceUrl;

  constructor(private http: HttpClient) {}

  // GET all
  getAllPhases(): Observable<any> {
    return this.http.get<any>(this.apiUrl).pipe(
      catchError(this.handleError)
    );
  }

  // GET by ID
  getPhaseById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  // POST create
  createPhase(phase: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, phase).pipe(
      catchError(this.handleError)
    );
  }

  // PUT update
  updatePhase(id: number, phase: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, phase).pipe(
      catchError(this.handleError)
    );
  }

  // DELETE
  deletePhase(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  // Error handler
  private handleError(error: HttpErrorResponse) {
    console.error('API Error:', error);
    return throwError(() => error);
  }
}
