import { Component, OnInit } from '@angular/core';
import { DashboardLayoutComponent } from "../../../../shared/dashboard-layout/dashboard-layout.component";
import { CardWithButtonComponent } from '../../../../shared/card-with-button/card-with-button.component';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule } from '@angular/material/table';
import { CommonModule } from '@angular/common';
import { MATERIAL_MODULES } from '../../../../material';
import { DragDropUploadComponent } from '../../../../shared/drag-drop-upload/drag-drop-upload.component';
import { RTRService, RTRFile, RTRData, AnalysisResult, InconsistentTicket, NewTicket, SaveDecisionsRequest, MatchingTicket } from '../../../../core/services/rtr/rtr.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationDialogComponent } from '../../../../shared/confirmation-dialog/confirmation-dialog.component';
import { BaseDashboardComponent } from '../../../../shared/base-dashboard.component';
import { FilterService } from '../../../../core/services/filter.service';
import { StepperCardComponent, StepperData } from '../../../../shared/stepper-card/stepper-card.component';

// Updated interface for the new API structure
interface RTRFileInfo {
  name: string;
  size: number;
  lastModified: string;
  type: 'uploaded' | 'generated';
  url: string;
}

interface RTRFilesResponse {
  success: boolean;
  files: {
    uploaded: RTRFileInfo[];
    generated: RTRFileInfo[];
  };
}

@Component({
  selector: 'app-rtr-processing',
  imports: [DashboardLayoutComponent,
    DragDropUploadComponent,
     CardWithButtonComponent, MatTableModule, MatDividerModule, CommonModule, MATERIAL_MODULES, StepperCardComponent],
  templateUrl: './rtr-processing.component.html',
  styleUrl: './rtr-processing.component.scss'
})
export class RtrProcessingComponent extends BaseDashboardComponent implements OnInit {
  // RTR Files from API
  receivedRTRs: RTRFile[] = [];
  sentRTRs: RTRFile[] = [];

  // Analysis results
  analysisResult: AnalysisResult | null = null;
  newTickets: NewTicket[] = [];
  inconsistentTickets: InconsistentTicket[] = [];
  matchingTickets: MatchingTicket[] = [];

  // Loading states
  isLoadingRTRs = false;
  isUploading = false;
  isAnalyzing = false;
  isProcessing = false;
  currentUploadFileName = '';  // Track current file being uploaded
  currentRtrId: number | null = null;  // Track current RTR ID from upload

  // Upload retry mechanism
  private uploadRetryCount = 0;
  private maxUploadRetries = 2;
  private currentUploadFile: File | null = null;

  // User decisions for inconsistencies
  userDecisions: { [ticketId: string]: { [field: string]: 'excel' | 'database' } } = {};

  // Track filled missing info for save
  missingInfoFilled: any[] = [];

  // Track skipped rows for validation/save
  skippedRows: any[] = [];

  // Pasted data functionality
  pastedDataSource: any[] = [];
  pastedDisplayedColumns: string[] = [];
  private pastedText: string = '';

  // Stepper data
  stepperData: StepperData = {};

  // Generate RTR functionality
  selectedGenerateFile: File | null = null;
  isGeneratingRtr = false;
  generateRtrResult: any = null;
  summaryDataSource: any[] = [];
  summaryColumns: string[] = ['metric', 'value', 'percentage'];

  constructor(
    private rtrService: RTRService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    filterService: FilterService
  ) {
    super(filterService);
  }

  override ngOnInit() {
    super.ngOnInit(); // Call parent ngOnInit to setup filters

    // Test API connectivity
    this.testApiConnectivity();

    // Load RTR files is called by loadData() which is called by the parent component
  }

  // Override the abstract loadData method
  protected override loadData(): void {
    this.loadRTRFiles();
  }

  // Load RTR files from API
  loadRTRFiles() {
    this.isLoadingRTRs = true;
    this.rtrService.listRTRs().subscribe({
      next: (response) => {
        if (response.success) {
          this.receivedRTRs = response.files.uploaded || [];
          this.sentRTRs = response.files.generated || [];

          // Update the base component's data arrays with received files for filtering
          this.allData = [...this.receivedRTRs];
          this.filteredData = [...this.allData];
        } else {
          console.error('Failed to load RTR files');
          this.snackBar.open('Failed to load RTR files', 'Close', { duration: 3000 });
        }
        this.isLoadingRTRs = false;
      },
      error: (error) => {
        console.error('Error loading RTR files:', error);
        this.snackBar.open('Error loading RTR files. Please check your connection.', 'Close', { duration: 5000 });
        this.isLoadingRTRs = false;
      }
    });
  }

  // Handle file upload from drag-drop component
  onFilesDropped(files: File[]) {
    console.log('🔄 onFilesDropped called with files:', files);
    console.log('📁 Number of files:', files.length);

    if (files.length === 0) {
      console.log('❌ No files were dropped');
      this.snackBar.open('No files were dropped', 'Close', { duration: 2000 });
      return;
    }

    if (files.length > 1) {
      console.log('❌ Too many files dropped:', files.length);
      this.snackBar.open('Please drop only one file at a time', 'Close', { duration: 2000 });
      return;
    }

    const file = files[0];
    console.log('📄 File dropped:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    });

    // Validate file before processing
    if (!file || file.size === 0) {
      console.log('❌ Invalid file: File is empty or corrupted');
      this.snackBar.open('Invalid file: File is empty or corrupted', 'Close', { duration: 3000 });
      return;
    }

    // Check if file is being processed
    if (this.isUploading) {
      console.log('⏳ Upload already in progress');
      this.snackBar.open('Upload already in progress. Please wait.', 'Close', { duration: 3000 });
      return;
    }

    console.log('✅ File validation passed, starting upload process');
    this.snackBar.open(`Processing file: ${file.name}`, 'Close', { duration: 2000 });
    this.currentUploadFileName = file.name;

    // Call uploadRTRFile directly without delay
    console.log('🚀 Calling uploadRTRFile');
    this.uploadRTRFile(file);
  }

  // Enhanced file upload with analysis and retry logic
  uploadRTRFile(file: File, isRetry: boolean = false) {
    console.log('🚀 uploadRTRFile called with:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      isRetry: isRetry,
      uploadRetryCount: this.uploadRetryCount
    });

    // Store the file for retry purposes
    if (!isRetry) {
      this.currentUploadFile = file;
      this.uploadRetryCount = 0;
      console.log('📁 File stored for potential retry');
    }

    // Validate file type
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv
      'application/octet-stream' // Fallback for some Excel files
    ];

    if (!allowedTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.xlsx') && !file.name.toLowerCase().endsWith('.xls') && !file.name.toLowerCase().endsWith('.csv')) {
      this.snackBar.open(
        `Invalid file type. Please upload an Excel (.xlsx, .xls) or CSV file.`,
        'Close',
        { duration: 5000 }
      );
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      this.snackBar.open(
        `File too large. Maximum size is 10MB.`,
        'Close',
        { duration: 5000 }
      );
      return;
    }

    // Prevent multiple simultaneous uploads
    if (this.isUploading) {
      this.snackBar.open('Upload already in progress. Please wait.', 'Close', { duration: 3000 });
      return;
    }

    this.isUploading = true;
    this.currentUploadFileName = file.name;
    this.currentRtrId = null; // Reset RTR ID
    console.log(`Starting upload for file: ${file.name}, Size: ${file.size}, Type: ${file.type}, Retry: ${isRetry ? this.uploadRetryCount : 0}`);

    // Make the API call directly without delay
    this.rtrService.uploadRTR(file).subscribe({
      next: (response) => {
        console.log('✅ Upload response:', response);

        // Reset retry count on success
        this.uploadRetryCount = 0;
        this.currentUploadFile = null;

        // Analyze the response structure for debugging
        this.testUploadResponseStructure(response);

        if (response.success) {
          // Extract RTR ID from response if available - check multiple possible field names
          if (response.rtrId) {
            this.currentRtrId = response.rtrId;
            console.log('RTR ID from upload (rtrId):', this.currentRtrId);
          } else if (response.rtrid) {
            this.currentRtrId = response.rtrid;
            console.log('RTR ID from upload (rtrid):', this.currentRtrId);
          } else if (response.id) {
            this.currentRtrId = response.id;
            console.log('RTR ID from upload (id):', this.currentRtrId);
          } else if (response.fileId) {
            this.currentRtrId = response.fileId;
            console.log('RTR ID from upload (fileId):', this.currentRtrId);
          } else if (response.uploadId) {
            this.currentRtrId = response.uploadId;
            console.log('RTR ID from upload (uploadId):', this.currentRtrId);
          } else {
            console.warn('No RTR ID found in upload response. Available fields:', Object.keys(response));
            // If no RTR ID is available, we can't download the file later
            this.currentRtrId = null;
          }

          this.snackBar.open(
            `File "${file.name}" uploaded successfully! ${response.sheetCount || 'Data'} processed.`,
            'Close',
            { duration: 5000 }
          );

          // If the upload includes parsed data, analyze it
          if (response.results && response.results.length > 0) {
            const firstResult = response.results[0];
            if (firstResult.data && firstResult.data.length > 0) {
              this.analyzeRTRData(firstResult.data);
            }
          }

          // Reload the list after a short delay to ensure backend processing is complete
          setTimeout(() => {
            this.loadRTRFiles();
          }, 1000);
        } else {
          this.snackBar.open(
            `Upload failed: ${response.error || 'Unknown error'}`,
            'Close',
            { duration: 5000 }
          );
        }
        this.isUploading = false;
        this.currentUploadFileName = '';
      },
      error: (error) => {
        console.error('❌ Upload error:', error);

        // Check if we should retry
        if (this.uploadRetryCount < this.maxUploadRetries && this.currentUploadFile) {
          this.uploadRetryCount++;
          console.log(`Retrying upload (attempt ${this.uploadRetryCount}/${this.maxUploadRetries})`);

          this.snackBar.open(
            `Upload failed, retrying... (${this.uploadRetryCount}/${this.maxUploadRetries})`,
            'Close',
            { duration: 2000 }
          );

          // Retry after a short delay
          setTimeout(() => {
            this.isUploading = false;
            this.uploadRTRFile(this.currentUploadFile!, true);
          }, 2000);
          return;
        }

        // Reset retry state
        this.uploadRetryCount = 0;
        this.currentUploadFile = null;

        // Use the improved error message from the service
        const errorMessage = error.userMessage || 'Upload failed';

        this.snackBar.open(
          `${errorMessage}. Please try again.`,
          'Close',
          { duration: 5000 }
        );
        this.isUploading = false;
        this.currentUploadFileName = '';
        this.currentRtrId = null;
      }
    });
  }

  // Download RTR file
  downloadRTR(file: RTRFile) {
    console.log('Downloading RTR file:', file.name, 'Object Key:', file.objectKey);

    if (!file.objectKey) {
      this.snackBar.open('No object key available for download', 'Close', { duration: 3000 });
      return;
    }

    // URL-encode the object key to handle forward slashes
    const encodedObjectKey = encodeURIComponent(file.objectKey);
    console.log('Encoded object key:', encodedObjectKey);

    // Use the backend download endpoint instead of presigned URL
    this.rtrService.downloadFileByKey(encodedObjectKey).subscribe({
      next: (blob: Blob) => {
        // Create blob URL and download
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        this.snackBar.open('File download started', 'Close', { duration: 3000 });
      },
      error: (error) => {
        console.error('Download failed:', error);
        console.error('Error details:', error.error);
        this.snackBar.open('Download failed. Please try again.', 'Close', { duration: 5000 });
      }
    });
  }

  // Download current uploaded file
  downloadCurrentUploadedFile() {
    if (!this.currentUploadFileName) {
      console.error('No filename available for current uploaded file');
      this.snackBar.open('No filename available for download.', 'Close', { duration: 3000 });
      return;
    }

    // Find the file by name in the received RTRs
    const file = this.receivedRTRs.find(rtr => rtr.name === this.currentUploadFileName);

    if (file) {
      console.log('Downloading current uploaded file:', file.name, 'Object Key:', file.objectKey);

      if (!file.objectKey) {
        this.snackBar.open('No object key available for download', 'Close', { duration: 3000 });
        return;
      }

      // URL-encode the object key to handle forward slashes
      const encodedObjectKey = encodeURIComponent(file.objectKey);
      console.log('Encoded object key:', encodedObjectKey);

      // Use the backend download endpoint
      this.rtrService.downloadFileByKey(encodedObjectKey).subscribe({
        next: (blob: Blob) => {
          // Create blob URL and download
          if (typeof window !== 'undefined') {
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = file.name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
          }

          this.snackBar.open('File download started', 'Close', { duration: 3000 });
        },
        error: (error) => {
          console.error('Download failed:', error);
          console.error('Error details:', error.error);
          this.snackBar.open('Download failed. Please try again.', 'Close', { duration: 5000 });
        }
      });
    } else {
      console.error('Current uploaded file not found in received RTRs');
      this.snackBar.open('File not found for download. Please refresh the list.', 'Close', { duration: 3000 });
    }
  }

  // Process pasted data and analyze
  processPastedData() {
    if (!this.pastedText) {
      this.snackBar.open('No data to process', 'Close', { duration: 3000 });
      return;
    }

    const rows = this.pastedText.split(/\r\n|\n/).filter(row => row.trim() !== '');
    if (rows.length === 0) {
      this.snackBar.open('No valid data found', 'Close', { duration: 3000 });
      return;
    }

    const headers = rows[0].split('\t');
    this.pastedDisplayedColumns = headers;
    this.pastedDataSource = [];

    // Convert to RTRData format
    const rtrData: RTRData[] = [];

    for (let i = 1; i < rows.length; i++) {
      const values = rows[i].split('\t');
      const rowData: { [key: string]: string } = {};

      headers.forEach((header, index) => {
        rowData[header] = values[index] || '';
      });

      this.pastedDataSource.push(rowData);

      // Convert to RTRData format for analysis
      const rtrRow: RTRData = {
        RESTN_WO_NUM: rowData['RESTN_WO_NUM'] || '',
        TASK_WO_NUM: rowData['TASK_WO_NUM'] || '',
        'PGL ComD:Wments': rowData['PGL ComD:Wments'] || '',
        'Contractor Comments': rowData['Contractor Comments'] || '',
        SHOP: rowData['SHOP'] || '',
        SQ_MI: parseFloat(rowData['SQ_MI']) || 0,
        Earliest_Rpt_Dt: rowData['Earliest_Rpt_Dt'] || '',
        ADDRESS: rowData['ADDRESS'] || '',
        STREET_FROM_RES: rowData['STREET_FROM_RES'] || '',
        STREET_TO_RES: rowData['STREET_TO_RES'] || '',
        NOTES2_RES: rowData['NOTES2_RES'] || '',
        SAP_ITEM_NUM: rowData['SAP_ITEM_NUM'] || '',
        LOCATION2_RES: rowData['LOCATION2_RES'] || '',
        length_x_width: rowData['length_x_width'] || '',
        AGENCY_NO: parseInt(rowData['AGENCY_NO']) || 0,
        ILL_ONLY: rowData['ILL_ONLY'] || '',
        START_DATE: rowData['START_DATE'] || '',
        EXP_DATE: rowData['EXP_DATE'] || ''
      };

      rtrData.push(rtrRow);
    }

    // Analyze the data
    this.analyzeRTRData(rtrData);
  }

  // Analyze RTR data
  analyzeRTRData(data: RTRData[]) {
    this.isAnalyzing = true;
    console.log('Analyzing RTR data:', data);

    this.rtrService.analyzeRTRData(data).subscribe({
      next: (result) => {
        console.log('Analysis result:', result);
        this.analysisResult = result;
        this.newTickets = result.analysis.newTickets;
        this.inconsistentTickets = result.analysis.inconsistentTickets;
        this.matchingTickets = result.analysis.matchingTickets || [];

        // Initialize user decisions with database as default
        this.userDecisions = {};
        this.inconsistentTickets.forEach(ticket => {
          this.userDecisions[ticket.ticketId.toString()] = {};
          ticket.inconsistencies.forEach(inconsistency => {
            this.userDecisions[ticket.ticketId.toString()][inconsistency.field] = 'database';
          });
        });

        const summary = result.analysis.summary;
        this.snackBar.open(
          `Analysis complete: ${summary.new} new tickets, ${summary.inconsistent} inconsistencies, ${summary.matching} matching`,
          'Close',
          { duration: 5000 }
        );
        this.isAnalyzing = false;
      },
      error: (error) => {
        console.error('Analysis error:', error);
        this.snackBar.open(
          `Analysis failed: ${error.error?.error || error.message}`,
          'Close',
          { duration: 5000 }
        );
        this.isAnalyzing = false;
      }
    });
  }

  // Handle user decision for inconsistency
  onDecisionChange(ticketId: number, field: string, decision: 'excel' | 'database') {
    if (!this.userDecisions[ticketId.toString()]) {
      this.userDecisions[ticketId.toString()] = {};
    }
    this.userDecisions[ticketId.toString()][field] = decision;
  }

  // Save decisions and process data
  saveWithDecisions() {
    // Validate data before proceeding
    const validation = this.validateAnalysisData();
    if (!validation.isValid) {
      this.snackBar.open(
        `Validation failed: ${validation.errors.join(', ')}`,
        'Close',
        { duration: 5000 }
      );
      return;
    }

    if (!this.analysisResult) {
      this.snackBar.open('No analysis data to save', 'Close', { duration: 3000 });
      return;
    }

    // Validate that all inconsistencies have decisions
    const missingDecisions = this.inconsistentTickets.some(ticket => {
      return ticket.inconsistencies.some(inconsistency => {
        return !this.userDecisions[ticket.ticketId.toString()]?.[inconsistency.field];
      });
    });

    if (missingDecisions) {
      this.snackBar.open('Please make decisions for all inconsistencies before saving', 'Close', { duration: 3000 });
      return;
    }

    // Debug log for missingInfoFilled
    console.log('DEBUG: missingInfoFilled being sent to backend:', JSON.stringify(this.missingInfoFilled, null, 2));

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '450px',
      data: {
        title: 'Confirm Save',
        message: `Are you sure you want to save ${this.newTickets.length} new tickets and update ${this.inconsistentTickets.length} existing tickets?`,
        confirmText: 'Save',
        cancelText: 'Cancel'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.isProcessing = true;

        // Build the full validation payload
        const validationData = {
          newTickets: this.newTickets,
          inconsistentTickets: this.inconsistentTickets,
          decisions: this.userDecisions,
          missingInfoFilled: this.missingInfoFilled,
          skippedRows: this.skippedRows
        };
        // Print the entire JSON request as a single object
        console.log('DEBUG: Validation request body being sent:', JSON.stringify(validationData, null, 2));

        // Call validation endpoint with full payload
        this.rtrService.validateRTRData(validationData).subscribe({
          next: (result: any) => {
            // Handle validation result (show messages, update state, etc.)
            console.log('Validation result:', result);
            this.isProcessing = false;
          },
          error: (error: any) => {
            console.error('Validation error:', error);
            this.isProcessing = false;
          }
        });

        const request: SaveDecisionsRequest = {
          newTickets: this.newTickets,
          inconsistentTickets: this.inconsistentTickets,
          decisions: this.userDecisions,
          createdBy: this.getCurrentUserId(),
          updatedBy: this.getCurrentUserId()
        };

        console.log('Saving with decisions:', request);

        this.rtrService.saveWithDecisions(request).subscribe({
          next: (result) => {
            console.log('Save result:', result);
            if (result.success) {
              const summary = result.results;
              this.snackBar.open(
                `Successfully created ${summary.newTicketsCreated.length} tickets and updated ${summary.ticketsUpdated.length} tickets`,
                'Close',
                { duration: 5000 }
              );

              if (summary.errors.length > 0) {
                console.warn('Some errors occurred:', summary.errors);
                this.snackBar.open(
                  `${summary.errors.length} errors occurred during save. Check console for details.`,
                  'Close',
                  { duration: 5000 }
                );
              }

              this.clearAnalysisData();
            } else {
              this.snackBar.open('Save operation failed', 'Close', { duration: 3000 });
            }
            this.isProcessing = false;
          },
          error: (error) => {
            console.error('Save error:', error);
            this.snackBar.open(
              `Save failed: ${error.error?.error || error.message}`,
              'Close',
              { duration: 5000 }
            );
            this.isProcessing = false;
          }
        });
      }
    });
  }

  // Clear analysis data
  clearAnalysisData() {
    this.analysisResult = null;
    this.newTickets = [];
    this.inconsistentTickets = [];
    this.matchingTickets = [];
    this.userDecisions = {};
    this.clearPastedData();
  }

  // Reset inconsistencies
  resetInconsistencies() {
    this.userDecisions = {};
    this.inconsistentTickets.forEach(ticket => {
      this.userDecisions[ticket.ticketId.toString()] = {};
      ticket.inconsistencies.forEach(inconsistency => {
        this.userDecisions[ticket.ticketId.toString()][inconsistency.field] = 'database';
      });
    });
    this.snackBar.open('Inconsistencies reset to default values', 'Close', { duration: 3000 });
  }

  // Pasted data functions
  handlePaste(event: ClipboardEvent) {
    const clipboardData = event.clipboardData;
    if (clipboardData) {
      this.pastedText = clipboardData.getData('text');
    }
  }

  clearPastedData() {
    this.pastedDataSource = [];
    this.pastedDisplayedColumns = [];
    this.pastedText = '';
  }

  // Format date for display
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: '2-digit'
    });
  }

  // Enhanced helper method to get user info from auth service
  private getCurrentUserId(): number {
    // TODO: Implement this when auth service is available
    // return this.authService.getCurrentUser()?.id || 1;
    return 1; // Default for now
  }

  // Enhanced validation method
  private validateAnalysisData(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.analysisResult) {
      errors.push('No analysis data available');
      return { isValid: false, errors };
    }

    if (!this.newTickets && !this.inconsistentTickets && !this.matchingTickets) {
      errors.push('No tickets to process');
      return { isValid: false, errors };
    }

    // Validate new tickets
    if (this.newTickets) {
      this.newTickets.forEach((ticket, index) => {
        if (!ticket.ticketCode) {
          errors.push(`New ticket ${index + 1}: Missing ticket code`);
        }
        if (!ticket.excelData) {
          errors.push(`New ticket ${index + 1}: Missing excel data`);
        }
      });
    }

    // Validate inconsistent tickets
    if (this.inconsistentTickets) {
      this.inconsistentTickets.forEach((ticket, index) => {
        if (!ticket.ticketId) {
          errors.push(`Inconsistent ticket ${index + 1}: Missing ticket ID`);
        }
        if (!ticket.inconsistencies || ticket.inconsistencies.length === 0) {
          errors.push(`Inconsistent ticket ${index + 1}: No inconsistencies found`);
        }
      });
    }

    // Validate matching tickets
    if (this.matchingTickets) {
      this.matchingTickets.forEach((ticket, index) => {
        if (!ticket.ticketId) {
          errors.push(`Matching ticket ${index + 1}: Missing ticket ID`);
        }
        if (!ticket.excelData) {
          errors.push(`Matching ticket ${index + 1}: Missing excel data`);
        }
      });
    }

    return { isValid: errors.length === 0, errors };
  }

  // Test API connectivity
  testApiConnectivity() {
    console.log('Testing RTR API connectivity...');
    console.log('API Info:', this.rtrService.getApiInfo());

    this.rtrService.healthCheck().subscribe({
      next: (response) => {
        console.log('✅ RTR API is accessible:', response);
        this.snackBar.open(`RTR API is accessible - ${response.status}`, 'Close', { duration: 3000 });
      },
      error: (error) => {
        console.warn('⚠️ RTR API connectivity issue:', error);
        let errorMessage = 'RTR API not accessible';

        if (error.status === 0) {
          errorMessage = 'RTR API server is not running. Please start the backend server.';
        } else if (error.status === 404) {
          errorMessage = 'RTR API endpoint not found. Please check the API configuration.';
        } else if (error.status === 500) {
          errorMessage = 'RTR API server error. Please check backend logs.';
        } else if (error.message) {
          errorMessage = `RTR API error: ${error.message}`;
        }

        this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
      }
    });
  }

  // Test upload response structure
  testUploadResponseStructure(response: any) {
    console.log('🔍 Upload Response Structure Analysis:');
    console.log('Response type:', typeof response);
    console.log('Response keys:', Object.keys(response));
    console.log('Full response:', response);

    // Check for common ID field patterns
    const possibleIdFields = ['rtrid', 'rtrId', 'id', 'fileId', 'uploadId', 'file_id', 'upload_id'];
    const foundIdFields = possibleIdFields.filter(field => response[field] !== undefined);

    if (foundIdFields.length > 0) {
      console.log('✅ Found ID fields:', foundIdFields);
      foundIdFields.forEach(field => {
        console.log(`  ${field}:`, response[field]);
      });
    } else {
      console.log('❌ No ID fields found in response');
    }

    // Check for file information
    if (response.results && Array.isArray(response.results)) {
      console.log('📁 Results array found with', response.results.length, 'items');
      response.results.forEach((result: any, index: number) => {
        console.log(`  Result ${index}:`, result);
      });
    }
  }

  // Stepper event handlers
  onStepCompleted(event: { step: number; data: any }) {
    console.log(`Step ${event.step} completed:`, event.data);

    // Update stepper data with the new data from the step
    this.stepperData = { ...this.stepperData, ...event.data };

    // Show success message
    this.snackBar.open(`Step ${event.step} completed successfully!`, 'Close', { duration: 3000 });

    // Handle specific step completions
    switch (event.step) {
      case 1: // Upload completed
        if (event.data.rtrId) {
          this.currentRtrId = event.data.rtrId;
        }
        break;
      case 2: // Analysis completed
        if (event.data.analyzedData) {
          // Update the existing analysis data
          this.analysisResult = {
            success: true,
            analysis: event.data.analyzedData
          };
          this.newTickets = event.data.analyzedData.newTickets || [];
          this.inconsistentTickets = event.data.analyzedData.inconsistentTickets || [];
          this.matchingTickets = event.data.analyzedData.matchingTickets || [];
        }
        break;
      case 6: // Save completed
        if (event.data.saveResults) {
          // Reload RTR files after successful save
          this.loadRTRFiles();
        }
        break;
    }
  }

  onProcessCompleted(data: StepperData) {
    console.log('Process completed:', data);

    // Show final success message
    this.snackBar.open('RTR processing workflow completed successfully!', 'Close', { duration: 5000 });

    // Reload data
    this.loadRTRFiles();

    // Clear any existing analysis data since it's now saved
    this.clearAnalysisData();
  }

  // Test method to verify Excel/Database selection functionality
  runExcelDatabaseTest() {
    console.log('🧪 Starting Excel/Database Selection Test...');

    // Create test data
    const testInconsistencies = [
      {
        ticketId: 1001,
        ticketCode: 'TKT-001',
        taskWoNum: 'WO-001',
        address: '123 Main St',
        restWoNum: 'REST-001',
        field: 'address',
        excelValue: '123 Main Street',
        databaseValue: '123 Main St',
        userChoice: undefined
      },
      {
        ticketId: 1001,
        ticketCode: 'TKT-001',
        taskWoNum: 'WO-001',
        address: '123 Main St',
        restWoNum: 'REST-001',
        field: 'taskWoNum',
        excelValue: 'WO-001-EXCEL',
        databaseValue: 'WO-001-DB',
        userChoice: undefined
      },
      {
        ticketId: 1002,
        ticketCode: 'TKT-002',
        taskWoNum: 'WO-002',
        address: '456 Oak Ave',
        restWoNum: 'REST-002',
        field: 'address',
        excelValue: '456 Oak Avenue',
        databaseValue: '456 Oak Ave',
        userChoice: undefined
      }
    ];

    // Test 1: Select Excel for all fields
    console.log('\n📋 Test 1: Selecting Excel for all fields');
    this.userDecisions = {};

    testInconsistencies.forEach(item => {
      this.onDecisionChange(item.ticketId, item.field, 'excel');
    });

    console.log('User decisions after Excel selection:', JSON.stringify(this.userDecisions, null, 2));

    // Test 2: Select Database for all fields
    console.log('\n📋 Test 2: Selecting Database for all fields');
    this.userDecisions = {};

    testInconsistencies.forEach(item => {
      this.onDecisionChange(item.ticketId, item.field, 'database');
    });

    console.log('User decisions after Database selection:', JSON.stringify(this.userDecisions, null, 2));

    // Test 3: Mixed selection (Excel for some, Database for others)
    console.log('\n📋 Test 3: Mixed selection (Excel for some, Database for others)');
    this.userDecisions = {};

    // Select Excel for first item, Database for others
    this.onDecisionChange(testInconsistencies[0].ticketId, testInconsistencies[0].field, 'excel');
    this.onDecisionChange(testInconsistencies[1].ticketId, testInconsistencies[1].field, 'database');
    this.onDecisionChange(testInconsistencies[2].ticketId, testInconsistencies[2].field, 'excel');

    console.log('User decisions after mixed selection:', JSON.stringify(this.userDecisions, null, 2));

    // Test 4: Verify data structure for API submission
    console.log('\n📋 Test 4: Verifying data structure for API submission');
    const apiData = {
      rtrId: 999,
      newTickets: [],
      inconsistentTickets: testInconsistencies.map(item => ({
        ticketId: item.ticketId,
        ticketCode: item.ticketCode,
        taskWoNum: item.taskWoNum,
        address: item.address,
        restWoNum: item.restWoNum,
        excelData: { [item.field]: item.excelValue },
        databaseData: { [item.field]: item.databaseValue },
        inconsistencies: [{
          field: item.field,
          databaseField: item.field,
          excelValue: item.excelValue,
          databaseValue: item.databaseValue,
          type: 'text'
        }]
      })),
      decisions: this.userDecisions,
      missingInfoFilled: [],
      skippedRows: []
    };

    console.log('API submission data:', JSON.stringify(apiData, null, 2));

    console.log('\n✅ Excel/Database Selection Test completed!');

    // Show results in snackbar
    this.snackBar.open(
      'Excel/Database selection test completed. Check console for detailed results.',
      'Close',
      { duration: 8000 }
    );
  }

  // Method to show complete API structure
  showApiStructure() {
    console.log('📋 COMPLETE API STRUCTURE FOR BACKEND:');
    console.log('=====================================');

    // 1. Analysis Request
    console.log('\n1️⃣ ANALYSIS REQUEST (/rtr/stepper/analyze):');
    console.log(JSON.stringify({
      parsedData: [
        {
          RESTN_WO_NUM: "REST-001",
          TASK_WO_NUM: "WO-001",
          ADDRESS: "123 Main St",
          SQ_MI: 0.5,
          Earliest_Rpt_Dt: "2024-01-01",
          // ... other RTR fields
        }
      ]
    }, null, 2));

    // 2. Analysis Response
    console.log('\n2️⃣ ANALYSIS RESPONSE:');
    console.log(JSON.stringify({
      success: true,
      analysis: {
        newTickets: [
          {
            ticketCode: "TKT-NEW-001",
            excelData: { /* RTR data */ },
            taskWoNum: "WO-001",
            address: "123 Main St",
            restWoNum: "REST-001"
          }
        ],
        inconsistentTickets: [
          {
            ticketId: 1001,
            ticketCode: "TKT-001",
            taskWoNum: "WO-001",
            address: "123 Main St",
            restWoNum: "REST-001",
            excelData: { address: "123 Main Street" },
            databaseData: { address: "123 Main St" },
            inconsistencies: [
              {
                field: "address",
                databaseField: "address",
                excelValue: "123 Main Street",
                databaseValue: "123 Main St",
                type: "text"
              }
            ]
          }
        ],
        matchingTickets: [
          {
            ticketId: 1002,
            ticketCode: "TKT-002",
            taskWoNum: "WO-002",
            address: "456 Oak Ave",
            restWoNum: "REST-002",
            excelData: { /* RTR data */ },
            databaseData: { /* DB data */ }
          }
        ],
        missingInfo: [
          {
            ticketCode: "TKT-003",
            taskWoNum: "WO-003",
            address: "789 Pine St",
            restWoNum: "REST-003",
            row: { /* RTR row data */ },
            missingField: "SAP_ITEM_NUM",
            type: "required",
            description: "Missing SAP item number"
          }
        ],
        summary: {
          total: 10,
          new: 2,
          inconsistent: 3,
          matching: 4,
          missingInfo: 1
        }
      },
      message: "Analysis completed successfully"
    }, null, 2));

    // 3. Validation Request
    console.log('\n3️⃣ VALIDATION REQUEST (/rtr/stepper/validate):');
    console.log(JSON.stringify({
      rtrId: 123,
      newTickets: [/* new tickets array */],
      inconsistentTickets: [/* inconsistent tickets array */],
      decisions: {
        "1001": {
          "address": "excel",
          "taskWoNum": "database"
        }
      },
      missingInfoFilled: [
        {
          ticketCode: "TKT-003",
          data: {
            "SAP_ITEM_NUM": "SAP123456"
          }
        }
      ],
      skippedRows: [
        {
          ticketCode: "TKT-004",
          field: "NOTES2_RES",
          reason: "User chose to skip optional field"
        }
      ]
    }, null, 2));

    // 4. Save Request
    console.log('\n4️⃣ SAVE REQUEST (/rtr/stepper/save):');
    console.log(JSON.stringify({
      fileInfo: {
        originalName: "rtr_data.xlsx",
        buffer: "base64_encoded_file_content",
        size: 10240,
        mimetype: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      },
      newTickets: [/* new tickets array */],
      inconsistentTickets: [/* inconsistent tickets array */],
      decisions: {
        "1001": {
          "address": "excel",
          "taskWoNum": "database"
        }
      },
      missingInfoFilled: [/* filled missing info */],
      skippedRows: [/* skipped rows */],
      createdBy: 1,
      updatedBy: 1
    }, null, 2));

    console.log('\n✅ API Structure documentation completed!');
    this.snackBar.open('API structure logged to console. Check console for complete documentation.', 'Close', { duration: 5000 });
  }

  // Generate RTR functionality
  onGenerateRtrFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
        'application/octet-stream' // Fallback for some Excel files
      ];

      if (!allowedTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.xlsx') && !file.name.toLowerCase().endsWith('.xls')) {
        this.snackBar.open('Please select an Excel file (.xlsx or .xls)', 'Close', { duration: 3000 });
        return;
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        this.snackBar.open('File too large. Maximum size is 10MB.', 'Close', { duration: 3000 });
        return;
      }

      this.selectedGenerateFile = file;
      this.snackBar.open(`File selected: ${file.name}`, 'Close', { duration: 2000 });
    }
  }

  clearSelectedGenerateFile() {
    this.selectedGenerateFile = null;
    // Reset the file input
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  generateRtrWithDatabase() {
    if (!this.selectedGenerateFile) {
      this.snackBar.open('Please select a file first', 'Close', { duration: 3000 });
      return;
    }

    this.isGeneratingRtr = true;
    this.snackBar.open(`Generating updated RTR from ${this.selectedGenerateFile.name}...`, 'Close', { duration: 2000 });

    // Create FormData for file upload
    const formData = new FormData();
    formData.append('file', this.selectedGenerateFile);

    // Make API call to update with database
    this.rtrService.updateRtrWithDatabase(formData).subscribe({
      next: (response: any) => {
        console.log('Generate RTR response:', response);
        this.isGeneratingRtr = false;

        if (response.success) {
          this.generateRtrResult = response.data;
          this.processGenerateRtrResults(response.data);
          this.snackBar.open('RTR generated successfully!', 'Close', { duration: 5000 });
        } else {
          this.snackBar.open(`Generation failed: ${response.message || 'Unknown error'}`, 'Close', { duration: 5000 });
        }
      },
      error: (error: any) => {
        console.error('Generate RTR error:', error);
        this.isGeneratingRtr = false;
        this.snackBar.open(`Generation failed: ${error.error?.message || error.message || 'Unknown error'}`, 'Close', { duration: 5000 });
      }
    });
  }

  processGenerateRtrResults(data: any) {
    // Process summary data for the table - only show Total Rows and Updated Rows
    if (data.summary) {
      const total = data.summary.totalRows;
      this.summaryDataSource = [
        {
          metric: 'Total Rows',
          value: data.summary.totalRows,
          percentage: 100
        },
        {
          metric: 'Updated Rows',
          value: data.summary.updatedRows,
          percentage: total > 0 ? Math.round((data.summary.updatedRows / total) * 100) : 0
        }
      ];
    }
  }

  downloadGeneratedRtr() {
    if (!this.generateRtrResult?.downloadUrl) {
      this.snackBar.open('Download URL not available', 'Close', { duration: 3000 });
      return;
    }

    // Check if we have an object key for backend download
    if (this.generateRtrResult.objectKey) {
      console.log('Downloading generated RTR using object key:', this.generateRtrResult.objectKey);

      // URL-encode the object key to handle forward slashes
      const encodedObjectKey = encodeURIComponent(this.generateRtrResult.objectKey);
      console.log('Encoded object key:', encodedObjectKey);

      this.rtrService.downloadFileByKey(encodedObjectKey).subscribe({
        next: (blob: Blob) => {
          // Create blob URL and download
          if (typeof window !== 'undefined') {
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = this.generateRtrResult.generatedFileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
          }

          this.snackBar.open('Download started', 'Close', { duration: 3000 });
        },
        error: (error) => {
          console.error('Download failed:', error);
          console.error('Error details:', error.error);
          this.snackBar.open('Download failed. Please try again.', 'Close', { duration: 5000 });
        }
      });
    } else {
      // Fallback to direct URL download if no object key available
      console.log('Downloading generated RTR using direct URL:', this.generateRtrResult.downloadUrl);

      const link = document.createElement('a');
      link.href = this.generateRtrResult.downloadUrl;
      link.download = this.generateRtrResult.generatedFileName;
      link.target = '_blank';

      // Append to body, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      this.snackBar.open('Download started', 'Close', { duration: 3000 });
    }
  }

  resetGenerateRtr() {
    this.generateRtrResult = null;
    this.selectedGenerateFile = null;
    this.summaryDataSource = [];

    // Reset the file input
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  // Helper methods for styling
  getSummaryValueClass(metric: string): string {
    switch (metric) {
      case 'Total Rows':
        return 'total-rows';
      case 'Updated Rows':
        return 'updated-rows';
      case 'Changed Rows':
        return 'changed-rows';
      case 'Unchanged Rows':
        return 'unchanged-rows';
      case 'Not Found Rows':
        return 'not-found-rows';
      case 'Error Rows':
        return 'error-rows';
      default:
        return '';
    }
  }
}
