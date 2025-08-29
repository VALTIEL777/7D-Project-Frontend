import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy,
  NgZone
} from '@angular/core';
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
    coordinates?: {
      latitude: number;
      longitude: number;
      placeid?: string;
    };
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
  styleUrls: ['./leaflet-map.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush // 1. OnPush Change Detection
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
  private routeLayers: Map<number, { markers: L.Marker[], polyline: L.Polyline | null, group: L.LayerGroup | null }> = new Map(); // 3. Layer Groups
  private isInitialLoad: boolean = true;

  // Polyline and icon caches
  private polylineCache = new Map<string, [number, number][]>() // 5. Polyline Cache
  private iconCache = new Map<string, L.DivIcon>(); // 6. Icon Cache

  // Debounce timer
  private updateTimeout?: any; // 7. Debounced Updates

  // Add missing previousRoutes and previousVisibleRoutes
  private previousRoutes: RouteData[] = [];
  private previousVisibleRoutes: Set<number> = new Set();

  // Add missing routeColors
  private readonly routeColors: { [key: string]: string } = {
    'SPOTTER': '#FF4500',
    'CONCRETE': '#4A90E2',
    'ASPHALT': '#228B22',
    'CURRENT': '#FF9800' // Color naranja para ubicación actual
  };

  constructor(private ngZone: NgZone) {} // 2. NgZone Optimization

  ngOnInit() {
    this.loadLeafletCSS();
  }

  ngAfterViewInit() {
    // 2. Run map initialization outside Angular zone
    this.ngZone.runOutsideAngular(() => {
      this.initMap();
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    // 7. Debounced Updates
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }
    this.updateTimeout = setTimeout(() => {
      this.ngZone.runOutsideAngular(() => {
        this.incrementalUpdateMap();
      });
    }, 100);
  }

  ngOnDestroy() {
    // 10. Memory Management
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }
    if (this.map) {
      this.map.remove();
    }
    this.polylineCache.clear();
    this.iconCache.clear();
    this.routeLayers.clear();
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
    const container = this.mapContainer.nativeElement;
    container.style.height = this.height;
    container.style.width = this.width;
    container.style.position = 'relative';
    // 4. Canvas Renderer
    this.map = L.map(this.mapContainer.nativeElement, {
      center: this.config.center,
      zoom: this.config.zoom,
      minZoom: this.config.minZoom,
      maxZoom: this.config.maxZoom,
      zoomControl: true,
      attributionControl: true,
      preferCanvas: true, // Use Canvas renderer for better performance
      renderer: L.canvas() // Explicit canvas renderer
    });
    L.tileLayer(this.config.tileLayer!, {
      attribution: this.config.attribution
    }).addTo(this.map);
    // Map click event inside Angular zone
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.ngZone.run(() => {
        this.mapClick.emit(e.latlng);
      });
    });
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

  /**
   * Incremental update logic: only add/remove/update changed routes and tickets.
   */
  private incrementalUpdateMap() {
    // Build sets of current and previous visible route IDs
    const currentVisible = new Set<number>();
    for (const route of this.routes) {
      if (this.shouldShowRoute(route)) {
        currentVisible.add(route.routeId);
      }
    }
    const prevVisible = this.previousVisibleRoutes;

    // Remove layers for routes that are no longer in the routes array, or are not visible, or all are untagged
    for (const routeId of Array.from(this.routeLayers.keys())) {
      const route = this.routes.find((r: RouteData) => r.routeId === routeId);
      if (
        !route ||
        !this.shouldShowRoute(route) ||
        this.visibleRoutes.size === 0
      ) {
        const layer = this.routeLayers.get(routeId);
        if (layer) {
          if (layer.group) this.map.removeLayer(layer.group);
          layer.markers.forEach(marker => marker.remove());
          if (layer.polyline) layer.polyline.remove();
        }
        this.routeLayers.delete(routeId);
      }
    }

    // If visibleRoutes is empty, don't add any routes (all routes are untagged)
    if (this.visibleRoutes.size === 0) {
      // Remove all map layers
      this.clearMapLayers();
      // Update previous state and return early
      this.previousRoutes = this.routes.map((r: RouteData) => ({ ...r, tickets: r.tickets.map((t: any) => ({ ...t })) }));
      this.previousVisibleRoutes = new Set();
      return;
    }

    // Add or update layers for new or changed routes
    for (const route of this.routes) {
      // STRICT VISIBILITY: Only add if visible
      const visible = this.visibleRoutes.has(route.routeId);
      if (!this.shouldShowRoute(route) || !visible) continue;
      const prevRoute = this.previousRoutes.find((r: RouteData) => r.routeId === route.routeId);
      const layer = this.routeLayers.get(route.routeId);
      // If route is new or changed (tickets/polyline), re-add
      if (!layer || !prevRoute ||
        prevRoute.encodedPolyline !== route.encodedPolyline ||
        prevRoute.tickets.length !== route.tickets.length ||
        !prevRoute.tickets.every((t: any, i: number) => t.ticketId === route.tickets[i]?.ticketId && t.queue === route.tickets[i]?.queue)) {
        // Remove old layer if exists
        if (layer) {
          if (layer.group) this.map.removeLayer(layer.group);
          layer.markers.forEach(marker => marker.remove());
          if (layer.polyline) layer.polyline.remove();
          this.routeLayers.delete(route.routeId);
        }
        // Add new layer using LayerGroup
        const routeColor = this.getRouteColor(route.type);
        const newLayer: { markers: L.Marker[], polyline: L.Polyline | null, group: L.LayerGroup | null } = { markers: [], polyline: null, group: null };
        const group = L.layerGroup();
        // Polyline (with cache)
        if (this.showPolylines && route.encodedPolyline) {
          let coordinates: [number, number][];
          if (this.polylineCache.has(route.encodedPolyline)) {
            coordinates = this.polylineCache.get(route.encodedPolyline)!;
          } else {
            coordinates = polyline.decode(route.encodedPolyline);
            this.polylineCache.set(route.encodedPolyline, coordinates);
          }
          if (coordinates.length > 1) {
            const poly = L.polyline(coordinates, {
              color: routeColor,
              weight: 4,
              opacity: 0.7,
              fillOpacity: 0.3,
              interactive: true
            });
            poly.on('click', () => {
              this.ngZone.run(() => {
                this.routeClick.emit(route);
              });
            });
            poly.bindPopup(`<div><b>${route.routeCode}</b><br>Type: ${route.type}</div>`);
            poly.addTo(group);
            newLayer.polyline = poly;
          }
        }
        // Markers (with icon cache)
        if (this.showMarkers && route.tickets) {
          const processedAddresses = new Set<string>();
          route.tickets.forEach((ticket: any, ticketIndex: number) => {
            const marker = this.createMarker(ticket, route, ticketIndex, routeColor, processedAddresses);
            if (marker) {
              marker.addTo(group);
              newLayer.markers.push(marker);
            }
          });
        }
        group.addTo(this.map);
        newLayer.group = group;
        this.routeLayers.set(route.routeId, newLayer);
      }
    }
    // Update previous state
    this.previousRoutes = this.routes.map((r: RouteData) => ({ ...r, tickets: r.tickets.map((t: any) => ({ ...t })) }));
    this.previousVisibleRoutes = new Set(this.routes.filter((r: RouteData) => this.shouldShowRoute(r)).map((r: RouteData) => r.routeId));
    // Optionally fit bounds if initial load or routes changed
    if (this.isInitialLoad) {
      this.fitMapToBounds();
      this.isInitialLoad = false;
    }
    setTimeout(() => {
      if (this.map) {
        this.map.invalidateSize();
        if (this.mapContainer) {
          const container = this.mapContainer.nativeElement;
          container.style.height = this.height;
        }
      }
    }, 200);
    // Remove the loop that calls toggleRouteVisibility for all routes
  }

  private clearMapLayers() {
    // Remove all layers from the map and clear routeLayers
    for (const layer of this.routeLayers.values()) {
      if (layer.group) this.map.removeLayer(layer.group);
      layer.markers.forEach(marker => marker.remove());
      if (layer.polyline) layer.polyline.remove();
    }
    this.routeLayers.clear();
  }

  private addRoutesToMap() {
    this.routes.forEach((route, index) => {
      // Check if route should be shown
      if (!this.shouldShowRoute(route)) {
        return;
      }

      // For CURRENT routes, always show them regardless of visibleRoutes
      const visible = route.type === 'CURRENT' ? true :
        (this.visibleRoutes.size === 0 ? false : this.visibleRoutes.has(route.routeId));

      if (!visible) {
        return;
      }
      const routeColor = this.getRouteColor(route.type);
      const routeLayer = {
        markers: [] as L.Marker[],
        polyline: null as L.Polyline | null,
        group: null as L.LayerGroup | null // Ensure group property is present
      };

      // Add polyline if enabled and available
      if (this.showPolylines && route.encodedPolyline) {
        try {
          const polyline = this.createPolyline(route.encodedPolyline, routeColor, route);
          if (polyline) {
            polyline.addTo(this.map);
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
              routeLayer.markers.push(startMarker);
            }

            // End marker
            const endMarker = this.createStartEndMarker(coordinates[coordinates.length - 1], route, 'end', routeColor);
            if (endMarker) {
              endMarker.addTo(this.map);
              routeLayer.markers.push(endMarker);
            }
          }
        }

              // Add ticket markers
      const processedAddresses = new Set<string>();
      console.log(`🗺️ Procesando ${route.tickets.length} tickets para ruta ${route.routeCode}`);

      route.tickets.forEach((ticket, ticketIndex) => {
        console.log(`🗺️ Creando marcador para ticket ${ticketIndex + 1}/${route.tickets.length}:`, ticket);
        const marker = this.createMarker(ticket, route, ticketIndex, routeColor, processedAddresses);
        if (marker) {
          console.log(`✅ Agregando marcador al mapa para ticket:`, ticket.ticketId);
          marker.addTo(this.map);
          routeLayer.markers.push(marker);
        } else {
          console.warn(`⚠️ No se pudo crear marcador para ticket:`, ticket);
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

    // Special case for CURRENT routes - always show them
    if (route.type === 'CURRENT') {
      return true;
    }

    // If visibleRoutes set is empty, show nothing (except CURRENT routes)
    if (this.visibleRoutes.size === 0) {
      return false;
    }
    // Only show if route is in visibleRoutes
    return this.visibleRoutes.has(route.routeId);
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

  private decodePolyline(encoded: string): [number, number][] {
    try {
      // Use @mapbox/polyline library for reliable decoding
      const coordinates = polyline.decode(encoded);
      return coordinates;
    } catch (error) {
      console.error('Error decoding polyline:', error);
      return [];
    }
  }

  private createMarker(ticket: any, route: RouteData, index: number, color: string, processedAddresses: Set<string>): L.Marker | null {
    console.log(`🗺️ === createMarker STARTED ===`);
    console.log(`🗺️ Ticket:`, ticket);
    console.log(`🗺️ Route:`, route);
    console.log(`🗺️ Index:`, index);
    console.log(`🗺️ Color:`, color);

    if (!ticket.address) {
      console.warn(`⚠️ No address for ticket:`, ticket);
      return null;
    }

    // Check if this address already has a marker (for duplicate addresses)
    const addressKey = ticket.address.toLowerCase().trim();
    if (processedAddresses.has(addressKey)) {
      return null;
    }
    processedAddresses.add(addressKey);

    // Use coordinates from the ticket data if available
    let markerLocation: [number, number] | null = null;

    // Enhanced coordinate extraction with better debugging
    if (ticket.coordinates) {
      console.log(`🔍 Ticket ${ticket.ticketId} coordinates:`, ticket.coordinates);

      // Try different possible coordinate property names
      let lat = ticket.coordinates.latitude || ticket.coordinates.lat || ticket.coordinates.latitud;
      let lng = ticket.coordinates.longitude || ticket.coordinates.lng || ticket.coordinates.longitud;

      // Convert to numbers if they're strings
      if (typeof lat === 'string') lat = parseFloat(lat);
      if (typeof lng === 'string') lng = parseFloat(lng);

      console.log(`🔍 Extracted lat/lng:`, { lat, lng, latType: typeof lat, lngType: typeof lng });

      if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
        // Ensure full precision for coordinates
        const preciseLat = parseFloat(lat.toFixed(8));
        const preciseLng = parseFloat(lng.toFixed(8));

        markerLocation = [preciseLat, preciseLng];
        console.log(`✅ Using API coordinates for ticket ${ticket.ticketId}: [${preciseLat}, ${preciseLng}]`);
        return this.createMarkerWithLocation(ticket, route, index, color, markerLocation, 'API');
      } else {
        console.warn(`⚠️ Invalid API coordinates for ticket ${ticket.ticketId}:`, { lat, lng });
      }
    } else {
      console.log(`⚠️ No coordinates object for ticket ${ticket.ticketId}`);
    }

    // ONLY use polyline coordinates if NO API coordinates are available
    if (route.encodedPolyline) {
      try {
        const coordinates = this.decodePolyline(route.encodedPolyline);
        if (coordinates.length > 0) {
          if (index === 0) {
            markerLocation = coordinates[0];
            console.log(`🔄 Using first polyline coordinate for ticket ${ticket.ticketId}:`, markerLocation);
            return this.createMarkerWithLocation(ticket, route, index, color, markerLocation, 'POLYLINE_FIRST');
          } else if (index === route.tickets.length - 1) {
            markerLocation = coordinates[coordinates.length - 1];
            console.log(`🔄 Using last polyline coordinate for ticket ${ticket.ticketId}:`, markerLocation);
            return this.createMarkerWithLocation(ticket, route, index, color, markerLocation, 'POLYLINE_LAST');
          } else {
            const progress = index / (route.tickets.length - 1);
            const coordIndex = Math.floor(progress * (coordinates.length - 1));
            markerLocation = coordinates[coordIndex];
            console.log(`🔄 Using polyline coordinate at index ${coordIndex} for ticket ${ticket.ticketId}:`, markerLocation);
            return this.createMarkerWithLocation(ticket, route, index, color, markerLocation, 'POLYLINE_PROGRESS');
          }
        }
      } catch (error) {
        console.error(`Error extracting polyline coordinates for ticket ${ticket.ticketId}:`, error);
      }
    }

    // Final fallback to map center
    markerLocation = this.config.center;
    console.warn(`⚠️ No coordinates available for ticket ${ticket.ticketId}, using map center:`, markerLocation);
    return this.createMarkerWithLocation(ticket, route, index, color, markerLocation, 'MAP_CENTER');
  }

  private createMarkerWithLocation(ticket: any, route: RouteData, index: number, color: string, markerLocation: [number, number], source: string): L.Marker | null {
    console.log(`🎯 Creating marker for ticket ${ticket.ticketId} at location [${markerLocation[0]}, ${markerLocation[1]}] (source: ${source})`);

    // Validate markerLocation is properly formatted
    if (!Array.isArray(markerLocation) || markerLocation.length !== 2) {
      console.error(`❌ Invalid markerLocation for ticket ${ticket.ticketId}:`, markerLocation);
      markerLocation = this.config.center;
    }

    // Validate coordinates are numbers
    if (typeof markerLocation[0] !== 'number' || typeof markerLocation[1] !== 'number' ||
        isNaN(markerLocation[0]) || isNaN(markerLocation[1])) {
      console.error(`❌ Invalid coordinates for ticket ${ticket.ticketId}:`, markerLocation);
      markerLocation = this.config.center;
    }

    // Para rutas CURRENT, usar el ticketId como etiqueta, para UPCOMING usar incremento serial por dirección única, para otras usar queue + 1
    let markerLabel: string = '';
    if (route.type === 'CURRENT') {
      markerLabel = ticket.ticketId.toString();
    } else if (route.type === 'UPCOMING') {
      // For UPCOMING routes, use serial numbering based on unique addresses
      // Since tickets with same address are batched, we need to count unique addresses
      const uniqueAddresses = new Set<string>();
      let serialNumber = 1;

      for (let i = 0; i < route.tickets.length; i++) {
        const currentTicket = route.tickets[i];
        const currentAddress = currentTicket.address?.toLowerCase().trim() || '';

        if (!uniqueAddresses.has(currentAddress)) {
          uniqueAddresses.add(currentAddress);

          // If this is the current ticket's address, use this serial number
          if (currentTicket.ticketId === ticket.ticketId) {
            markerLabel = serialNumber.toString();
            break;
          }

          serialNumber++;
        }
      }

      // Fallback if not found
      if (!markerLabel) {
        markerLabel = (ticket.queue + 1).toString();
      }
    } else {
      markerLabel = (ticket.queue + 1).toString();
    }

    // Para rutas CURRENT, usar icono más grande
    const iconSize = route.type === 'CURRENT' ? 40 : 32;
    const fontSize = route.type === 'CURRENT' ? '16px' : '14px';

    const icon = L.divIcon({
      className: 'custom-marker',
      html: `<div class="marker-content" style="background-color: ${color}; color: white; border-radius: 50%; width: ${iconSize}px; height: ${iconSize}px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: ${fontSize}; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4); cursor: pointer; text-shadow: 1px 1px 1px rgba(0,0,0,0.5);">${markerLabel}</div>`,
      iconSize: [iconSize, iconSize],
      iconAnchor: [iconSize / 2, iconSize / 2]
    });

    const marker = L.marker(markerLocation, { icon });
    marker.on('click', () => {
      this.markerClick.emit({ ticket, route, index, label: markerLabel });
    });

    // Popup personalizado para rutas CURRENT
    const formatCoordinate = (coord: any): string => {
      if (typeof coord === 'number' && !isNaN(coord)) {
        return coord.toFixed(6);
      }
      return 'N/A';
    };

    const popupContent = route.type === 'CURRENT' ? `
      <div class="ticket-popup">
        <h4>📍 Current Location</h4>
        <p><strong>Ticket ID:</strong> ${ticket.ticketId}</p>
        <p><strong>Address:</strong> ${ticket.address}</p>
        <p><strong>Route:</strong> ${route.routeCode}</p>
        <p><strong>Coordinates:</strong> [${formatCoordinate(markerLocation[0])}, ${formatCoordinate(markerLocation[1])}]</p>
        <p><strong>Source:</strong> ${source}</p>
        ${ticket.coordinates?.placeid ? `<p><strong>Place ID:</strong> ${ticket.coordinates.placeid}</p>` : ''}
      </div>
    ` : `
      <div class="ticket-popup">
        <h4>Stop ${markerLabel}</h4>
        <p><strong>Address:</strong> ${ticket.address}</p>
        <p><strong>Route:</strong> ${route.routeCode}</p>
        <p><strong>Type:</strong> ${route.type}</p>
        <p><strong>Ticket ID:</strong> ${ticket.ticketId}</p>
        <p><strong>Queue:</strong> ${ticket.queue + 1}</p>
        <p><strong>Coordinates:</strong> [${formatCoordinate(markerLocation[0])}, ${formatCoordinate(markerLocation[1])}]</p>
        <p><strong>Source:</strong> ${source}</p>
        ${ticket.coordinates?.placeid ? `<p><strong>Place ID:</strong> ${ticket.coordinates.placeid}</p>` : ''}
      </div>
    `;

    marker.bindPopup(popupContent);

    console.log(`✅ Marcador creado exitosamente para ticket ${ticket.ticketId} en [${markerLocation[0]}, ${markerLocation[1]}] (source: ${source})`);
    return marker;
  }

  private createStartEndMarker(location: [number, number], route: RouteData, type: 'start' | 'end', color: string): L.Marker | null {
    const iconSize = 20;
    const icon = L.divIcon({
      className: 'custom-marker start-end-marker',
      html: `<div class="marker-content" style="background-color: ${type === 'start' ? '#4CAF50' : '#F44336'}; color: white; border-radius: 50%; width: ${iconSize}px; height: ${iconSize}px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 8px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); cursor: pointer;">${type === 'start' ? 'S' : 'E'}</div>`,
      iconSize: [iconSize, iconSize],
      iconAnchor: [iconSize / 2, iconSize / 2]
    });
    const marker = L.marker(location, { icon });
    marker.on('click', () => {
      this.markerClick.emit({ type, route, location });
    });

    const formatCoordinate = (coord: any): string => {
      if (typeof coord === 'number' && !isNaN(coord)) {
        return coord.toFixed(6);
      }
      return 'N/A';
    };

    marker.bindPopup(`
      <div class="ticket-popup">
        <h4>${type.charAt(0).toUpperCase() + type.slice(1)} Point</h4>
        <p><strong>Route:</strong> ${route.routeCode}</p>
        <p><strong>Type:</strong> ${route.type}</p>
        <p><strong>Coordinates:</strong> [${formatCoordinate(location[0])}, ${formatCoordinate(location[1])}]</p>
      </div>
    `);
    return marker;
  }

  private fitMapToBounds() {
    const bounds = L.latLngBounds([]);
    let hasBounds = false;
    for (const layer of this.routeLayers.values()) {
      layer.markers.forEach(marker => {
        bounds.extend(marker.getLatLng());
        hasBounds = true;
      });
      if (layer.polyline) {
        bounds.extend(layer.polyline.getBounds());
        hasBounds = true;
      }
    }
    if (hasBounds) {
      this.map.fitBounds(bounds, {
        padding: [50, 50],
        maxZoom: 16
      });
    }
  }

  // Public methods for external control
  public refreshMap() {
    this.incrementalUpdateMap();
  }

  public setCenter(lat: number, lng: number) {
    if (this.map) {
      this.map.setView([lat, lng], this.map.getZoom());
    }
  }

  public setZoom(zoom: number) {
    if (this.map) {
      this.map.setZoom(zoom);
    }
  }

  public fitBounds(bounds: L.LatLngBounds) {
    if (this.map) {
      this.map.fitBounds(bounds);
    }
  }

  // Método de debugging para verificar el estado del mapa
  public debugMapState(): void {
    console.log('🗺️ === LEAFLET MAP DEBUG INFO ===');
    console.log('📍 Routes count:', this.routes.length);
    console.log('📍 Visible routes:', Array.from(this.visibleRoutes));
    console.log('📍 Route type visibility:', this.routeTypeVisibility);
    console.log('📍 Show markers:', this.showMarkers);
    console.log('📍 Show polylines:', this.showPolylines);
    console.log('📍 Map center:', this.config.center);

    // Debug each route
    this.routes.forEach((route, routeIndex) => {
      console.log(`📍 Route ${routeIndex + 1}:`, {
        routeId: route.routeId,
        routeCode: route.routeCode,
        type: route.type,
        ticketsCount: route.tickets?.length || 0,
        hasEncodedPolyline: !!route.encodedPolyline,
        polylineLength: route.encodedPolyline?.length || 0
      });

      // Debug tickets in this route
      route.tickets?.forEach((ticket, ticketIndex) => {
        console.log(`  📍 Ticket ${ticketIndex + 1}:`, {
          ticketId: ticket.ticketId,
          address: ticket.address,
          queue: ticket.queue,
          hasCoordinates: !!ticket.coordinates,
          coordinates: ticket.coordinates
        });
      });
    });

    console.log('🗺️ === END LEAFLET MAP DEBUG ===');
  }
}
