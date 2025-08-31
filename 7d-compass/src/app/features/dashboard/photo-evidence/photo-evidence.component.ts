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

interface ContractUnit {
  contractUnitId: number;
  name: string;
  description: string;
  unit: string;
  costPerUnit: number;
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
  contractUnit: ContractUnit;
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
  isCustomTemplate?: boolean; // Added for custom template
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
  loadingPhotos = false; // New property for photo loading state
  uploadingPhoto = false; // New property for photo upload state
  deletingPhoto = false; // New property for photo delete state
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
      name: 'contractUnit',
      header: 'Contract Unit',
      cell: (ticket: any) => ticket.contractUnit?.name || 'N/A'
    },
    {
      name: 'size',
      header: 'Size',
      cell: (ticket: any) => {
        if (ticket.wayfinding && ticket.wayfinding.dimensions) {
          const width = ticket.wayfinding.dimensions.width;
          const length = ticket.wayfinding.dimensions.length;
          if (width && length) {
            return `${width}*${length}`;
          }
        }
        return 'N/A';
      }
    },
    {
      name: 'comment7d',
      header: '7D Comment',
      cell: (ticket: any) => ticket.comment7d || 'N/A',
      isCustomTemplate: true
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
    const searchableFields = ['incidentName', 'ticketCode', 'incidentId', 'comment7d'];

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

    // Check size field specifically
    if (item.wayfinding && item.wayfinding.dimensions) {
      const width = item.wayfinding.dimensions.width;
      const length = item.wayfinding.dimensions.length;
      if (width && length) {
        const sizeString = `${width}*${length}`;
        if (sizeString.toLowerCase().includes(searchTerm.toLowerCase())) {
          return true;
        }
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

        // Log the first incident structure to see the actual properties
        if (response.data && response.data.length > 0) {
          console.log('🔍 First incident structure:', response.data[0]);
          if (response.data[0].tickets && response.data[0].tickets.length > 0) {
            console.log('🔍 First ticket structure:', response.data[0].tickets[0]);
            console.log('🔍 Contract unit in first ticket:', response.data[0].tickets[0].contractUnit);
          }
        }

        if (response.success) {
          this.galleryData = response.data;
          // Flatten the data structure for the table
          this.flattenGalleryData();
          this.totalCount = this.allData.length;
          console.log('✅ Gallery data loaded successfully');
          console.log('📋 Flattened data count:', this.allData.length);
          console.log('📊 Total count for pagination:', this.totalCount);

          // Log the first flattened ticket to see the structure
          if (this.allData.length > 0) {
            console.log('🔍 First flattened ticket:', this.allData[0]);
            console.log('🔍 Contract unit in flattened ticket:', this.allData[0].contractUnit);
          }
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
        // Skip tickets with MOBILIZATION in contract unit name
        if (ticket.contractUnit && ticket.contractUnit.name) {
          const contractUnitName = ticket.contractUnit.name.toLowerCase();
          if (contractUnitName.includes('mobilization')) {
            console.log('🚫 Skipping MOBILIZATION ticket:', ticket.ticketCode, 'Contract Unit:', ticket.contractUnit.name);
            return; // Skip this ticket
          }
        }

        // Add incident information to each ticket
        const ticketWithIncident = {
          ...ticket,
          incidentId: incident.incidentId,
          incidentName: incident.incidentName,
          earliestRptDate: incident.earliestRptDate,
          contractUnit: ticket.contractUnit // Preserve contractUnit information
        };
        flattenedData.push(ticketWithIncident);
      });
    });

    this.allData = flattenedData;
    this.filteredData = [...this.allData];

    console.log('📊 Total tickets after filtering MOBILIZATION:', this.allData.length);
  }

  // Getter for filtered gallery data
  get filteredGalleryData() {
    return this.filteredData;
  }

  async onTicketSelect(ticket: Ticket): Promise<void> {
    this.selectedTicket = ticket;
    this.loadingPhotos = true; // Start loading photos
    console.log('🔄 Starting to load photos for ticket:', ticket.ticketCode);

    try {
      // Get all photos from the ticket (including empty phases)
      const rawPhotos = this.getAllPhotosFromTicket(ticket);
      console.log('Selected ticket:', ticket);
      console.log('Raw photos found:', rawPhotos.length);

      // Load photo blobs and create object URLs
      this.selectedPhotos = await this.loadPhotoBlobs(rawPhotos);
      console.log('Photos loaded with blobs:', this.selectedPhotos.length);

      // Add a small delay to ensure UI updates are processed
      await new Promise(resolve => setTimeout(resolve, 100));

      console.log('✅ Photos loading completed for ticket:', ticket.ticketCode);

    } catch (error) {
      console.error('Error loading photos:', error);
      this.error = 'Error loading photos. Please try again.';
    } finally {
      this.loadingPhotos = false; // Stop loading photos
      console.log('🔄 Loading state set to false for ticket:', ticket.ticketCode);
    }
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
    // Show view button for any ticket that has task statuses (phases)
    // This allows users to upload photos even when there are no existing photos
    return ticket.taskStatuses && ticket.taskStatuses.length > 0;
  }

  getViewButtonColor = (ticket: any): string => {
    // Return 'accent' (green) if ticket has photos, 'primary' (blue) if no photos
    return this.hasPhotos(ticket) ? 'accent' : 'primary';
  }

  getViewButtonTooltip = (ticket: any): string => {
    // Return descriptive tooltip based on photo status
    if (this.hasPhotos(ticket)) {
      const photoCount = this.getPhotoCount(ticket);
      return `View Photos (${photoCount} photo${photoCount !== 1 ? 's' : ''} available)`;
    } else {
      return 'View Photos (No photos yet - Click to upload)';
    }
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

  // Computed property for phases - only recalculate when needed
  get allPhases(): { phaseName: string; photos: PhotoEvidence[] }[] {
    if (!this.selectedTicket || this.loadingPhotos) {
      console.log('🔄 allPhases getter: returning empty array (loadingPhotos:', this.loadingPhotos, ')');
      return [];
    }

    // Define the custom phase order
    const phaseOrder = [
      'Spotting',
      'No Parking Signs',
      'Sawcut',
      'Removal',
      'Framing',
      'Pour',
      'Clean',
      'Steel Plate Pickup',
      'Grind',
      'Asphalt',
      'Crack Seal',
      'Stripping',
      'Install Signs'
    ];

    // Get all phases from the ticket, even if they have no photos
    const phases = this.selectedTicket.taskStatuses.map(taskStatus => {
      // Find photos for this phase
      const phasePhotos = this.selectedPhotos.filter(photo =>
        photo.taskStatusName === taskStatus.name
      );

      return {
        phaseName: taskStatus.name,
        photos: phasePhotos
      };
    });

    // Sort phases by custom order instead of alphabetically
    const sortedPhases = phases.sort((a, b) => {
      const aIndex = phaseOrder.indexOf(a.phaseName);
      const bIndex = phaseOrder.indexOf(b.phaseName);

      // If both phases are in the defined order, sort by their position
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }

      // If only one phase is in the defined order, prioritize it
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;

      // If neither phase is in the defined order, sort alphabetically
      return a.phaseName.localeCompare(b.phaseName);
    });

    console.log('📊 allPhases getter: returning', sortedPhases.length, 'phases in custom order');
    return sortedPhases;
  }

  // Keep the old method for backward compatibility
  getAllPhases(): { phaseName: string; photos: PhotoEvidence[] }[] {
    return this.allPhases;
  }

  // Check if we should show the no phases message
  get shouldShowNoPhases(): boolean {
    const result = !this.loadingPhotos && !!this.selectedTicket &&
           (!this.selectedTicket.taskStatuses || this.selectedTicket.taskStatuses.length === 0);
    console.log('🔍 shouldShowNoPhases:', result, '(loadingPhotos:', this.loadingPhotos, ')');
    return result;
  }

  // Check if we should show the no photos message
  get shouldShowNoPhotos(): boolean {
    const result = !this.loadingPhotos && !!this.selectedTicket &&
           !!this.selectedTicket.taskStatuses && this.selectedTicket.taskStatuses.length > 0 &&
           this.allPhases.every(phase => phase.photos.length === 0);
    console.log('🔍 shouldShowNoPhotos:', result, '(loadingPhotos:', this.loadingPhotos, ')');
    return result;
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

    this.uploadingPhoto = true; // Start upload loading

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
        this.uploadingPhoto = false; // Stop upload loading
      },
      error: (error) => {
        console.error('❌ Error uploading photo:', error);
        this.snackBar.open('Error uploading photo', 'Close', { duration: 3000 });
        this.uploadingPhoto = false; // Stop upload loading on error
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
        this.deletingPhoto = true; // Start delete loading

        this.http.delete(`${environment.apiUrl}/photoevidence/${photo.photoId}`).subscribe({
          next: () => {
            console.log('✅ Photo deleted successfully');
            this.snackBar.open('Photo deleted successfully', 'Close', { duration: 3000 });

            // Refresh the current ticket's photos immediately
            this.refreshCurrentTicketPhotos();
            this.deletingPhoto = false; // Stop delete loading
          },
          error: (error) => {
            console.error('❌ Error deleting photo:', error);
            this.snackBar.open('Error deleting photo', 'Close', { duration: 3000 });
            this.deletingPhoto = false; // Stop delete loading on error
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
            // Reload photos for the updated ticket (this will handle its own loading state)
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

    // Determine the correct file extension
    let extension = 'jpg'; // Default to jpg

    // Check if it's a blob URL (starts with blob:)
    if (photoUrl.startsWith('blob:')) {
      // For blob URLs, we need to determine the type from the original photo data
      if (photo.photo && photo.photo.includes('data:image/')) {
        // Extract MIME type from data URL
        const mimeMatch = photo.photo.match(/data:image\/([^;]+)/);
        if (mimeMatch) {
          const mimeType = mimeMatch[1];
          switch (mimeType) {
            case 'jpeg':
            case 'jpg':
              extension = 'jpg';
              break;
            case 'png':
              extension = 'png';
              break;
            case 'gif':
              extension = 'gif';
              break;
            case 'webp':
              extension = 'webp';
              break;
            default:
              extension = 'jpg';
          }
        }
      } else if (photo.photo && photo.photo.includes('.')) {
        // Try to extract extension from the original photo filename
        const photoParts = photo.photo.split('.');
        if (photoParts.length > 1) {
          const photoExt = photoParts[photoParts.length - 1].toLowerCase();
          if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(photoExt)) {
            extension = photoExt === 'jpeg' ? 'jpg' : photoExt;
          }
        }
      }
    } else if (photoUrl.includes('.')) {
      // For regular URLs, extract extension from URL
      const urlParts = photoUrl.split('.');
      const urlExt = urlParts[urlParts.length - 1].split('?')[0].toLowerCase();
      if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(urlExt)) {
        extension = urlExt === 'jpeg' ? 'jpg' : urlExt;
      }
    }

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
    console.log('🔍 Photo URL type:', photoUrl.startsWith('blob:') ? 'blob' : 'regular');
    console.log('🔍 Original photo data:', photo.photo ? 'exists' : 'none');
  }

  onPageChange(page: number) {
    this.currentPage = page;
    console.log('📄 Page changed to:', page);
    // If you need server-side pagination, you would modify the API call here
    // For now, we'll just update the current page
  }

  onCommentChange(event: {element: any, newComment: string}): void {
    const { element, newComment } = event;

    console.log('🔄 Updating comment for ticket:', element.ticketId, 'New comment:', newComment);

    const payload = {
      comment7d: newComment,
      updatedBy: 1 // TODO: Get from auth service
    };

    this.http.put(`${environment.apiUrl}/tickets/${element.ticketId}/comment`, payload).subscribe({
      next: (response) => {
        console.log('✅ Comment updated successfully:', response);
        this.snackBar.open('Comment updated successfully', 'Close', { duration: 3000 });

        // Update the element in the data
        element.comment7d = newComment;
        element.commentChanged = false;
      },
      error: (error) => {
        console.error('❌ Error updating comment:', error);
        this.snackBar.open('Error updating comment', 'Close', { duration: 3000 });

        // Revert the change on error
        element.commentChanged = true;
      }
    });
  }
}
