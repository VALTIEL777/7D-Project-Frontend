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
import { ConfirmationDialogComponent } from '../../../shared/confirmation-dialog/confirmation-dialog.component';
import { InputDialogComponent } from '../../../shared/input-dialog/input-dialog.component';

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
      name: 'contractUnit',
      header: 'Contract Unit',
      cell: (ticket: any) => ticket.contractUnit?.name || 'N/A'
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
      name: 'comments',
      header: 'Photo Comments',
      cell: (ticket: any) => this.getAllPhotoComments(ticket)
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
    const searchableFields = ['incidentName', 'ticketCode', 'incidentId', 'contractUnit'];

    // Check the main searchable fields
    const mainFieldMatch = searchableFields.some(field => {
      const value = item[field];
      if (value) {
        return String(value).toLowerCase().includes(searchTerm.toLowerCase());
      }
      return false;
    });

    if (mainFieldMatch) {
      return true;
    }

    // Check contract unit name specifically
    if (item.contractUnit && item.contractUnit.name) {
      const contractUnitMatch = item.contractUnit.name.toLowerCase().includes(searchTerm.toLowerCase());
      if (contractUnitMatch) {
        return true;
      }
    }

    // Check address field specifically
    if (item.addresses && item.addresses.length > 0) {
      const addressMatch = item.addresses.some((address: any) => {
        if (address.fullAddress) {
          return address.fullAddress.toLowerCase().includes(searchTerm.toLowerCase());
        }
        return false;
      });
      return addressMatch;
    }

    return false;
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

  getAllPhotoComments(ticket: Ticket): string {
    const comments: string[] = [];

    ticket.taskStatuses.forEach(taskStatus => {
      if (taskStatus.photoEvidence && taskStatus.photoEvidence.length > 0) {
        taskStatus.photoEvidence.forEach(photo => {
          if (photo.comment && photo.comment.trim()) {
            comments.push(photo.comment.trim());
          }
        });
      }
    });

    if (comments.length === 0) {
      return 'No comments';
    }

    // Join all comments with line breaks
    const allComments = comments.join('\n');

    // Limit to 200 characters to prevent table from becoming too wide
    if (allComments.length > 200) {
      return allComments.substring(0, 197) + '...';
    }

    return allComments;
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

  shouldShowViewButton = (ticket: any): boolean => {
    return this.hasPhotos(ticket);
  }

  getPhotosByPhase(): { phaseName: string; photos: PhotoEvidence[] }[] {
    const phaseGroups: { [key: string]: PhotoEvidence[] } = {};

    // Group photos by task status name
    this.selectedPhotos.forEach(photo => {
      const phaseName = photo.taskStatusName || 'Unknown Phase';
      if (!phaseGroups[phaseName]) {
        phaseGroups[phaseName] = [];
      }
      phaseGroups[phaseName].push(photo);
    });

    // Convert to array format and sort by phase name
    return Object.keys(phaseGroups)
      .map(phaseName => ({
        phaseName,
        photos: phaseGroups[phaseName]
      }))
      .sort((a, b) => a.phaseName.localeCompare(b.phaseName));
  }

  getTaskStatusId(phaseName: string): number {
    if (!this.selectedTicket) return 0;

    const taskStatus = this.selectedTicket.taskStatuses.find(ts => ts.name === phaseName);
    return taskStatus ? taskStatus.taskStatusId : 0;
  }

  onImageError(event: any): void {
    // Handle image loading errors
    const img = event.target;
    img.src = 'assets/imgs/no-image.png'; // Fallback image
  }

  viewPhoto(photo: PhotoEvidence): void {
    // Download photo with custom filename
    if (photo.photoURL) {
      this.downloadPhoto(photo.photoURL, photo);
    } else if (photo.photo) {
      // For base64 images, create a data URL and download
      const dataUrl = photo.photo;
      this.downloadPhoto(dataUrl, photo);
    }
  }

  addPhoto(): void {
    if (!this.selectedTicket) {
      this.snackBar.open('Please select a ticket first', 'Close', { duration: 3000 });
      return;
    }

    // Use the first task status as default
    const firstTaskStatus = this.selectedTicket.taskStatuses[0];
    if (!firstTaskStatus) {
      this.snackBar.open('No task status available for this ticket', 'Close', { duration: 3000 });
      return;
    }

    this.addPhotoToPhase(firstTaskStatus.taskStatusId);
  }

  private uploadPhoto(file: File, taskStatusId: number, comment: string = ''): void {
    if (!this.selectedTicket) return;

    const formData = new FormData();
    formData.append('ticketStatusId', taskStatusId.toString());
    formData.append('ticketId', this.selectedTicket.ticketId.toString());
    formData.append('file', file);
    formData.append('name', `Photo ${new Date().toLocaleString()}`);
    formData.append('comment', comment);
    formData.append('date', '2024-01-15T10:30:00Z');
    formData.append('createdBy', '1'); // TODO: Get from auth service
    formData.append('updatedBy', '1'); // TODO: Get from auth service

    this.http.post(`${environment.apiUrl}/photoevidence`, formData).subscribe({
      next: (response: any) => {
        console.log('✅ Photo uploaded successfully:', response);
        this.snackBar.open('Photo uploaded successfully', 'Close', { duration: 3000 });

        // Refresh the current ticket's photos immediately
        this.refreshCurrentTicketPhotos();
      },
      error: (error) => {
        console.error('❌ Error uploading photo:', error);
        this.snackBar.open('Error uploading photo', 'Close', { duration: 3000 });
      }
    });
  }

  addPhotoToPhase(taskStatusId: number): void {
    if (!this.selectedTicket) {
      this.snackBar.open('Please select a ticket first', 'Close', { duration: 3000 });
      return;
    }

    // Create a file input element
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/png,image/jpg,image/jpeg';
    fileInput.multiple = false;

    fileInput.onchange = (event: any) => {
      const file = event.target.files[0];
      if (file) {
        this.showCommentDialog(file, taskStatusId);
      }
    };

    fileInput.click();
  }

  private showCommentDialog(file: File, taskStatusId: number): void {
    const dialogRef = this.dialog.open(InputDialogComponent, {
      width: '500px',
      data: {
        title: 'Add Photo Comment',
        message: 'Please enter a comment for this photo (optional):',
        inputLabel: 'Comment',
        inputPlaceholder: 'Enter photo comment...',
        confirmText: 'Upload Photo',
        cancelText: 'Cancel',
        required: false
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result !== null && result !== undefined) {
        this.uploadPhoto(file, taskStatusId, result);
      }
    });
  }

  deletePhoto(photo: PhotoEvidence): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '450px',
      data: {
        title: 'Delete Photo',
        message: `Are you sure you want to delete this photo? This action cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Cancel'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.http.delete(`${environment.apiUrl}/photoevidence/${photo.photoId}`).subscribe({
          next: () => {
            console.log('✅ Photo deleted successfully');
            this.snackBar.open('Photo deleted successfully', 'Close', { duration: 3000 });

            // Refresh the current ticket's photos immediately
            this.refreshCurrentTicketPhotos();
          },
          error: (error) => {
            console.error('❌ Error deleting photo:', error);
            this.snackBar.open('Error deleting photo', 'Close', { duration: 3000 });
          }
        });
      }
    });
  }

  private refreshCurrentTicketPhotos(): void {
    if (!this.selectedTicket) return;

    // Reload the gallery data to get the latest photos
    this.http.get<GalleryResponse>(`${environment.apiUrl}/tickets/gallery`).subscribe({
      next: (response) => {
        if (response.success) {
          this.galleryData = response.data;
          this.flattenGalleryData();

          // Find the updated ticket in the new data
          const updatedTicket = this.findTicketInGalleryData(this.selectedTicket!.ticketId);
          if (updatedTicket) {
            // Update the selected ticket with fresh data
            this.selectedTicket = updatedTicket;
            // Reload photos for the updated ticket
            this.onTicketSelect(updatedTicket);
          }
        }
      },
      error: (error) => {
        console.error('❌ Error refreshing ticket photos:', error);
        this.snackBar.open('Error refreshing photos', 'Close', { duration: 3000 });
      }
    });
  }

  private findTicketInGalleryData(ticketId: number): Ticket | null {
    for (const incident of this.galleryData) {
      const ticket = incident.tickets.find(t => t.ticketId === ticketId);
      if (ticket) {
        return ticket;
      }
    }
    return null;
  }

  private downloadPhoto(photoUrl: string, photo: PhotoEvidence): void {
    // Create filename: ticketNumber_Addresses_taskStatus_dateTaken
    const ticketNumber = this.selectedTicket?.ticketCode || 'unknown';
    const address = this.selectedTicket?.addresses?.[0]?.fullAddress || 'unknown';
    const taskStatus = photo.taskStatusName || 'unknown';
    const dateTaken = photo.date ? new Date(photo.date).toISOString().split('T')[0] : 'unknown';

    // Clean the address for filename (remove special characters)
    const cleanAddress = address.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');

    // Clean the task status for filename (remove special characters)
    const cleanTaskStatus = taskStatus.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');

    // Get file extension from URL or default to .jpg
    const urlParts = photoUrl.split('.');
    const extension = urlParts.length > 1 ? urlParts[urlParts.length - 1].split('?')[0] : 'jpg';

    const filename = `${ticketNumber}_${cleanAddress}_${cleanTaskStatus}_${dateTaken}.${extension}`;

    // Create download link
    const link = document.createElement('a');
    link.href = photoUrl;
    link.download = filename;
    link.target = '_blank';

    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log('📥 Downloading photo:', filename);
  }

  onPageChange(page: number) {
    this.currentPage = page;
    console.log('📄 Page changed to:', page);
    // If you need server-side pagination, you would modify the API call here
    // For now, we'll just update the current page
  }
}
