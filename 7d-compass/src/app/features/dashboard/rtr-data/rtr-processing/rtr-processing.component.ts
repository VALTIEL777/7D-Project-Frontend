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

@Component({
  selector: 'app-rtr-processing',
  imports: [DashboardLayoutComponent,
    DragDropUploadComponent,
     CardWithButtonComponent, MatTableModule, MatDividerModule, CommonModule, MATERIAL_MODULES, ],
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

  // User decisions for inconsistencies
  userDecisions: { [ticketId: string]: { [field: string]: 'excel' | 'database' } } = {};

  // Pasted data functionality
  pastedDataSource: any[] = [];
  pastedDisplayedColumns: string[] = [];
  private pastedText: string = '';

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

    // Add mock data for testing if API is not available
    if (this.receivedRTRs.length === 0) {
      this.addMockData();
    }
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
          this.receivedRTRs = response.rtrs;
          this.sentRTRs = response.rtrs; // For now, using same data for both

          // Update the base component's data arrays
          this.allData = [...this.receivedRTRs];
          this.filteredData = [...this.allData];
        } else {
          this.addMockData(); // Use mock data if API returns failure
        }
        this.isLoadingRTRs = false;
      },
      error: (error) => {
        console.error('Error loading RTR files:', error);
        this.snackBar.open('Using mock data for testing', 'Close', { duration: 3000 });
        this.addMockData(); // Use mock data on error
        this.isLoadingRTRs = false;
      }
    });
  }

  // Add mock data for testing
  addMockData() {
    const mockRTRs: RTRFile[] = [
      {
        rtrid: 1,
        name: 'RTR_2025_01_15.xlsx',
        url: '/api/rtr/download/1',
        createdat: '2025-01-15T10:30:00Z',
        updatedat: '2025-01-15T10:30:00Z'
      },
      {
        rtrid: 2,
        name: 'RTR_2025_01_10.xlsx',
        url: '/api/rtr/download/2',
        createdat: '2025-01-10T14:20:00Z',
        updatedat: '2025-01-10T14:20:00Z'
      },
      {
        rtrid: 3,
        name: 'RTR_2025_01_05.xlsx',
        url: '/api/rtr/download/3',
        createdat: '2025-01-05T09:15:00Z',
        updatedat: '2025-01-05T09:15:00Z'
      }
    ];

    this.receivedRTRs = mockRTRs;
    this.sentRTRs = mockRTRs;

    // Update the base component's data arrays
    this.allData = [...this.receivedRTRs];
    this.filteredData = [...this.allData];
  }

  // Generate mock analysis data for testing
  generateMockAnalysis() {
    const mockAnalysis: AnalysisResult = {
      success: true,
      analysis: {
        newTickets: [
          {
            ticketCode: 'WO123456',
            excelData: {
              RESTN_WO_NUM: 'WO123456',
              TASK_WO_NUM: 'TASK789',
              'PGL ComD:Wments': 'Sample comment',
              'Contractor Comments': 'Contractor note',
              SHOP: 'Shop1',
              SQ_MI: 1.5,
              Earliest_Rpt_Dt: '2025-01-15',
              ADDRESS: '123 Main St',
              STREET_FROM_RES: 'Oak St',
              STREET_TO_RES: 'Pine St',
              NOTES2_RES: 'Notes',
              SAP_ITEM_NUM: 'ITEM001',
              LOCATION2_RES: 'Austin, TX',
              length_x_width: '10x20',
              AGENCY_NO: 12345,
              ILL_ONLY: 'N',
              START_DATE: '2025-02-01',
              EXP_DATE: '2025-03-01',
              ticketType: 'regular'
            }
          }
        ],
        inconsistentTickets: [
          {
            ticketId: 2,
            ticketCode: 'WO789012',
            excelData: {
              RESTN_WO_NUM: 'WO789012',
              TASK_WO_NUM: 'TASK012',
              'PGL ComD:Wments': 'Updated comment',
              'Contractor Comments': 'Updated contractor note',
              SHOP: 'Shop2',
              SQ_MI: 2.0,
              Earliest_Rpt_Dt: '2025-01-20',
              ADDRESS: '456 Oak Ave',
              STREET_FROM_RES: 'Maple St',
              STREET_TO_RES: 'Elm St',
              NOTES2_RES: 'Updated notes',
              SAP_ITEM_NUM: 'ITEM002',
              LOCATION2_RES: 'Dallas, TX',
              length_x_width: '15x25',
              AGENCY_NO: 67890,
              ILL_ONLY: 'Y',
              START_DATE: '2025-02-15',
              EXP_DATE: '2025-03-15',
              ticketType: 'regular'
            },
            databaseData: {
              ticketId: 2,
              ticketCode: 'WO789012',
              comment7d: 'Old comment',
              quantity: 1.8
            },
            inconsistencies: [
              {
                field: 'PGL ComD:Wments',
                databaseField: 'comment7d',
                excelValue: 'Updated comment',
                databaseValue: 'Old comment',
                type: 'text'
              },
              {
                field: 'SQ_MI',
                databaseField: 'quantity',
                excelValue: 2.0,
                databaseValue: 1.8,
                type: 'number'
              }
            ]
          }
        ],
        matchingTickets: [
          {
            ticketId: 3,
            ticketCode: 'WO345678',
            excelData: {
              RESTN_WO_NUM: 'WO345678',
              'PGL ComD:Wments': 'Matching comment',
              SQ_MI: 1.5,
              Earliest_Rpt_Dt: '2025-01-25',
              ADDRESS: '789 Pine St'
            },
            databaseData: {
              ticketId: 3,
              ticketCode: 'WO345678',
              comment7d: 'Matching comment',
              quantity: 1.5
            }
          }
        ],
        summary: {
          total: 3,
          new: 1,
          inconsistent: 1,
          matching: 1
        }
      }
    };

    this.analysisResult = mockAnalysis;
    this.newTickets = mockAnalysis.analysis.newTickets;
    this.inconsistentTickets = mockAnalysis.analysis.inconsistentTickets;
    this.matchingTickets = mockAnalysis.analysis.matchingTickets || [];

    // Initialize user decisions
    this.userDecisions = {};
    this.inconsistentTickets.forEach(ticket => {
      this.userDecisions[ticket.ticketId.toString()] = {};
      ticket.inconsistencies.forEach(inconsistency => {
        this.userDecisions[ticket.ticketId.toString()][inconsistency.field] = 'database';
      });
    });
  }

  // Handle file upload from drag-drop component
  onFilesDropped(files: File[]) {
    if (files.length > 0) {
      const file = files[0];
      console.log('File dropped:', file.name);
      this.snackBar.open(`Processing file: ${file.name}`, 'Close', { duration: 2000 });
      this.currentUploadFileName = file.name;
      this.uploadRTRFile(file);
    }
  }

  // Enhanced file upload with analysis
  uploadRTRFile(file: File) {
    // Validate file type
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv' // .csv
    ];

    if (!allowedTypes.includes(file.type)) {
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

    this.isUploading = true;
    this.currentUploadFileName = file.name;
    this.currentRtrId = null; // Reset RTR ID
    console.log('Starting upload for file:', file.name);

    this.rtrService.uploadRTR(file).subscribe({
      next: (response) => {
        console.log('Upload response:', response);

        // Analyze the response structure for debugging
        this.testUploadResponseStructure(response);

        if (response.success) {
          // Extract RTR ID from response if available - check multiple possible field names
          if (response.rtrid) {
            this.currentRtrId = response.rtrid;
            console.log('RTR ID from upload (rtrid):', this.currentRtrId);
          } else if (response.rtrId) {
            this.currentRtrId = response.rtrId;
            console.log('RTR ID from upload (rtrId):', this.currentRtrId);
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
            `File "${file.name}" uploaded successfully! ${response.sheetCount} sheets processed.`,
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

          this.loadRTRFiles(); // Reload the list
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
        console.error('Upload error:', error);
        this.snackBar.open(
          `Upload failed: ${error.error?.error || error.message}`,
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
  downloadRTR(rtrId: number, fileName: string) {
    // Validate RTR ID
    if (!rtrId || rtrId === undefined) {
      console.error('Invalid RTR ID for download:', rtrId);
      this.snackBar.open('Invalid RTR ID for download', 'Close', { duration: 3000 });
      return;
    }

    console.log('Downloading RTR file with ID:', rtrId, 'FileName:', fileName);

    this.rtrService.downloadRTR(rtrId).subscribe({
      next: (blob) => {
        console.log('Download successful, blob size:', blob.size);
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        window.URL.revokeObjectURL(url);
        this.snackBar.open('File downloaded successfully', 'Close', { duration: 3000 });
      },
      error: (error) => {
        console.error('Download error:', error);
        this.snackBar.open('Download failed - using mock data for testing', 'Close', { duration: 3000 });
        // For testing purposes, create a mock download
        this.createMockDownload(fileName);
      }
    });
  }

  // Download current uploaded file
  downloadCurrentUploadedFile() {
    if (!this.currentRtrId) {
      console.error('No RTR ID available for current uploaded file');
      this.snackBar.open('No file available for download. Please upload a file first.', 'Close', { duration: 3000 });
      return;
    }

    if (!this.currentUploadFileName) {
      console.error('No filename available for current uploaded file');
      this.snackBar.open('No filename available for download.', 'Close', { duration: 3000 });
      return;
    }

    console.log('Downloading current uploaded file with ID:', this.currentRtrId, 'FileName:', this.currentUploadFileName);
    this.downloadRTR(this.currentRtrId, this.currentUploadFileName);
  }

  // Create mock download for testing
  createMockDownload(fileName: string) {
    const mockContent = `Mock RTR file content for ${fileName}
This is a test file created for demonstration purposes.
Date: ${new Date().toISOString()}
Ticket: P123456
Location: Austin, TX`;

    const blob = new Blob([mockContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName.replace('.xlsx', '_mock.txt');
    link.click();
    window.URL.revokeObjectURL(url);
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

    this.rtrService.testApiConnectivity().subscribe({
      next: (response) => {
        console.log('✅ RTR API is accessible:', response);
        this.snackBar.open('RTR API is accessible', 'Close', { duration: 3000 });
      },
      error: (error) => {
        console.warn('⚠️ RTR API connectivity issue:', error);
        this.snackBar.open(
          `RTR API not accessible: ${error.message || 'Unknown error'}`,
          'Close',
          { duration: 5000 }
        );
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
}
