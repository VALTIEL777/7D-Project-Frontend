import { Component, EventEmitter, Output } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { SearchBarComponent } from '../search-bar/search-bar.component';
import { filter } from 'rxjs/operators';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDialog } from '@angular/material/dialog';
import { SearchDialogComponent } from '../search-dialog/search-dialog.component';
import { MatChipsModule } from '@angular/material/chips';
import { FilterService, FilterOption, FilterState, DateRangeFilter } from '../../core/services/filter.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-title-bar',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatMenuModule,
    MatToolbarModule,
    MatFormFieldModule,
    MatInputModule,
    SearchBarComponent,
    MatBadgeModule,
    MatChipsModule,
    FormsModule,
  ],
  templateUrl: './title-bar.component.html',
  styleUrl: './title-bar.component.scss',
})
export class TitleBarComponent {
  @Output() toggleSidebar = new EventEmitter<void>();

  hasUnreadNotifications: boolean = true;
  pageTitle: string = 'Dashboard';
  notificationCount: number = 11;
  showFilterBar: boolean = false;

  // Filter properties
  textSearch: string = '';
  selectedDateRange: string = '';
  dateRangeOptions: DateRangeFilter[] = [];

  // Custom filter labels for different pages
  customFilterLabels: { searchLabel: string; dateLabel: string } = {
    searchLabel: 'Search by name or content',
    dateLabel: 'Date Range:'
  };

  notifications = [
    {
      id: 1,
      message: 'New user signed up',
      type: 'user',
      read: false,
      data: { name: 'Alice Johnson', role: 'Admin', city: 'New York' },
    },
    {
      id: 2,
      message: 'Invoice #123 generated',
      type: 'invoice',
      read: false,
      data: { id: 123, customer: 'Bob Smith', total: 250.75 },
    },
    {
      id: 3,
      message: 'Route updated',
      type: 'route',
      read: false,
      data: { id: 'R23', origin: 'Chicago', destination: 'Houston' },
    },
    {
      id: 4,
      message: 'Payment received for invoice #456',
      type: 'invoice',
      read: false,
      data: { id: 456, customer: 'Charlie Brown', total: 420.5, status: 'paid' },
    },
    {
      id: 5,
      message: 'New support ticket created',
      type: 'ticket',
      read: false,
      data: { id: 'TKT-789', subject: 'Login issues', priority: 'high' },
    },
    {
      id: 6,
      message: 'Maintenance scheduled for tomorrow',
      type: 'system',
      read: false,
      data: { event: 'maintenance', startTime: '2023-11-15 02:00', duration: '2 hours' },
    },
    {
      id: 7,
      message: 'New comment on document #DOC-101',
      type: 'document',
      read: false,
      data: { id: 'DOC-101', title: 'Project Proposal', commentBy: 'David Wilson' },
    },
    {
      id: 8,
      message: 'Inventory low on Product X',
      type: 'inventory',
      read: false,
      data: { product: 'Product X', currentStock: 5, threshold: 10 },
    },
    {
      id: 9,
      message: 'New team member joined',
      type: 'user',
      read: false,
      data: { name: 'Eva Green', role: 'Developer', department: 'Engineering' },
    },
    {
      id: 10,
      message: 'Server backup completed',
      type: 'system',
      read: false,
      data: { event: 'backup', status: 'completed', size: '45GB' },
    },
    {
      id: 11,
      message: 'New feature request submitted',
      type: 'ticket',
      read: false,
      data: { id: 'TKT-202', subject: 'Dark mode implementation', priority: 'medium' },
    },
  ];

  constructor(
    private router: Router,
    private dialog: MatDialog,
    private filterService: FilterService
  ) {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.setPageTitle(this.router.url);
      });

    // Initialize date range options
    this.dateRangeOptions = this.filterService.getDateRangeOptions();

    // Initialize filter values from service
    this.textSearch = this.filterService.currentTextSearch;
    this.selectedDateRange = this.filterService.currentDateRange;

    // Subscribe to filter changes
    this.filterService.textSearch$.subscribe(search => {
      this.textSearch = search;
    });

    this.filterService.dateRange$.subscribe(range => {
      this.selectedDateRange = range;
    });
  }

  private setPageTitle(url: string) {
    const routeMap: Record<string, string> = {
      '/rtr-processing': 'RTR Processing',
      '/crew-generation': 'Crew Generation',
      '/photo-evidence': 'Photo Evidence',
      '/route-generator': 'Route Generator',
      '/route-history': 'Route History',
      '/route-tracker': 'Route Tracker',
      '/income': 'Income',
      '/fines-penalties': 'Fines & Penalties',
      '/users': 'Users',
      '/contract-units': 'Contract Units',
      '/payments': 'Payments',
      '/invoices': 'Invoices',
      '/fines': 'Fines',
      '/supervisors': 'Supervisors',
      '/inventory': 'Inventory',
      '/suppliers': 'Suppliers',
      '/equipment': 'Equipment',
      '/crews': 'Crews',
      '/ticket': 'Ticket',
    };
    this.pageTitle = routeMap[url] || 'Dashboard';

    // Set custom filter labels based on the current page
    this.setCustomFilterLabels(url);
  }

  private setCustomFilterLabels(url: string) {
    const filterLabelsMap: Record<string, { searchLabel: string; dateLabel: string }> = {
      '/overview': {
        searchLabel: 'Search by location, phase, or status',
        dateLabel: 'Start Date Range:'
      },
      '/rtr-processing': {
        searchLabel: 'Search by file name, status, or description',
        dateLabel: 'Upload Date Range:'
      },
      '/route-generator': {
        searchLabel: 'Search by route code, location, or status',
        dateLabel: 'Creation Date Range:'
      },
      '/users': {
        searchLabel: 'Search by name, username, email, or role',
        dateLabel: 'Registration Date Range:'
      },
      '/invoices': {
        searchLabel: 'Search by invoice number, ticket ID, or status',
        dateLabel: 'Invoice Date Range:'
      },
      '/fines': {
        searchLabel: 'Search by fine number, ticket ID, or status',
        dateLabel: 'Fine Date Range:'
      },
      '/supervisors': {
        searchLabel: 'Search by name, email, role, or assigned quadrants',
        dateLabel: 'Assignment Date Range:'
      },
      '/inventory': {
        searchLabel: 'Search by item name, supplier, or category',
        dateLabel: 'Inventory Date Range:'
      },
      '/suppliers': {
        searchLabel: 'Search by supplier name, phone, or email',
        dateLabel: 'Supplier Date Range:'
      },
      '/equipment': {
        searchLabel: 'Search by equipment name, type, or status',
        dateLabel: 'Equipment Date Range:'
      },
      '/crews': {
        searchLabel: 'Search by crew type, team members, or equipment',
        dateLabel: 'Crew Date Range:'
      },
      '/ticket': {
        searchLabel: 'Search by ticket code, contract unit, or status',
        dateLabel: 'Ticket Date Range:'
      },
      '/payments': {
        searchLabel: 'Search by payment number or status',
        dateLabel: 'Payment Date Range:'
      },
      '/contract-units': {
        searchLabel: 'Search by item code, name, or zone',
        dateLabel: 'Contract Date Range:'
      },
      '/income': {
        searchLabel: 'Search by ticket number, crew, or invoice number',
        dateLabel: 'Income Date Range:'
      },
      '/fines-penalties': {
        searchLabel: 'Search by location, ticket, or fine number',
        dateLabel: 'Fine Date Range:'
      }
    };

    // Set default labels if no specific ones are found
    this.customFilterLabels = filterLabelsMap[url] || {
      searchLabel: 'Search by name or content',
      dateLabel: 'Date Range:'
    };
  }

  onNotificationsOpened() {
    if (this.hasUnreadNotifications) {
      this.hasUnreadNotifications = false;
      this.notifications = this.notifications.map(notif => ({
        ...notif,
        read: true
      }));
      this.notificationCount = 0;

      // Force change detection by creating a new array reference
      this.notifications = [...this.notifications];
    }
  }

  addNewNotification(newNotification: any) {
    this.notifications = [...this.notifications, { ...newNotification, read: false }];
    this.notificationCount++;
    this.hasUnreadNotifications = true;
  }

  openNotificationDialog(notification: any): void {
    if (!notification.data) {
      console.error('Notification data is missing');
      return;
    }

    this.dialog.open(SearchDialogComponent, {
      width: '600px',
      data: {
        title: this.getNotificationTitle(notification),
        data: {
          ...notification.data,
          type: notification.type,
        },
        excludedFields: [],
      },
    });
  }

  getNotificationIcon(type: string): string {
    const iconMap: Record<string, string> = {
      user: 'person',
      invoice: 'receipt',
      route: 'alt_route',
      ticket: 'support_agent',
      system: 'settings',
      document: 'description',
      inventory: 'inventory_2',
    };
    return iconMap[type] || 'notifications';
  }

  getNotificationColor(type: string): string {
    const colorMap: Record<string, string> = {
      user: '#4CAF50',
      invoice: '#2196F3',
      route: '#FF9800',
      ticket: '#9C27B0',
      system: '#607D8B',
      document: '#795548',
      inventory: '#F44336',
    };
    return colorMap[type] || '#9E9E9E';
  }

  private getNotificationTitle(notification: any): string {
    switch (notification.type) {
      case 'user': return `User Notification: ${notification.message}`;
      case 'invoice': return `Invoice Notification: ${notification.message}`;
      case 'route': return `Route Notification: ${notification.message}`;
      case 'ticket': return `Ticket Notification: ${notification.message}`;
      case 'system': return `System Notification: ${notification.message}`;
      case 'document': return `Document Notification: ${notification.message}`;
      case 'inventory': return `Inventory Notification: ${notification.message}`;
      default: return notification.message;
    }
  }

  changeProfilePicture() {
    // Removed debug log
  }

  editUserInfo() {
    // Removed debug log
  }

  logout() {
    // Removed debug log
  }

  isMobile: boolean = false;

  ngOnInit() {
    if (typeof window !== 'undefined') {
      this.checkScreenSize();
      window.addEventListener('resize', () => this.checkScreenSize());
    }
  }

  checkScreenSize() {
    if (typeof window !== 'undefined') {
      this.isMobile = window.innerWidth < 768;
    }
  }

  toggleFilterBar() {
    this.showFilterBar = !this.showFilterBar;

    // Clear all filters when hiding the filter bar
    if (!this.showFilterBar) {
      this.clearAllFilters();
    } else {
      // Ensure filter values are synchronized when showing the filter bar
      this.textSearch = this.filterService.currentTextSearch;
      this.selectedDateRange = this.filterService.currentDateRange;
    }
  }

  // Text search methods
  onTextSearchChange() {
    this.filterService.setTextSearch(this.textSearch);
  }

  // Date range methods
  onDateRangeChange() {
    this.filterService.setDateRange(this.selectedDateRange);
  }

  clearAllFilters() {
    this.filterService.clearAllFilters();
    this.textSearch = '';
    this.selectedDateRange = '';
  }

  getActiveFilterCount(): number {
    return this.filterService.getActiveFilterCount();
  }
}
