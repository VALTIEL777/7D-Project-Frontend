import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DiggerService {
  private readonly baseUrl = environment.diggerServiceUrl;

  constructor(private http: HttpClient) {}

  // GET /diggers
  getAllDiggers(): Observable<any[]> {
    return this.http.get<any[]>(this.baseUrl);
  }

  // GET /diggers/:id
  getDiggerById(diggerid: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${diggerid}`);
  }

  // POST /diggers
  createDigger(digger: any): Observable<any> {
    return this.http.post<any>(this.baseUrl, digger);
  }

  // PUT /diggers/:id
  updateDigger(diggerid: number, digger: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/${diggerid}`, digger);
  }

  // DELETE /diggers/:id
  deleteDigger(diggerid: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/${diggerid}`);
  }
}
