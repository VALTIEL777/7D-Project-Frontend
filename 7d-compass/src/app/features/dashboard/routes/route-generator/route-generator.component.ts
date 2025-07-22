import { Component, HostListener, OnInit, ViewChild, TemplateRef, ElementRef } from '@angular/core';
import { DashboardLayoutComponent } from "../../../../shared/dashboard-layout/dashboard-layout.component";
import { CardWithButtonComponent } from "../../../../shared/card-with-button/card-with-button.component";
import { MatTableModule } from "@angular/material/table";
import { CommonModule } from "@angular/common";
import { MatDividerModule } from '@angular/material/divider';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { LoadingSpinnerComponent } from '../../../../shared/loading-spinner/loading-spinner.component';
import { BaseDashboardComponent } from '../../../../shared/base-dashboard.component';
import { FilterService } from '../../../../core/services/filter.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { LeafletMapComponent, RouteData, MapConfig } from '../../../../shared/leaflet-map/leaflet-map.component';

import * as polyline from '@mapbox/polyline';

// Interface for route tickets
interface RouteTicket {
  ticketId: number;
  ticketCode: string;
  address: string;
  queue: number;
  quantity: number;
  amountToPay: number;
}

// Interface for optimization metadata
interface OptimizationMetadata {
  optimizationDate: string;
  totalWaypoints: number;
  originAddress: string;
  destinationAddress: string;
}

// Interface for individual route
interface Route {
  routeId: number;
  routeCode: string;
  type: string;
  startDate: string;
  endDate: string | null;
  encodedPolyline: string;
  totalDistance: number;
  totalDuration: number;
  optimizedOrder: number[];
  optimizationMetadata: OptimizationMetadata;
  createdAt: string;
  updatedAt: string;
  createdBy: number;
  updatedBy: number;
  tickets: RouteTicket[];
}

// Interface for API response
interface RoutesResponse {
  message: string;
  type: string;
  count: number;
  routes: Route[];
}

// Interface for ready tickets
interface ReadyTicket {
  ticketid: number;
  ticketcode: string;
  contractnumber: string | null;
  amounttopay: number | null;
  tickettype: string;
  daysoutstanding: number | null;
  comment7d: string | null;
  quantity: number;
  address: string;
  contractunitname: string;
  incidentname: string;
  createdat: string;
  updatedat: string;
}

// Interface for ready tickets API response
interface ReadyTicketsResponse {
  message: string;
  type: string;
  count: number;
  criteria: string;
  tickets: ReadyTicket[];
}

// Interface for tickets with issues
interface TicketWithIssue {
  ticketId: number;
  ticketCode: string;
  contractNumber: string;
  contractUnitName: string;
  amountToPay: number;
  ticketType: string;
  daysOutstanding: number;
  comment7d: string;
  quantity: number;
  createdAt: string;
  updatedAt: string;
  incidentName: string;
  addresses: string;
  addressDetails: Array<{
    addressId: number;
    addressNumber: string;
    addressCardinal: string;
    addressStreet: string;
    addressSuffix: string;
    latitude: number;
    longitude: number;
    placeid: string;
    fullAddress: string;
  }>;
  taskStatuses: Array<{
    taskStatusId: number;
    name: string;
    description: string;
    startingDate: string;
    endingDate: string;
    crewComment: string | null;
    crewId: number;
  }>;
  taskStatusCount: number;
}

interface TicketsWithIssuesResponse {
  success: boolean;
  message: string;
  summary: {
    totalTickets: number;
    ticketsOnHoldOff: number;
    ticketsWillBeScheduled: number;
    ticketsNeedsPermitExtension: number;
    ticketsWithCrewComments: number;
    totalCrewComments: number;
  };
  data: TicketWithIssue[];
}

@Component({
  selector: 'app-route-generator',
  imports: [
    DashboardLayoutComponent,
    CardWithButtonComponent,
    MatTableModule,
    CommonModule,
    MatDividerModule,
    DragDropModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    LoadingSpinnerComponent,
    LeafletMapComponent
  ],
  templateUrl: './route-generator.component.html',
  styleUrl: './route-generator.component.scss'
})
export class RouteGeneratorComponent extends BaseDashboardComponent implements OnInit {
  isMobile: boolean = false;

  // API data properties
  spottingRoutes: Route[] = [];
  concreteRoutes: Route[] = [];
  asphaltRoutes: Route[] = [];

  // Ready tickets data
  spotReadyTickets: ReadyTicket[] = [];
  asphaltReadyTickets: ReadyTicket[] = [];
  concreteReadyTickets: ReadyTicket[] = [];

  // Loading states
  isLoadingSpottingRoutes = false;
  isLoadingConcreteRoutes = false;
  isLoadingAsphaltRoutes = false;
  isLoadingSpotReady = false;
  isLoadingAsphaltReady = false;
  isLoadingConcreteReady = false;

  // Dialog properties
  newRouteType: string = '';
  private dialogRef: any;

  // Loading states
  isGeneratingRoute: boolean = false;
  reoptimizingRoutes: Set<number> = new Set();

  // Tickets with issues
  ticketsWithIssues: TicketWithIssue[] = [];
  isLoadingTicketsWithIssues = false;

  // Leaflet map properties
  mapConfig: MapConfig = {
    center: [41.8781, -87.6298], // Chicago coordinates
    zoom: 11,
    minZoom: 8,
    maxZoom: 18,
    tileLayer: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors'
  };
  leafletRoutes: RouteData[] = [];

  // Route visibility controls
  showSpottingRoutes: boolean = true;
  showConcreteRoutes: boolean = true;
  showAsphaltRoutes: boolean = true;

  // Individual route visibility controls
  visibleRoutes: Set<number> = new Set();



  displayedColumns: string[] = [
    'location',
    'phase',
    'status',
    'startDate',
    'actions',
  ];

  private initialSpottingRoutes: Route[] = [];
  private initialConcreteRoutes: Route[] = [];
  private initialAsphaltRoutes: Route[] = [];

  @ViewChild('generateRouteDialog') generateRouteDialog!: TemplateRef<any>;

  constructor(
    filterService: FilterService,
    private http: HttpClient,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {
    super(filterService);
    this.checkMobile();
    this.initialSpottingRoutes = [...this.spottingRoutes];
    this.initialConcreteRoutes = [...this.concreteRoutes];
    this.initialAsphaltRoutes = [...this.asphaltRoutes];
  }

  override ngOnInit() {
    super.ngOnInit();
    this.updateDisplayedColumns();

    this.loadSpottingRoutes();
    this.loadConcreteRoutes();
    this.loadAsphaltRoutes();
    this.loadSpotReadyTickets();
    this.loadAsphaltReadyTickets();
    this.loadConcreteReadyTickets();
    this.loadTicketsWithIssues();

    // Generate Leaflet map after initial data load
    setTimeout(() => {
      this.updateLeafletMap();
    }, 1000);
  }

  // Initialize visible routes when data is loaded
  private initializeVisibleRoutes() {
    console.log('=== INITIALIZE VISIBLE ROUTES ===');
    console.log('Show spotting routes:', this.showSpottingRoutes);
    console.log('Show concrete routes:', this.showConcreteRoutes);
    console.log('Show asphalt routes:', this.showAsphaltRoutes);

    this.visibleRoutes.clear();
    const allRoutes = [...this.spottingRoutes, ...this.concreteRoutes, ...this.asphaltRoutes];
    console.log('Total routes to check:', allRoutes.length);

    allRoutes.forEach(route => {
      // Only add routes that match the current type visibility settings
      const typeVisible = (route.type === 'SPOTTER' && this.showSpottingRoutes) ||
                         (route.type === 'CONCRETE' && this.showConcreteRoutes) ||
                         (route.type === 'ASPHALT' && this.showAsphaltRoutes);

      console.log(`Route ${route.routeCode} (${route.type}): typeVisible = ${typeVisible}`);

      if (typeVisible) {
        this.visibleRoutes.add(route.routeId);
        console.log(`Added route ${route.routeId} to visible routes`);
      }
    });

    console.log('Final visible routes:', Array.from(this.visibleRoutes));
  }

    private updateVisibleRoutes() {
    console.log('=== UPDATE VISIBLE ROUTES ===');
    console.log('Show spotting routes:', this.showSpottingRoutes);
    console.log('Show concrete routes:', this.showConcreteRoutes);
    console.log('Show asphalt routes:', this.showAsphaltRoutes);

    const allRoutes = [...this.spottingRoutes, ...this.concreteRoutes, ...this.asphaltRoutes];
    console.log('Total routes to check:', allRoutes.length);

    // Only update visible routes if this is the initial load (visibleRoutes is empty)
    // or if we're toggling type visibility (not individual route visibility)
    if (this.visibleRoutes.size === 0) {
      console.log('Initial load - setting up visible routes based on type visibility');

      allRoutes.forEach(route => {
        // Check if route type is visible
        const typeVisible = (route.type === 'SPOTTER' && this.showSpottingRoutes) ||
                           (route.type === 'CONCRETE' && this.showConcreteRoutes) ||
                           (route.type === 'ASPHALT' && this.showAsphaltRoutes);

        console.log(`Route ${route.routeCode} (${route.type}): typeVisible = ${typeVisible}`);

        if (typeVisible) {
          this.visibleRoutes.add(route.routeId);
          console.log(`Added route ${route.routeId} to visible routes`);
        }
      });
    } else {
      console.log('Individual route visibility mode - preserving existing visible routes');
      console.log('Current visible routes:', Array.from(this.visibleRoutes));
    }

    console.log('Final visible routes:', Array.from(this.visibleRoutes));
  }

  private updateTypeVisibility() {
    console.log('=== UPDATE TYPE VISIBILITY ===');
    console.log('Show spotting routes:', this.showSpottingRoutes);
    console.log('Show concrete routes:', this.showConcreteRoutes);
    console.log('Show asphalt routes:', this.showAsphaltRoutes);

    const allRoutes = [...this.spottingRoutes, ...this.concreteRoutes, ...this.asphaltRoutes];
    console.log('Total routes to check:', allRoutes.length);

    // Clear and rebuild visible routes based on type visibility
    this.visibleRoutes.clear();

    allRoutes.forEach(route => {
      // Check if route type is visible
      const typeVisible = (route.type === 'SPOTTER' && this.showSpottingRoutes) ||
                         (route.type === 'CONCRETE' && this.showConcreteRoutes) ||
                         (route.type === 'ASPHALT' && this.showAsphaltRoutes);

      console.log(`Route ${route.routeCode} (${route.type}): typeVisible = ${typeVisible}`);

      if (typeVisible) {
        this.visibleRoutes.add(route.routeId);
        console.log(`Added route ${route.routeId} to visible routes`);
      }
    });

    console.log('Final visible routes after type visibility update:', Array.from(this.visibleRoutes));
    this.updateLeafletMap();
  }

  protected override loadData(): void {
    // Initialize data for filtering - combine all route-related data
    const allRouteData = [
      ...this.spottingRoutes.map(route => ({ ...route, type: 'spotting' })),
      ...this.concreteRoutes.map(route => ({ ...route, type: 'concrete' })),
      ...this.asphaltRoutes.map(route => ({ ...route, type: 'asphalt' })),
      // Add ready tickets for filtering
      ...this.spotReadyTickets.map(ticket => ({ ...ticket, type: 'ready-ticket', category: 'spot' })),
      ...this.asphaltReadyTickets.map(ticket => ({ ...ticket, type: 'ready-ticket', category: 'asphalt' })),
      ...this.concreteReadyTickets.map(ticket => ({ ...ticket, type: 'ready-ticket', category: 'concrete' }))
    ];

    this.allData = allRouteData;
    this.filteredData = [...this.allData];
  }

  // Override text search to include route and location fields
  protected override matchesTextSearch(item: any, searchTerm: string): boolean {
    const searchableFields = ['routeCode', 'location', 'phase', 'status', 'reason'];

    // Check direct fields
    const directMatch = searchableFields.some(field => {
      const value = this.getNestedValue(item, field);
      if (value) {
        return String(value).toLowerCase().includes(searchTerm);
      }
      return false;
    });

    if (directMatch) return true;

    // Search in tickets arrays for route items
    if (item.tickets && Array.isArray(item.tickets)) {
      return item.tickets.some((ticket: RouteTicket) => {
        if (ticket.address) {
          return ticket.address.toLowerCase().includes(searchTerm);
        }
        return false;
      });
    }

    // Search in ready tickets for ready sections
    if (item.type === 'ready-ticket' && item.address) {
      return item.address.toLowerCase().includes(searchTerm);
    }

    return false;
  }

  // Override date range to use startDate for tickets
  protected override matchesDateRange(item: any, cutoffDate: Date): boolean {
    if (item.type === 'ticket' && item.startDate) {
      const itemDate = new Date(item.startDate);
      if (!isNaN(itemDate.getTime()) && itemDate >= cutoffDate) {
        return true;
      }
    }
    return false;
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    this.checkMobile();
    this.updateDisplayedColumns();
  }

  checkMobile() {
    if (typeof window !== 'undefined') {
      this.isMobile = window.innerWidth <= 768;
    }
  }

  updateDisplayedColumns() {
    if (this.isMobile) {
      this.displayedColumns = ['location', 'status'];
    } else {
      this.displayedColumns = ['location', 'phase', 'status', 'startDate', 'actions'];
    }
  }

  // Getter for filtered ticket data
  get filteredTicketData() {
    return this.filteredData.filter(item => item.type === 'ticket');
  }

  // Getter for filtered route data with filtered tickets
  get filteredSpottingRoutes() {
    return this.spottingRoutes.map(route => ({
      ...route,
      tickets: this.filterTicketsInRoute(route.tickets)
    }));
  }

  get filteredConcreteRoutes() {
    return this.concreteRoutes.map(route => ({
      ...route,
      tickets: this.filterTicketsInRoute(route.tickets)
    }));
  }

  get filteredAsphaltRoutes() {
    return this.asphaltRoutes.map(route => ({
      ...route,
      tickets: this.filterTicketsInRoute(route.tickets)
    }));
  }

  // Helper method to filter tickets within a route based on current search
  private filterTicketsInRoute(tickets: RouteTicket[]): RouteTicket[] {
    if (!this.currentTextSearch.trim()) {
      return tickets; // Return all tickets if no search term
    }

    const searchTerm = this.currentTextSearch.toLowerCase().trim();
    return tickets.filter(ticket => {
      if (ticket.address) {
        return ticket.address.toLowerCase().includes(searchTerm);
      }
      return false;
    });
  }

  // Helper method to check if a ticket should be visible based on current search
  isTicketVisible(ticket: any): boolean {
    if (!this.currentTextSearch.trim()) {
      return true; // Show all tickets if no search term
    }

    const searchTerm = this.currentTextSearch.toLowerCase().trim();
    if (ticket.address) {
      return ticket.address.toLowerCase().includes(searchTerm);
    }
    return false;
  }

  // Getter for filtered ready tickets
  get filteredSpotReadyTickets() {
    if (!this.currentTextSearch.trim()) {
      return this.spotReadyTickets;
    }
    const searchTerm = this.currentTextSearch.toLowerCase().trim();
    return this.spotReadyTickets.filter(ticket => {
      if (ticket.address) {
        return ticket.address.toLowerCase().includes(searchTerm);
      }
      return false;
    });
  }

  get filteredAsphaltReadyTickets() {
    if (!this.currentTextSearch.trim()) {
      return this.asphaltReadyTickets;
    }
    const searchTerm = this.currentTextSearch.toLowerCase().trim();
    return this.asphaltReadyTickets.filter(ticket => {
      if (ticket.address) {
        return ticket.address.toLowerCase().includes(searchTerm);
      }
      return false;
    });
  }

  get filteredConcreteReadyTickets() {
    if (!this.currentTextSearch.trim()) {
      return this.concreteReadyTickets;
    }
    const searchTerm = this.currentTextSearch.toLowerCase().trim();
    return this.concreteReadyTickets.filter(ticket => {
      if (ticket.address) {
        return ticket.address.toLowerCase().includes(searchTerm);
      }
      return false;
    });
  }





  // Load spotting routes from API
  loadSpottingRoutes() {
    this.isLoadingSpottingRoutes = true;
    this.http.get<RoutesResponse>(`${environment.apiUrl}/routes/spotting`).subscribe({
      next: (response) => {
        console.log('Spotting routes API response:', response);
        console.log('Number of routes received:', response.routes?.length || 0);

        // Debug each route's polyline
        if (response.routes && response.routes.length > 0) {
          response.routes.forEach((route, index) => {
            console.log(`Route ${index + 1} (${route.routeCode}):`);
            console.log(`  - Route ID: ${route.routeId}`);
            console.log(`  - Type: ${route.type}`);
            console.log(`  - Polyline length: ${route.encodedPolyline?.length || 0}`);
            console.log(`  - Polyline preview: ${route.encodedPolyline?.substring(0, 50) || 'N/A'}...`);
            console.log(`  - Tickets count: ${route.tickets?.length || 0}`);
          });
        }

        this.spottingRoutes = response.routes || [];
        this.initialSpottingRoutes = [...this.spottingRoutes];
        this.isLoadingSpottingRoutes = false;

        this.loadData(); // Refresh filtered data
        this.initializeVisibleRoutes(); // Initialize visible routes
        this.updateLeafletMap(); // Update Leaflet map
      },
      error: (error) => {
        console.error('Error loading spotting routes:', error);
        this.isLoadingSpottingRoutes = false;
        // Use empty array if API fails
        this.spottingRoutes = [];
        this.initialSpottingRoutes = [...this.spottingRoutes];
        this.loadData(); // Refresh filtered data
        this.updateLeafletMap(); // Update Leaflet map
      }
    });
  }

  // Load concrete routes from API
  loadConcreteRoutes() {
    this.isLoadingConcreteRoutes = true;
    this.http.get<RoutesResponse>(`${environment.apiUrl}/routes/concrete`).subscribe({
      next: (response) => {
        console.log('Concrete routes API response:', response);
        console.log('Number of concrete routes received:', response.routes?.length || 0);

        // Debug each route's polyline
        if (response.routes && response.routes.length > 0) {
          response.routes.forEach((route, index) => {
            console.log(`Concrete Route ${index + 1} (${route.routeCode}):`);
            console.log(`  - Route ID: ${route.routeId}`);
            console.log(`  - Type: ${route.type}`);
            console.log(`  - Polyline length: ${route.encodedPolyline?.length || 0}`);
            console.log(`  - Polyline preview: ${route.encodedPolyline?.substring(0, 50) || 'N/A'}...`);
            console.log(`  - Tickets count: ${route.tickets?.length || 0}`);
          });
        }

        this.concreteRoutes = response.routes || [];
        this.initialConcreteRoutes = [...this.concreteRoutes];
        this.isLoadingConcreteRoutes = false;

        this.loadData(); // Refresh filtered data
        this.initializeVisibleRoutes(); // Initialize visible routes
        this.updateLeafletMap(); // Update Leaflet map
      },
      error: (error) => {
        console.error('Error loading concrete routes:', error);
        this.isLoadingConcreteRoutes = false;
        // Use empty array if API fails
        this.concreteRoutes = [];
        this.initialConcreteRoutes = [...this.concreteRoutes];
        this.loadData(); // Refresh filtered data
        this.updateLeafletMap(); // Update Leaflet map
      }
    });
  }

  // Load asphalt routes from API
  loadAsphaltRoutes() {
    this.isLoadingAsphaltRoutes = true;
    this.http.get<RoutesResponse>(`${environment.apiUrl}/routes/asphalt`).subscribe({
      next: (response) => {
        console.log('Asphalt routes API response:', response);
        console.log('Number of asphalt routes received:', response.routes?.length || 0);

        // Debug each route's polyline
        if (response.routes && response.routes.length > 0) {
          response.routes.forEach((route, index) => {
            console.log(`Asphalt Route ${index + 1} (${route.routeCode}):`);
            console.log(`  - Route ID: ${route.routeId}`);
            console.log(`  - Type: ${route.type}`);
            console.log(`  - Polyline length: ${route.encodedPolyline?.length || 0}`);
            console.log(`  - Polyline preview: ${route.encodedPolyline?.substring(0, 50) || 'N/A'}...`);
            console.log(`  - Tickets count: ${route.tickets?.length || 0}`);
          });
        }

        this.asphaltRoutes = response.routes || [];
        this.initialAsphaltRoutes = [...this.asphaltRoutes];
        this.isLoadingAsphaltRoutes = false;

        this.loadData(); // Refresh filtered data
        this.initializeVisibleRoutes(); // Initialize visible routes
        this.updateLeafletMap(); // Update Leaflet map
      },
      error: (error) => {
        console.error('Error loading asphalt routes:', error);
        this.isLoadingAsphaltRoutes = false;
        // Use empty array if API fails
        this.asphaltRoutes = [];
        this.initialAsphaltRoutes = [...this.asphaltRoutes];
        this.loadData(); // Refresh filtered data
        this.updateLeafletMap(); // Update Leaflet map
      }
    });
  }

  // Load spot ready tickets from API
  loadSpotReadyTickets() {
    this.isLoadingSpotReady = true;
    this.http.get<ReadyTicketsResponse>(`${environment.apiUrl}/routes/tickets-ready/spotting`).subscribe({
      next: (response) => {
        console.log('Spot ready tickets response:', response);
        this.spotReadyTickets = response.tickets;
        console.log('Spot ready tickets array:', this.spotReadyTickets);
        this.isLoadingSpotReady = false;
        this.loadData(); // Refresh filtered data
      },
      error: (error) => {
        console.error('Error loading spot ready tickets:', error);
        this.isLoadingSpotReady = false;
        // Fallback to empty array if API fails
        this.spotReadyTickets = [];
        this.loadData(); // Refresh filtered data
      }
    });
  }

  // Load asphalt ready tickets from API
  loadAsphaltReadyTickets() {
    this.isLoadingAsphaltReady = true;
    this.http.get<ReadyTicketsResponse>(`${environment.apiUrl}/routes/tickets-ready/asphalt`).subscribe({
      next: (response) => {
        this.asphaltReadyTickets = response.tickets;
        this.isLoadingAsphaltReady = false;
        this.loadData(); // Refresh filtered data
      },
      error: (error) => {
        console.error('Error loading asphalt ready tickets:', error);
        this.isLoadingAsphaltReady = false;
        // Fallback to empty array if API fails
        this.asphaltReadyTickets = [];
        this.loadData(); // Refresh filtered data
      }
    });
  }

  // Load concrete ready tickets from API
  loadConcreteReadyTickets() {
    this.isLoadingConcreteReady = true;
    this.http.get<ReadyTicketsResponse>(`${environment.apiUrl}/routes/tickets-ready/concrete`).subscribe({
      next: (response) => {
        this.concreteReadyTickets = response.tickets;
        this.isLoadingConcreteReady = false;
        this.loadData(); // Refresh filtered data
      },
      error: (error) => {
        console.error('Error loading concrete ready tickets:', error);
        this.isLoadingConcreteReady = false;
        // Fallback to empty array if API fails
        this.concreteReadyTickets = [];
        this.loadData(); // Refresh filtered data
      }
    });
  }

  async drop(event: CdkDragDrop<any[]>) {
    console.log('=== DROP EVENT TRIGGERED ===');
    console.log('Event:', event);
    console.log('Previous container:', event.previousContainer);
    console.log('Current container:', event.container);
    console.log('Previous index:', event.previousIndex);
    console.log('Current index:', event.currentIndex);
    console.log('Previous container data:', event.previousContainer.data);
    console.log('Current container data:', event.container.data);

    const draggedTicket = event.previousContainer.data[event.previousIndex];
    console.log('Dragged ticket:', draggedTicket);

    // Check if we're moving between ready sections
    const isFromReadySection = this.isReadySection(event.previousContainer.data);
    const isToReadySection = this.isReadySection(event.container.data);
    const isToRoute = this.isRouteSection(event.container);

    console.log('Is from ready section:', isFromReadySection);
    console.log('Is to ready section:', isToReadySection);
    console.log('Is to route:', isToRoute);
    console.log('Previous container data type:', typeof event.previousContainer.data);
    console.log('Current container element:', event.container.element);

    if (isFromReadySection && isToReadySection) {
      console.log('Scenario 2: Moving between ready sections');
      // Scenario 2: Moving between ready sections
      await this.handleMoveBetweenReadySections(event, draggedTicket);
    } else if (isFromReadySection && isToRoute) {
      console.log('Scenario 3: Moving from ready section to route');
      // Scenario 3: Moving from ready section to route
      await this.handleMoveFromReadyToRoute(event, draggedTicket);
    } else if (event.previousContainer === event.container) {
      console.log('Scenario 1: Reordering within the same container');
      // Scenario 1: Reordering within the same route
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);

      // Update queue numbers for the reordered tickets
      event.container.data.forEach((ticket, index) => {
        ticket.queue = index;
      });

      // Find the route that contains this container
      const routeId = this.getRouteIdFromDropEvent(event);
      if (routeId) {
        const route = this.findRouteByTickets(routeId);
        if (route) {
          await this.handleReorderWithinRoute(route, event.container.data);
        }
      }
    } else {
      console.log('Scenario 4: Moving between routes');
      // Scenario 4: Moving between routes
      const isSourceRoute = this.isRouteSection(event.previousContainer);

      if (isSourceRoute && event.previousContainer.data.length === 1) {
        alert('Routes cannot be empty. At least one location must remain.');
        return;
      }

      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );

      // Update queue numbers for both source and destination containers
      if (event.previousContainer.data.length > 0) {
        event.previousContainer.data.forEach((ticket, index) => {
          ticket.queue = index;
        });
      }

      event.container.data.forEach((ticket, index) => {
        ticket.queue = index;
      });

      // Handle the API calls for moving between routes
      await this.handleMoveBetweenRoutes(event, draggedTicket);
    }

    // Force Angular to detect changes by reassigning the arrays
    this.spottingRoutes = [...this.spottingRoutes];
    this.concreteRoutes = [...this.concreteRoutes];
    this.asphaltRoutes = [...this.asphaltRoutes];
    console.log('=== DROP EVENT COMPLETED ===');
  }

  private getRouteIdFromDropEvent(event: CdkDragDrop<any[]>): number | null {
    // Get route ID from the container element's data attribute
    const containerElement = event.container.element.nativeElement;
    const routeId = containerElement.getAttribute('data-route-id');
    console.log('=== GET ROUTE ID FROM DROP EVENT ===');
    console.log('Container element:', containerElement);
    console.log('Route ID attribute:', routeId);
    console.log('Parsed route ID:', routeId ? parseInt(routeId, 10) : null);
    console.log('====================================');
    return routeId ? parseInt(routeId, 10) : null;
  }

  private isReadySection(data: any[]): boolean {
    console.log('=== IS READY SECTION CHECK ===');
    console.log('Data to check:', data);
    console.log('Filtered spot ready tickets:', this.filteredSpotReadyTickets);
    console.log('Filtered concrete ready tickets:', this.filteredConcreteReadyTickets);
    console.log('Filtered asphalt ready tickets:', this.filteredAsphaltReadyTickets);
    console.log('Is filtered spot ready:', data === this.filteredSpotReadyTickets);
    console.log('Is filtered concrete ready:', data === this.filteredConcreteReadyTickets);
    console.log('Is filtered asphalt ready:', data === this.filteredAsphaltReadyTickets);
    const result = data === this.filteredSpotReadyTickets ||
           data === this.filteredConcreteReadyTickets ||
           data === this.filteredAsphaltReadyTickets;
    console.log('Final result:', result);
    console.log('==============================');
    return result;
  }

  private isRouteSection(container: any): boolean {
    // Check if the container element has the route section attribute
    const containerElement = container.element?.nativeElement;
    console.log('=== IS ROUTE SECTION CHECK ===');
    console.log('Container:', container);
    console.log('Container element:', containerElement);
    console.log('Has data-route-section attribute:', containerElement && containerElement.hasAttribute('data-route-section'));
    const result = containerElement && containerElement.hasAttribute('data-route-section');
    console.log('Final result:', result);
    console.log('=============================');
    return result;
  }

  private async handleMoveFromReadyToRoute(event: CdkDragDrop<any[]>, draggedTicket: any) {
    console.log('=== HANDLE MOVE FROM READY TO ROUTE ===');
    console.log('Dragged ticket:', draggedTicket);
    console.log('Previous container data:', event.previousContainer.data);
    console.log('Current container data:', event.container.data);

    try {
      const routeId = this.getRouteIdFromDropEvent(event);
      if (!routeId) {
        console.error('Could not find route ID from drop event');
        alert('Could not find destination route. Please try again.');
        return;
      }

      const destinationRoute = this.findRouteByTickets(routeId);

      if (!destinationRoute) {
        console.error('Could not find destination route');
        alert('Could not find destination route. Please try again.');
        return;
      }

      // Extract ticket ID from the ready ticket
      const ticketId = draggedTicket.ticketid || draggedTicket.ticketId;

      console.log('=== MOVE FROM READY TO ROUTE DEBUG ===');
      console.log('Dragged ticket object:', draggedTicket);
      console.log('Ticket ID extracted:', ticketId);
      console.log('Destination route:', destinationRoute);
      console.log('======================================');

      if (!ticketId) {
        console.error('Could not find ticket ID in dragged ticket:', draggedTicket);
        alert('Could not find ticket ID. Please try again.');
        return;
      }

      console.log(`Adding ticket ${ticketId} to route ${destinationRoute.routeCode}`);

      // Show loading message
      this.snackBar.open(`Adding ticket to route ${destinationRoute.routeCode}...`, 'Close', { duration: 2000 });

      // Add ticket to destination route
      await this.addTicketsToRoute(destinationRoute.routeId, [ticketId]);

      // Note: Reoptimization will be done manually via the route button

      // Remove the ticket from the ready section (don't transfer, just remove)
      // Note: We need to remove from the original array, not the filtered array
      const ticketToRemove = event.previousContainer.data[event.previousIndex];
      if (ticketToRemove) {
        // Find and remove from the original array
        if (event.previousContainer.data === this.filteredSpotReadyTickets) {
          const originalIndex = this.spotReadyTickets.findIndex(t => t.ticketid === ticketToRemove.ticketid);
          if (originalIndex !== -1) {
            this.spotReadyTickets.splice(originalIndex, 1);
          }
        } else if (event.previousContainer.data === this.filteredAsphaltReadyTickets) {
          const originalIndex = this.asphaltReadyTickets.findIndex(t => t.ticketid === ticketToRemove.ticketid);
          if (originalIndex !== -1) {
            this.asphaltReadyTickets.splice(originalIndex, 1);
          }
        } else if (event.previousContainer.data === this.filteredConcreteReadyTickets) {
          const originalIndex = this.concreteReadyTickets.findIndex(t => t.ticketid === ticketToRemove.ticketid);
          if (originalIndex !== -1) {
            this.concreteReadyTickets.splice(originalIndex, 1);
          }
        }
      }

      // Refresh the data to get the updated route with the new ticket
      this.refreshAllDataAndCache();

      console.log(`Successfully added ticket ${ticketId} to route ${destinationRoute.routeCode}`);
      this.snackBar.open(`Successfully added ticket to route ${destinationRoute.routeCode}!`, 'Close', { duration: 3000 });
    } catch (error: any) {
      console.error('Error moving ticket from ready section to route:', error);

      // Provide more specific error messages
      let errorMessage = 'Error adding ticket to route. Please try again.';

      if (error?.status === 404) {
        errorMessage = 'Route not found. Please refresh and try again.';
      } else if (error?.status === 400) {
        errorMessage = 'Invalid ticket data. Please check the ticket information.';
      } else if (error?.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      } else if (error?.status === 0) {
        errorMessage = 'Network error. Please check your connection.';
      }

      this.snackBar.open(errorMessage, 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
    }
  }

  private async handleMoveBetweenReadySections(event: CdkDragDrop<any[]>, draggedTicket: any) {
    console.log('=== HANDLE MOVE BETWEEN READY SECTIONS ===');
    console.log('Dragged ticket:', draggedTicket);
    console.log('Previous container data:', event.previousContainer.data);
    console.log('Current container data:', event.container.data);

    // Determine the source and destination ready sections
    const sourceSection = this.getReadySectionType(event.previousContainer.data);
    const destSection = this.getReadySectionType(event.container.data);

    console.log('Source section:', sourceSection);
    console.log('Destination section:', destSection);

    // Check restrictions
    if (sourceSection === 'spot' && (destSection === 'asphalt' || destSection === 'concrete')) {
      console.log('✅ Allowed: Spot Ready → Asphalt Ready or Concrete Ready');
    } else if (sourceSection === 'concrete' && destSection === 'asphalt') {
      console.log('✅ Allowed: Concrete Ready → Asphalt Ready');
    } else {
      console.log('❌ Restricted move detected');
      this.snackBar.open('This move is not allowed. Please check the restrictions.', 'Close', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    // Remove from source ready section (from original array)
    const ticketToMove = event.previousContainer.data[event.previousIndex];
    if (ticketToMove) {
      // Remove from original source array
      if (event.previousContainer.data === this.filteredSpotReadyTickets) {
        const originalIndex = this.spotReadyTickets.findIndex(t => t.ticketid === ticketToMove.ticketid);
        if (originalIndex !== -1) {
          this.spotReadyTickets.splice(originalIndex, 1);
        }
      } else if (event.previousContainer.data === this.filteredAsphaltReadyTickets) {
        const originalIndex = this.asphaltReadyTickets.findIndex(t => t.ticketid === ticketToMove.ticketid);
        if (originalIndex !== -1) {
          this.asphaltReadyTickets.splice(originalIndex, 1);
        }
      } else if (event.previousContainer.data === this.filteredConcreteReadyTickets) {
        const originalIndex = this.concreteReadyTickets.findIndex(t => t.ticketid === ticketToMove.ticketid);
        if (originalIndex !== -1) {
          this.concreteReadyTickets.splice(originalIndex, 1);
        }
      }

      // Add to original destination array
      if (event.container.data === this.filteredSpotReadyTickets) {
        this.spotReadyTickets.push(ticketToMove);
      } else if (event.container.data === this.filteredAsphaltReadyTickets) {
        this.asphaltReadyTickets.push(ticketToMove);
      } else if (event.container.data === this.filteredConcreteReadyTickets) {
        this.concreteReadyTickets.push(ticketToMove);
      }
    }

    console.log('=== MOVE BETWEEN READY SECTIONS COMPLETED ===');
  }

  private getReadySectionType(data: any[]): string {
    console.log('=== GET READY SECTION TYPE ===');
    console.log('Data:', data);

    // Check if this is a ready section by comparing with filtered arrays
    if (data === this.filteredSpotReadyTickets) {
      console.log('Section type: spot');
      return 'spot';
    }

    if (data === this.filteredAsphaltReadyTickets) {
      console.log('Section type: asphalt');
      return 'asphalt';
    }

    if (data === this.filteredConcreteReadyTickets) {
      console.log('Section type: concrete');
      return 'concrete';
    }

    // Fallback: Check if this is a ready section by looking at the first item's properties
    if (data.length > 0) {
      const firstItem = data[0];
      console.log('First item:', firstItem);

      // Check if it's a ready ticket with category
      if (firstItem.type === 'ready-ticket') {
        console.log('Section type:', firstItem.category);
        return firstItem.category;
      }
    }

    console.log('Section type: unknown');
    return 'unknown';
  }

  private findRouteByTickets(routeId: number): Route | null {
    const allRoutes = [...this.spottingRoutes, ...this.concreteRoutes, ...this.asphaltRoutes];
    return allRoutes.find(route => route.routeId === routeId) || null;
  }

  private async handleReorderWithinRoute(route: Route, tickets: any[]): Promise<void> {
    try {
      // Update queue numbers locally without reoptimizing
      console.log(`Reordered tickets within route ${route.routeCode} - reoptimization will be done manually`);
    } catch (error) {
      console.error('Error reordering tickets within route:', error);
      alert('Error reordering tickets. Please try again.');
    }
  }

  private async handleMoveBetweenRoutes(event: CdkDragDrop<any[]>, draggedTicket: any): Promise<void> {
    try {
      const sourceRouteId = this.getRouteIdFromDropEvent({ ...event, container: event.previousContainer });
      const destinationRouteId = this.getRouteIdFromDropEvent(event);

      if (!sourceRouteId || !destinationRouteId) {
        console.error('Could not find route IDs from drop event');
        alert('Could not identify source or destination route. Please try again.');
        return;
      }

      const sourceRoute = this.findRouteByTickets(sourceRouteId);
      const destinationRoute = this.findRouteByTickets(destinationRouteId);

      if (sourceRoute && destinationRoute) {
        // Extract ticket ID - handle both RouteTicket and ReadyTicket structures
        const ticketId = draggedTicket.ticketId || draggedTicket.ticketid;

        if (!ticketId) {
          console.error('Could not find ticket ID in dragged ticket:', draggedTicket);
          return;
        }

        // 1. Remove from source route
        await this.removeTicketsFromRoute(sourceRoute.routeId, [ticketId]);

        // 2. Add to destination route
        await this.addTicketsToRoute(destinationRoute.routeId, [ticketId]);

        // Note: Reoptimization will be done manually via the route buttons

        console.log(`Moved ticket ${ticketId} from route ${sourceRoute.routeCode} to ${destinationRoute.routeCode}`);
      }
    } catch (error) {
      console.error('Error moving ticket between routes:', error);
      alert('Error moving ticket. Please try again.');
    }
  }

  private async removeTicketsFromRoute(routeId: number, ticketIds: number[]): Promise<void> {
    const endpoint = `${environment.apiUrl}/route-optimization/route/${routeId}/remove-tickets`;
    await this.http.delete(endpoint, { body: { ticketIds } }).toPromise();
  }

  private async addTicketsToRoute(routeId: number, ticketIds: number[]): Promise<void> {
    const endpoint = `${environment.apiUrl}/route-optimization/route/${routeId}/add-tickets`;
    const requestBody = { ticketIds };

    console.log('=== ADD TICKETS TO ROUTE DEBUG ===');
    console.log('Endpoint:', endpoint);
    console.log('Route ID:', routeId);
    console.log('Ticket IDs:', ticketIds);
    console.log('Request body:', JSON.stringify(requestBody, null, 2));
    console.log('==================================');

    try {
      const response = await this.http.post(endpoint, requestBody).toPromise();
      console.log('Add tickets response:', response);
    } catch (error: any) {
      console.error('=== ADD TICKETS ERROR DEBUG ===');
      console.error('Error object:', error);
      console.error('Error status:', error.status);
      console.error('Error statusText:', error.statusText);
      console.error('Error message:', error.message);
      console.error('Error error:', error.error);
      console.error('Error url:', error.url);
      console.error('Full error response:', JSON.stringify(error, null, 2));
      console.error('===============================');
      throw error;
    }
  }

  private async reoptimizeRoute(routeId: number): Promise<void> {
    const endpoint = `${environment.apiUrl}/route-optimization/route/${routeId}/reoptimize`;
    const requestBody = {
      originAddress: "2000 W 43rd St, Chicago, IL 60609, Estados Unidos",
      destinationAddress: "2000 W 43rd St, Chicago, IL 60609, Estados Unidos"
    };
    await this.http.post(endpoint, requestBody).toPromise();
  }



  // Helper method to count unique locations in a route
  getUniqueLocationCount(route: Route): number {
    if (!route.tickets || route.tickets.length === 0) {
      return 0;
    }

    const uniqueAddresses = new Set<string>();
    route.tickets.forEach(ticket => {
      if (ticket.address) {
        uniqueAddresses.add(ticket.address.trim().toLowerCase());
      }
    });

    return uniqueAddresses.size;
  }

  // Helper method to check if route has too many locations for reoptimization
  isRouteTooLargeForReoptimization(route: Route): boolean {
    return this.getUniqueLocationCount(route) > 25;
  }

    // Cancel route
  async cancelRoute(route: Route) {
    const confirmed = confirm(`Are you sure you want to cancel route ${route.routeCode}?`);

    if (!confirmed) {
      return;
    }

    try {
      this.snackBar.open(`Cancelling route ${route.routeCode}...`, 'Close', { duration: 3000 });

      // Use the correct endpoint based on route type
      let endpoint: string;
      switch (route.type) {
        case 'SPOTTER':
          endpoint = `${environment.apiUrl}/route-optimization/route/${route.routeId}/cancel-spotting`;
          break;
        case 'CONCRETE':
          endpoint = `${environment.apiUrl}/route-optimization/route/${route.routeId}/cancel-concrete`;
          break;
        case 'ASPHALT':
          endpoint = `${environment.apiUrl}/route-optimization/route/${route.routeId}/cancel-asphalt`;
          break;
        default:
          throw new Error(`Unknown route type: ${route.type}`);
      }

      await this.http.post(endpoint, {}).toPromise();

      // Refresh the specific route data
      this.refreshAllDataAndCache();

      this.snackBar.open(`Route ${route.routeCode} has been cancelled successfully!`, 'Close', { duration: 5000 });
    } catch (error) {
      console.error(`Error cancelling route ${route.routeCode}:`, error);
      this.snackBar.open(`Error cancelling route ${route.routeCode}. Please try again.`, 'Close', { duration: 5000 });
    }
  }

  // Complete route
  async completeRoute(route: Route) {
    const confirmed = confirm(`Are you sure you want to complete route ${route.routeCode}?`);

    if (!confirmed) {
      return;
    }

    try {
      this.snackBar.open(`Completing route ${route.routeCode}...`, 'Close', { duration: 3000 });

      const endpoint = `${environment.apiUrl}/route-optimization/route/${route.routeId}/complete`;
      await this.http.post(endpoint, {}).toPromise();

      // Refresh the specific route data
      this.refreshAllDataAndCache();

      this.snackBar.open(`Route ${route.routeCode} has been completed successfully!`, 'Close', { duration: 5000 });
    } catch (error) {
      console.error(`Error completing route ${route.routeCode}:`, error);
      this.snackBar.open(`Error completing route ${route.routeCode}. Please try again.`, 'Close', { duration: 5000 });
    }
  }

  // Reoptimize specific route - updated to use actual endpoints
  async reoptimizeSpecificRoute(route: Route) {
    // Check if route has too many locations
    if (this.isRouteTooLargeForReoptimization(route)) {
      const locationCount = this.getUniqueLocationCount(route);
      this.snackBar.open(
        `Cannot reoptimize route ${route.routeCode}. It has ${locationCount} unique locations (maximum 25 allowed).`,
        'Close',
        { duration: 5000, panelClass: ['error-snackbar'] }
      );
      return;
    }

    const confirmed = confirm(`Are you sure you want to reoptimize route ${route.routeCode}?`);

    if (!confirmed) {
      return;
    }

    this.reoptimizingRoutes.add(route.routeId);

    try {
      this.snackBar.open(`Reoptimizing route ${route.routeCode}...`, 'Close', { duration: 3000 });

      await this.reoptimizeRoute(route.routeId);

      // Refresh the specific route data
      this.refreshAllDataAndCache();

      this.snackBar.open(`Route ${route.routeCode} has been reoptimized successfully!`, 'Close', { duration: 5000 });
    } catch (error) {
      console.error(`Error reoptimizing route ${route.routeCode}:`, error);
      this.snackBar.open(`Error reoptimizing route ${route.routeCode}. Please try again.`, 'Close', { duration: 5000 });
    } finally {
      this.reoptimizingRoutes.delete(route.routeId);
    }
  }

  openGenerateRouteDialog() {
    this.dialogRef = this.dialog.open(this.generateRouteDialog, {
      width: '500px',
      disableClose: true
    });
  }

  closeGenerateRouteDialog() {
    if (this.dialogRef) {
      this.dialogRef.close();
      // Reset form after dialog closes
      this.newRouteType = '';
    }
  }

  generateNewRoute() {
    // Validate form
    if (!this.newRouteType) {
      alert('Please select a route type');
      return;
    }

    // Set loading state
    this.isGeneratingRoute = true;

    // Get ready tickets based on route type
    let readyTickets: ReadyTicket[] = [];
    switch (this.newRouteType) {
      case 'spotting':
        readyTickets = this.filteredSpotReadyTickets;
        break;
      case 'concrete':
        readyTickets = this.filteredConcreteReadyTickets;
        break;
      case 'asphalt':
        readyTickets = this.filteredAsphaltReadyTickets;
        break;
      default:
        alert('Invalid route type selected');
        return;
    }

    if (readyTickets.length === 0) {
      alert('No ready tickets available for this route type');
      return;
    }

    // Extract ticket IDs from ready tickets and filter out any null/undefined values
    const ticketIds = readyTickets
      .map(ticket => ticket.ticketid)
      .filter(id => id !== null && id !== undefined && id > 0);

    if (ticketIds.length === 0) {
      alert('No valid ticket IDs found for this route type');
      return;
    }

    console.log('=== ROUTE GENERATION DEBUG ===');
    console.log('Route type:', this.newRouteType);
    console.log('Ready tickets:', readyTickets);
    console.log('Ticket IDs:', ticketIds);
    console.log('Ready tickets count:', readyTickets.length);
    console.log('Valid ticket IDs count:', ticketIds.length);
    console.log('==============================');

    // Use the optimize-single endpoint from your backend
    const endpoint = `${environment.apiUrl}/route-optimization/optimize-single`;

    // Map route type to expected API values
    let routeType = this.newRouteType.toUpperCase();
    switch (this.newRouteType) {
      case 'spotting':
        routeType = 'SPOTTER';
        break;
      case 'concrete':
        routeType = 'CONCRETE';
        break;
      case 'asphalt':
        routeType = 'ASPHALT';
        break;
    }

    const requestBody = {
      ticketIds: ticketIds,
      routeCode: `${routeType}-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`,
      type: routeType,
      originAddress: "2000 W 43rd St, Chicago, IL 60609, Estados Unidos",
      destinationAddress: "2000 W 43rd St, Chicago, IL 60609, Estados Unidos",
      options: {
        autoSuggest: true,
        minConfidence: 0.8
      }
    };

    console.log('=== API REQUEST DEBUG ===');
    console.log('Endpoint:', endpoint);
    console.log('Request body:', JSON.stringify(requestBody, null, 2));
    console.log('========================');

    // Test if endpoint is reachable first
    console.log('Testing endpoint reachability...');
    this.http.get(`${environment.apiUrl}/route-optimization/status`).subscribe({
      next: (statusResponse) => {
        console.log('API status check successful:', statusResponse);
        this.makeOptimizationRequest(endpoint, requestBody);
      },
      error: (statusError) => {
        console.error('API status check failed:', statusError);
        this.isGeneratingRoute = false;
        alert('Route optimization service is not available. Please try again later.');
      }
    });
  }

  private makeOptimizationRequest(endpoint: string, requestBody: any) {
    console.log('Making optimization request...');
    this.http.post(endpoint, requestBody).subscribe({
      next: (response) => {
        console.log('Route generation successful:', response);
        this.isGeneratingRoute = false;
        this.closeGenerateRouteDialog();
        this.snackBar.open('Route generation completed successfully!', 'Close', { duration: 5000 });

        // Refresh the routes data
        this.refreshAllDataAndCache();
      },
      error: (error) => {
        console.error('=== API ERROR DEBUG ===');
        console.error('Error object:', error);
        console.error('Error status:', error.status);
        console.error('Error statusText:', error.statusText);
        console.error('Error message:', error.message);
        console.error('Error error:', error.error);
        console.error('Error url:', error.url);
        console.error('Full error response:', JSON.stringify(error, null, 2));
        console.error('========================');

        this.isGeneratingRoute = false;

        // Handle specific Google Maps API error
        if (error.error && error.error.details &&
            error.error.details.includes('google.maps.routing.v2.Routes.ComputeRoutes are blocked')) {
          this.snackBar.open(
            'Route optimization failed: Google Maps Routing API is not properly configured. ' +
            'Please contact your administrator to enable the Routes API and billing.',
            'Close',
            { duration: 8000, panelClass: ['error-snackbar'] }
          );
        } else {
          this.snackBar.open(
            `Error generating route: ${error.status} ${error.statusText}. Please try again later.`,
            'Close',
            { duration: 5000, panelClass: ['error-snackbar'] }
          );
        }
      }
    });
  }

  // Generate Leaflet map data for route visualization
  updateLeafletMap(): void {
    console.log('=== UPDATE LEAFLET MAP ===');

    // Combine all routes to create comprehensive map data
    const allRoutes = [...this.spottingRoutes, ...this.concreteRoutes, ...this.asphaltRoutes];
    console.log('All routes:', allRoutes.map(r => ({ id: r.routeId, code: r.routeCode, type: r.type })));

    // Convert routes to Leaflet map format
    this.leafletRoutes = allRoutes.map(route => ({
      routeId: route.routeId,
      routeCode: route.routeCode,
      type: route.type,
      encodedPolyline: route.encodedPolyline,
      tickets: route.tickets.map(ticket => ({
        ticketId: ticket.ticketId,
        address: ticket.address,
        queue: ticket.queue
      }))
    }));

    console.log('Leaflet routes:', this.leafletRoutes.map(r => ({ id: r.routeId, code: r.routeCode, type: r.type })));
    console.log('Visible routes before initialization:', Array.from(this.visibleRoutes));

    // Update visible routes based on current settings
    this.updateVisibleRoutes();

    console.log('Visible routes after initialization:', Array.from(this.visibleRoutes));
    console.log('Updated Leaflet map with', this.leafletRoutes.length, 'routes');
  }

  // Leaflet map event handlers
  onMarkerClick(event: any) {
    console.log('Marker clicked:', event);
    // Handle marker click events
  }

  onRouteClick(route: RouteData) {
    console.log('Route clicked:', route);
    // Handle route click events
  }

  onMapClick(latlng: any) {
    console.log('Map clicked at:', latlng);
    // Handle map click events
  }



  // Format address to remove coordinates, city, and state
  formatAddress(address: string): string {
    if (!address) return 'Address not available';

    // Remove coordinates (numbers with decimal points in parentheses)
    let formattedAddress = address.replace(/\([^)]*\)/g, '').trim();

    // Remove common city/state patterns
    // Remove ", Chicago, IL" or similar patterns
    formattedAddress = formattedAddress.replace(/,\s*[^,]+,\s*[A-Z]{2}.*$/i, '');

    // Remove ", Estados Unidos" or similar country names
    formattedAddress = formattedAddress.replace(/,\s*[^,]+$/, '');

    // Remove any remaining trailing commas and whitespace
    formattedAddress = formattedAddress.replace(/,\s*$/, '').trim();

    return formattedAddress || 'Address not available';
  }



    // Helper method to create simple path from waypoints
  private createSimplePathFromWaypoints(tickets: RouteTicket[], color: string, weight: number): { polyline: string; color: string; weight: number; routeCode: string } | null {
    if (!tickets || tickets.length < 2) {
      return null; // Need at least 2 points to create a path
    }

    console.log(`Creating simple path for ${tickets.length} waypoints`);

    // Create a simple polyline by connecting waypoints in order
    // This is a fallback when the backend doesn't provide proper polylines
    try {
      const coordinates: [number, number][] = [];

      // Add enterprise as starting point (approximate coordinates for 2000 W 43rd St, Chicago)
      coordinates.push([41.8165, -87.6655]); // Enterprise location

      // Add ticket locations (we'll need to geocode these addresses)
      // For now, we'll create a simple path using the enterprise location
      // In a real implementation, you'd geocode the addresses

      // Add enterprise as ending point
      coordinates.push([41.8165, -87.6655]); // Enterprise location

      // Encode the polyline
      const encodedPolyline = polyline.encode(coordinates);

      console.log(`Created simple polyline with ${coordinates.length} points`);

      return {
        polyline: encodedPolyline,
        color: color,
        weight: weight,
        routeCode: 'simple-path'
      };
    } catch (error) {
      console.error('Error creating simple path:', error);
      return null;
    }
  }

    // Toggle route visibility methods
  toggleSpottingRoutes() {
    this.showSpottingRoutes = !this.showSpottingRoutes;
    console.log('Toggled spotting routes visibility:', this.showSpottingRoutes);
    this.updateTypeVisibility();
  }

  toggleConcreteRoutes() {
    this.showConcreteRoutes = !this.showConcreteRoutes;
    console.log('Toggled concrete routes visibility:', this.showConcreteRoutes);
    this.updateTypeVisibility();
  }

  toggleAsphaltRoutes() {
    this.showAsphaltRoutes = !this.showAsphaltRoutes;
    console.log('Toggled asphalt routes visibility:', this.showAsphaltRoutes);
    this.updateTypeVisibility();
  }

  // Toggle individual route visibility
  toggleRoute(routeId: number) {
    console.log('Toggling individual route visibility for route ID:', routeId);
    console.log('Current visible routes before toggle:', Array.from(this.visibleRoutes));

    if (this.visibleRoutes.has(routeId)) {
      this.visibleRoutes.delete(routeId);
      console.log('Removed route', routeId, 'from visible routes');
    } else {
      this.visibleRoutes.add(routeId);
      console.log('Added route', routeId, 'to visible routes');
    }

    console.log('Visible routes after toggle:', Array.from(this.visibleRoutes));
    this.updateLeafletMap();
  }

  // Check if a specific route is visible on the map (for polylines)
  isRouteVisible(routeId: number): boolean {
    // Check if the route type is visible
    const route = this.findRouteById(routeId);
    if (!route) return false;

    // Check route type visibility
    const typeVisible = (route.type === 'SPOTTER' && this.showSpottingRoutes) ||
                       (route.type === 'CONCRETE' && this.showConcreteRoutes) ||
                       (route.type === 'ASPHALT' && this.showAsphaltRoutes);

    if (!typeVisible) return false;

    // Check individual route visibility
    return this.visibleRoutes.has(routeId);
  }

  // Check if a route should be displayed in the routes section (always show)
  isRouteDisplayed(routeId: number): boolean {
    return true; // Always show routes in the routes section
  }

  // Helper method to find route by ID
  private findRouteById(routeId: number): Route | null {
    const allRoutes = [...this.spottingRoutes, ...this.concreteRoutes, ...this.asphaltRoutes];
    return allRoutes.find(route => route.routeId === routeId) || null;
  }

  // Get route color for individual route buttons
  getRouteColor(routeType: string): string {
    switch (routeType) {
      case 'SPOTTER':
        return '#FF4500'; // Red-orange
      case 'CONCRETE':
        return '#4A90E2'; // Blue
      case 'ASPHALT':
        return '#228B22'; // Dark green
      default:
        return '#666666'; // Gray
    }
  }

  // Get marker label that works with Google Static Maps API
  private getMarkerLabel(index: number): string {
    // Use letters for better visibility with Google Static Maps API
    if (index <= 26) {
      return String.fromCharCode(64 + index); // A-Z (65-90 in ASCII)
    } else if (index <= 52) {
      return String.fromCharCode(96 + (index - 26)); // a-z (97-122 in ASCII)
    } else {
      // For more than 52 markers, use numbers but limit to single digit
      return (index % 9 + 1).toString(); // 1-9, then repeat
    }
  }

  // Load tickets with issues from API
  loadTicketsWithIssues() {
    this.isLoadingTicketsWithIssues = true;
    this.http.get<TicketsWithIssuesResponse>(`${environment.apiUrl}/tickets/with-issues`).subscribe({
      next: (response) => {
        this.ticketsWithIssues = response.data;
        this.isLoadingTicketsWithIssues = false;
      },
      error: (error) => {
        console.error('Error loading tickets with issues:', error);
        this.isLoadingTicketsWithIssues = false;
        // Fallback to empty array if API fails
        this.ticketsWithIssues = [];
      }
    });
  }

  // Helper method to format address from addressDetails
  formatAddressFromIssues(ticket: TicketWithIssue): string {
    if (ticket.addressDetails && ticket.addressDetails.length > 0) {
      const address = ticket.addressDetails[0];
      return `${address.addressNumber} ${address.addressCardinal} ${address.addressStreet} ${address.addressSuffix}`;
    }
    return ticket.addresses || 'N/A';
  }

  // Helper method to get non-null crew comments
  getCrewComments(ticket: TicketWithIssue): string {
    const comments = ticket.taskStatuses
      ?.filter(status => status.crewComment && status.crewComment.trim() !== '')
      ?.map(status => status.crewComment)
      ?.join(', ');

    return comments || 'No crew comments';
  }

  // Refresh all data
  refreshAllDataAndCache() {
    this.loadSpottingRoutes();
    this.loadConcreteRoutes();
    this.loadAsphaltRoutes();
    this.loadSpotReadyTickets();
    this.loadAsphaltReadyTickets();
    this.loadConcreteReadyTickets();
    this.loadTicketsWithIssues();
    this.updateLeafletMap(); // Update Leaflet map after refresh
  }
}
