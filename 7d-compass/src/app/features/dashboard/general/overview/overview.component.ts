import { Component, HostListener, OnInit } from '@angular/core';
import { DashboardLayoutComponent } from '../../../../shared/dashboard-layout/dashboard-layout.component';
import { CardWithButtonComponent } from '../../../../shared/card-with-button/card-with-button.component';
import { MatTableModule } from '@angular/material/table';
import { MatDividerModule } from '@angular/material/divider';
import { CommonModule } from '@angular/common';
import { MATERIAL_MODULES } from '../../../../material';
import { MatTabsModule } from '@angular/material/tabs';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { BaseDashboardComponent } from '../../../../shared/base-dashboard.component';
import { FilterService } from '../../../../core/services/filter.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';

// Interface for expiring tickets
interface ExpiringTicket {
  ticketId: number;
  ticketCode: string;
  contractNumber: string;
  amountToPay: number;
  ticketType: string;
  daysOutstanding: number;
  comment7d: string;
  expireDate: string;
  daysUntilExpiry: number;
  addresses: string;
}

// Interface for expired tickets
interface ExpiredTicket {
  ticketId: number;
  ticketCode: string;
  contractNumber: string;
  amountToPay: number;
  ticketType: string;
  daysOutstanding: number;
  comment7d: string | null;
  expireDate: string | null;
  daysExpired: number | null;
  addresses: string;
  taskStatusNames: string;
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

// Interface for dashboard statistics
interface DashboardStatistics {
  success: boolean;
  message: string;
  data: {
    overview: {
      newTickets: number;
      ticketsInSchedule: number;
      ticketsHoldOff: number;
      totalActiveTickets: number;
      completedTickets: number;
    };
    specific: {
      completedWithoutInvoices: number;
      totalCompleted: number;
      percentageWithoutInvoices: number;
      nonExpiredPermitsNoDigger: number;
      ticketsWithCarryover: number;
    };
    histograms: {
      monthly: any[];
      weekly: any[];
      daily: any[];
    };
    detailed: {
      totalTickets: number;
      newTickets: number;
      ticketsInSchedule: number;
      ticketsHoldOff: number;
      completedTickets: number;
      needsPermitExtension: number;
      willBeScheduledSpring: number;
      diggerApply: number;
      onProgress: number;
      hmaOnProgress: number;
      ticketsWithPermits: number;
      expiredPermits: number;
      ticketsWithAddresses: number;
      ticketsWithTaskStatuses: number;
    };
    trends: any[];
  };
}

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
export class OverviewComponent extends BaseDashboardComponent implements OnInit {
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

  expiringTickets: ExpiringTicket[] = [];
  isLoadingExpiringTickets = false;

  expiredTickets: ExpiredTicket[] = [];
  isLoadingExpiredTickets = false;

  ticketsWithIssues: TicketWithIssue[] = [];
  isLoadingTicketsWithIssues = false;

  // Dashboard statistics
  dashboardStats: DashboardStatistics | null = null;
  isLoadingDashboardStats = false;

  constructor(filterService: FilterService, private http: HttpClient) {
    super(filterService);
    this.selectRange(this.selectedRange);
    this.checkMobile();
  }

  override ngOnInit() {
    super.ngOnInit();
    this.updateDisplayedColumns();
    this.loadDashboardStatistics();
    this.loadExpiringTickets();
    this.loadExpiredTickets();
    this.loadTicketsWithIssues();
  }

  protected override loadData(): void {
    // Initialize data for filtering
    this.allData = [...this.ticketData];
    this.filteredData = [...this.allData];
  }

  // Override text search to include location and phase
  protected override matchesTextSearch(item: any, searchTerm: string): boolean {
    const searchableFields = ['location', 'phase', 'status'];

    return searchableFields.some(field => {
      const value = this.getNestedValue(item, field);
      if (value) {
        return String(value).toLowerCase().includes(searchTerm);
      }
      return false;
    });
  }

  // Override date range to use startDate
  protected override matchesDateRange(item: any, cutoffDate: Date): boolean {
    const dateValue = item.startDate;
    if (dateValue) {
      const itemDate = new Date(dateValue);
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
      this.displayedColumns = ['location', 'phase', 'status', 'startDate'];
    }
  }

  selectRange(range: 'Year' | 'Month' | 'Week') {
    this.selectedRange = range;
    this.chartData = this.dataSets[range];
  }

  // Getter for filtered ticket data
  get filteredTicketData() {
    return this.filteredData;
  }

  // Load expiring tickets from API
  loadExpiringTickets() {
    this.isLoadingExpiringTickets = true;
    this.http.get<ExpiringTicket[]>(`${environment.apiUrl}/tickets/expiring/7days`).subscribe({
      next: (tickets) => {
        this.expiringTickets = tickets;
        this.isLoadingExpiringTickets = false;
      },
      error: (error) => {
        console.error('Error loading expiring tickets:', error);
        this.isLoadingExpiringTickets = false;
        // Fallback to empty array if API fails
        this.expiringTickets = [];
      }
    });
  }

  // Load expired tickets from API
  loadExpiredTickets() {
    this.isLoadingExpiredTickets = true;
    this.http.get<ExpiredTicket[]>(`${environment.apiUrl}/tickets/expired`).subscribe({
      next: (tickets) => {
        this.expiredTickets = tickets;
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

  // Load dashboard statistics from API
  loadDashboardStatistics() {
    this.isLoadingDashboardStats = true;
    this.http.get<DashboardStatistics>(`${environment.apiUrl}/statistics/dashboard`).subscribe({
      next: (response) => {
        this.dashboardStats = response;
        this.isLoadingDashboardStats = false;
      },
      error: (error) => {
        console.error('Error loading dashboard statistics:', error);
        this.isLoadingDashboardStats = false;
        // Fallback to null if API fails
        this.dashboardStats = null;
      }
    });
  }

  // Helper method to format address from addressDetails
  formatAddress(ticket: TicketWithIssue): string {
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
}
