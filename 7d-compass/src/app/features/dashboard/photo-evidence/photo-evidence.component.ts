import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { DashboardLayoutComponent } from '../../../shared/dashboard-layout/dashboard-layout.component';
import { CardWithButtonComponent } from '../../../shared/card-with-button/card-with-button.component';
import { DataTableComponent } from '../../../shared/data-table/data-table.component';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { BaseDashboardComponent } from '../../../shared/base-dashboard.component';
import { FilterService } from '../../../core/services/filter.service';
import { PhotoEvidenceService } from '../../../core/services/route/photoevidence.service';

interface PhotoEvidence {
  photoId: number;
  name: string;
  latitude: number;
  longitude: number;
  photo: string;
  date: string;
  comment: string;
  photoURL: string;
  createdAt: string;
  taskStatusName?: string; // Optional property added for context
  loaded?: boolean; // Whether the photo has been loaded as blob
  error?: boolean; // Whether there was an error loading the photo
}

interface TaskStatus {
  taskStatusId: number;
  name: string;
  description: string;
  startingDate: string;
  endingDate: string;
  observation: string;
  crewId: number;
  photoEvidence: PhotoEvidence[];
}

interface Address {
  addressId: number;
  addressNumber: string;
  addressCardinal: string;
  addressStreet: string;
  addressSuffix: string;
  fullAddress: string;
}

interface Ticket {
  ticketId: number;
  ticketCode: string;
  contractNumber: string;
  amountToPay: number;
  ticketType: string;
  quantity: number;
  daysOutstanding: number;
  comment7d: string;
  addresses: Address[];
  taskStatuses: TaskStatus[];
}

interface Incident {
  incidentId: number;
  incidentName: string;
  earliestRptDate: string;
  totalTickets: number;
  totalPhotos: number;
  totalAddresses: number;
  tickets: Ticket[];
}

interface GalleryResponse {
  success: boolean;
  message: string;
  summary: {
    totalIncidents: number;
    totalTickets: number;
    totalPhotos: number;
    totalAddresses: number;
    incidentsWithPhotos: number;
    incidentsWithAddresses: number;
  };
  data: Incident[];
}

interface ColumnDefinition {
  name: string;
  header: string;
  cell: (element: any) => string;
  isActionColumn?: boolean;
  sortable?: boolean;
  sortValue?: (element: any) => any;
}

@Component({
  selector: 'app-photo-evidence',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    DashboardLayoutComponent,
    CardWithButtonComponent,
    DataTableComponent,
  ],
  templateUrl: './photo-evidence.component.html',
  styleUrl: './photo-evidence.component.scss'
})
export class PhotoEvidenceComponent extends BaseDashboardComponent implements OnInit {
  loading = false;
  error: string | null = null;
  galleryData: Incident[] = [];
  selectedTicket: Ticket | null = null;
  selectedPhotos: PhotoEvidence[] = [];
  totalCount = 0;
  currentPage = 1;
  pageSize = 10;

  columns: ColumnDefinition[] = [
    {
      name: 'mxNumber',
      header: 'MX Number',
      cell: (ticket: any) => ticket.incidentName || 'N/A'
    },
    {
      name: 'ticketNumber',
      header: 'Ticket Number',
      cell: (ticket: any) => ticket.ticketCode || 'N/A'
    },
    {
      name: 'address',
      header: 'Address',
      cell: (ticket: any) => {
        if (ticket.addresses && ticket.addresses.length > 0) {
          return ticket.addresses[0].fullAddress || 'N/A';
        }
        return 'N/A';
      }
    },
    {
      name: 'show',
      header: 'Actions',
      cell: (ticket: any) => this.hasPhotos(ticket) ? 'Has Photos' : 'No Photos',
      isActionColumn: true
    }
  ];

  constructor(
    private http: HttpClient,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private photoEvidenceService: PhotoEvidenceService,
    filterService: FilterService
  ) {
    super(filterService);
  }

  override ngOnInit(): void {
    super.ngOnInit();
    this.loadGalleryData();
  }

  protected override loadData(): void {
    // Initialize data for filtering
    this.allData = [...this.galleryData];
    this.filteredData = [...this.allData];
  }

  // Override text search to include relevant fields
  protected override matchesTextSearch(item: any, searchTerm: string): boolean {
    const searchableFields = ['incidentName', 'ticketCode', 'incidentId'];

    return searchableFields.some(field => {
      const value = item[field];
      if (value) {
        return String(value).toLowerCase().includes(searchTerm);
      }
      return false;
    });
  }

  // Override date range to use earliest report date
  protected override matchesDateRange(item: any, cutoffDate: Date): boolean {
    const dateValue = item.earliestRptDate;
    if (dateValue) {
      const itemDate = new Date(dateValue);
      if (!isNaN(itemDate.getTime()) && itemDate >= cutoffDate) {
        return true;
      }
    }
    return false;
  }

  loadGalleryData(): void {
    this.loading = true;
    this.error = null;

    console.log('🔄 Loading gallery data from API...');
    console.log('📡 API URL:', `${environment.apiUrl}/tickets/gallery`);

    this.http.get<GalleryResponse>(`${environment.apiUrl}/tickets/gallery`).subscribe({
      next: (response) => {
        console.log('✅ API Response received:', response);
        console.log('📊 Response summary:', response.summary);
        console.log('📋 Total incidents:', response.data.length);

        if (response.success) {
          this.galleryData = response.data;
          // Flatten the data structure for the table
          this.flattenGalleryData();
          this.totalCount = this.allData.length;
          console.log('✅ Gallery data loaded successfully');
          console.log('📋 Flattened data count:', this.allData.length);
          console.log('📊 Total count for pagination:', this.totalCount);
        } else {
          console.error('❌ API returned error:', response.message);
          this.error = response.message || 'Failed to load gallery data';
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('❌ Error loading gallery data:', err);
        console.error('❌ Error details:', {
          status: err.status,
          statusText: err.statusText,
          message: err.message,
          url: err.url
        });
        this.error = 'Error loading gallery data. Please try again.';
        this.loading = false;
      }
    });
  }

  private flattenGalleryData(): void {
    const flattenedData: any[] = [];

    this.galleryData.forEach(incident => {
      incident.tickets.forEach(ticket => {
        // Add incident information to each ticket
        const ticketWithIncident = {
          ...ticket,
          incidentId: incident.incidentId,
          incidentName: incident.incidentName,
          earliestRptDate: incident.earliestRptDate
        };
        flattenedData.push(ticketWithIncident);
      });
    });

    this.allData = flattenedData;
    this.filteredData = [...this.allData];
  }

  // Getter for filtered gallery data
  get filteredGalleryData() {
    return this.filteredData;
  }

  async onTicketSelect(ticket: Ticket): Promise<void> {
    this.selectedTicket = ticket;
    const rawPhotos = this.getAllPhotosFromTicket(ticket);
    console.log('Selected ticket:', ticket);
    console.log('Raw photos found:', rawPhotos.length);

    // Load photo blobs and create object URLs
    this.selectedPhotos = await this.loadPhotoBlobs(rawPhotos);
    console.log('Photos loaded with blobs:', this.selectedPhotos.length);
  }

  private getAllPhotosFromTicket(ticket: Ticket): PhotoEvidence[] {
    const allPhotos: PhotoEvidence[] = [];

    ticket.taskStatuses.forEach(taskStatus => {
      if (taskStatus.photoEvidence && taskStatus.photoEvidence.length > 0) {
        // Add task status name to each photo for context
        const photosWithContext = taskStatus.photoEvidence.map(photo => ({
          ...photo,
          taskStatusName: taskStatus.name
        }));
        allPhotos.push(...photosWithContext);
      }
    });

    return allPhotos;
  }

  // Load photo blobs and create object URLs like the current/completed components
  private async loadPhotoBlobs(photos: PhotoEvidence[]): Promise<PhotoEvidence[]> {
    const photosWithBlobs: PhotoEvidence[] = [];

    for (const photo of photos) {
      try {
        // Try to get the photo blob from the service
        const blob = await this.photoEvidenceService.getPhotoEvidenceFile(photo.photoId).toPromise();
        if (blob) {
          const objectUrl = URL.createObjectURL(blob);
          photosWithBlobs.push({
            ...photo,
            photoURL: objectUrl,
            loaded: true,
            error: false
          });
        } else {
          // Fallback to original photoURL if blob fails
          photosWithBlobs.push({
            ...photo,
            loaded: false,
            error: true
          });
        }
      } catch (error) {
        console.error('Error loading photo blob for photoId:', photo.photoId, error);
        // Fallback to original photoURL if blob fails
        photosWithBlobs.push({
          ...photo,
          loaded: false,
          error: true
        });
      }
    }

    return photosWithBlobs;
  }

  getPhotoPreviewUrl(photo: PhotoEvidence): string {
    // Use photoURL if available (now contains blob object URL)
    if (photo.photoURL) {
      return photo.photoURL;
    }
    // Fallback to base64 data if available
    return photo.photo || '';
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';

    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid date';
    }
  }

  getPhotoCount(ticket: Ticket): number {
    let count = 0;
    ticket.taskStatuses.forEach(taskStatus => {
      if (taskStatus.photoEvidence) {
        count += taskStatus.photoEvidence.length;
      }
    });
    return count;
  }

  getTaskStatusCount(ticket: Ticket): number {
    return ticket.taskStatuses.length;
  }

  hasPhotos(ticket: Ticket): boolean {
    let hasPhotos = false;
    ticket.taskStatuses.forEach(taskStatus => {
      if (taskStatus.photoEvidence && taskStatus.photoEvidence.length > 0) {
        hasPhotos = true;
      }
    });
    return hasPhotos;
  }

  shouldShowViewButton(ticket: any): boolean {
    return this.hasPhotos(ticket);
  }

  onImageError(event: any): void {
    // Handle image loading errors
    const img = event.target;
    img.src = 'assets/imgs/no-image.png'; // Fallback image
  }

  viewPhoto(photo: PhotoEvidence): void {
    // Open photo in a dialog or new window
    if (photo.photoURL) {
      window.open(photo.photoURL, '_blank');
    } else if (photo.photo) {
      // For base64 images, create a data URL
      const dataUrl = photo.photo;
      window.open(dataUrl, '_blank');
    }
  }

  onPageChange(page: number) {
    this.currentPage = page;
    console.log('📄 Page changed to:', page);
    // If you need server-side pagination, you would modify the API call here
    // For now, we'll just update the current page
  }
}
