import { Component, OnInit, ViewChild } from '@angular/core';
import { DashboardLayoutComponent } from "../../../../shared/dashboard-layout/dashboard-layout.component";
import { CardWithButtonComponent } from '../../../../shared/card-with-button/card-with-button.component';
import { DataTableComponent } from '../../../../shared/data-table/data-table.component';
import { LeafletMapComponent, RouteData, MapConfig } from '../../../../shared/leaflet-map/leaflet-map.component';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { FilterService } from '../../../../core/services/filter.service';

interface ColumnDefinition {
  name: string;
  header: string;
  cell: (element: any) => string;
  isActionColumn?: boolean;
  isHtml?: boolean;
}

interface Route {
  routeId: number;
  routeCode: string;
  type: string;
  startDate: string;
  endDate: string;
  encodedPolyline: string;
  totalDistance: number;
  totalDuration: number;
  optimizedOrder: number[];
  optimizationMetadata: {
    algorithm: string;
    version: string;
  };
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  createdBy: number;
  updatedBy: number;
  tickets: any[];
  addressCount: number;
}

interface ApiResponse {
  message: string;
  count: number;
  routes: Route[];
}

@Component({
  selector: 'app-route-history',
  imports: [
    DashboardLayoutComponent,
    CardWithButtonComponent,
    DataTableComponent,
    LeafletMapComponent,
    CommonModule,
    MatIconModule,
    MatButtonModule
  ],
  templateUrl: './route-history.component.html',
  styleUrl: './route-history.component.scss'
})
export class RouteHistoryComponent implements OnInit {
  constructor(
    private http: HttpClient,
    private filterService: FilterService
  ) {}

  // Make Math available in template
  Math = Math;

  // Filter properties
  filteredRoutes: Route[] = [];
  textSearch: string = '';
  selectedDateRange: string = '';

  routeColumns: ColumnDefinition[] = [
    {
      name: 'routeCode',
      header: 'Route Code',
      cell: (route: Route) => route.routeCode
    },
    {
      name: 'type',
      header: 'Type',
      cell: (route: Route) => route.type
    },
    {
      name: 'startDate',
      header: 'Start Date',
      cell: (route: Route) => new Date(route.startDate).toLocaleDateString()
    },
    {
      name: 'endDate',
      header: 'End Date',
      cell: (route: Route) => new Date(route.endDate).toLocaleDateString()
    },
    {
      name: 'addressCount',
      header: 'Addresses',
      cell: (route: Route) => route.addressCount.toString()
    },
    {
      name: 'show',
      header: 'Actions',
      cell: () => 'View',
      isActionColumn: true
    }
  ];

  routes: Route[] = [];
  selectedRoute: Route | null = null;
  loading = false;
  error = '';
  totalCount = 0;
  currentPage = 1;
  pageSize = 10;

  // Map configuration
  mapConfig: MapConfig = {
    center: [41.8781, -87.6298], // Chicago coordinates
    zoom: 11,
    minZoom: 8,
    maxZoom: 18,
    tileLayer: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors'
  };

  leafletRoutes: RouteData[] = [];

  @ViewChild('leafletMap') leafletMapComponent!: LeafletMapComponent;

  // Map visibility control
  visibleRoutes: Set<number> = new Set();

  ngOnInit() {
    console.log('🚀 RouteHistoryComponent initialized');
    this.loadRoutes();

    // Subscribe to filter changes
    this.filterService.textSearch$.subscribe(search => {
      this.textSearch = search;
      this.applyFilters();
    });

    this.filterService.dateRange$.subscribe(range => {
      this.selectedDateRange = range;
      this.applyFilters();
    });
  }

    loadRoutes() {
    this.loading = true;
    this.error = '';

    console.log('🔄 Loading routes from API...');

    this.http.get<ApiResponse>('/api/routes/all-with-polylines')
      .subscribe({
        next: (response) => {
          console.log('✅ API Response received:', response);
          console.log('📊 Total count:', response.count);
          console.log('🗺️ Routes array:', response.routes);

          // Log each route's key properties
          response.routes.forEach((route, index) => {
            console.log(`📍 Route ${index + 1}:`, {
              routeId: route.routeId,
              routeCode: route.routeCode,
              type: route.type,
              encodedPolyline: route.encodedPolyline ? `${route.encodedPolyline.substring(0, 50)}...` : 'null',
              totalDistance: route.totalDistance,
              totalDuration: route.totalDuration,
              addressCount: route.addressCount,
              ticketsCount: route.tickets?.length || 0
            });

            // Debug ticket coordinates
            route.tickets?.forEach((ticket, ticketIndex) => {
              console.log(`  📍 Ticket ${ticketIndex + 1} coordinates:`, {
                ticketId: ticket.ticketId,
                address: ticket.address,
                hasCoordinates: !!ticket.coordinates,
                coordinates: ticket.coordinates,
                coordinateKeys: ticket.coordinates ? Object.keys(ticket.coordinates) : []
              });
            });
          });

          this.routes = response.routes;
          this.totalCount = response.count;
          this.loading = false;

          console.log('✅ Routes loaded successfully. Total routes:', this.routes.length);

          // Initialize filtered routes
          this.filteredRoutes = [...this.routes];
          this.applyFilters();
        },
        error: (error) => {
          console.error('❌ Error loading routes:', error);
          console.error('❌ Error details:', {
            status: error.status,
            statusText: error.statusText,
            message: error.message,
            url: error.url
          });
          this.error = 'Failed to load routes. Please try again.';
          this.loading = false;
        }
      });
  }

  onRouteSelect(route: Route) {
    console.log('🎯 Route selected:', route);
    console.log('🗺️ Selected route details:', {
      routeId: route.routeId,
      routeCode: route.routeCode,
      type: route.type,
      encodedPolyline: route.encodedPolyline ? `${route.encodedPolyline.substring(0, 100)}...` : 'null',
      totalDistance: route.totalDistance,
      totalDuration: route.totalDuration,
      addressCount: route.addressCount,
      tickets: route.tickets
    });

    this.selectedRoute = route;
    console.log('✅ Selected route set:', this.selectedRoute);

    // Check if encodedPolyline exists and is valid
    if (!route.encodedPolyline) {
      console.error('❌ No encodedPolyline found in route data');
      return;
    }

    console.log('🔍 Encoded polyline length:', route.encodedPolyline.length);
    console.log('🔍 Encoded polyline preview:', route.encodedPolyline.substring(0, 50));

    // Format the route data for the leaflet map
    this.leafletRoutes = [{
      routeId: route.routeId,
      routeCode: route.routeCode,
      type: route.type,
      encodedPolyline: route.encodedPolyline,
      tickets: route.tickets.map(ticket => ({
        ticketId: ticket.ticketId,
        address: ticket.address,
        queue: ticket.queue,
        coordinates: ticket.coordinates // Include coordinates from API
      })),
      color: this.getRouteColor(route.type)
    }];

    console.log('🗺️ Leaflet routes formatted:', this.leafletRoutes);
    console.log('🗺️ Leaflet route encodedPolyline:', this.leafletRoutes[0].encodedPolyline);

    // Add the selected route to visible routes
    this.visibleRoutes.clear();
    this.visibleRoutes.add(route.routeId);
    console.log('👁️ Visible routes set:', Array.from(this.visibleRoutes));

    // Force refresh the map after a short delay to ensure data is set
    setTimeout(() => {
      if (this.leafletMapComponent) {
        console.log('🔄 Refreshing map component...');
        console.log('🗺️ Map component routes:', this.leafletMapComponent['routes']);
        console.log('🗺️ Map component config:', this.leafletMapComponent['config']);
        this.leafletMapComponent.refreshMap();
      } else {
        console.log('❌ Leaflet map component not found');
      }
    }, 100);
  }

  getRouteColor(routeType: string): string {
    const colors: { [key: string]: string } = {
      'SPOTTER': '#FF4500',
      'CONCRETE': '#4A90E2',
      'ASPHALT': '#228B22'
    };
    return colors[routeType] || '#666666';
  }

  onPageChange(page: number) {
    this.currentPage = page;
    // If you need server-side pagination, you would modify the API call here
    // For now, we'll just update the current page
  }

  getMapData() {
    console.log('🗺️ getMapData called, selectedRoute:', this.selectedRoute);

    if (!this.selectedRoute) {
      console.log('❌ No selected route, returning null');
      return null;
    }

    console.log('✅ Map data prepared:', this.leafletRoutes);
    return this.leafletRoutes;
  }

  refreshMap() {
    if (this.leafletMapComponent) {
      console.log('🔄 Manually refreshing map...');
      console.log('🗺️ Current leaflet routes:', this.leafletRoutes);
      this.leafletMapComponent.refreshMap();
    }
  }

  applyFilters() {
    console.log('🔍 Applying filters...');
    console.log('🔍 Text search:', this.textSearch);
    console.log('🔍 Date range:', this.selectedDateRange);

    this.filteredRoutes = this.routes.filter(route => {
      // Text search filter
      const textMatch = !this.textSearch ||
        route.routeCode.toLowerCase().includes(this.textSearch.toLowerCase()) ||
        route.type.toLowerCase().includes(this.textSearch.toLowerCase());

      // Date range filter
      let dateMatch = true;
      if (this.selectedDateRange) {
        const routeDate = new Date(route.startDate);
        const cutoffDate = this.filterService.getDateFromRange(this.selectedDateRange);
        if (cutoffDate) {
          dateMatch = routeDate >= cutoffDate;
        }
      }

      return textMatch && dateMatch;
    });

    console.log('🔍 Filtered routes count:', this.filteredRoutes.length);
  }
}

