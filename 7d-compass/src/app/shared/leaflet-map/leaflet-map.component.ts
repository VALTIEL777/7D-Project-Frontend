import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import * as polyline from '@mapbox/polyline';

export interface RouteData {
  routeId: number;
  routeCode: string;
  type: string;
  encodedPolyline: string;
  tickets: Array<{
    ticketId: number;
    address: string;
    queue: number;
  }>;
  color?: string;
}

export interface MapConfig {
  center: [number, number];
  zoom: number;
  minZoom?: number;
  maxZoom?: number;
  tileLayer?: string;
  attribution?: string;
}

@Component({
  selector: 'app-leaflet-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './leaflet-map.component.html',
  styleUrls: ['./leaflet-map.component.scss']
})
export class LeafletMapComponent implements OnInit, OnDestroy, AfterViewInit, OnChanges {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;

  @Input() routes: RouteData[] = [];
  @Input() config: MapConfig = {
    center: [41.8781, -87.6298], // Chicago coordinates
    zoom: 11,
    minZoom: 8,
    maxZoom: 18,
    tileLayer: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors'
  };
  @Input() showMarkers: boolean = true;
  @Input() showPolylines: boolean = true;
  @Input() height: string = '600px';
  @Input() width: string = '100%';
  @Input() visibleRoutes: Set<number> = new Set();
  @Input() routeTypeVisibility: { [key: string]: boolean } = {
    'SPOTTER': true,
    'CONCRETE': true,
    'ASPHALT': true
  };

  @Output() markerClick = new EventEmitter<any>();
  @Output() routeClick = new EventEmitter<RouteData>();
  @Output() mapClick = new EventEmitter<L.LatLng>();

  private map!: L.Map;
  private markers: L.Marker[] = [];
  private polylines: L.Polyline[] = [];
  private routeLayers: Map<number, { markers: L.Marker[], polyline: L.Polyline | null }> = new Map();
  private isInitialLoad: boolean = true;

  // Default colors for different route types
  private readonly routeColors = {
    'SPOTTER': '#FF4500', // Red-orange
    'CONCRETE': '#4A90E2', // Blue
    'ASPHALT': '#228B22'  // Dark green
  };

  ngOnInit() {
    this.loadLeafletCSS();
  }

  ngAfterViewInit() {
    this.initMap();
  }

  ngOnChanges(changes: SimpleChanges) {
    // Handle height/width changes
    if ((changes['height'] || changes['width']) && this.mapContainer) {
      const container = this.mapContainer.nativeElement;
      if (changes['height']) {
        container.style.height = this.height;
      }
      if (changes['width']) {
        container.style.width = this.width;
      }

      // Force map resize if map exists
      if (this.map) {
        setTimeout(() => {
          this.map.invalidateSize();
        }, 100);
      }
    }

    // Check if routes have completely changed (new route set)
    if (changes['routes'] && !changes['routes'].firstChange) {
      const previousRoutes = changes['routes'].previousValue || [];
      const currentRoutes = changes['routes'].currentValue || [];

      // If the number of routes changed significantly, treat as new route set
      if (Math.abs(currentRoutes.length - previousRoutes.length) > 2) {
        this.isInitialLoad = true;
      }
    }

    // Check if any relevant inputs have changed
    const relevantChanges = ['routes', 'visibleRoutes', 'routeTypeVisibility', 'showMarkers', 'showPolylines'];
    const hasRelevantChanges = relevantChanges.some(key => changes[key]);

    if (hasRelevantChanges && this.map) {
      this.updateMap();
    }
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
    }
  }

  private loadLeafletCSS() {
    const existingLink = document.querySelector('link[href*="leaflet.css"]');

    if (!existingLink) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
      link.crossOrigin = '';
      document.head.appendChild(link);
    }
  }

  private initMap() {
    if (!this.mapContainer) {
      return;
    }

    // Set the container dimensions
    const container = this.mapContainer.nativeElement;
    container.style.height = this.height;
    container.style.width = this.width;
    container.style.position = 'relative';

    this.createMap();
  }

  private createMap() {
    if (this.map) {
      this.map.remove();
    }

    // Create new map
    this.map = L.map(this.mapContainer.nativeElement, {
      center: this.config.center,
      zoom: this.config.zoom,
      minZoom: this.config.minZoom,
      maxZoom: this.config.maxZoom,
      zoomControl: true,
      attributionControl: true
    });

    // Add tile layer
    L.tileLayer(this.config.tileLayer!, {
      attribution: this.config.attribution
    }).addTo(this.map);

    // Add click event
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.mapClick.emit(e.latlng);
    });

    // Force map resize after a short delay to ensure proper rendering
    setTimeout(() => {
      if (this.map) {
        this.map.invalidateSize();
      }
    }, 100);
  }

  private updateMap() {
    // Clear all existing layers
    this.clearMapLayers();

    if (this.routes.length === 0) {
      return;
    }

    // Count visible routes for debugging
    const visibleRoutes = this.routes.filter(route => this.shouldShowRoute(route));

    this.addRoutesToMap();
    if (this.isInitialLoad) {
      this.fitMapToBounds();
    }

    // Force map resize after routes are added
    setTimeout(() => {
      if (this.map) {
        this.map.invalidateSize();

        // Ensure container height is properly set
        if (this.mapContainer) {
          const container = this.mapContainer.nativeElement;
          container.style.height = this.height;
        }
      }
    }, 200);
    this.isInitialLoad = false;
  }

  private clearMapLayers() {
    // Clear all markers and polylines
    this.markers.forEach(marker => marker.remove());
    this.polylines.forEach(polyline => polyline.remove());
    this.markers = [];
    this.polylines = [];
    this.routeLayers.clear();
  }

  private addRoutesToMap() {
    this.routes.forEach((route, index) => {
      // Check if route should be visible
      if (!this.shouldShowRoute(route)) {
        return;
      }

      const routeColor = this.getRouteColor(route.type);
      const routeLayer = {
        markers: [] as L.Marker[],
        polyline: null as L.Polyline | null
      };

      // Add polyline if enabled and available
      if (this.showPolylines && route.encodedPolyline) {
        try {
          const polyline = this.createPolyline(route.encodedPolyline, routeColor, route);
          if (polyline) {
            polyline.addTo(this.map);
            this.polylines.push(polyline);
            routeLayer.polyline = polyline;
          }
        } catch (error) {
          console.error(`Error creating polyline for route ${route.routeCode}:`, error);
        }
      }

      // Add markers if enabled
      if (this.showMarkers && route.tickets) {
        // Add start and end markers
        if (route.encodedPolyline) {
          const coordinates = this.decodePolyline(route.encodedPolyline);
          if (coordinates.length > 0) {
            // Start marker
            const startMarker = this.createStartEndMarker(coordinates[0], route, 'start', routeColor);
            if (startMarker) {
              startMarker.addTo(this.map);
              this.markers.push(startMarker);
              routeLayer.markers.push(startMarker);
            }

            // End marker
            const endMarker = this.createStartEndMarker(coordinates[coordinates.length - 1], route, 'end', routeColor);
            if (endMarker) {
              endMarker.addTo(this.map);
              this.markers.push(endMarker);
              routeLayer.markers.push(endMarker);
            }
          }
        }

        // Add ticket markers
        route.tickets.forEach((ticket, ticketIndex) => {
          const marker = this.createMarker(ticket, route, ticketIndex, routeColor);
          if (marker) {
            marker.addTo(this.map);
            this.markers.push(marker);
            routeLayer.markers.push(marker);
          }
        });
      }

      this.routeLayers.set(route.routeId, routeLayer);
    });
  }

  private shouldShowRoute(route: RouteData): boolean {
    // Check if route type is visible
    if (!this.routeTypeVisibility[route.type]) {
      return false;
    }

    // Check if individual route is visible
    // If visibleRoutes set has any entries, use individual route visibility
    // If visibleRoutes set is empty, show all routes of visible types
    if (this.visibleRoutes.size > 0) {
      const isIndividuallyVisible = this.visibleRoutes.has(route.routeId);

      if (!isIndividuallyVisible) {
        return false;
      }
    }

    return true;
  }

  private getRouteColor(routeType: string): string {
    return this.routeColors[routeType as keyof typeof this.routeColors] || '#666666';
  }

  private createPolyline(encodedPolyline: string, color: string, route: RouteData): L.Polyline | null {
    try {
      // Decode the polyline
      const coordinates = this.decodePolyline(encodedPolyline);

      if (coordinates.length < 2) {
        return null;
      }

      // Create polyline
      const polyline = L.polyline(coordinates, {
        color: color,
        weight: 5,
        opacity: 0.8,
        fillOpacity: 0.3
      });

      // Add click event
      polyline.on('click', () => {
        this.routeClick.emit(route);
      });

      // Add popup with route info
      polyline.bindPopup(`
        <div class="route-popup">
          <h4>${route.routeCode}</h4>
          <p><strong>Type:</strong> ${route.type}</p>
          <p><strong>Stops:</strong> ${route.tickets?.length || 0}</p>
        </div>
      `);

      return polyline;
    } catch (error) {
      console.error('Error decoding polyline:', error);
      return null;
    }
  }

  private createMarker(ticket: any, route: RouteData, index: number, color: string): L.Marker | null {
    if (!ticket.address) {
      return null;
    }

    // Try to get coordinates from the polyline waypoints
    let markerLocation: [number, number] | null = null;

    if (route.encodedPolyline) {
      try {
        const coordinates = this.decodePolyline(route.encodedPolyline);
        if (coordinates.length > 0) {
          // Use the first coordinate for the first ticket, last coordinate for the last ticket
          // and interpolate for tickets in between
          if (index === 0) {
            markerLocation = coordinates[0];
          } else if (index === route.tickets.length - 1) {
            markerLocation = coordinates[coordinates.length - 1];
          } else {
            // Interpolate position based on ticket index
            const progress = index / (route.tickets.length - 1);
            const coordIndex = Math.floor(progress * (coordinates.length - 1));
            markerLocation = coordinates[coordIndex];
          }
        }
      } catch (error) {
        console.error(`Error extracting coordinates for ticket ${ticket.ticketId}:`, error);
      }
    }

    // Fallback to default location if no coordinates found
    if (!markerLocation) {
      markerLocation = this.config.center;
    } else {
    }

    // Generate marker label using letters (A-Z) for better visibility
    const markerLabel = this.getMarkerLabel(index);

    // Create custom icon with different styles based on route type
    const iconSize = 32; // Larger for better number visibility
    const icon = L.divIcon({
      className: 'custom-marker',
      html: `
        <div class="marker-content" style="
          background-color: ${color};
          color: white;
          border-radius: 50%;
          width: ${iconSize}px;
          height: ${iconSize}px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 14px;
          border: 2px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.4);
          cursor: pointer;
          text-shadow: 1px 1px 1px rgba(0,0,0,0.5);
        ">
          ${markerLabel}
        </div>
      `,
      iconSize: [iconSize, iconSize],
      iconAnchor: [iconSize / 2, iconSize / 2]
    });

    const marker = L.marker(markerLocation, { icon });

    // Add click event
    marker.on('click', () => {
      this.markerClick.emit({ ticket, route, index, label: markerLabel });
    });

    // Add popup with more detailed information
    marker.bindPopup(`
      <div class="ticket-popup">
        <h4>Stop ${markerLabel}</h4>
        <p><strong>Address:</strong> ${ticket.address}</p>
        <p><strong>Route:</strong> ${route.routeCode}</p>
        <p><strong>Type:</strong> ${route.type}</p>
        <p><strong>Ticket ID:</strong> ${ticket.ticketId}</p>
        <p><strong>Queue:</strong> ${ticket.queue + 1}</p>
        <p><strong>Coordinates:</strong> [${markerLocation[0].toFixed(6)}, ${markerLocation[1].toFixed(6)}]</p>
      </div>
    `);

    return marker;
  }

  // Helper method to generate marker labels using numbers only
  private getMarkerLabel(index: number): string {
    // Use simple numbers for better clarity and intuitive ordering
    return (index + 1).toString();
  }

  private createStartEndMarker(location: [number, number], route: RouteData, type: 'start' | 'end', color: string): L.Marker | null {
    const iconSize = 20;
    const icon = L.divIcon({
      className: 'custom-marker start-end-marker',
      html: `
        <div class="marker-content" style="
          background-color: ${type === 'start' ? '#4CAF50' : '#F44336'};
          color: white;
          border-radius: 50%;
          width: ${iconSize}px;
          height: ${iconSize}px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 8px;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          cursor: pointer;
        ">
          ${type === 'start' ? 'S' : 'E'}
        </div>
      `,
      iconSize: [iconSize, iconSize],
      iconAnchor: [iconSize / 2, iconSize / 2]
    });

    const marker = L.marker(location, { icon });

    // Add click event
    marker.on('click', () => {
      this.markerClick.emit({ type, route, location });
    });

    // Add popup
    marker.bindPopup(`
      <div class="ticket-popup">
        <h4>${type.charAt(0).toUpperCase() + type.slice(1)} Point</h4>
        <p><strong>Route:</strong> ${route.routeCode}</p>
        <p><strong>Type:</strong> ${route.type}</p>
        <p><strong>Coordinates:</strong> [${location[0].toFixed(6)}, ${location[1].toFixed(6)}]</p>
      </div>
    `);

    return marker;
  }

    private decodePolyline(encoded: string): [number, number][] {
    try {
      // Use @mapbox/polyline library for reliable decoding
      const coordinates = polyline.decode(encoded);

      if (coordinates.length > 0) {
      }

      return coordinates;
    } catch (error) {
      console.error('Error decoding polyline:', error);
      return [];
    }
  }

  private fitMapToBounds() {
    if (this.markers.length === 0 && this.polylines.length === 0) {
      return;
    }

    const bounds = L.latLngBounds([]);

    // Add marker bounds
    this.markers.forEach(marker => {
      bounds.extend(marker.getLatLng());
    });

    // Add polyline bounds
    this.polylines.forEach(polyline => {
      bounds.extend(polyline.getBounds());
    });

    if (bounds.getNorthEast() && bounds.getSouthWest()) {
      this.map.fitBounds(bounds, {
        padding: [50, 50],
        maxZoom: 16 // Prevent zooming in too much on initial fit
      });
    }
  }

  // Public methods for external control
  public refreshMap() {
    this.updateMap();
  }

  public setCenter(lat: number, lng: number) {
    this.map.setView([lat, lng], this.map.getZoom());
  }

  public setZoom(zoom: number) {
    this.map.setZoom(zoom);
  }

  public fitBounds(bounds: L.LatLngBounds) {
    this.map.fitBounds(bounds);
  }

  public toggleRouteVisibility(routeId: number, visible: boolean) {
    const routeLayer = this.routeLayers.get(routeId);
    if (routeLayer) {
      if (visible) {
        routeLayer.markers.forEach(marker => marker.addTo(this.map));
        if (routeLayer.polyline) {
          routeLayer.polyline.addTo(this.map);
        }
      } else {
        routeLayer.markers.forEach(marker => marker.remove());
        if (routeLayer.polyline) {
          routeLayer.polyline.remove();
        }
      }
    }
  }

  public clearMap() {
    this.clearMapLayers();
  }
}
