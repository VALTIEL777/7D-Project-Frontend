import { Component, HostListener, OnInit } from '@angular/core';
import { DashboardLayoutComponent } from "../../../../shared/dashboard-layout/dashboard-layout.component";
import { CardWithButtonComponent } from "../../../../shared/card-with-button/card-with-button.component";
import { MatTableModule } from "@angular/material/table";
import { CommonModule } from "@angular/common";
import { MatDividerModule } from '@angular/material/divider';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { PlusButtonComponent } from '../../../../shared/plus-button/plus-button.component';
import { BaseDashboardComponent } from '../../../../shared/base-dashboard.component';
import { FilterService } from '../../../../core/services/filter.service';

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
    PlusButtonComponent
  ],
  templateUrl: './route-generator.component.html',
  styleUrl: './route-generator.component.scss'
})
export class RouteGeneratorComponent extends BaseDashboardComponent implements OnInit {
  isMobile: boolean = false;

  activeRoutes = [
    { code: 'RTE-001', details: ['2837 N Froid Street', '123 Main St', '456 Oak Ave', '789 Pine Ln', '101 Elm Rd', '111 Elm Rd', '222 Oak Dr'] },
    { code: 'RTE-002', details: ['2837 N Froid Street', '123 Main St', '456 Oak Ave', '789 Pine Ln', '101 Elm Rd'] },
  ];
  generatedRoutes = [
    { code: 'RTE-003', details: ['2837 N Froid Street', '123 Main St', '456 Oak Ave', '789 Pine Ln', '101 Elm Rd'] },
    { code: 'RTE-004', details: ['2837 N Froid Street', '123 Main St', '456 Oak Ave', '789 Pine Ln', '101 Elm Rd'] },
    { code: 'RTE-005', details: ['2837 N Froid Street', '123 Main St', '456 Oak Ave', '789 Pine Ln', '101 Elm Rd'] },
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

  private initialActiveRoutes: any[] = [];
  private initialGeneratedRoutes: any[] = [];

  constructor(filterService: FilterService) {
    super(filterService);
    this.checkMobile();
    this.initialActiveRoutes = [...this.activeRoutes];
    this.initialGeneratedRoutes = [...this.generatedRoutes];
  }

  override ngOnInit() {
    super.ngOnInit();
    this.updateDisplayedColumns();
  }

  protected override loadData(): void {
    // Initialize data for filtering - combine all route-related data
    const allRouteData = [
      ...this.activeRoutes.map(route => ({ ...route, type: 'active' })),
      ...this.generatedRoutes.map(route => ({ ...route, type: 'generated' })),
      ...this.locationsWithoutRoute.map(location => ({ code: location, details: [location], type: 'without-route' })),
      ...this.locationsOnHoldOff.map(item => ({ code: item.location, details: [item.location], reason: item.reason, type: 'on-hold' })),
      ...this.ticketData.map(ticket => ({ ...ticket, type: 'ticket' }))
    ];

    this.allData = allRouteData;
    this.filteredData = [...this.allData];
  }

  // Override text search to include route and location fields
  protected override matchesTextSearch(item: any, searchTerm: string): boolean {
    const searchableFields = ['code', 'location', 'phase', 'status', 'reason'];

    return searchableFields.some(field => {
      const value = this.getNestedValue(item, field);
      if (value) {
        return String(value).toLowerCase().includes(searchTerm);
      }
      return false;
    }) ||
    // Also search in details arrays
    (item.details && Array.isArray(item.details) &&
     item.details.some((detail: string) => detail.toLowerCase().includes(searchTerm)));
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
  get filteredActiveRoutes() {
    return this.filteredData.filter(item => item.type === 'active');
  }

  get filteredGeneratedRoutes() {
    return this.filteredData.filter(item => item.type === 'generated');
  }

  get filteredLocationsWithoutRoute() {
    return this.filteredData.filter(item => item.type === 'without-route').map(item => item.code);
  }

  get filteredLocationsOnHoldOff() {
    return this.filteredData.filter(item => item.type === 'on-hold').map(item => ({
      location: item.code,
      reason: item.reason
    }));
  }

  drop(event: CdkDragDrop<any[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      // Prevent routes from becoming empty
      const isSourceActiveOrGeneratedRoute =
        this.activeRoutes.some(route => route.details === event.previousContainer.data) ||
        this.generatedRoutes.some(route => route.details === event.previousContainer.data);

      if (isSourceActiveOrGeneratedRoute && event.previousContainer.data.length === 1) {
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
    this.activeRoutes = [...this.activeRoutes];
    this.generatedRoutes = [...this.generatedRoutes];
    this.locationsWithoutRoute = [...this.locationsWithoutRoute];
    this.locationsOnHoldOff = [...this.locationsOnHoldOff];
  }

  saveChanges() {
    console.log('Active Routes:', this.activeRoutes);
    console.log('Generated Routes:', this.generatedRoutes);
    // Here you would implement the logic to save the changes, e.g., send to a backend service
    alert('Changes saved! Check console for updated routes.');
  }

  resetLists() {
    this.activeRoutes = [...this.initialActiveRoutes];
    this.generatedRoutes = [...this.initialGeneratedRoutes];
    alert('Lists have been reset!');
  }
}
