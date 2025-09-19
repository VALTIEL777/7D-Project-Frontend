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
import { MatCheckboxModule } from '@angular/material/checkbox';
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
  coordinates?: {
    latitude: number;
    longitude: number;
    placeid?: string;
  };
  watchnProtect?: boolean; // Add watchnProtect property
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
  expiredate: string; // Add expiredate field from API
  watchnProtect?: boolean; // Add watchnProtect property
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
  contractNumber: string | null;
  contractUnitName: string;
  amountToPay: string | number;
  ticketType: string;
  daysOutstanding: number | null;
  comment7d: string;
  expireDate: string; // Add expireDate field from API
  quantity: number;
  createdAt: string;
  updatedAt: string;
  incidentName: string;
  addresses: string;
  addressDetails: Array<{
    ticketid?: number;
    addressid?: number;
    addressNumber?: string;
    addressnumber?: string;
    addressCardinal?: string;
    addresscardinal?: string;
    addressStreet?: string;
    addressstreet?: string;
    addressSuffix?: string;
    addresssuffix?: string;
    latitude: number | null;
    longitude: number | null;
    placeid: string | null;
    fullAddress?: string;
    fulladdress?: string;
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
  watchnProtect?: boolean; // Add watchnProtect property
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

// Interface for expired tickets API response
interface ExpiredTicketsResponse {
  success: boolean;
  message: string;
  summary: {
    totalTickets: number;
    ticketsExpired: number;
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
    MatCheckboxModule,
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

  // Master loading state - shows loading until all data is loaded
  isInitialLoading = true;

  // Dialog properties
  newRouteType: string = '';
  private dialogRef: any;

  // Loading states
  isGeneratingRoute: boolean = false;
  reoptimizingRoutes: Set<number> = new Set();

  // Tickets with issues
  ticketsWithIssues: TicketWithIssue[] = [];
  isLoadingTicketsWithIssues = false;

  // Expired tickets
  expiredTickets: TicketWithIssue[] = [];
  isLoadingExpiredTickets = false;

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

  // Filter for Issued Tickets - On Hold Off card
  issuedOnHoldOffFilter: string = '';

  // Filter for Expired Tickets card
  expiredTicketsFilter: string = '';

  // Add a loading state for batch add (optional)
  isBatchAddingTickets: boolean = false;

  // Add watchnProtect loading states
  watchnProtectLoading: Set<number> = new Set();

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

    // Load all data and wait for completion before showing the page
    this.loadAllData();
  }

  private async loadAllData(): Promise<void> {
    try {
      console.log('🔄 Starting to load all data...');

      // Load all data in parallel
      const loadPromises = [
        this.loadSpottingRoutesAsync(),
        this.loadConcreteRoutesAsync(),
        this.loadAsphaltRoutesAsync(),
        this.loadSpotReadyTicketsAsync(),
        this.loadAsphaltReadyTicketsAsync(),
        this.loadConcreteReadyTicketsAsync(),
        this.loadTicketsWithIssuesAsync(),
        this.loadExpiredTicketsAsync()
      ];

      // Wait for all data to load
      await Promise.all(loadPromises);

      console.log('✅ All data loaded successfully');

      // Generate Leaflet map after all data is loaded
      setTimeout(() => {
        this.updateLeafletMap();
      }, 500);

      // Load watchnProtect status for all tickets after data is loaded
      setTimeout(async () => {
        await this.loadWatchnProtectStatusForTickets();
      }, 1000);

      // Subscribe to filter changes to trigger change detection
      this.filterService.textSearch$.subscribe(() => {
        // Force change detection when filter changes
        this.cdr.detectChanges();
      });

      // Debug: Check route rendering after data loads
      setTimeout(() => {
        this.debugRouteRendering();
      }, 1500);

    } catch (error) {
      console.error('❌ Error loading data:', error);
    } finally {
      // Hide loading state and show the page
      this.isInitialLoading = false;
      console.log('🎉 Page is now ready to display');
    }
  }

  private debugRouteRendering() {
    console.log('Route rendering debug:', {
      spottingRoutes: this.spottingRoutes.length,
      concreteRoutes: this.concreteRoutes.length,
      asphaltRoutes: this.asphaltRoutes.length,
      routeContainers: document.querySelectorAll('[data-route-section="true"], [data-route-id]').length,
      allDropLists: document.querySelectorAll('.cdk-drop-list').length,
      concreteRoutesData: this.concreteRoutes.map(route => ({
        routeId: route.routeId,
        routeCode: route.routeCode,
        ticketsCount: route.tickets?.length || 0
      }))
    });

    // Debug all drop lists in detail
    const allDropLists = document.querySelectorAll('.cdk-drop-list');
    console.log('🔍 ALL DROP LISTS DETAILED:', {
      totalCount: allDropLists.length,
      lists: Array.from(allDropLists).map((el: any, index: number) => ({
        index,
        id: el.id,
        className: el.className,
        dataReadySection: el.getAttribute('data-ready-section'),
        dataRouteSection: el.getAttribute('data-route-section'),
        dataRouteId: el.getAttribute('data-route-id'),
        isVisible: el.offsetParent !== null,
        display: window.getComputedStyle(el).display,
        visibility: window.getComputedStyle(el).visibility,
        zIndex: window.getComputedStyle(el).zIndex,
        position: window.getComputedStyle(el).position,
        rect: el.getBoundingClientRect()
      }))
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
    // Debug visible routes
    console.log('👁️ VISIBLE ROUTES DEBUG:', {
      showSpottingRoutes: this.showSpottingRoutes,
      showConcreteRoutes: this.showConcreteRoutes,
      showAsphaltRoutes: this.showAsphaltRoutes,
      visibleRoutesSet: Array.from(this.visibleRoutes),
      concreteRouteIds: this.concreteRoutes.map(r => r.routeId),
      concreteRoutesVisible: this.concreteRoutes.map(r => ({
        routeId: r.routeId,
        routeCode: r.routeCode,
        isVisible: this.visibleRoutes.has(r.routeId)
      }))
    });

    if (this.visibleRoutes.size === 0) {
      return;
    }
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
    let filteredTickets = this.concreteReadyTickets;

    // Apply text filter
    const textFilter = this.concreteReadyFilter.toLowerCase().trim();
    if (textFilter) {
      filteredTickets = filteredTickets.filter(ticket => ticket.address && ticket.address.toLowerCase().includes(textFilter));
    }

    return filteredTickets;
  }

  // Filter issued tickets by On Hold Off and text filter
  getFilteredOnHoldOffTickets(): TicketWithIssue[] {
    let tickets = this.ticketsWithIssues.filter(t => this.isTicketOnHoldOff(t));

    const textFilter = (this.issuedOnHoldOffFilter || '').toLowerCase().trim();
    if (textFilter) {
      tickets = tickets.filter(t => {
        const address = this.formatAddressFromIssues(t).toLowerCase();
        const ticketCode = (t.ticketCode || '').toLowerCase();
        const comments = (this.getCrewComments(t) || '').toLowerCase();
        return address.includes(textFilter) || ticketCode.includes(textFilter) || comments.includes(textFilter);
      });
    }

    return tickets;
  }

  // Filter expired tickets by text filter
  getFilteredExpiredTickets(): TicketWithIssue[] {
    let tickets = this.expiredTickets;

    // Debug logging
    console.log('🔍 Expired tickets debug:', {
      totalTickets: this.expiredTickets.length,
      tickets: this.expiredTickets.map(t => ({
        ticketId: t.ticketId,
        ticketCode: t.ticketCode,
        address: this.formatAddressFromIssues(t),
        comment7d: t.comment7d
      }))
    });

    const textFilter = (this.expiredTicketsFilter || '').toLowerCase().trim();
    if (textFilter) {
      tickets = tickets.filter(t => {
        const address = this.formatAddressFromIssues(t).toLowerCase();
        const ticketCode = (t.ticketCode || '').toLowerCase();
        const comments = (this.getCrewComments(t) || '').toLowerCase();
        return address.includes(textFilter) || ticketCode.includes(textFilter) || comments.includes(textFilter);
      });
    }

    console.log('🔍 Filtered expired tickets:', {
      filteredCount: tickets.length,
      filter: textFilter,
      tickets: tickets.map(t => ({
        ticketId: t.ticketId,
        ticketCode: t.ticketCode,
        address: this.formatAddressFromIssues(t)
      }))
    });

    return tickets;
  }

  // Determine if a ticket is marked as On Hold Off
  private isTicketOnHoldOff(ticket: TicketWithIssue): boolean {
    const comment = (ticket.comment7d || '').toLowerCase();
    return comment.includes('hold off');
  }

  // Filter tickets in a route by the filter for that route
  getFilteredRouteTickets(route: Route): RouteTicket[] {
    const filter = (this.routeTicketFilters[route.routeId] || '').toLowerCase().trim();
    if (!filter) return route.tickets;
    return route.tickets.filter(ticket =>
      (ticket.address && ticket.address.toLowerCase().includes(filter)) ||
      (ticket.ticketCode && ticket.ticketCode.toLowerCase().includes(filter))
    );
  }

  // Filter spot ready tickets by the spotReadyFilter
  getFilteredSpotReadyTickets(): ReadyTicket[] {
    let filteredTickets = this.spotReadyTickets;

    // Apply text filter
    const textFilter = this.spotReadyFilter.toLowerCase().trim();
    if (textFilter) {
      filteredTickets = filteredTickets.filter(ticket =>
        (ticket.address && ticket.address.toLowerCase().includes(textFilter)) ||
        (ticket.ticketcode && ticket.ticketcode.toLowerCase().includes(textFilter))
      );
    }

    return filteredTickets;
  }

  // Filter asphalt ready tickets by the asphaltReadyFilter
  getFilteredAsphaltReadyTickets(): ReadyTicket[] {
    let filteredTickets = this.asphaltReadyTickets;

    // Apply text filter
    const textFilter = this.asphaltReadyFilter.toLowerCase().trim();
    if (textFilter) {
      filteredTickets = filteredTickets.filter(ticket =>
        (ticket.address && ticket.address.toLowerCase().includes(textFilter)) ||
        (ticket.ticketcode && ticket.ticketcode.toLowerCase().includes(textFilter))
      );
    }

    return filteredTickets;
  }

  // Filter concrete ready tickets by the concreteReadyFilter
  getFilteredConcreteReadyTickets(): ReadyTicket[] {
    let filteredTickets = this.concreteReadyTickets;

    // Apply text filter
    const textFilter = this.concreteReadyFilter.toLowerCase().trim();
    if (textFilter) {
      filteredTickets = filteredTickets.filter(ticket =>
        (ticket.address && ticket.address.toLowerCase().includes(textFilter)) ||
        (ticket.ticketcode && ticket.ticketcode.toLowerCase().includes(textFilter))
      );
    }

    return filteredTickets;
  }


  // Async version of loadSpottingRoutes for Promise.all
  private async loadSpottingRoutesAsync(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.loadSpottingRoutes();
      // Wait for loading to complete
      const checkLoading = () => {
        if (!this.isLoadingSpottingRoutes) {
          resolve();
        } else {
          setTimeout(checkLoading, 100);
        }
      };
      checkLoading();
    });
  }

  // Load spotting routes from API
  loadSpottingRoutes() {
    this.isLoadingSpottingRoutes = true;
    this.http.get<RoutesResponse>(`${environment.apiUrl}/routes/spotting`).subscribe({
      next: (response) => {
        console.log('🔍 SPOTTING ROUTES API Response:', response);

        this.spottingRoutes = response.routes || [];
        this.initialSpottingRoutes = [...this.spottingRoutes];
        this.isLoadingSpottingRoutes = false;

        // Debug each route's ticket data
        this.spottingRoutes.forEach((route, routeIndex) => {
          console.log(`🔍 Spotting Route ${routeIndex + 1} (${route.routeCode}) - Raw Data:`, {
            routeId: route.routeId,
            routeCode: route.routeCode,
            type: route.type,
            ticketsCount: route.tickets?.length || 0,
            tickets: route.tickets?.map((ticket, ticketIndex) => ({
              index: ticketIndex,
              ticketId: ticket.ticketId,
              ticketCode: ticket.ticketCode,
              address: ticket.address,
              queue: ticket.queue,
              coordinates: ticket.coordinates,
              rawTicketData: ticket
            }))
          });
        });

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

  // Async version of loadConcreteRoutes for Promise.all
  private async loadConcreteRoutesAsync(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.loadConcreteRoutes();
      const checkLoading = () => {
        if (!this.isLoadingConcreteRoutes) {
          resolve();
        } else {
          setTimeout(checkLoading, 100);
        }
      };
      checkLoading();
    });
  }

  // Load concrete routes from API
  loadConcreteRoutes() {
    this.isLoadingConcreteRoutes = true;
    this.http.get<RoutesResponse>(`${environment.apiUrl}/routes/concrete`).subscribe({
      next: (response) => {
        console.log('🔍 CONCRETE ROUTES API Response:', response);

        this.concreteRoutes = response.routes || [];
        this.initialConcreteRoutes = [...this.concreteRoutes];
        this.isLoadingConcreteRoutes = false;

        // Debug each route's ticket data
        this.concreteRoutes.forEach((route, routeIndex) => {
          console.log(`🔍 Concrete Route ${routeIndex + 1} (${route.routeCode}) - Raw Data:`, {
            routeId: route.routeId,
            routeCode: route.routeCode,
            type: route.type,
            ticketsCount: route.tickets?.length || 0,
            encodedPolyline: route.encodedPolyline,
            polylineLength: route.encodedPolyline?.length || 0,
            tickets: route.tickets?.map((ticket, ticketIndex) => ({
              index: ticketIndex,
              ticketId: ticket.ticketId,
              ticketCode: ticket.ticketCode,
              address: ticket.address,
              queue: ticket.queue,
              coordinates: ticket.coordinates,
              rawTicketData: ticket
            }))
          });

          // Special debugging for concrete routes
          console.log(`🚨 CONCRETE ROUTE DEBUG - ${route.routeCode}:`, {
            hasPolyline: !!route.encodedPolyline,
            polylineValid: route.encodedPolyline && route.encodedPolyline.length > 0,
            ticketsValid: route.tickets && route.tickets.length > 0,
            firstTicket: route.tickets?.[0],
            lastTicket: route.tickets?.[route.tickets.length - 1],
            allTicketIds: route.tickets?.map(t => t.ticketId),
            allTicketCodes: route.tickets?.map(t => t.ticketCode),
            allQueues: route.tickets?.map(t => t.queue)
          });

          // Check if polyline can be decoded
          if (route.encodedPolyline) {
            try {
              const decodedPolyline = polyline.decode(route.encodedPolyline);
              console.log(`🗺️ Concrete Polyline Decoded Successfully:`, {
                pointCount: decodedPolyline.length,
                firstPoint: decodedPolyline[0],
                lastPoint: decodedPolyline[decodedPolyline.length - 1],
                isValid: decodedPolyline.length > 0
              });
            } catch (error) {
              console.error(`❌ Concrete Polyline Decode Error:`, error);
            }
          } else {
            console.warn(`⚠️ Concrete Route ${route.routeCode} has NO encoded polyline!`);
          }
        });

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

  // Async version of loadAsphaltRoutes for Promise.all
  private async loadAsphaltRoutesAsync(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.loadAsphaltRoutes();
      const checkLoading = () => {
        if (!this.isLoadingAsphaltRoutes) {
          resolve();
        } else {
          setTimeout(checkLoading, 100);
        }
      };
      checkLoading();
    });
  }

  // Load asphalt routes from API
  loadAsphaltRoutes() {
    this.isLoadingAsphaltRoutes = true;
    this.http.get<RoutesResponse>(`${environment.apiUrl}/routes/asphalt`).subscribe({
      next: (response) => {
        console.log('🔍 ASPHALT ROUTES API Response:', response);

        this.asphaltRoutes = response.routes || [];
        this.initialAsphaltRoutes = [...this.asphaltRoutes];
        this.isLoadingAsphaltRoutes = false;

        // Debug each route's ticket data
        this.asphaltRoutes.forEach((route, routeIndex) => {
          console.log(`🔍 Asphalt Route ${routeIndex + 1} (${route.routeCode}) - Raw Data:`, {
            routeId: route.routeId,
            routeCode: route.routeCode,
            type: route.type,
            ticketsCount: route.tickets?.length || 0,
            tickets: route.tickets?.map((ticket, ticketIndex) => ({
              index: ticketIndex,
              ticketId: ticket.ticketId,
              ticketCode: ticket.ticketCode,
              address: ticket.address,
              queue: ticket.queue,
              coordinates: ticket.coordinates,
              rawTicketData: ticket
            }))
          });
        });

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

  // Async version of loadSpotReadyTickets for Promise.all
  private async loadSpotReadyTicketsAsync(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.loadSpotReadyTickets();
      const checkLoading = () => {
        if (!this.isLoadingSpotReady) {
          resolve();
        } else {
          setTimeout(checkLoading, 100);
        }
      };
      checkLoading();
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

  // Async version of loadAsphaltReadyTickets for Promise.all
  private async loadAsphaltReadyTicketsAsync(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.loadAsphaltReadyTickets();
      const checkLoading = () => {
        if (!this.isLoadingAsphaltReady) {
          resolve();
        } else {
          setTimeout(checkLoading, 100);
        }
      };
      checkLoading();
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

  // Async version of loadConcreteReadyTickets for Promise.all
  private async loadConcreteReadyTicketsAsync(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.loadConcreteReadyTickets();
      const checkLoading = () => {
        if (!this.isLoadingConcreteReady) {
          resolve();
        } else {
          setTimeout(checkLoading, 100);
        }
      };
      checkLoading();
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
    console.log('🔍 DROP EVENT DEBUG:', {
      previousContainer: event.previousContainer,
      container: event.container,
      previousIndex: event.previousIndex,
      currentIndex: event.currentIndex,
      isSameContainer: event.previousContainer === event.container,
      previousContainerId: event.previousContainer.element?.nativeElement?.id,
      containerId: event.container.element?.nativeElement?.id,
      previousContainerData: event.previousContainer.data,
      containerData: event.container.data
    });

    // Debug drop targets
    this.debugDropTargets();

    // Debug concrete routes specifically
    console.log('🔍 CONCRETE ROUTES DEBUG:', {
      concreteRoutesCount: this.concreteRoutes.length,
      concreteRoutes: this.concreteRoutes.map(route => ({
        routeId: route.routeId,
        routeCode: route.routeCode,
        ticketsCount: route.tickets?.length || 0,
        tickets: route.tickets?.map(ticket => ({
          ticketId: ticket.ticketId,
          address: ticket.address
        })) || []
      })),
      concreteReadyCount: this.concreteReadyTickets.length,
      concreteReadyTickets: this.concreteReadyTickets.map(ticket => ({
        ticketid: ticket.ticketid,
        address: ticket.address
      }))
    });
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

      // Debug logging for single ticket move
      console.log('Single ticket move debug:', {
        isFromReadySection,
        isToReadySection,
        isToRoute,
        previousContainerData: event.previousContainer.data,
        containerData: event.container.data,
        draggedTicket: draggedTicket,
        availableRoutes: {
          spottingRoutes: this.spottingRoutes.length,
          concreteRoutes: this.concreteRoutes.length,
          asphaltRoutes: this.asphaltRoutes.length
        },
        containerComparison: {
          previousContainer: event.previousContainer,
          container: event.container,
          areSame: event.previousContainer === event.container,
          previousContainerId: event.previousContainer.element?.nativeElement?.id,
          containerId: event.container.element?.nativeElement?.id
        }
      });

      if (isFromReadySection && isToReadySection) {
        // Check if moving between different ready section types
        const sourceType = this.getReadySectionType(event.previousContainer.data);
        const destType = this.getReadySectionType(event.container.data);

        if (sourceType !== destType) {
          this.snackBar.open('Cannot move tickets between different ready section types.', 'Close', {
            duration: 3000,
            panelClass: ['error-snackbar']
          });
          return;
        }

        await this.handleMoveBetweenReadySections(event, draggedTicket);
                      } else if (isFromReadySection && isToRoute) {
          // Check type compatibility for ready to route
          const readyType = this.getReadySectionType(event.previousContainer.data);
          const routeId = this.getRouteIdFromDropEvent(event);

          if (routeId) {
            const route = this.findRouteByTickets(routeId);
            if (route && route.type !== readyType.toUpperCase()) {
              this.snackBar.open(`Cannot move ${readyType} ready tickets to ${route.type} routes. Only matching types are allowed.`, 'Close', {
                duration: 4000,
                panelClass: ['error-snackbar']
              });
              return;
            }

            // Check if adding this ticket would exceed the 95 location limit
            if (route && this.wouldExceedLocationLimit(route, [draggedTicket])) {
            const currentCount = this.getUniqueLocationCount(route);
            const newAddress = draggedTicket.address?.trim().toLowerCase();
            const existingAddresses = new Set<string>();
            route.tickets.forEach(ticket => {
              if (ticket.address) {
                existingAddresses.add(ticket.address.trim().toLowerCase());
              }
            });
            const isNewAddress = newAddress && !existingAddresses.has(newAddress);
            const totalAfterAdd = currentCount + (isNewAddress ? 1 : 0);

            this.snackBar.open(
              `Cannot add ticket to route ${route.routeCode}. Adding this location would exceed the 95 location limit (${currentCount} current + ${isNewAddress ? 1 : 0} new = ${totalAfterAdd} total).`,
              'Close',
              { duration: 6000, panelClass: ['error-snackbar'] }
            );
            return;
          }
        }
        await this.handleMoveFromReadyToRoute(event, draggedTicket);
      } else if (event.previousContainer === event.container) {
        console.log('Same container detected - reordering within container');
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
        console.log('Different containers detected - moving between containers');

        // Check if moving between routes
        const isSourceRoute = this.isRouteSection(event.previousContainer);
        const isDestRoute = this.isRouteSection(event.container);

        if (isSourceRoute && isDestRoute) {
          // Moving between routes - check if they're the same type
          const sourceRouteId = this.getRouteIdFromDropEvent({ ...event, container: event.previousContainer });
          const destRouteId = this.getRouteIdFromDropEvent(event);

          if (sourceRouteId && destRouteId) {
            const sourceRoute = this.findRouteByTickets(sourceRouteId);
            const destRoute = this.findRouteByTickets(destRouteId);

            if (sourceRoute && destRoute && sourceRoute.type !== destRoute.type) {
              this.snackBar.open(`Cannot move tickets between different route types (${sourceRoute.type} → ${destRoute.type}). Only same type routes can exchange tickets.`, 'Close', {
                duration: 4000,
                panelClass: ['error-snackbar']
              });
              return;
            }
          }
        } else if (isSourceRoute && !isDestRoute) {
          // Moving from route to ready section - not allowed
          this.snackBar.open('Cannot move tickets from routes back to ready sections.', 'Close', {
            duration: 3000,
            panelClass: ['error-snackbar']
          });
          return;
        }

        // Only prevent empty routes, not ready sections
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

      // Check if sourceList is a filtered version of the ready tickets
      if (sourceList === this.getFilteredSpotReadyTickets() || sourceList === this.spotReadyTickets) {
        readyType = 'SPOTTER';
      } else if (sourceList === this.getFilteredAsphaltReadyTickets() || sourceList === this.asphaltReadyTickets) {
        readyType = 'ASPHALT';
      } else if (sourceList === this.getFilteredConcreteReadyTickets() || sourceList === this.concreteReadyTickets) {
        readyType = 'CONCRETE';
      } else if (batchTickets[0]?.tickettype) {
        readyType = (batchTickets[0].tickettype || '').toUpperCase();
      }

      // Debug logging
      console.log('Type compatibility check:', {
        sourceList: sourceList,
        readyType: readyType,
        routeType: route.type,
        routeCode: route.routeCode,
        batchTicketsLength: batchTickets.length,
        firstTicketType: batchTickets[0]?.tickettype
      });

      // Route type must match ready type
      if (route.type !== readyType) {
        console.error('Type mismatch:', { readyType, routeType: route.type });
        this.snackBar.open('Invalid move: You can only drag from a ready card to a matching route type.', 'Close', { duration: 4000, panelClass: ['error-snackbar'] });
        return;
      }

      // Check if adding these tickets would exceed the 95 location limit
      if (this.wouldExceedLocationLimit(route, batchTickets)) {
        const currentCount = this.getUniqueLocationCount(route);
        const newUniqueAddresses = new Set<string>();
        batchTickets.forEach(ticket => {
          if (ticket.address) {
            newUniqueAddresses.add(ticket.address.trim().toLowerCase());
          }
        });
        const existingAddresses = new Set<string>();
        route.tickets.forEach(ticket => {
          if (ticket.address) {
            existingAddresses.add(ticket.address.trim().toLowerCase());
          }
        });
        let trulyNewAddresses = 0;
        newUniqueAddresses.forEach(address => {
          if (!existingAddresses.has(address)) {
            trulyNewAddresses++;
          }
        });
        const totalAfterAdd = currentCount + trulyNewAddresses;

        this.snackBar.open(
          `Cannot add tickets to route ${route.routeCode}. Adding ${trulyNewAddresses} new locations would exceed the 95 location limit (${currentCount} current + ${trulyNewAddresses} new = ${totalAfterAdd} total).`,
          'Close',
          { duration: 6000, panelClass: ['error-snackbar'] }
        );
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
    const isSpotReady = data === this.getFilteredSpotReadyTickets() || data === this.spotReadyTickets;
    const isConcreteReady = data === this.getFilteredConcreteReadyTickets() || data === this.concreteReadyTickets;
    const isAsphaltReady = data === this.getFilteredAsphaltReadyTickets() || data === this.asphaltReadyTickets;

    // Debug logging
    console.log('isReadySection debug:', {
      data,
      isSpotReady,
      isConcreteReady,
      isAsphaltReady,
      filteredSpotReady: this.getFilteredSpotReadyTickets(),
      filteredConcreteReady: this.getFilteredConcreteReadyTickets(),
      filteredAsphaltReady: this.getFilteredAsphaltReadyTickets(),
      spotReady: this.spotReadyTickets,
      concreteReady: this.concreteReadyTickets,
      asphaltReady: this.asphaltReadyTickets
    });

    return isSpotReady || isConcreteReady || isAsphaltReady;
  }

        private isRouteSection(container: any): boolean {
    // Check if the container element has the route section attribute or route ID
    const containerElement = container.element?.nativeElement;
    const hasRouteSection = containerElement && (
      containerElement.hasAttribute('data-route-section') ||
      containerElement.getAttribute('data-route-section') === 'true' ||
      containerElement.hasAttribute('data-route-id')
    );

    // Debug logging
    console.log('isRouteSection debug:', {
      containerElement,
      hasRouteSection,
      dataRouteSection: containerElement ? containerElement.getAttribute('data-route-section') : null,
      dataRouteId: containerElement ? containerElement.getAttribute('data-route-id') : null,
      hasRouteSectionAttr: containerElement ? containerElement.hasAttribute('data-route-section') : false,
      hasRouteIdAttr: containerElement ? containerElement.hasAttribute('data-route-id') : false,
      attributes: containerElement ? Array.from(containerElement.attributes).map((attr: any) => ({ name: attr.name, value: attr.value })) : [],
      className: containerElement ? containerElement.className : null,
      id: containerElement ? containerElement.id : null,
      parentElement: containerElement ? containerElement.parentElement : null,
      parentClassName: containerElement?.parentElement ? containerElement.parentElement.className : null
    });

    return hasRouteSection;
  }

  private async handleMoveFromReadyToRoute(event: CdkDragDrop<any[]>, draggedTicket: any) {
    try {
      // Debug: Check what route containers are available in the DOM
      const routeContainers = document.querySelectorAll('[data-route-section="true"], [data-route-id]');
      const allDropLists = document.querySelectorAll('.cdk-drop-list');
      console.log('Available route containers in DOM:', {
        count: routeContainers.length,
        containers: Array.from(routeContainers).map((el: any) => ({
          id: el.id,
          className: el.className,
          dataRouteId: el.getAttribute('data-route-id'),
          dataRouteSection: el.getAttribute('data-route-section'),
          isVisible: el.offsetParent !== null,
          display: window.getComputedStyle(el).display,
          visibility: window.getComputedStyle(el).visibility
        }))
      });
      console.log('All drop lists in DOM:', {
        count: allDropLists.length,
        lists: Array.from(allDropLists).map((el: any) => ({
          id: el.id,
          className: el.className,
          dataReadySection: el.getAttribute('data-ready-section'),
          dataRouteSection: el.getAttribute('data-route-section'),
          dataRouteId: el.getAttribute('data-route-id'),
          isVisible: el.offsetParent !== null,
          display: window.getComputedStyle(el).display
        }))
      });
      console.log('All drop lists in DOM:', {
        count: allDropLists.length,
        lists: Array.from(allDropLists).map((el: any) => ({
          id: el.id,
          className: el.className,
          dataReadySection: el.getAttribute('data-ready-section'),
          dataRouteSection: el.getAttribute('data-route-section'),
          dataRouteId: el.getAttribute('data-route-id'),
          isVisible: el.offsetParent !== null,
          display: window.getComputedStyle(el).display
        }))
      });

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
        if (event.previousContainer.data === this.getFilteredSpotReadyTickets() || event.previousContainer.data === this.spotReadyTickets) {
          const originalIndex = this.spotReadyTickets.findIndex(t => t.ticketid === ticketToRemove.ticketid);
          if (originalIndex !== -1) {
            this.spotReadyTickets.splice(originalIndex, 1);
          }
        } else if (event.previousContainer.data === this.getFilteredAsphaltReadyTickets() || event.previousContainer.data === this.asphaltReadyTickets) {
          const originalIndex = this.asphaltReadyTickets.findIndex(t => t.ticketid === ticketToRemove.ticketid);
          if (originalIndex !== -1) {
            this.asphaltReadyTickets.splice(originalIndex, 1);
          }
        } else if (event.previousContainer.data === this.getFilteredConcreteReadyTickets() || event.previousContainer.data === this.concreteReadyTickets) {
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
      if (event.previousContainer.data === this.getFilteredSpotReadyTickets() || event.previousContainer.data === this.spotReadyTickets) {
        const originalIndex = this.spotReadyTickets.findIndex(t => t.ticketid === ticketToMove.ticketid);
        if (originalIndex !== -1) {
          this.spotReadyTickets.splice(originalIndex, 1);
        }
      } else if (event.previousContainer.data === this.getFilteredAsphaltReadyTickets() || event.previousContainer.data === this.asphaltReadyTickets) {
        const originalIndex = this.asphaltReadyTickets.findIndex(t => t.ticketid === ticketToMove.ticketid);
        if (originalIndex !== -1) {
          this.asphaltReadyTickets.splice(originalIndex, 1);
        }
      } else if (event.previousContainer.data === this.getFilteredConcreteReadyTickets() || event.previousContainer.data === this.concreteReadyTickets) {
        const originalIndex = this.concreteReadyTickets.findIndex(t => t.ticketid === ticketToMove.ticketid);
        if (originalIndex !== -1) {
          this.concreteReadyTickets.splice(originalIndex, 1);
        }
      }

      // Add to original destination array
      if (event.container.data === this.getFilteredSpotReadyTickets() || event.container.data === this.spotReadyTickets) {
        this.spotReadyTickets.push(ticketToMove);
      } else if (event.container.data === this.getFilteredAsphaltReadyTickets() || event.container.data === this.asphaltReadyTickets) {
        this.asphaltReadyTickets.push(ticketToMove);
      } else if (event.container.data === this.getFilteredConcreteReadyTickets() || event.container.data === this.concreteReadyTickets) {
        this.concreteReadyTickets.push(ticketToMove);
      }
    }
  }

  private getReadySectionType(data: any[]): string {
    // Check if this is a ready section by comparing with filtered arrays
    if (data === this.getFilteredSpotReadyTickets() || data === this.spotReadyTickets) {
      return 'spot';
    }

    if (data === this.getFilteredAsphaltReadyTickets() || data === this.asphaltReadyTickets) {
      return 'asphalt';
    }

    if (data === this.getFilteredConcreteReadyTickets() || data === this.concreteReadyTickets) {
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
    return this.getUniqueLocationCount(route) > 95;
  }

    // Helper method to check if adding tickets would exceed the 95 location limit
  private wouldExceedLocationLimit(route: Route, ticketsToAdd: any[]): boolean {
    const currentUniqueLocations = this.getUniqueLocationCount(route);

    // Get unique addresses from tickets to add
    const newAddresses = new Set<string>();
    ticketsToAdd.forEach(ticket => {
      if (ticket.address) {
        newAddresses.add(ticket.address.trim().toLowerCase());
      }
    });

    // Check if any of the new addresses already exist in the route
    const existingAddresses = new Set<string>();
    route.tickets.forEach(ticket => {
      if (ticket.address) {
        existingAddresses.add(ticket.address.trim().toLowerCase());
      }
    });

    // Count only truly new unique addresses
    let newUniqueAddresses = 0;
    newAddresses.forEach(address => {
      if (!existingAddresses.has(address)) {
        newUniqueAddresses++;
      }
    });

    const totalUniqueLocations = currentUniqueLocations + newUniqueAddresses;
    return totalUniqueLocations > 95;
  }

  // Helper method to check if a route is approaching the location limit (for UI warnings)
  isRouteApproachingLimit(route: Route): boolean {
    const currentCount = this.getUniqueLocationCount(route);
    return currentCount >= 90; // Warning when 90 or more locations
  }

  // Helper method to get the location count display text with color coding
  getLocationCountDisplay(route: Route): { text: string; color: string } {
    const count = this.getUniqueLocationCount(route);
    if (count > 95) {
      return { text: `${count}/95`, color: '#f44336' }; // Red for over limit
    } else if (count >= 90) {
      return { text: `${count}/95`, color: '#ff9800' }; // Orange for approaching limit
    } else {
      return { text: `${count}/95`, color: '#4caf50' }; // Green for safe
    }
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

      // Debug logging
      console.log('🔍 Completing route:', {
        routeId: route.routeId,
        routeCode: route.routeCode,
        routeType: route.type,
        routeTypeUpperCase: route.type?.toUpperCase()
      });

      // Use the correct endpoint based on route type
      let endpoint: string;
      let routeType = route.type?.toUpperCase();

      // Fallback: If route type is not available or unknown, try to determine from routeCode
      if (!routeType || !['SPOTTER', 'CONCRETE', 'ASPHALT'].includes(routeType)) {
        console.log('⚠️ Route type not found or unknown, trying to determine from routeCode:', route.routeCode);

        const routeCode = route.routeCode?.toUpperCase() || '';
        if (routeCode.includes('SPOTTER')) {
          routeType = 'SPOTTER';
        } else if (routeCode.includes('CONCRETE')) {
          routeType = 'CONCRETE';
        } else if (routeCode.includes('ASPHALT')) {
          routeType = 'ASPHALT';
        } else {
          // Default to SPOTTER if we can't determine
          routeType = 'SPOTTER';
          console.log('⚠️ Could not determine route type from routeCode, defaulting to SPOTTER');
        }

        console.log('🎯 Determined route type from routeCode:', routeType);
      }

      switch (routeType) {
        case 'SPOTTER':
          endpoint = `${environment.apiUrl}/route-optimization/route/${route.routeId}/complete-spotting`;
          break;
        case 'CONCRETE':
          endpoint = `${environment.apiUrl}/route-optimization/route/${route.routeId}/complete-concrete`;
          break;
        case 'ASPHALT':
          endpoint = `${environment.apiUrl}/route-optimization/route/${route.routeId}/complete-asphalt`;
          break;
        default:
          console.error('❌ Unknown route type:', routeType, 'for route:', route);
          throw new Error(`Unknown route type: ${routeType || 'undefined'}`);
      }

      console.log('🔗 Using endpoint:', endpoint);

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
      console.error(`❌ Error completing route ${route.routeCode}:`, error);
      console.error('🔍 Error details:', {
        routeId: route.routeId,
        routeCode: route.routeCode,
        routeType: route.type,
        error: error
      });
      this.snackBar.open(`Error completing route ${route.routeCode}. Please try again.`, 'Close', { duration: 5000 });
    }
  }

  // Reoptimize specific route - updated to use actual endpoints
  async reoptimizeSpecificRoute(route: Route) {
    // Check if route has too many locations
    if (this.isRouteTooLargeForReoptimization(route)) {
      const locationCount = this.getUniqueLocationCount(route);
      this.snackBar.open(
        `Cannot reoptimize route ${route.routeCode}. It has ${locationCount} unique locations (maximum 95 allowed).`,
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

    // Debug coordinate data
    console.log('🔍 Route Generator - Debugging coordinate data:');
    allRoutes.forEach((route, routeIndex) => {
      console.log(`📍 Route ${routeIndex + 1} (${route.type}):`, {
        routeId: route.routeId,
        routeCode: route.routeCode,
        ticketsCount: route.tickets?.length || 0,
        encodedPolyline: route.encodedPolyline,
        polylineLength: route.encodedPolyline?.length || 0
      });

      // Special focus on concrete routes
      if (route.type === 'concrete') {
        console.log(`🚨 CONCRETE ROUTE MAP DEBUG - ${route.routeCode}:`, {
          routeInArray: route,
          hasTickets: !!route.tickets,
          ticketsLength: route.tickets?.length || 0,
          hasPolyline: !!route.encodedPolyline,
          polylineLength: route.encodedPolyline?.length || 0,
          willBeInLeafletRoutes: true
        });
      }

      route.tickets?.forEach((ticket, ticketIndex) => {
        console.log(`  📍 Ticket ${ticketIndex + 1}:`, {
          ticketId: ticket.ticketId,
          ticketCode: ticket.ticketCode,
          address: ticket.address,
          queue: ticket.queue,
          hasCoordinates: !!ticket.coordinates,
          coordinates: ticket.coordinates,
          coordinateKeys: ticket.coordinates ? Object.keys(ticket.coordinates) : [],
          latType: ticket.coordinates?.latitude ? typeof ticket.coordinates.latitude : 'undefined',
          lngType: ticket.coordinates?.longitude ? typeof ticket.coordinates.longitude : 'undefined',
          latValue: ticket.coordinates?.latitude,
          lngValue: ticket.coordinates?.longitude,
          placeid: ticket.coordinates?.placeid
        });
      });

      // Debug polyline decoding
      if (route.encodedPolyline) {
        try {
          const decodedPolyline = polyline.decode(route.encodedPolyline);
          console.log(`  🗺️ Decoded Polyline for ${route.routeCode}:`, {
            pointCount: decodedPolyline.length,
            firstPoint: decodedPolyline[0],
            lastPoint: decodedPolyline[decodedPolyline.length - 1],
            allPoints: decodedPolyline.map((point, index) => ({
              index,
              lat: point[0],
              lng: point[1]
            }))
          });

          // Compare ticket coordinates with polyline points
          console.log(`  🔍 Comparing ticket coordinates with polyline points:`);
          route.tickets?.forEach((ticket, ticketIndex) => {
            if (ticket.coordinates?.latitude && ticket.coordinates?.longitude) {
              const ticketLat = ticket.coordinates.latitude;
              const ticketLng = ticket.coordinates.longitude;

              // Find closest polyline point
              let closestPoint = null;
              let minDistance = Infinity;
              let closestIndex = -1;

              decodedPolyline.forEach((point, pointIndex) => {
                const distance = Math.sqrt(
                  Math.pow(point[0] - ticketLat, 2) +
                  Math.pow(point[1] - ticketLng, 2)
                );
                if (distance < minDistance) {
                  minDistance = distance;
                  closestPoint = point;
                  closestIndex = pointIndex;
                }
              });

              console.log(`    🎯 Ticket ${ticketIndex + 1} (${ticket.ticketCode}):`, {
                ticketCoords: { lat: ticketLat, lng: ticketLng },
                closestPolylinePoint: closestPoint,
                closestIndex: closestIndex,
                distance: minDistance,
                address: ticket.address,
                queue: ticket.queue
              });
            }
          });
        } catch (error) {
          console.error(`  ❌ Error decoding polyline for ${route.routeCode}:`, error);
        }
      }
    });

    // Convert routes to Leaflet map format
    this.leafletRoutes = allRoutes.map(route => ({
      routeId: route.routeId,
      routeCode: route.routeCode,
      type: route.type,
      encodedPolyline: route.encodedPolyline,
      tickets: route.tickets.map(ticket => ({
        ticketId: ticket.ticketId,
        address: ticket.address,
        queue: ticket.queue,
        coordinates: ticket.coordinates // Include coordinates from API
      }))
    }));

    // Debug the final leafletRoutes array
    console.log('🗺️ FINAL LEAFLET ROUTES ARRAY:', {
      totalRoutes: this.leafletRoutes.length,
      routeTypes: this.leafletRoutes.map(r => r.type),
      concreteRoutes: this.leafletRoutes.filter(r => r.type === 'concrete'),
      concreteRouteDetails: this.leafletRoutes.filter(r => r.type === 'concrete').map(r => ({
        routeId: r.routeId,
        routeCode: r.routeCode,
        hasPolyline: !!r.encodedPolyline,
        polylineLength: r.encodedPolyline?.length || 0,
        ticketsCount: r.tickets?.length || 0,
        tickets: r.tickets?.map(t => ({
          ticketId: t.ticketId,
          queue: t.queue,
          hasCoordinates: !!t.coordinates
        }))
      }))
    });

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

  // Format expiration date for tickets
  formatExpirationDate(ticket: any): string {
    // Check if ticket has the expiredate field from API (highest priority for ready tickets)
    if (ticket.expiredate) {
      return this.formatDate(ticket.expiredate);
    }

    // Check if ticket has the expireDate field from API (for tickets with issues)
    if (ticket.expireDate) {
      return this.formatDate(ticket.expireDate);
    }

    // Check if ticket has an explicit expiration date field
    if (ticket.expirationDate) {
      return this.formatDate(ticket.expirationDate);
    }

    // Check if ticket has an expiry date field
    if (ticket.expiryDate) {
      return this.formatDate(ticket.expiryDate);
    }

    // Check if ticket has a validUntil field
    if (ticket.validUntil) {
      return this.formatDate(ticket.validUntil);
    }

    // If no explicit expiration date, calculate based on creation date + standard period
    // Assuming 30 days from creation as default expiration
    if (ticket.createdat || ticket.createdAt) {
      const createdDate = new Date(ticket.createdat || ticket.createdAt);
      const expirationDate = new Date(createdDate);
      expirationDate.setDate(expirationDate.getDate() + 30); // 30 days from creation
      return this.formatDate(expirationDate.toISOString());
    }

    return 'No expiration date';
  }

  // Helper method to format dates consistently
  private formatDate(dateString: string): string {
    if (!dateString) return 'Invalid date';

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';

      // Format as MM/DD/YYYY
      return date.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      return 'Invalid date';
    }
  }

  // Check if a ticket is expired or expiring soon
  isTicketExpiredOrExpiringSoon(ticket: any): { isExpired: boolean; isExpiringSoon: boolean; daysLeft: number } {
    let expirationDate: Date | null = null;

    // Try to get expiration date from various possible fields (prioritize expiredate from API)
    if (ticket.expiredate) {
      expirationDate = new Date(ticket.expiredate);
    } else if (ticket.expireDate) {
      expirationDate = new Date(ticket.expireDate);
    } else if (ticket.expirationDate) {
      expirationDate = new Date(ticket.expirationDate);
    } else if (ticket.expiryDate) {
      expirationDate = new Date(ticket.expiryDate);
    } else if (ticket.validUntil) {
      expirationDate = new Date(ticket.validUntil);
    } else if (ticket.createdat || ticket.createdAt) {
      // Calculate expiration date (30 days from creation)
      const createdDate = new Date(ticket.createdat || ticket.createdAt);
      expirationDate = new Date(createdDate);
      expirationDate.setDate(expirationDate.getDate() + 30);
    }

    if (!expirationDate || isNaN(expirationDate.getTime())) {
      return { isExpired: false, isExpiringSoon: false, daysLeft: -1 };
    }

    const now = new Date();
    const timeDiff = expirationDate.getTime() - now.getTime();
    const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));

    return {
      isExpired: daysLeft < 0,
      isExpiringSoon: daysLeft >= 0 && daysLeft <= 7, // Expiring within 7 days
      daysLeft: daysLeft
    };
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

  // Async version of loadTicketsWithIssues for Promise.all
  private async loadTicketsWithIssuesAsync(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.loadTicketsWithIssues();
      const checkLoading = () => {
        if (!this.isLoadingTicketsWithIssues) {
          resolve();
        } else {
          setTimeout(checkLoading, 100);
        }
      };
      checkLoading();
    });
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

  // Async version of loadExpiredTickets for Promise.all
  private async loadExpiredTicketsAsync(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.loadExpiredTickets();
      const checkLoading = () => {
        if (!this.isLoadingExpiredTickets) {
          resolve();
        } else {
          setTimeout(checkLoading, 100);
        }
      };
      checkLoading();
    });
  }

  // Load expired tickets from API
  loadExpiredTickets() {
    this.isLoadingExpiredTickets = true;
    this.http.get<ExpiredTicketsResponse>(`${environment.apiUrl}/tickets/expired-or-needs-permit`).subscribe({
      next: (response) => {
        this.expiredTickets = response.data;
        this.isLoadingExpiredTickets = false;
      },
      error: (error) => {
        console.error('Error loading expired tickets:', error);
        this.isLoadingExpiredTickets = false;
        // Fallback to empty array if API fails
        this.expiredTickets = [];
      }
    });
  }

  // Helper method to format address from addressDetails
  formatAddressFromIssues(ticket: TicketWithIssue): string {
    if (ticket.addressDetails && ticket.addressDetails.length > 0) {
      const address = ticket.addressDetails[0];
      // Handle both camelCase and snake_case property names
      const addressNumber = address.addressNumber || address.addressnumber;
      const addressCardinal = address.addressCardinal || address.addresscardinal;
      const addressStreet = address.addressStreet || address.addressstreet;
      const addressSuffix = address.addressSuffix || address.addresssuffix;

      if (addressNumber && addressCardinal && addressStreet && addressSuffix) {
        return `${addressNumber} ${addressCardinal} ${addressStreet} ${addressSuffix}`;
      }

      // Fallback to fullAddress if available
      const fullAddress = address.fullAddress || address.fulladdress;
      if (fullAddress) {
        return fullAddress;
      }
    }

    // Fallback to addresses field (which is a string in the API response)
    return ticket.addresses || 'N/A';
  }

  // Helper method to get non-null crew comments
  getCrewComments(ticket: TicketWithIssue): string {
    const comments = ticket.taskStatuses
      ?.filter(status => status.crewComment && status.crewComment.trim() !== '')
      ?.map(status => status.crewComment as string)
      ?.join(', ');

    return comments || '';
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
    this.loadExpiredTickets();
    this.updateLeafletMap(); // Update Leaflet map after refresh

    // Reload watchnProtect status for all tickets after data refresh
    setTimeout(async () => {
      await this.loadWatchnProtectStatusForTickets();
    }, 1000);
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

  // Debug method to check drop targets during drag
  private debugDropTargets() {
    console.log('🔍 DROP TARGETS DEBUG:', {
      timestamp: new Date().toISOString(),
      routeContainers: document.querySelectorAll('[data-route-section="true"]').length,
      readyContainers: document.querySelectorAll('[data-ready-section="true"]').length,
      allDropLists: document.querySelectorAll('.cdk-drop-list').length,
      routeContainersDetails: Array.from(document.querySelectorAll('[data-route-section="true"]')).map((el: any) => ({
        id: el.id,
        routeId: el.getAttribute('data-route-id'),
        isVisible: el.offsetParent !== null,
        rect: el.getBoundingClientRect(),
        style: {
          display: window.getComputedStyle(el).display,
          visibility: window.getComputedStyle(el).visibility,
          zIndex: window.getComputedStyle(el).zIndex,
          position: window.getComputedStyle(el).position
        }
      })),
      allDropListsDetails: Array.from(document.querySelectorAll('.cdk-drop-list')).map((el: any) => ({
        id: el.id,
        className: el.className,
        dataReadySection: el.getAttribute('data-ready-section'),
        dataRouteSection: el.getAttribute('data-route-section'),
        dataRouteId: el.getAttribute('data-route-id'),
        isVisible: el.offsetParent !== null,
        rect: el.getBoundingClientRect()
      }))
    });
  }

  // Method to get watchnProtect status for a ticket
  async getWatchnProtectStatus(ticketId: number): Promise<boolean> {
    try {
      const response = await this.http.get<any>(`${environment.apiUrl}/diggers/ticket/${ticketId}`).toPromise();
      // The API returns { success: true, data: { watchnProtect: boolean } }
      return response?.data?.watchnProtect || false;
    } catch (error) {
      console.error(`Error getting watchnProtect status for ticket ${ticketId}:`, error);
      return false;
    }
  }

  // Method to update watchnProtect status for a ticket
  async updateWatchnProtectStatus(ticketId: number, watchnProtect: boolean): Promise<void> {
    if (this.watchnProtectLoading.has(ticketId)) {
      return; // Prevent multiple simultaneous updates
    }

    this.watchnProtectLoading.add(ticketId);

    try {
      const requestBody = {
        watchnProtect: watchnProtect,
        updatedBy: 1
      };

      await this.http.patch(`${environment.apiUrl}/diggers/ticket/${ticketId}/watchn-protect`, requestBody).toPromise();

      // Update the local ticket data
      this.updateLocalTicketWatchnProtect(ticketId, watchnProtect);

      this.snackBar.open(`Watch 'n Protect ${watchnProtect ? 'enabled' : 'disabled'} for ticket`, 'Close', { duration: 2000 });
    } catch (error) {
      console.error(`Error updating watchnProtect status for ticket ${ticketId}:`, error);
      this.snackBar.open('Error updating Watch \'n Protect status', 'Close', { duration: 3000, panelClass: ['error-snackbar'] });
    } finally {
      this.watchnProtectLoading.delete(ticketId);
    }
  }

  // Helper method to update local ticket data with new watchnProtect status
  private updateLocalTicketWatchnProtect(ticketId: number, watchnProtect: boolean): void {
    // Update in spotting routes
    this.spottingRoutes.forEach(route => {
      route.tickets.forEach(ticket => {
        if (ticket.ticketId === ticketId) {
          ticket.watchnProtect = watchnProtect;
        }
      });
    });

    // Update in concrete routes
    this.concreteRoutes.forEach(route => {
      route.tickets.forEach(ticket => {
        if (ticket.ticketId === ticketId) {
          ticket.watchnProtect = watchnProtect;
        }
      });
    });

    // Update in asphalt routes
    this.asphaltRoutes.forEach(route => {
      route.tickets.forEach(ticket => {
        if (ticket.ticketId === ticketId) {
          ticket.watchnProtect = watchnProtect;
        }
      });
    });

    // Update in ready tickets
    this.spotReadyTickets.forEach(ticket => {
      if (ticket.ticketid === ticketId) {
        ticket.watchnProtect = watchnProtect;
      }
    });

    this.asphaltReadyTickets.forEach(ticket => {
      if (ticket.ticketid === ticketId) {
        ticket.watchnProtect = watchnProtect;
      }
    });

    this.concreteReadyTickets.forEach(ticket => {
      if (ticket.ticketid === ticketId) {
        ticket.watchnProtect = watchnProtect;
      }
    });

    // Update in tickets with issues
    this.ticketsWithIssues.forEach(ticket => {
      if (ticket.ticketId === ticketId) {
        ticket.watchnProtect = watchnProtect;
      }
    });
  }

  // Method to handle checkbox change
  onWatchnProtectChange(ticketId: number, event: any): void {
    const checked = event.checked;
    this.updateWatchnProtectStatus(ticketId, checked);
  }

  // Method to load watchnProtect status for all tickets
  private async loadWatchnProtectStatusForTickets(): Promise<void> {
    const allTickets: Array<{ ticketId: number; type: string }> = [];

    // Collect all ticket IDs from routes
    this.spottingRoutes.forEach(route => {
      route.tickets.forEach(ticket => {
        allTickets.push({ ticketId: ticket.ticketId, type: 'route' });
      });
    });

    this.concreteRoutes.forEach(route => {
      route.tickets.forEach(ticket => {
        allTickets.push({ ticketId: ticket.ticketId, type: 'route' });
      });
    });

    this.asphaltRoutes.forEach(route => {
      route.tickets.forEach(ticket => {
        allTickets.push({ ticketId: ticket.ticketId, type: 'route' });
      });
    });

    // Collect all ticket IDs from ready tickets
    this.spotReadyTickets.forEach(ticket => {
      allTickets.push({ ticketId: ticket.ticketid, type: 'ready' });
    });

    this.asphaltReadyTickets.forEach(ticket => {
      allTickets.push({ ticketId: ticket.ticketid, type: 'ready' });
    });

    this.concreteReadyTickets.forEach(ticket => {
      allTickets.push({ ticketId: ticket.ticketid, type: 'ready' });
    });

    // Load watchnProtect status for each ticket
    const promises = allTickets.map(async ({ ticketId, type }) => {
      try {
        const status = await this.getWatchnProtectStatus(ticketId);

        // Update the local data based on ticket type
        if (type === 'route') {
          this.updateLocalTicketWatchnProtect(ticketId, status);
        } else if (type === 'ready') {
          this.updateLocalTicketWatchnProtect(ticketId, status);
        }
      } catch (error) {
        console.error(`Error loading watchnProtect status for ticket ${ticketId}:`, error);
      }
    });

    // Wait for all statuses to be loaded
    await Promise.all(promises);
  }
}
