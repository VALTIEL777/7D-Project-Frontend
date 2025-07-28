import { Component, OnInit } from '@angular/core';
import { DashboardLayoutComponent } from "../../../../shared/dashboard-layout/dashboard-layout.component";
import { CardWithButtonComponent } from '../../../../shared/card-with-button/card-with-button.component';
import { DataTableComponent } from '../../../../shared/data-table/data-table.component';
import { LeafletMapComponent } from '../../../../shared/leaflet-map/leaflet-map.component';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

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
    private http: HttpClient
  ) {}

  // Make Math available in template
  Math = Math;

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
      name: 'totalDistance',
      header: 'Distance (km)',
      cell: (route: Route) => (route.totalDistance / 1000).toFixed(2)
    },
    {
      name: 'totalDuration',
      header: 'Duration (min)',
      cell: (route: Route) => Math.round(route.totalDuration / 60).toString()
    }
  ];

  routes: Route[] = [];
  selectedRoute: Route | null = null;
  loading = false;
  error = '';
  totalCount = 0;
  currentPage = 1;
  pageSize = 10;

  ngOnInit() {
    console.log('🚀 RouteHistoryComponent initialized');
    this.loadRoutes();
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
          });

          this.routes = response.routes;
          this.totalCount = response.count;
          this.loading = false;

          console.log('✅ Routes loaded successfully. Total routes:', this.routes.length);
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

    const mapData = {
      encodedPolyline: this.selectedRoute.encodedPolyline,
      routeCode: this.selectedRoute.routeCode,
      tickets: this.selectedRoute.tickets,
      totalDistance: this.selectedRoute.totalDistance,
      totalDuration: this.selectedRoute.totalDuration
    };

    console.log('✅ Map data prepared:', mapData);
    return mapData;
  }
}

