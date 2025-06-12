import { Component, HostListener, OnInit } from '@angular/core';
import { DashboardLayoutComponent } from "../../../../shared/dashboard-layout/dashboard-layout.component";
import { CardWithButtonComponent } from "../../../../shared/card-with-button/card-with-button.component";
import { MatTableModule } from "@angular/material/table";
import { CommonModule } from "@angular/common";
import { DatePipe } from '@angular/common';
import { MatDividerModule } from '@angular/material/divider';
import { SearchBarComponent } from '../../../../shared/search-bar/search-bar.component';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { PlusButtonComponent } from '../../../../shared/plus-button/plus-button.component';

@Component({
  selector: 'app-route-generator',
  imports: [
    DashboardLayoutComponent,
    CardWithButtonComponent,
    MatTableModule,
    CommonModule,
    DatePipe,
    MatDividerModule,
    SearchBarComponent,
    DragDropModule,
    MatButtonModule,
    PlusButtonComponent
  ],
  templateUrl: './route-generator.component.html',
  styleUrl: './route-generator.component.scss'
})
export class RouteGeneratorComponent implements OnInit {
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

  constructor() {
    this.checkMobile();
    this.initialActiveRoutes = [...this.activeRoutes];
    this.initialGeneratedRoutes = [...this.generatedRoutes];
  }

  ngOnInit() {
    this.updateDisplayedColumns();
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
