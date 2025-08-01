import { Component, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatStepperModule, MatStepper } from '@angular/material/stepper';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule } from '@angular/material/table';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DragDropUploadComponent } from '../drag-drop-upload/drag-drop-upload.component';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { environment } from '../../../environments/environment';

// API Response Interfaces
export interface InvoiceAnalyzeResponse {
  excelType: string;
  headerRow: number;
  headers: string[];
  preview: Array<{
    contractNumber: string;
    invoiceNumber: string;
    ticketCode: string;
    paylineItemCode: string;
    [key: string]: any;
  }>;
  missing: any[];
  indexes: {
    contractNumber: number;
    invoiceNumber: number;
    ticketCode: number;
    [key: string]: number;
  };
  inconsistencies: Array<{
    row: number;
    paylineCode: string;
  }>;
  consistentItems: any[];
  totalDataRows: number;
  consistentCount: number;
  inconsistentCount: number;
  summary: {
    total: number;
    consistent: number;
    inconsistent: number;
  };
}

export interface InvoiceUploadResponse {
  excelType: string;
  fileUrl: string;
  results: Array<{
    success: boolean;
    row: number;
    ticketCode: string;
    ticketId?: number;
    invoiceId?: number;
    invoiceNumber?: string;
    amountRequested?: number;
    paylineConsistent?: boolean;
    message?: string;
    error?: string;
    data?: any;
  }>;
  totalDataRows: number;
  processedRows: number;
  skippedRows: number;
  summary: {
    total: number;
    successful: number;
    failed: number;
    successRate: number;
  };
}

export interface InvoiceStepperData {
  uploadedFile?: File;
  analyzedData?: InvoiceAnalyzeResponse;
  uploadResults?: InvoiceUploadResponse;
}

@Component({
  selector: 'app-invoice-stepper-card',
  standalone: true,
  imports: [
    CommonModule,
    MatStepperModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatTableModule,
    MatButtonToggleModule,
    MatDialogModule,
    MatTooltipModule,
    MatPaginatorModule,
    FormsModule,
    ReactiveFormsModule,
    DragDropUploadComponent
  ],
  templateUrl: './invoice-stepper-card.component.html',
  styleUrls: ['./invoice-stepper-card.component.scss']
})
export class InvoiceStepperCardComponent {
  @Input() title: string = 'Invoice Excel Processing';
  @Input() data: InvoiceStepperData = {};
  @Output() stepCompleted = new EventEmitter<{ step: number; data: any }>();
  @Output() processCompleted = new EventEmitter<InvoiceStepperData>();
  @ViewChild('stepper') stepper!: MatStepper;

  // Step validation properties
  isLinear = true;

  // Loading states
  isStep1Loading = false;
  isStep2Loading = false;
  isStep3Loading = false;

  // Step data
  uploadedFile: File | null = null;
  analyzedData: InvoiceAnalyzeResponse | null = null;
  uploadResults: InvoiceUploadResponse | null = null;

  // Display columns for tables
  previewColumns: string[] = [];
  resultsColumns: string[] = ['row', 'ticketCode', 'invoiceNumber', 'paylineConsistent', 'error'];

  // Pagination properties
  pageSize = 8;
  pageSizeOptions = [8, 16, 32];
  currentPage = 0;
  totalItems = 0;

  constructor(
    private dialog: MatDialog,
    private http: HttpClient,
    private snackBar: MatSnackBar
  ) {}

  // Step 1: Upload File
  onFileUploaded(files: File[]) {
    if (files.length === 0) return;

    const newFile = files[0];

    // If this is a different file than the current one, reset the stepper state
    if (this.uploadedFile && this.uploadedFile.name !== newFile.name) {
      this.resetStepperState();
      this.snackBar.open('New file selected. Previous analysis data has been cleared.', 'Close', { duration: 3000 });
    }

    this.uploadedFile = newFile;
    this.isStep1Loading = true;

    this.snackBar.open(`File "${newFile.name}" uploaded successfully!`, 'Close', { duration: 3000 });
    this.stepCompleted.emit({ step: 1, data: { uploadedFile: this.uploadedFile } });
    this.isStep1Loading = false;
  }

  // Reset stepper state when a new file is uploaded
  private resetStepperState() {
    this.analyzedData = null;
    this.uploadResults = null;
    this.previewColumns = [];

    // Reset loading states
    this.isStep1Loading = false;
    this.isStep2Loading = false;
    this.isStep3Loading = false;

    // Reset stepper
    this.stepper.reset();
  }

  // Clear uploaded file
  clearUploadedFile() {
    this.uploadedFile = null;
    this.resetStepperState();
    this.snackBar.open('File cleared. You can now upload a new file.', 'Close', { duration: 3000 });
  }

  // Step 2: Analyze Excel
  analyzeExcel() {
    if (!this.uploadedFile) {
      this.snackBar.open('No file to analyze. Please upload a file first.', 'Close', { duration: 3000 });
      return;
    }

    this.isStep2Loading = true;

    const formData = new FormData();
    formData.append('file', this.uploadedFile);

    this.http.post<InvoiceAnalyzeResponse>(`${environment.apiUrl}/unified/excel/analyze`, formData)
      .subscribe({
        next: (response) => {
          console.log('Analysis response:', response);
          this.analyzedData = response;

          // Set up preview columns from headers
          if (response.headers && response.headers.length > 0) {
            this.previewColumns = response.headers.filter(h => !!h && typeof h === 'string' && h.trim() !== '');
          } else {
            this.previewColumns = [];
          }

          // Ensure the table has time to initialize properly
          setTimeout(() => {
            this.snackBar.open('Excel analysis completed successfully!', 'Close', { duration: 3000 });
            this.stepCompleted.emit({ step: 2, data: { analyzedData: this.analyzedData } });
            this.isStep2Loading = false;
          }, 100);
        },
        error: (error) => {
          console.error('Analysis error:', error);
          this.snackBar.open('Analysis failed. Please try again.', 'Close', { duration: 5000 });
          this.isStep2Loading = false;
        }
      });
  }

  // Step 3: Upload Excel
  uploadExcel() {
    if (!this.uploadedFile) {
      this.snackBar.open('No file to upload. Please upload a file first.', 'Close', { duration: 3000 });
      return;
    }

    this.isStep3Loading = true;

    const formData = new FormData();
    formData.append('file', this.uploadedFile);

    this.http.post<InvoiceUploadResponse>(`${environment.apiUrl}/unified/excel/upload`, formData)
      .subscribe({
        next: (response) => {
          console.log('Upload response:', response);
          this.uploadResults = response;

          // Reset pagination when new results are loaded
          this.resetPagination();

          this.snackBar.open('Excel upload completed successfully!', 'Close', { duration: 3000 });
          this.stepCompleted.emit({ step: 3, data: { uploadResults: this.uploadResults } });
          this.isStep3Loading = false;
        },
        error: (error) => {
          console.error('Upload error:', error);
          this.snackBar.open('Upload failed. Please try again.', 'Close', { duration: 5000 });
          this.isStep3Loading = false;
        }
      });
  }

  // Reset pagination to first page
  private resetPagination(): void {
    this.currentPage = 0;
    this.totalItems = 0;
  }

  // Complete process and reset stepper
  completeProcess() {
    // Emit the process completed event
    this.processCompleted.emit(this.data);

    // Reset the stepper to the first step
    this.resetStepperToFirstStep();

    // Show success message
    this.snackBar.open('Process completed successfully! Stepper has been reset and is ready for a new file.', 'Close', { duration: 4000 });
  }

  // Reset stepper to first step
  private resetStepperToFirstStep() {
    // Reset all data
    this.resetStepperState();

    // Reset the stepper to the first step
    this.stepper.reset();

    // Clear the uploaded file
    this.uploadedFile = null;
  }

  // Helper methods
  canProceedToStep(step: number): boolean {
    switch (step) {
      case 1: return true; // First step is always accessible
      case 2: return !!this.uploadedFile; // Need uploaded file
      case 3: return !!this.analyzedData; // Need analyzed data
      default: return false;
    }
  }

  isStepCompleted(step: number): boolean {
    switch (step) {
      case 1: return !!this.uploadedFile;
      case 2: return !!this.analyzedData;
      case 3: return !!this.uploadResults;
      default: return false;
    }
  }

  canAccessStep(step: number): boolean {
    // Can access step if all previous steps are completed
    for (let i = 1; i < step; i++) {
      if (!this.isStepCompleted(i)) {
        return false;
      }
    }
    return true;
  }

  getStepStatus(step: number): 'completed' | 'current' | 'pending' {
    if (this.isStepCompleted(step)) {
      return 'completed';
    }
    if (this.canAccessStep(step)) {
      return 'current';
    }
    return 'pending';
  }

  // Handle step navigation
  onStepClick(stepIndex: number) {
    if (this.canAccessStep(stepIndex + 1)) {
      this.stepper.selectedIndex = stepIndex;
    } else {
      // Show a message that the step is not accessible
      this.snackBar.open(`Please complete the previous steps first`, 'OK', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom'
      });
    }
  }

  // Get preview data for table
  getPreviewDataSource(): any[] {
    if (!this.analyzedData?.preview) return [];

    return this.analyzedData.preview.map((row, index) => {
      return {
        index,
        ...row
      };
    });
  }

  // Get results data for table with pagination
  getResultsDataSource(): any[] {
    if (!this.uploadResults?.results) return [];

    const allResults = this.uploadResults.results.filter(result => this.isFailedResult(result));
    this.totalItems = allResults.length;

    const startIndex = this.currentPage * this.pageSize;
    const endIndex = startIndex + this.pageSize;

    return allResults.slice(startIndex, endIndex);
  }

  // Get paginated results for display (only missing tickets - tickets not found)
  getPaginatedResults(): any[] {
    if (!this.uploadResults?.results) return [];

    // Filter only missing tickets (tickets not found in database)
    const missingTickets = this.uploadResults.results.filter(result =>
      result.success === false ||
      result.error?.toLowerCase().includes('not found') ||
      result.message?.toLowerCase().includes('not found') ||
      result.data?.error?.toLowerCase().includes('not found')
    );

    const startIndex = this.currentPage * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    const paginatedData = missingTickets.slice(startIndex, endIndex);

    console.log('Upload Results pagination (missing tickets only):', {
      total: this.uploadResults.results.length,
      missing: missingTickets.length,
      page: this.currentPage,
      pageSize: this.pageSize,
      startIndex,
      endIndex,
      paginatedCount: paginatedData.length
    });

    // Log missing ticket details for debugging
    if (missingTickets.length > 0) {
      console.log('Missing tickets:', missingTickets.map(result => ({
        row: result.row,
        ticketCode: result.ticketCode,
        success: result.success,
        error: result.error,
        message: result.message,
        dataError: result.data?.error
      })));
    }

    return paginatedData;
  }

  // Get total results count (only missing tickets - tickets not found)
  getTotalResults(): number {
    if (!this.uploadResults?.results) return 0;
    return this.uploadResults.results.filter(result =>
      result.success === false ||
      result.error?.toLowerCase().includes('not found') ||
      result.message?.toLowerCase().includes('not found') ||
      result.data?.error?.toLowerCase().includes('not found')
    ).length;
  }

  // Handle page change
  onPageChange(event: PageEvent): void {
    console.log('Upload Results page change:', event);
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
  }

  // Get total failed results count
  getTotalFailedResults(): number {
    if (!this.uploadResults?.results) return 0;
    return this.uploadResults.results.filter(result => this.isFailedResult(result)).length;
  }

  // Helper: is row failed
  isFailedResult(result: any): boolean {
    return result.success === false || !!result.error || !!result.message || !!result.data?.error;
  }

  // Get inconsistency count
  getInconsistencyCount(): number {
    return this.analyzedData?.inconsistentCount || 0;
  }

  // Get missing fields count
  getMissingFieldsCount(): number {
    return this.analyzedData?.missing?.length || 0;
  }

  // Get consistent results count
  getConsistentResultsCount(): number {
    if (!this.uploadResults?.results) return 0;
    return this.uploadResults.results.filter(result => result.paylineConsistent).length;
  }

  // Get inconsistent results count
  getInconsistentResultsCount(): number {
    if (!this.uploadResults?.results) return 0;
    return this.uploadResults.results.filter(result => !result.paylineConsistent).length;
  }

  // Get success rate percentage
  getSuccessRate(): number {
    if (!this.analyzedData?.totalDataRows || this.analyzedData.totalDataRows === 0) return 0;
    const successRate = (this.analyzedData.consistentCount / this.analyzedData.totalDataRows) * 100;
    return Math.round(successRate);
  }

  // TrackBy function for headers
  trackByHeader(index: number, header: string): string {
    return header;
  }

  // Check if preview table should be displayed
  shouldShowPreviewTable(): boolean {
    return !!(
      this.analyzedData?.preview &&
      this.analyzedData.preview.length > 0 &&
      this.previewColumns.length > 0 &&
      this.previewColumns.every(h => typeof h === 'string' && h.trim() !== '')
    );
  }
}
