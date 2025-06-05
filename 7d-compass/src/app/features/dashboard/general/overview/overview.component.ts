import { Component, HostListener, OnInit } from '@angular/core';
import { DashboardLayoutComponent } from '../../../../shared/dashboard-layout/dashboard-layout.component';
import { CardWithButtonComponent } from '../../../../shared/card-with-button/card-with-button.component';
import { MatTableModule } from '@angular/material/table';
import { MatDividerModule } from '@angular/material/divider';
import { CommonModule } from '@angular/common';
import { MATERIAL_MODULES } from '../../../../material';
import { MatTabsModule } from '@angular/material/tabs';
import { NgxChartsModule } from '@swimlane/ngx-charts';

@Component({
  selector: 'app-overview',
  imports: [
    DashboardLayoutComponent,
    CardWithButtonComponent,
    MatTableModule,
    MatDividerModule,
    CommonModule,
    MATERIAL_MODULES,
    MatTabsModule,
    NgxChartsModule

  ],
  templateUrl: './overview.component.html',
  styleUrl: './overview.component.scss',
})
export class OverviewComponent implements OnInit {
  isMobile: boolean = false;

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


  timeRanges = ['Year', 'Month', 'Week'] as const;
  selectedRange: 'Year' | 'Month' | 'Week' = 'Week';

  chartData: any[] = [];

  colorScheme = {
    domain: ['#5AA454']
  };

  dataSets = {
    Week: [
      { name: 'Mon', value: 8 },
      { name: 'Tue', value: 6 },
      { name: 'Wed', value: 10 },
      { name: 'Thu', value: 5 },
      { name: 'Fri', value: 12 }
    ],
    Month: [
      { name: 'Week 1', value: 25 },
      { name: 'Week 2', value: 30 },
      { name: 'Week 3', value: 18 },
      { name: 'Week 4', value: 40 }
    ],
    Year: [
      { name: 'Jan', value: 120 },
      { name: 'Feb', value: 98 },
      { name: 'Mar', value: 135 },
      { name: 'Apr', value: 110 },
      { name: 'May', value: 150 }
    ]
  };

  constructor() {
    this.selectRange(this.selectedRange);
    this.checkMobile();
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

  selectRange(range: 'Year' | 'Month' | 'Week') {
    this.selectedRange = range;
    this.chartData = this.dataSets[range];
  }
  expiredPermits = [
    { code: 'EXP-001', date: '2025-06-01' },
    { code: 'EXP-002', date: '2025-05-30' },
    { code: 'EXP-003', date: '2025-05-28' },
    { code: 'EXP-004', date: '2025-05-25' },
    { code: 'EXP-005', date: '2025-05-20' }
  ];

  nearToExpirePermits = [
    { code: 'NEXP-101', date: '2025-06-10' },
    { code: 'NEXP-102', date: '2025-06-12' },
    { code: 'NEXP-103', date: '2025-06-15' },
    { code: 'NEXP-104', date: '2025-06-18' },
    { code: 'NEXP-105', date: '2025-06-19' }
  ];

unresolvedIssues = [
  { location: 'Chicago', comment: 'Power outage in sector 7G' },
  { location: 'New York', comment: 'Broken streetlight on 5th Ave' },
  { location: 'Los Angeles', comment: 'Pothole causing traffic delays' },
  { location: 'Chicago', comment: 'Power outage in sector 7G' },
  { location: 'New York', comment: 'Broken streetlight on 5th Ave' },
  { location: 'Los Angeles', comment: 'Pothole causing traffic delays' }
];

}
