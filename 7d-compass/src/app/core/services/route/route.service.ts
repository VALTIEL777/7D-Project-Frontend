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
    console.log('🛣️ Getting all routes...');
    return this.http.get<any>(`${environment.apiUrl}/routes`);
  }

  // GET /routes/:routeId
  getRouteById(routeId: number): Observable<any> {
    console.log('🛣️ Getting route by ID:', routeId);
    return this.http.get<any>(`${environment.apiUrl}/routes/${routeId}`);
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

  // GET optimized route for locations
  getOptimizedRoute(locations: any[]): Promise<string | null> {
    if (!locations || locations.length < 2) {
      console.log('❌ Not enough locations for route optimization');
      return Promise.resolve(null);
    }

    // Extract coordinates from locations
    const coordinates = locations
      .filter(loc => loc.lat && loc.lng)
      .map(loc => ({ lat: loc.lat, lng: loc.lng }));

    if (coordinates.length < 2) {
      console.log('❌ Not enough coordinates for route optimization');
      return Promise.resolve(null);
    }

    console.log('🛣️ Attempting route optimization...');
    console.log('📍 Locations to optimize:', locations.length);
    console.log('📍 Coordinates available:', coordinates.length);

    // Use the route optimization endpoint (same as route-generator)
    const endpoint = `${environment.apiUrl}/route-optimization/optimize-single`;
    
    // Create temporary ticket IDs for locations that don't have them
    const ticketIds = locations.map((loc, index) => {
      if (loc.ticketid || loc.ticketId) {
        return loc.ticketid || loc.ticketId;
      } else {
        // Create a temporary ID for optimization
        return -(index + 1); // Use negative numbers to avoid conflicts
      }
    }).filter(id => id);
    
    const requestBody = {
      ticketIds: ticketIds,
      routeCode: `UPCOMING-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`,
      type: 'UPCOMING',
      originAddress: "2000 W 43rd St, Chicago, IL 60609, Estados Unidos",
      destinationAddress: "2000 W 43rd St, Chicago, IL 60609, Estados Unidos",
      options: {
        autoSuggest: true,
        minConfidence: 0.8
      }
    };

    console.log('🛣️ Optimization endpoint:', endpoint);
    console.log('🛣️ Request body:', JSON.stringify(requestBody, null, 2));
    console.log('🛣️ Ticket IDs:', ticketIds);

    return new Promise((resolve) => {
      this.http.post(endpoint, requestBody).subscribe({
        next: (response: any) => {
          console.log('✅ Optimization response received:', response);
          if (response && response.encodedPolyline) {
            console.log('✅ Using optimized route from backend');
            resolve(response.encodedPolyline);
          } else {
            console.log('❌ No optimized route available from backend');
            resolve(null);
          }
        },
        error: (error) => {
          console.error('❌ Error getting optimized route:', error);
          console.error('❌ Error details:', {
            status: error.status,
            statusText: error.statusText,
            message: error.message,
            url: error.url
          });
          console.log('🔄 Will use fallback route');
          resolve(null);
        }
      });
    });
  }
}
