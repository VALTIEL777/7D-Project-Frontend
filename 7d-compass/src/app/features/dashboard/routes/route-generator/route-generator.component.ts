import { Component, HostListener, OnInit, ViewChild, TemplateRef } from '@angular/core';
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
import { PlusButtonComponent } from '../../../../shared/plus-button/plus-button.component';
import { BaseDashboardComponent } from '../../../../shared/base-dashboard.component';
import { FilterService } from '../../../../core/services/filter.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';

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
    MatSelectModule
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
  newRouteStartDate: string = '';
  private dialogRef: any;

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

  constructor(filterService: FilterService, private http: HttpClient, private dialog: MatDialog) {
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

  // Load spotting routes from API
  loadSpottingRoutes() {
    this.isLoadingSpottingRoutes = true;
    this.http.get<RoutesResponse>(`${environment.apiUrl}/routes/spotting`).subscribe({
      next: (response) => {
        this.spottingRoutes = response.routes;
        this.isLoadingSpottingRoutes = false;
        this.loadData(); // Refresh filtered data
      },
      error: (error) => {
        console.error('Error loading spotting routes:', error);
        this.isLoadingSpottingRoutes = false;
        // Fallback to empty array if API fails
        this.spottingRoutes = [];
        this.loadData(); // Refresh filtered data
      }
    });
  }

  // Load concrete routes from API
  loadConcreteRoutes() {
    this.isLoadingConcreteRoutes = true;
    this.http.get<RoutesResponse>(`${environment.apiUrl}/routes/concrete`).subscribe({
      next: (response) => {
        this.concreteRoutes = response.routes;
        this.isLoadingConcreteRoutes = false;
        this.loadData(); // Refresh filtered data
      },
      error: (error) => {
        console.error('Error loading concrete routes:', error);
        this.isLoadingConcreteRoutes = false;
        // Fallback to empty array if API fails
        this.concreteRoutes = [];
        this.loadData(); // Refresh filtered data
      }
    });
  }

  // Load asphalt routes from API
  loadAsphaltRoutes() {
    this.isLoadingAsphaltRoutes = true;
    this.http.get<RoutesResponse>(`${environment.apiUrl}/routes/asphalt`).subscribe({
      next: (response) => {
        this.asphaltRoutes = response.routes;
        this.isLoadingAsphaltRoutes = false;
        this.loadData(); // Refresh filtered data
      },
      error: (error) => {
        console.error('Error loading asphalt routes:', error);
        this.isLoadingAsphaltRoutes = false;
        // Fallback to empty array if API fails
        this.asphaltRoutes = [];
        this.loadData(); // Refresh filtered data
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

  drop(event: CdkDragDrop<any[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      // Prevent routes from becoming empty
      const isSourceRoute =
        this.spottingRoutes.some(route => route.tickets === event.previousContainer.data) ||
        this.concreteRoutes.some(route => route.tickets === event.previousContainer.data) ||
        this.asphaltRoutes.some(route => route.tickets === event.previousContainer.data);

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
    }

    // Force Angular to detect changes by reassigning the arrays
    this.spottingRoutes = [...this.spottingRoutes];
    this.concreteRoutes = [...this.concreteRoutes];
    this.asphaltRoutes = [...this.asphaltRoutes];
    this.locationsWithoutRoute = [...this.locationsWithoutRoute];
    this.locationsOnHoldOff = [...this.locationsOnHoldOff];
  }

  saveChanges() {
    console.log('Spotting Routes:', this.spottingRoutes);
    console.log('Concrete Routes:', this.concreteRoutes);
    console.log('Asphalt Routes:', this.asphaltRoutes);
    // Here you would implement the logic to save the changes, e.g., send to a backend service
    alert('Changes saved! Check console for updated routes.');
  }

  resetLists() {
    this.spottingRoutes = [...this.initialSpottingRoutes];
    this.concreteRoutes = [...this.initialConcreteRoutes];
    this.asphaltRoutes = [...this.initialAsphaltRoutes];
    alert('Lists have been reset!');
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
    if (!this.newRouteType || !this.newRouteStartDate) {
      alert('Please fill in all required fields');
      return;
    }

    // Create new route object
    const newRoute = {
      routeType: this.newRouteType,
      startDate: this.newRouteStartDate
    };

    console.log('Generating new route:', newRoute);

    // Determine the correct API endpoint based on route type
    let endpoint = '';
    switch (this.newRouteType) {
      case 'spotting':
        endpoint = `${environment.apiUrl}/routes/optimize/spotting`;
        break;
      case 'concrete':
        endpoint = `${environment.apiUrl}/routes/optimize/concrete`;
        break;
      case 'asphalt':
        endpoint = `${environment.apiUrl}/routes/optimize/asphalt`;
        break;
      default:
        alert('Invalid route type selected');
        return;
    }

    // Make API call to generate the route
    this.http.post(endpoint, {
      startDate: this.newRouteStartDate
    }).subscribe({
      next: (response) => {
        console.log('Route generation successful:', response);
        this.closeGenerateRouteDialog();
        alert('Route generation completed successfully!');

        // Refresh the routes data
        this.loadSpottingRoutes();
        this.loadConcreteRoutes();
        this.loadAsphaltRoutes();
      },
      error: (error) => {
        console.error('Error generating route:', error);
        alert('Error generating route. Please try again.');
      }
    });

    // Reset form
    this.newRouteType = '';
    this.newRouteStartDate = '';
  }
}
