import { Component, HostListener, OnInit, ViewChild, TemplateRef, ElementRef, ChangeDetectorRef } from '@angular/core';
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

  // Computed property for route type visibility to ensure proper change detection
  get routeTypeVisibility() {
    return {
      'SPOTTER': this.showSpottingRoutes,
      'CONCRETE': this.showConcreteRoutes,
      'ASPHALT': this.showAsphaltRoutes
    };
  }


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
  @ViewChild('leafletMap') leafletMapComponent!: LeafletMapComponent;

  // Add per-route and spot ready filters
  routeTicketFilters: { [routeId: number]: string } = {};
  spotReadyFilter: string = '';

  // Add filters for Asphalt Ready and Concrete Ready cards
  asphaltReadyFilter: string = '';
  concreteReadyFilter: string = '';

  // Add a loading state for batch add (optional)
  isBatchAddingTickets: boolean = false;

  constructor(
    filterService: FilterService,
    private http: HttpClient,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
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

    // Subscribe to filter changes to trigger change detection
    this.filterService.textSearch$.subscribe(() => {
      // Force change detection when filter changes
      this.cdr.detectChanges();
    });
  }

  // Initialize visible routes when data is loaded
  private initializeVisibleRoutes() {
    this.visibleRoutes.clear();
    const allRoutes = [...this.spottingRoutes, ...this.concreteRoutes, ...this.asphaltRoutes];

    allRoutes.forEach(route => {
      // Only add routes that match the current type visibility settings
      const typeVisible = (route.type === 'SPOTTER' && this.showSpottingRoutes) ||
                         (route.type === 'CONCRETE' && this.showConcreteRoutes) ||
                         (route.type === 'ASPHALT' && this.showAsphaltRoutes);

      if (typeVisible) {
        this.visibleRoutes.add(route.routeId);
      }
    });
  }

  private updateVisibleRoutes() {
    // Only update visible routes if this is the initial load (visibleRoutes is empty)
    // or if we're toggling type visibility (not individual route visibility)
    // FIX: Do not auto-populate visibleRoutes when empty; let empty mean 'show nothing'.
    // This prevents the reset when all are untapped.
    // No action needed if visibleRoutes is empty.
    if (this.visibleRoutes.size === 0) {
      // Do nothing: show nothing if all are untapped
      return;
    }
    // Otherwise, preserve existing visible routes (no-op)
  }

  private updateTypeVisibility() {
    const allRoutes = [...this.spottingRoutes, ...this.concreteRoutes, ...this.asphaltRoutes];
    // Clear and rebuild visible routes based on type visibility
    this.visibleRoutes.clear();

    allRoutes.forEach((route: any) => {
      // Check if route type is visible
      const typeVisible = (route.type === 'SPOTTER' && this.showSpottingRoutes) ||
                         (route.type === 'CONCRETE' && this.showConcreteRoutes) ||
                         (route.type === 'ASPHALT' && this.showAsphaltRoutes);

      if (typeVisible) {
        this.visibleRoutes.add(route.routeId);
      }
    });
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

  // Filter tickets in a route by the filter for that route
  getFilteredRouteTickets(route: Route): RouteTicket[] {
    const filter = (this.routeTicketFilters[route.routeId] || '').toLowerCase().trim();
    if (!filter) return route.tickets;
    return route.tickets.filter(ticket => ticket.address && ticket.address.toLowerCase().includes(filter));
  }

  // Filter spot ready tickets by the spotReadyFilter
  getFilteredSpotReadyTickets(): ReadyTicket[] {
    const filter = this.spotReadyFilter.toLowerCase().trim();
    if (!filter) return this.spotReadyTickets;
    return this.spotReadyTickets.filter(ticket => ticket.address && ticket.address.toLowerCase().includes(filter));
  }

  // Filter asphalt ready tickets by the asphaltReadyFilter
  getFilteredAsphaltReadyTickets(): ReadyTicket[] {
    const filter = this.asphaltReadyFilter.toLowerCase().trim();
    if (!filter) return this.asphaltReadyTickets;
    return this.asphaltReadyTickets.filter(ticket => ticket.address && ticket.address.toLowerCase().includes(filter));
  }

  // Filter concrete ready tickets by the concreteReadyFilter
  getFilteredConcreteReadyTickets(): ReadyTicket[] {
    const filter = this.concreteReadyFilter.toLowerCase().trim();
    if (!filter) return this.concreteReadyTickets;
    return this.concreteReadyTickets.filter(ticket => ticket.address && ticket.address.toLowerCase().includes(filter));
  }


  // Load spotting routes from API
  loadSpottingRoutes() {
    this.isLoadingSpottingRoutes = true;
    this.http.get<RoutesResponse>(`${environment.apiUrl}/routes/spotting`).subscribe({
      next: (response) => {
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
        this.spotReadyTickets = response.tickets;
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

  // Update the drop method to handle batch moves from ready cards to route cards with type checking
  async drop(event: CdkDragDrop<any[]>) {
    const draggedTicket = event.previousContainer.data[event.previousIndex];

    // Batch: find all tickets in the source list with the same address
    const addressKey = (draggedTicket.address || '').toLowerCase().trim();
    const sourceList = event.previousContainer.data;
    const batchTickets = sourceList.filter(
      t => (t.address || '').toLowerCase().trim() === addressKey
    );

    // If only one ticket matches, fallback to normal logic
    if (batchTickets.length === 1) {
      // Check if we're moving between ready sections
      const isFromReadySection = this.isReadySection(event.previousContainer.data);
      const isToReadySection = this.isReadySection(event.container.data);
      const isToRoute = this.isRouteSection(event.container);

      if (isFromReadySection && isToReadySection) {
        await this.handleMoveBetweenReadySections(event, draggedTicket);
      } else if (isFromReadySection && isToRoute) {
        await this.handleMoveFromReadyToRoute(event, draggedTicket);
      } else if (event.previousContainer === event.container) {
        moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
        event.container.data.forEach((ticket, index) => {
          ticket.queue = index;
        });
        const routeId = this.getRouteIdFromDropEvent(event);
        if (routeId) {
          const route = this.findRouteByTickets(routeId);
          if (route) {
            await this.handleReorderWithinRoute(route, event.container.data);
          }
        }
      } else {
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
        if (event.previousContainer.data.length > 0) {
          event.previousContainer.data.forEach((ticket, index) => {
            ticket.queue = index;
          });
        }
        event.container.data.forEach((ticket, index) => {
          ticket.queue = index;
        });
        await this.handleMoveBetweenRoutes(event, draggedTicket);
      }
      this.spottingRoutes = [...this.spottingRoutes];
      this.concreteRoutes = [...this.concreteRoutes];
      this.asphaltRoutes = [...this.asphaltRoutes];
      this.forceMapUpdate();
      return;
    }

    // Batch move logic
    const isFromReadySection = this.isReadySection(event.previousContainer.data);
    const isToRoute = this.isRouteSection(event.container);
    if (isFromReadySection && isToRoute) {
      // Type compatibility check
      const routeId = this.getRouteIdFromDropEvent(event);
      if (routeId == null) {
        this.snackBar.open('Could not find destination route. Please try again.', 'Close', { duration: 3000, panelClass: ['error-snackbar'] });
        return;
      }
      const route = this.findRouteByTickets(routeId);
      if (!route) {
        this.snackBar.open('Could not find destination route. Please try again.', 'Close', { duration: 3000, panelClass: ['error-snackbar'] });
        return;
      }
      // Determine ready section type
      let readyType = '';
      if (sourceList === this.spotReadyTickets) readyType = 'SPOTTER';
      else if (sourceList === this.asphaltReadyTickets) readyType = 'ASPHALT';
      else if (sourceList === this.concreteReadyTickets) readyType = 'CONCRETE';
      else if (batchTickets[0]?.tickettype) readyType = (batchTickets[0].tickettype || '').toUpperCase();
      // Route type must match ready type
      if (route.type !== readyType) {
        this.snackBar.open('Invalid move: You can only drag from a ready card to a matching route type.', 'Close', { duration: 4000, panelClass: ['error-snackbar'] });
        return;
      }
      // Sequentially move all batch tickets
      this.isBatchAddingTickets = true;
      for (const t of batchTickets) {
        try {
          await this.handleMoveFromReadyToRoute(event, t);
        } catch (err) {
          console.error('Error adding ticket to route:', t, err);
          this.snackBar.open(`Failed to add ticket ${t.ticketcode || t.ticketCode || t.ticketId}`, 'Close', { duration: 3000, panelClass: ['error-snackbar'] });
        }
      }
      this.isBatchAddingTickets = false;
      this.spottingRoutes = [...this.spottingRoutes];
      this.concreteRoutes = [...this.concreteRoutes];
      this.asphaltRoutes = [...this.asphaltRoutes];
      this.forceMapUpdate();
      return;
    }

    // Remove all batchTickets from the source list
    for (const t of batchTickets) {
      const idx = sourceList.indexOf(t);
      if (idx !== -1) {
        sourceList.splice(idx, 1);
      }
    }

    // Insert all batchTickets into the destination list at the drop index
    const destList = event.container.data;
    let insertIndex = event.currentIndex;
    for (const t of batchTickets) {
      destList.splice(insertIndex, 0, t);
      insertIndex++;
    }

    // Update queue numbers for both lists
    if (sourceList.length > 0) {
      sourceList.forEach((ticket, index) => {
        ticket.queue = index;
      });
    }
    destList.forEach((ticket, index) => {
      ticket.queue = index;
    });

    // If moving between routes, call handleMoveBetweenRoutes for each ticket
    const isSourceRoute = this.isRouteSection(event.previousContainer);
    const isDestRoute = this.isRouteSection(event.container);
    if (isSourceRoute && isDestRoute && event.previousContainer !== event.container) {
      for (const t of batchTickets) {
        await this.handleMoveBetweenRoutes(event, t);
      }
    } else if (isSourceRoute && !isDestRoute) {
      // Moving from route to ready section (if supported)
      // (implement if needed)
    } else if (!isSourceRoute && isDestRoute) {
      // Moving from ready section to route
      for (const t of batchTickets) {
        await this.handleMoveFromReadyToRoute(event, t);
      }
    }

    this.spottingRoutes = [...this.spottingRoutes];
    this.concreteRoutes = [...this.concreteRoutes];
    this.asphaltRoutes = [...this.asphaltRoutes];
    this.forceMapUpdate();
  }

  private getRouteIdFromDropEvent(event: CdkDragDrop<any[]>): number | null {
    // Get route ID from the container element's data attribute
    const containerElement = event.container.element.nativeElement;
    const routeId = containerElement.getAttribute('data-route-id');
    return routeId ? parseInt(routeId, 10) : null;
  }

  private isReadySection(data: any[]): boolean {
    return data === this.filteredSpotReadyTickets ||
           data === this.filteredConcreteReadyTickets ||
           data === this.filteredAsphaltReadyTickets;
  }

  private isRouteSection(container: any): boolean {
    // Check if the container element has the route section attribute
    const containerElement = container.element?.nativeElement;
    return containerElement && containerElement.hasAttribute('data-route-section');
  }

  private async handleMoveFromReadyToRoute(event: CdkDragDrop<any[]>, draggedTicket: any) {
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

      if (!ticketId) {
        console.error('Could not find ticket ID in dragged ticket:', draggedTicket);
        alert('Could not find ticket ID. Please try again.');
        return;
      }

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

      // Force immediate map update
      this.forceMapUpdate();

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
    // Determine the source and destination ready sections
    const sourceSection = this.getReadySectionType(event.previousContainer.data);
    const destSection = this.getReadySectionType(event.container.data);

    // Check restrictions
    if (sourceSection === 'spot' && (destSection === 'asphalt' || destSection === 'concrete')) {
    } else if (sourceSection === 'concrete' && destSection === 'asphalt') {
    } else {
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
  }

  private getReadySectionType(data: any[]): string {
    // Check if this is a ready section by comparing with filtered arrays
    if (data === this.filteredSpotReadyTickets) {
      return 'spot';
    }

    if (data === this.filteredAsphaltReadyTickets) {
      return 'asphalt';
    }

    if (data === this.filteredConcreteReadyTickets) {
      return 'concrete';
    }

    // Fallback: Check if this is a ready section by looking at the first item's properties
    if (data.length > 0) {
      const firstItem = data[0];

      // Check if it's a ready ticket with category
      if (firstItem.type === 'ready-ticket') {
        return firstItem.category;
      }
    }

    return 'unknown';
  }

  private findRouteByTickets(routeId: number): Route | null {
    const allRoutes = [...this.spottingRoutes, ...this.concreteRoutes, ...this.asphaltRoutes];
    return allRoutes.find(route => route.routeId === routeId) || null;
  }

  private async handleReorderWithinRoute(route: Route, tickets: any[]): Promise<void> {
    try {
      // Build the updates array
      const updates = tickets.map((ticket, index) => ({
        ticketId: ticket.ticketId,
        queue: index
      }));
      // Use a placeholder for updatedBy (replace with real user ID if available)
      const updatedBy = 1;
      const endpoint = `${environment.apiUrl}/routetickets/${route.routeId}/batch-queue`;
      const body = { updates, updatedBy };
      await this.http.put(endpoint, body).toPromise();
      this.snackBar.open('Ticket order saved!', 'Close', { duration: 2000 });
    } catch (error) {
      console.error('Error saving ticket order:', error);
      this.snackBar.open('Failed to save ticket order', 'Close', { duration: 4000, panelClass: ['error-snackbar'] });
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

    try {
      const response = await this.http.post(endpoint, requestBody).toPromise();
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
    return this.getUniqueLocationCount(route) > 99;
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

      // Immediately remove the route from visible routes and update map
      this.visibleRoutes.delete(route.routeId);

      // Remove the route from the local arrays
      this.removeRouteFromLocalArrays(route.routeId);

      // Force immediate map update
      this.forceMapUpdate();

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

      // Immediately remove the route from visible routes and update map
      this.visibleRoutes.delete(route.routeId);

      // Remove the route from the local arrays
      this.removeRouteFromLocalArrays(route.routeId);

      // Force immediate map update
      this.forceMapUpdate();

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

      // Force immediate map update
      this.forceMapUpdate();

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

    // Test if endpoint is reachable first
    this.http.get(`${environment.apiUrl}/route-optimization/status`).subscribe({
      next: (statusResponse) => {
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
    this.http.post(endpoint, requestBody).subscribe({
      next: (response) => {
        this.isGeneratingRoute = false;
        this.closeGenerateRouteDialog();
        this.snackBar.open('Route generation completed successfully!', 'Close', { duration: 5000 });

        // Force immediate map update
        this.forceMapUpdate();

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
    // Combine all routes to create comprehensive map data
    const allRoutes = [...this.spottingRoutes, ...this.concreteRoutes, ...this.asphaltRoutes];

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

    // Remove: if (this.visibleRoutes.size === 0) { ... add all ... }
    // Instead, just update visible routes based on current settings
    this.updateVisibleRoutes();
  }

  // Leaflet map event handlers
  onMarkerClick(event: any) {
    // Handle marker click events
  }

  onRouteClick(route: RouteData) {
    // Handle route click events
  }

  onMapClick(latlng: any) {
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
    this.updateTypeVisibility();
    this.forceMapUpdate();
  }

  toggleConcreteRoutes() {
    this.showConcreteRoutes = !this.showConcreteRoutes;
    this.updateTypeVisibility();
    this.forceMapUpdate();
  }

  toggleAsphaltRoutes() {
    this.showAsphaltRoutes = !this.showAsphaltRoutes;
    this.updateTypeVisibility();
    this.forceMapUpdate();
  }

  // Toggle individual route visibility
  toggleRoute(routeId: number) {
    if (this.visibleRoutes.has(routeId)) {
      this.visibleRoutes.delete(routeId);
    } else {
      this.visibleRoutes.add(routeId);
    }

    this.updateLeafletMap();
    this.forceMapUpdate();
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

  // Remove route from local arrays immediately
  private removeRouteFromLocalArrays(routeId: number) {
    this.spottingRoutes = this.spottingRoutes.filter(route => route.routeId !== routeId);
    this.concreteRoutes = this.concreteRoutes.filter(route => route.routeId !== routeId);
    this.asphaltRoutes = this.asphaltRoutes.filter(route => route.routeId !== routeId);

    // Update the leaflet routes array
    this.leafletRoutes = this.leafletRoutes.filter(route => route.routeId !== routeId);

    // Force immediate map update to remove the cancelled route
    this.forceMapUpdate();
  }

  // Force immediate map update
  private forceMapUpdate() {
    // Update the leaflet routes data
    this.updateLeafletMap();

    // Force the map component to refresh if available
    if (this.leafletMapComponent) {
      setTimeout(() => {
        this.leafletMapComponent.refreshMap();
      }, 100);
    }
  }
}
