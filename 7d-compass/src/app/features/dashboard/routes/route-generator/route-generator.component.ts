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
import { PlusButtonComponent } from '../../../../shared/plus-button/plus-button.component';
import { BaseDashboardComponent } from '../../../../shared/base-dashboard.component';
import { FilterService } from '../../../../core/services/filter.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';

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
    PlusButtonComponent,
    MatIconModule,
    MatDialogModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './route-generator.component.html',
  styleUrl: './route-generator.component.scss'
})
export class RouteGeneratorComponent extends BaseDashboardComponent implements OnInit {
  isMobile: boolean = false;

  // Static map properties
  private readonly GOOGLE_MAPS_API_KEY = 'AIzaSyDwEG-Tyq2kpHc4wznqVvSU0Dj2B_idzlY';

  // Cache properties
  private readonly CACHE_EXPIRY = 30 * 60 * 1000; // 30 minutes
  private readonly CACHE_KEYS = {
    SPOTTING_ROUTES: 'spotting_routes_cache',
    CONCRETE_ROUTES: 'concrete_routes_cache',
    ASPHALT_ROUTES: 'asphalt_routes_cache',
    SPOT_READY: 'spot_ready_cache',
    ASPHALT_READY: 'asphalt_ready_cache',
    CONCRETE_READY: 'concrete_ready_cache'
  };

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

  // Static map properties (replacing interactive map)
  staticMapUrl: string = '';
  staticMapWidth: number = 400;
  staticMapHeight: number = 600;

  // Fallback data (will be used if API fails)
  fallbackSpottingRoutes = [
    { routeCode: 'SPT-001', tickets: [{ address: '2837 N Froid Street' }, { address: '123 Main St' }, { address: '456 Oak Ave' }] },
    { routeCode: 'SPT-002', tickets: [{ address: '789 Pine Ln' }, { address: '101 Elm Rd' }] },
  ];

  fallbackConcreteRoutes = [
    { routeCode: 'CON-001', tickets: [{ address: '2837 N Froid Street' }, { address: '123 Main St' }, { address: '456 Oak Ave' }] },
    { routeCode: 'CON-002', tickets: [{ address: '789 Pine Ln' }, { address: '101 Elm Rd' }] },
    { routeCode: 'CON-003', tickets: [{ address: '111 Elm Rd' }, { address: '222 Oak Dr' }] },
  ];

  fallbackAsphaltRoutes = [
    { routeCode: 'ASP-001', tickets: [{ address: '2837 N Froid Street' }, { address: '123 Main St' }, { address: '456 Oak Ave' }] },
    { routeCode: 'ASP-002', tickets: [{ address: '789 Pine Ln' }, { address: '101 Elm Rd' }] },
  ];

  locationsWithoutRoute = [
    '2837 N Froid Street',
    '123 Main St',
    '456 Oak Ave',
    '789 Pine Ln',
    '101 Elm Rd',
    '333 Pine Rd',
    '444 Cedar Dr',
  ];

  locationsOnHoldOff = [
    { location: '101 Cedar Lane', reason: 'Permit Pending' },
    { location: '202 Birch Road', reason: 'Client Unresponsive' },
    { location: '303 Pine Street', reason: 'Equipment Malfunction' },
    { location: '404 Maple Drive', reason: 'Weather Delay' },
    { location: '505 Elm Road', reason: 'Inspection Required' },
    { location: '606 Oak Avenue', reason: 'Material Shortage' },
    { location: '707 Cherry Lane', reason: 'Scheduling Conflict' },
  ];

  ticketData = [
    {
      location: 'Chicago',
      phase: 'Planning',
      status: 'Open',
      startDate: new Date('2025-06-01'),
    },
    {
      location: 'New York',
      phase: 'Execution',
      status: 'In Progress',
      startDate: new Date('2025-05-28'),
    },
    {
      location: 'Los Angeles',
      phase: 'Review',
      status: 'Closed',
      startDate: new Date('2025-05-20'),
    },
    {
      location: 'San Francisco',
      phase: 'Planning',
      status: 'Open',
      startDate: new Date('2025-06-05'),
    },
    {
      location: 'Miami',
      phase: 'Execution',
      status: 'In Progress',
      startDate: new Date('2025-06-02'),
    },
    {
      location: 'Seattle',
      phase: 'Review',
      status: 'Closed',
      startDate: new Date('2025-05-25'),
    },
    {
      location: 'Boston',
      phase: 'Planning',
      status: 'Open',
      startDate: new Date('2025-06-03'),
    },
  ];

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

    // Generate static map after initial data load
    setTimeout(() => {
      this.updateStaticMap();
    }, 1000);
  }

  protected override loadData(): void {
    // Initialize data for filtering - combine all route-related data
    const allRouteData = [
      ...this.spottingRoutes.map(route => ({ ...route, type: 'spotting' })),
      ...this.concreteRoutes.map(route => ({ ...route, type: 'concrete' })),
      ...this.asphaltRoutes.map(route => ({ ...route, type: 'asphalt' })),
      ...this.locationsWithoutRoute.map(location => ({ routeCode: location, tickets: [{ address: location }], type: 'without-route' })),
      ...this.locationsOnHoldOff.map(item => ({ routeCode: item.location, tickets: [{ address: item.location }], reason: item.reason, type: 'on-hold' })),
      ...this.ticketData.map(ticket => ({ ...ticket, type: 'ticket' }))
    ];

    this.allData = allRouteData;
    this.filteredData = [...this.allData];
  }

  // Override text search to include route and location fields
  protected override matchesTextSearch(item: any, searchTerm: string): boolean {
    const searchableFields = ['routeCode', 'location', 'phase', 'status', 'reason'];

    return searchableFields.some(field => {
      const value = this.getNestedValue(item, field);
      if (value) {
        return String(value).toLowerCase().includes(searchTerm);
      }
      return false;
    }) ||
    // Also search in tickets arrays
    (item.tickets && Array.isArray(item.tickets) &&
     item.tickets.some((ticket: RouteTicket) => ticket.address.toLowerCase().includes(searchTerm)));
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
    this.isMobile = window.innerWidth <= 768;
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

  // Getter for filtered route data
  get filteredSpottingRoutes() {
    return this.filteredData.filter(item => item.type === 'spotting');
  }

  get filteredConcreteRoutes() {
    return this.filteredData.filter(item => item.type === 'concrete');
  }

  get filteredAsphaltRoutes() {
    return this.filteredData.filter(item => item.type === 'asphalt');
  }

  get filteredLocationsWithoutRoute() {
    return this.filteredData.filter(item => item.type === 'without-route').map(item => item.routeCode);
  }

  get filteredLocationsOnHoldOff() {
    return this.filteredData.filter(item => item.type === 'on-hold').map(item => ({
      location: item.routeCode,
      reason: item.reason
    }));
  }

  // Cache management methods
  private getCachedData(key: string): any {
    try {
      const cached = localStorage.getItem(key);
      if (cached) {
        const data = JSON.parse(cached);
        if (Date.now() - data.timestamp < this.CACHE_EXPIRY) {
          console.log(`Using cached data for ${key}`);
          return data.value;
        } else {
          console.log(`Cache expired for ${key}`);
          localStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.error(`Error reading cache for ${key}:`, error);
    }
    return null;
  }

  private setCachedData(key: string, value: any): void {
    try {
      const cacheData = {
        value: value,
        timestamp: Date.now()
      };
      localStorage.setItem(key, JSON.stringify(cacheData));
      console.log(`Cached data for ${key}`);
    } catch (error) {
      console.error(`Error caching data for ${key}:`, error);
    }
  }

  private clearCache(): void {
    Object.values(this.CACHE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    console.log('Cache cleared');
  }

  // Modify loadSpottingRoutes to use cache
  loadSpottingRoutes() {
    // Try to load from cache first
    const cachedData = this.getCachedData(this.CACHE_KEYS.SPOTTING_ROUTES);
    if (cachedData) {
      this.spottingRoutes = cachedData;
      this.initialSpottingRoutes = [...cachedData];
      this.isLoadingSpottingRoutes = false;
      this.loadData(); // Refresh filtered data
      this.updateStaticMap(); // Update static map
      return;
    }

    this.isLoadingSpottingRoutes = true;
    this.http.get<RoutesResponse>(`${environment.apiUrl}/routes/spotting`).subscribe({
      next: (response) => {
        console.log('Spotting routes API response:', response);
        this.spottingRoutes = response.routes || [];
        this.initialSpottingRoutes = [...this.spottingRoutes];
        this.isLoadingSpottingRoutes = false;

        // Cache the data
        this.setCachedData(this.CACHE_KEYS.SPOTTING_ROUTES, this.spottingRoutes);

        this.loadData(); // Refresh filtered data
        this.updateStaticMap(); // Update static map
      },
      error: (error) => {
        console.error('Error loading spotting routes:', error);
        this.isLoadingSpottingRoutes = false;
        // Fallback to cached data if available, otherwise use fallback data
        const fallbackData = this.getCachedData(this.CACHE_KEYS.SPOTTING_ROUTES) || this.fallbackSpottingRoutes;
        this.spottingRoutes = fallbackData;
        this.initialSpottingRoutes = [...this.spottingRoutes];
        this.loadData(); // Refresh filtered data
        this.updateStaticMap(); // Update static map
      }
    });
  }

  // Modify loadConcreteRoutes to use cache
  loadConcreteRoutes() {
    // Try to load from cache first
    const cachedData = this.getCachedData(this.CACHE_KEYS.CONCRETE_ROUTES);
    if (cachedData) {
      this.concreteRoutes = cachedData;
      this.initialConcreteRoutes = [...cachedData];
      this.isLoadingConcreteRoutes = false;
      this.loadData(); // Refresh filtered data
      this.updateStaticMap(); // Update static map
      return;
    }

    this.isLoadingConcreteRoutes = true;
    this.http.get<RoutesResponse>(`${environment.apiUrl}/routes/concrete`).subscribe({
      next: (response) => {
        console.log('Concrete routes API response:', response);
        this.concreteRoutes = response.routes || [];
        this.initialConcreteRoutes = [...this.concreteRoutes];
        this.isLoadingConcreteRoutes = false;

        // Cache the data
        this.setCachedData(this.CACHE_KEYS.CONCRETE_ROUTES, this.concreteRoutes);

        this.loadData(); // Refresh filtered data
        this.updateStaticMap(); // Update static map
      },
      error: (error) => {
        console.error('Error loading concrete routes:', error);
        this.isLoadingConcreteRoutes = false;
        // Fallback to cached data if available, otherwise use fallback data
        const fallbackData = this.getCachedData(this.CACHE_KEYS.CONCRETE_ROUTES) || this.fallbackConcreteRoutes;
        this.concreteRoutes = fallbackData;
        this.initialConcreteRoutes = [...this.concreteRoutes];
        this.loadData(); // Refresh filtered data
        this.updateStaticMap(); // Update static map
      }
    });
  }

  // Modify loadAsphaltRoutes to use cache
  loadAsphaltRoutes() {
    // Try to load from cache first
    const cachedData = this.getCachedData(this.CACHE_KEYS.ASPHALT_ROUTES);
    if (cachedData) {
      this.asphaltRoutes = cachedData;
      this.initialAsphaltRoutes = [...cachedData];
      this.isLoadingAsphaltRoutes = false;
      this.loadData(); // Refresh filtered data
      this.updateStaticMap(); // Update static map
      return;
    }

    this.isLoadingAsphaltRoutes = true;
    this.http.get<RoutesResponse>(`${environment.apiUrl}/routes/asphalt`).subscribe({
      next: (response) => {
        console.log('Asphalt routes API response:', response);
        this.asphaltRoutes = response.routes || [];
        this.initialAsphaltRoutes = [...this.asphaltRoutes];
        this.isLoadingAsphaltRoutes = false;

        // Cache the data
        this.setCachedData(this.CACHE_KEYS.ASPHALT_ROUTES, this.asphaltRoutes);

        this.loadData(); // Refresh filtered data
        this.updateStaticMap(); // Update static map
      },
      error: (error) => {
        console.error('Error loading asphalt routes:', error);
        this.isLoadingAsphaltRoutes = false;
        // Fallback to cached data if available, otherwise use fallback data
        const fallbackData = this.getCachedData(this.CACHE_KEYS.ASPHALT_ROUTES) || this.fallbackAsphaltRoutes;
        this.asphaltRoutes = fallbackData;
        this.initialAsphaltRoutes = [...this.asphaltRoutes];
        this.loadData(); // Refresh filtered data
        this.updateStaticMap(); // Update static map
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
    this.locationsWithoutRoute = [...this.locationsWithoutRoute];
    this.locationsOnHoldOff = [...this.locationsOnHoldOff];
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
    console.log('Spot ready tickets:', this.spotReadyTickets);
    console.log('Concrete ready tickets:', this.concreteReadyTickets);
    console.log('Asphalt ready tickets:', this.asphaltReadyTickets);
    console.log('Is spot ready:', data === this.spotReadyTickets);
    console.log('Is concrete ready:', data === this.concreteReadyTickets);
    console.log('Is asphalt ready:', data === this.asphaltReadyTickets);
    const result = data === this.spotReadyTickets ||
           data === this.concreteReadyTickets ||
           data === this.asphaltReadyTickets;
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
      event.previousContainer.data.splice(event.previousIndex, 1);

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

    // Remove from source ready section
    event.previousContainer.data.splice(event.previousIndex, 1);

    // Add to destination ready section
    event.container.data.splice(event.currentIndex, 0, draggedTicket);

    console.log('=== MOVE BETWEEN READY SECTIONS COMPLETED ===');
  }

  private getReadySectionType(data: any[]): string {
    console.log('=== GET READY SECTION TYPE ===');
    console.log('Data:', data);

    // Check if this is a ready section by looking at the first item's properties
    if (data.length > 0) {
      const firstItem = data[0];
      console.log('First item:', firstItem);

      // Check if it's a spot ready ticket
      if (firstItem.spotReady) {
        console.log('Section type: spot');
        return 'spot';
      }

      // Check if it's an asphalt ready ticket
      if (firstItem.asphaltReady) {
        console.log('Section type: asphalt');
        return 'asphalt';
      }

      // Check if it's a concrete ready ticket
      if (firstItem.concreteReady) {
        console.log('Section type: concrete');
        return 'concrete';
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

  // Reoptimize all routes - updated to use actual endpoints
  async reoptimizeAllRoutes() {
    const confirmed = confirm('Are you sure you want to reoptimize all routes? This will recalculate the optimal order for all tickets.');

    if (!confirmed) {
      return;
    }

    try {
      const allRoutes = [...this.spottingRoutes, ...this.concreteRoutes, ...this.asphaltRoutes];

      // Show loading message
      this.snackBar.open('Reoptimizing routes...', 'Close', { duration: 3000 });

      // Reoptimize each route using the actual endpoint
      for (const route of allRoutes) {
        await this.reoptimizeRoute(route.routeId);
      }

      // Refresh all route data
      this.refreshAllDataAndCache();

      this.snackBar.open('All routes have been reoptimized successfully!', 'Close', { duration: 5000 });
    } catch (error) {
      console.error('Error reoptimizing routes:', error);
      this.snackBar.open('Error reoptimizing routes. Please try again.', 'Close', { duration: 5000 });
    }
  }

  // Reoptimize specific route - updated to use actual endpoints
  async reoptimizeSpecificRoute(route: Route) {
    const confirmed = confirm(`Are you sure you want to reoptimize route ${route.routeCode}?`);

    if (!confirmed) {
      return;
    }

    try {
      this.snackBar.open(`Reoptimizing route ${route.routeCode}...`, 'Close', { duration: 3000 });

      await this.reoptimizeRoute(route.routeId);

      // Refresh the specific route data
      this.refreshAllDataAndCache();

      this.snackBar.open(`Route ${route.routeCode} has been reoptimized successfully!`, 'Close', { duration: 5000 });
    } catch (error) {
      console.error(`Error reoptimizing route ${route.routeCode}:`, error);
      this.snackBar.open(`Error reoptimizing route ${route.routeCode}. Please try again.`, 'Close', { duration: 5000 });
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
    }
  }

  generateNewRoute() {
    // Validate form
    if (!this.newRouteType) {
      alert('Please select a route type');
      return;
    }

    // Get ready tickets based on route type
    let readyTickets: ReadyTicket[] = [];
    switch (this.newRouteType) {
      case 'spotting':
        readyTickets = this.spotReadyTickets;
        break;
      case 'concrete':
        readyTickets = this.concreteReadyTickets;
        break;
      case 'asphalt':
        readyTickets = this.asphaltReadyTickets;
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
        alert('Route optimization service is not available. Please try again later.');
      }
    });
  }

  private makeOptimizationRequest(endpoint: string, requestBody: any) {
    console.log('Making optimization request...');
    this.http.post(endpoint, requestBody).subscribe({
      next: (response) => {
        console.log('Route generation successful:', response);
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

    // Reset form
    this.newRouteType = '';
  }

  // Generate static map for route visualization
  generateStaticMap(): void {
    // Combine all routes to create a comprehensive static map
    const allRoutes = [...this.spottingRoutes, ...this.concreteRoutes, ...this.asphaltRoutes];

    if (allRoutes.length === 0) {
      this.staticMapUrl = '';
      return;
    }

    // Collect all waypoints from all routes
    const allWaypoints: string[] = [];
    const pathEncodings: string[] = [];

    allRoutes.forEach(route => {
      if (route.tickets && route.tickets.length > 0) {
        // Add addresses as waypoints
        route.tickets.forEach(ticket => {
          if (ticket.address && !allWaypoints.includes(ticket.address)) {
            allWaypoints.push(ticket.address);
          }
        });

        // Add polyline if available
        if (route.encodedPolyline) {
          pathEncodings.push(route.encodedPolyline);
        }
      }
    });

    // Build static map URL
    let mapUrl = `https://maps.googleapis.com/maps/api/staticmap?`;
    mapUrl += `size=${this.staticMapWidth}x${this.staticMapHeight}`;
    mapUrl += `&scale=2`; // High DPI for better quality
    mapUrl += `&maptype=roadmap`;
    mapUrl += `&key=${this.GOOGLE_MAPS_API_KEY}`;

    // Add small custom markers for waypoints (limit to first 10 to avoid URL length issues)
    const limitedWaypoints = allWaypoints.slice(0, 10);
    limitedWaypoints.forEach((waypoint, index) => {
      // Use small markers with numbered labels - ensure proper encoding
      const label = (index + 1).toString();
      mapUrl += `&markers=size:small|color:red|label:${label}|${encodeURIComponent(waypoint)}`;
    });

    // Add path for first route if available (Static Maps API has limitations)
    if (pathEncodings.length > 0) {
      mapUrl += `&path=enc:${pathEncodings[0]}`;
    }

    // Always use the specified center coordinates
    mapUrl += `&center=41.899463,-87.694039`; // Your custom coordinates

    mapUrl += `&zoom=10`;

    this.staticMapUrl = mapUrl;
    console.log('Generated static map URL:', this.staticMapUrl);
  }

  // Update static map when data changes
  updateStaticMap(): void {
    this.generateStaticMap();
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

  // Refresh all data and cache
  refreshAllDataAndCache() {
    this.clearCache();
    this.loadSpottingRoutes();
    this.loadConcreteRoutes();
    this.loadAsphaltRoutes();
    this.loadSpotReadyTickets();
    this.loadAsphaltReadyTickets();
    this.loadConcreteReadyTickets();
    this.updateStaticMap(); // Update static map after refresh
  }
}
