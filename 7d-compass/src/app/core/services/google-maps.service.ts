import { Injectable } from '@angular/core';
import { Observable, fromEvent, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

// Google Maps type declarations
declare global {
  interface Window {
    google: any;
  }
}

const google = window.google;

export interface MapLocation {
  lat: number;
  lng: number;
  address?: string;
}

export interface RouteSegment {
  origin: MapLocation;
  destination: MapLocation;
  distance: number;
  duration: number;
  polyline: string;
}

export interface OptimizedRoute {
  segments: RouteSegment[];
  totalDistance: number;
  totalDuration: number;
  waypoints: MapLocation[];
}

@Injectable({
  providedIn: 'root'
})
export class GoogleMapsService {
  private googleMapsLoaded = false;
  private directionsService: any;
  private geocoder: any;

  constructor() {
    this.loadGoogleMapsScript();
  }

  /**
   * Load Google Maps JavaScript API
   */
  private loadGoogleMapsScript(): void {
    if (this.googleMapsLoaded) return;

    const script = document.createElement('script');
    script.src = 'https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&libraries=geometry,places';
    script.async = true;
    script.defer = true;

    script.onload = () => {
      this.googleMapsLoaded = true;
      this.initializeServices();
    };

    document.head.appendChild(script);
  }

  /**
   * Initialize Google Maps services
   */
  private initializeServices(): void {
    if (typeof window.google !== 'undefined') {
      this.directionsService = new window.google.maps.DirectionsService();
      this.geocoder = new window.google.maps.Geocoder();
    }
  }

  /**
   * Geocode an address to get coordinates
   */
  geocodeAddress(address: string): Observable<MapLocation> {
    return new Observable(observer => {
      if (!this.geocoder) {
        observer.error('Google Maps not loaded');
        return;
      }

      this.geocoder.geocode({ address }, (results: any, status: any) => {
        if (status === 'OK' && results[0]) {
          const location = results[0].geometry.location;
          observer.next({
            lat: location.lat(),
            lng: location.lng(),
            address: address
          });
          observer.complete();
        } else {
          observer.error(`Geocoding failed: ${status}`);
        }
      });
    });
  }

  /**
   * Get route between two points
   */
  getRoute(origin: MapLocation, destination: MapLocation, waypoints: MapLocation[] = []): Observable<OptimizedRoute> {
    return new Observable(observer => {
      if (!this.directionsService) {
        observer.error('Google Maps not loaded');
        return;
      }

      const request = {
        origin: new window.google.maps.LatLng(origin.lat, origin.lng),
        destination: new window.google.maps.LatLng(destination.lat, destination.lng),
        waypoints: waypoints.map(wp => ({
          location: new window.google.maps.LatLng(wp.lat, wp.lng),
          stopover: true
        })),
        optimizeWaypoints: true,
        travelMode: window.google.maps.TravelMode.DRIVING
      };

      this.directionsService.route(request, (result: any, status: any) => {
        if (status === 'OK') {
          const route = result.routes[0];
          const segments: RouteSegment[] = [];
          let totalDistance = 0;
          let totalDuration = 0;

          route.legs.forEach((leg: any, index: number) => {
            const segment: RouteSegment = {
              origin: {
                lat: leg.start_location.lat(),
                lng: leg.start_location.lng(),
                address: leg.start_address
              },
              destination: {
                lat: leg.end_location.lat(),
                lng: leg.end_location.lng(),
                address: leg.end_address
              },
              distance: leg.distance.value / 1000, // Convert to km
              duration: leg.duration.value / 60, // Convert to minutes
              polyline: leg.steps.map((step: any) => step.polyline.points).join('')
            };

            segments.push(segment);
            totalDistance += segment.distance;
            totalDuration += segment.duration;
          });

          const optimizedRoute: OptimizedRoute = {
            segments,
            totalDistance,
            totalDuration,
            waypoints: route.waypoint_order.map((index: number) => waypoints[index])
          };

          observer.next(optimizedRoute);
          observer.complete();
        } else {
          observer.error(`Route calculation failed: ${status}`);
        }
      });
    });
  }

  /**
   * Optimize route with multiple waypoints
   */
  optimizeRoute(origin: MapLocation, destination: MapLocation, waypoints: MapLocation[]): Observable<OptimizedRoute> {
    return this.getRoute(origin, destination, waypoints);
  }

  /**
   * Calculate distance between two points
   */
  calculateDistance(point1: MapLocation, point2: MapLocation): number {
    if (typeof window.google === 'undefined') return 0;

    const lat1 = point1.lat;
    const lng1 = point1.lng;
    const lat2 = point2.lat;
    const lng2 = point2.lng;

    const R = 6371; // Earth's radius in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLng = this.deg2rad(lng2 - lng1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Check if Google Maps is loaded
   */
  isLoaded(): boolean {
    return this.googleMapsLoaded;
  }

  /**
   * Get map instance for a container
   */
  createMap(container: HTMLElement, center: MapLocation, zoom: number = 12): any {
    if (typeof window.google === 'undefined') return null;

    return new window.google.maps.Map(container, {
      center: new window.google.maps.LatLng(center.lat, center.lng),
      zoom: zoom,
      mapTypeId: window.google.maps.MapTypeId.ROADMAP
    });
  }

  /**
   * Add marker to map
   */
  addMarker(map: any, location: MapLocation, title?: string): any {
    if (typeof window.google === 'undefined') return null;

    return new window.google.maps.Marker({
      position: new window.google.maps.LatLng(location.lat, location.lng),
      map: map,
      title: title || location.address
    });
  }

  /**
   * Draw polyline on map
   */
  drawPolyline(map: any, path: MapLocation[], color: string = '#FF0000'): any {
    if (typeof window.google === 'undefined') return null;

    const googlePath = path.map(location =>
      new window.google.maps.LatLng(location.lat, location.lng)
    );

    return new window.google.maps.Polyline({
      path: googlePath,
      geodesic: true,
      strokeColor: color,
      strokeOpacity: 1.0,
      strokeWeight: 2,
      map: map
    });
  }
}
