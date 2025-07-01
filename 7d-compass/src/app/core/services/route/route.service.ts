import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class RoutesService {
  private readonly baseUrl = environment.routeServiceUrl;

  constructor(private http: HttpClient) {}

  // GET /routes
  getAllRoutes(): Observable<any> {
    return this.http.get<any>(this.baseUrl);
  }

  // GET /routes/:routeId
  getRouteById(routeId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${routeId}`);
  }

  // POST /routes
  createRoute(route: any): Observable<any> {
    return this.http.post<any>(this.baseUrl, route);
  }

  // PUT /routes/:routeId
  updateRoute(routeId: number, route: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/${routeId}`, route);
  }

  // DELETE /routes/:routeId
  deleteRoute(routeId: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/${routeId}`);
  }
}
