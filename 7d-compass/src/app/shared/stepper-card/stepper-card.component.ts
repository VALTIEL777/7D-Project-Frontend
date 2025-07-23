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
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DragDropUploadComponent } from '../drag-drop-upload/drag-drop-upload.component';
import { SearchDialogComponent } from '../search-dialog/search-dialog.component';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { environment } from '../../../environments/environment';

// API Response Interfaces
export interface StepperUploadResponse {
  success: boolean;
  rtrId: number;
  rtrName: string;
  fileUrl: string;
  parsedData: any[];
  totalRows: number;
  message: string;
}

export interface StepperAnalyzeResponse {
  success: boolean;
  analysis: {
    newTickets: Array<{
      ticketCode: string;
      excelData: any;
      taskWoNum: string;
      address: string;
      restWoNum: string;
    }>;
    inconsistentTickets: Array<{
      taskWoNum: string;
      address: string;
      restWoNum: string;
      excelData: any;
      databaseData: {
        ticketid: number;
        ticketcode: string;
        [key: string]: any;
      };
      inconsistencies: Array<{
        field: string;
        databaseField: string;
        excelValue: any;
        databaseValue: any;
        type: string;
        taskWoNum: string;
        address: string;
        restWoNum: string;
      }>;
    }>;
    matchingTickets: Array<{
      taskWoNum: string;
      address: string;
      restWoNum: string;
      excelData: any;
      databaseData: {
        ticketid: number;
        ticketcode: string;
        [key: string]: any;
      };
    }>;
    missingInfo: Array<{
      ticketCode: string;
      taskWoNum: string;
      address: string;
      restWoNum: string;
      row: any;
      missingField?: string;
      missingFields?: Array<{
        field: string;
        name: string;
        type: string;
      }>;
      type: string;
      description: string;
    }>;
    summary: {
      total: number;
      new: number;
      inconsistent: number;
      matching: number;
      missingInfo: number;
    };
  };
  message: string;
}

export interface StepperValidateResponse {
  success: boolean;
  validation: {
    isValid: boolean;
    errors: any[];
    warnings: any[];
    summary: {
      totalTickets: number;
      validTickets: number;
      invalidTickets: number;
      skippedTickets: number;
    };
  };
  message: string;
}

export interface StepperSaveResponse {
  success: boolean;
  results: {
    newTicketsCreated: Array<{
      ticketCode: string;
      result: any[];
    }>;
    ticketsUpdated: Array<{
      ticketId: number;
      ticketCode: string;
      result: any;
    }>;
    skippedTickets: Array<{
      ticketCode: string;
      reason: string;
    }>;
    errors: any[];
    summary: {
      total: number;
      created: number;
      updated: number;
      skipped: number;
      failed: number;
    };
  };
  generatedFileUrl: string;
  message: string;
}

export interface StepperData {
  uploadedFile?: File;
  analyzedData?: any;
  inconsistencies?: any[];
  missingInfo?: any[];
  validationResults?: any[];
  saveResults?: any;
  rtrId?: number;
  parsedData?: any[];
  userDecisions?: { [ticketId: string]: { [field: string]: 'excel' | 'database' } };
  missingInfoFilled?: any[];
  skippedRows?: any[];
}

export interface InconsistencyItem {
  ticketId: number;
  ticketCode: string;
  taskWoNum: string;
  address: string;
  restWoNum: string;
  field: string;
  excelValue: any;
  databaseValue: any;
  userChoice?: 'excel' | 'database';
}

export interface MissingInfoItem {
  field: string;
  label: string;
  value: any;
  required: boolean;
  type: 'text' | 'number' | 'email' | 'select' | 'textarea';
  options?: { value: any; label: string }[];
  ticketCode?: string;
  address?: string;
  row?: any;
}

export interface ValidationResult {
  field: string;
  isValid: boolean;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

@Component({
  selector: 'app-stepper-card',
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
    FormsModule,
    ReactiveFormsModule,
    DragDropUploadComponent
  ],
  templateUrl: './stepper-card.component.html',
  styleUrls: ['./stepper-card.component.scss']
})
export class StepperCardComponent {
  @Input() title: string = 'RTR Processing Stepper';
  @Input() data: StepperData = {};
  @Output() stepCompleted = new EventEmitter<{ step: number; data: any }>();
  @Output() processCompleted = new EventEmitter<StepperData>();
  @ViewChild('stepper') stepper!: MatStepper;

  // Step validation properties
  isLinear = true; // Enable linear mode to prevent skipping steps

  // Loading states
  isStep1Loading = false;
  isStep2Loading = false;
  isStep3Loading = false;
  isStep4Loading = false;
  isStep5Loading = false;
  isStep6Loading = false;

  // Step data
  uploadedFile: File | null = null;
  analyzedData: any = null;
  inconsistencies: InconsistencyItem[] = [];
  missingInfo: MissingInfoItem[] = [];
  validationResults: ValidationResult[] = [];
  saveResults: any = null;

  // API data
  rtrId: number | null = null;
  parsedData: any[] = [];
  userDecisions: { [ticketId: string]: { [field: string]: 'excel' | 'database' } } = {};
  missingInfoFilled: any[] = [];
  skippedRows: any[] = [];
  originalParsedTickets: { [ticketCode: string]: any } = {};

  // Display columns for tables
  inconsistencyColumns: string[] = ['ticket', 'field', 'excelValue', 'databaseValue', 'choice'];
  missingInfoColumns: string[] = ['ticket', 'field', 'value', 'required', 'actions'];
  validationColumns: string[] = ['field', 'status', 'message'];

  // Pagination properties
  currentPage = 0;
  itemsPerPage = 10;

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

    const formData = new FormData();
    formData.append('file', this.uploadedFile);

    this.http.post<StepperUploadResponse>(`${environment.apiUrl}/rtr/stepper/upload`, formData)
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.rtrId = response.rtrId;
            this.parsedData = response.parsedData;
            // Build originalParsedTickets as an object mapping ticketCode to ticket data
            this.originalParsedTickets = {};
            if (Array.isArray(response.parsedData)) {
              response.parsedData.forEach(ticket => {
                if (ticket.TASK_WO_NUM) {
                  this.originalParsedTickets[ticket.TASK_WO_NUM] = ticket;
                }
              });
            }

            this.snackBar.open(response.message, 'Close', { duration: 3000 });
            this.stepCompleted.emit({ step: 1, data: { uploadedFile: this.uploadedFile, rtrId: this.rtrId, parsedData: this.parsedData } });
          } else {
            this.snackBar.open(`Upload failed: ${response.message}`, 'Close', { duration: 5000 });
          }
          this.isStep1Loading = false;
        },
        error: (error) => {
          console.error('Upload error:', error);
          this.snackBar.open('Upload failed. Please try again.', 'Close', { duration: 5000 });
          this.isStep1Loading = false;
        }
      });
  }

  // Reset stepper state when a new file is uploaded
  private resetStepperState() {
    this.analyzedData = null;
    this.inconsistencies = [];
    this.missingInfo = [];
    this.validationResults = [];
    this.saveResults = null;
    this.rtrId = null;
    this.parsedData = [];
    this.userDecisions = {};
    this.missingInfoFilled = [];
    this.skippedRows = [];
    this.originalParsedTickets = {};

    // Reset loading states
    this.isStep1Loading = false;
    this.isStep2Loading = false;
    this.isStep3Loading = false;
    this.isStep4Loading = false;
    this.isStep5Loading = false;
    this.isStep6Loading = false;

    // Reset stepper
    this.stepper.reset();
  }

  // Clear uploaded file
  clearUploadedFile() {
    this.uploadedFile = null;
    this.resetStepperState();
    this.snackBar.open('File cleared. You can now upload a new file.', 'Close', { duration: 3000 });
  }

  // Step 2: Analyze Data
  analyzeData() {
    if (!this.parsedData.length) {
      this.snackBar.open('No data to analyze. Please upload a file first.', 'Close', { duration: 3000 });
      return;
    }

    this.isStep2Loading = true;

    const analysisRequest = {
      parsedData: this.parsedData
    };

    console.log('🔍 ANALYSIS REQUEST JSON:');
    console.log('URL:', `${environment.apiUrl}/rtr/stepper/analyze`);
    console.log('Request Body:', JSON.stringify(analysisRequest, null, 2));

    this.http.post<StepperAnalyzeResponse>(`${environment.apiUrl}/rtr/stepper/analyze`, analysisRequest)
      .subscribe({
        next: (response) => {
          console.log('✅ ANALYSIS RESPONSE:', response);
          if (response.success) {
            this.analyzedData = response.analysis;

            // Convert inconsistencies to our format - one row per ticket with the first inconsistency
            this.inconsistencies = [];
            console.log('Processing inconsistent tickets:', response.analysis.inconsistentTickets?.length || 0);

            response.analysis.inconsistentTickets.forEach((ticket, index) => {
              // Debug: Log the full ticket object to see what fields are available
              console.log(`🔍 Processing inconsistent ticket ${index}:`, JSON.stringify(ticket, null, 2));

              // Use the actual ticketId from the backend
              const ticketId = ticket.databaseData.ticketid;

              if (!ticketId) {
                console.error('❌ Ticket without ticketId found:', ticket);
                return; // Skip this ticket as requested by backend
              }

              // Take the first inconsistency for this ticket to display in UI
              if (ticket.inconsistencies && ticket.inconsistencies.length > 0) {
                const firstInconsistency = ticket.inconsistencies[0];
                console.log('Adding inconsistency for ticket:', ticket.databaseData.ticketcode, 'field:', firstInconsistency.field, 'ticketId:', ticketId);

                this.inconsistencies.push({
                  ticketId: ticketId,
                  ticketCode: ticket.databaseData.ticketcode,
                  taskWoNum: ticket.taskWoNum || 'N/A',
                  address: ticket.address || 'N/A',
                  restWoNum: ticket.restWoNum || 'N/A',
                  field: firstInconsistency.field,
                  excelValue: firstInconsistency.excelValue,
                  databaseValue: firstInconsistency.databaseValue
                });

                // Initialize user decisions for ALL inconsistencies in this ticket
                if (!this.userDecisions[ticketId.toString()]) {
                  this.userDecisions[ticketId.toString()] = {};
                }

                // Set default choice (database) for all inconsistencies in this ticket
                ticket.inconsistencies.forEach(inconsistency => {
                  this.userDecisions[ticketId.toString()][inconsistency.field] = 'database';
                });
              }
            });

            // Convert missing info to our format - handle both single and multiple missing fields
            this.missingInfo = [];
            response.analysis.missingInfo.forEach(item => {
              // Ensure the original parsed data for this ticket is in originalParsedTickets
              if (item.ticketCode && item.row) {
                this.originalParsedTickets[item.ticketCode] = item.row;
              }

              // Handle single missing field
              if (item.missingField) {
                this.missingInfo.push({
                  field: item.missingField,
                  label: item.missingField.replace(/^Edit\s+/i, ''),
                  value: item.row[item.missingField] || null,
                  required: item.type === 'critical' || item.type === 'required',
                  type: 'text',
                  ticketCode: item.ticketCode || 'N/A',
                  address: item.address || item.row.ADDRESS || 'N/A',
                  row: item.row
                });
              }
              // Handle multiple missing fields
              else if (item.missingFields && Array.isArray(item.missingFields)) {
                item.missingFields.forEach(field => {
                  this.missingInfo.push({
                    field: field.field,
                    label: field.name.replace(/^Edit\s+/i, ''),
                    value: item.row[field.field] || null,
                    required: field.type === 'required',
                    type: 'text',
                    ticketCode: item.ticketCode || 'N/A',
                    address: item.address || item.row.ADDRESS || 'N/A',
                    row: item.row
                  });
                });
              }
            });

            // Reset pagination to first page when new data is loaded
            this.currentPage = 0;

            console.log('Final inconsistencies array length:', this.inconsistencies.length);

            this.snackBar.open(response.message, 'Close', { duration: 3000 });
            this.stepCompleted.emit({ step: 2, data: { analyzedData: this.analyzedData } });

            // Initialize user choices for inconsistencies
            this.initializeUserChoices();
          } else {
            this.snackBar.open(`Analysis failed: ${response.message}`, 'Close', { duration: 5000 });
          }
          this.isStep2Loading = false;
        },
        error: (error) => {
          console.error('Analysis error:', error);
          this.snackBar.open('Analysis failed. Please try again.', 'Close', { duration: 5000 });
          this.isStep2Loading = false;
        }
      });
  }

  // Step 3: Review Inconsistencies
  onInconsistencyChoice(item: InconsistencyItem, choice: 'excel' | 'database') {
    item.userChoice = choice;

    // Update user decisions for ALL inconsistencies in this ticket
    if (item.ticketId) {
      if (!this.userDecisions[item.ticketId.toString()]) {
        this.userDecisions[item.ticketId.toString()] = {};
      }

      // Find the original ticket data to get all inconsistencies
      const originalTicket = this.analyzedData?.inconsistentTickets?.find(
        (ticket: any) => ticket.databaseData.ticketid === item.ticketId
      );

      if (originalTicket) {
        // Apply the choice to all inconsistencies for this ticket
        originalTicket.inconsistencies.forEach((inconsistency: any) => {
          this.userDecisions[item.ticketId.toString()][inconsistency.field] = choice;
        });
      } else {
        // Fallback: just update the displayed field
        this.userDecisions[item.ticketId.toString()][item.field] = choice;
      }
    } else {
      console.warn('Inconsistency item without ticketId:', item);
    }
  }

  reviewInconsistencies() {
    this.isStep3Loading = true;

    // Simulate API call for finding inconsistencies
    setTimeout(() => {
      this.isStep3Loading = false;

      console.log('Review inconsistencies - analyzedData:', this.analyzedData);
      console.log('Review inconsistencies - inconsistencies array:', this.inconsistencies);
      console.log('Review inconsistencies - userDecisions:', this.userDecisions);

      // Check if we have inconsistencies from the analysis step
      if (this.analyzedData?.inconsistentTickets && this.analyzedData.inconsistentTickets.length > 0) {
        console.log('Found inconsistencies from analysis:', this.analyzedData.inconsistentTickets.length);
        console.log('Inconsistencies array length:', this.inconsistencies.length);

        if (this.inconsistencies.length > 0) {
          this.snackBar.open(`Found ${this.inconsistencies.length} inconsistencies to review. Please make your selections.`, 'Close', { duration: 3000 });
        } else {
          this.snackBar.open(`Found ${this.analyzedData.inconsistentTickets.length} tickets with inconsistencies, but none were processed.`, 'Close', { duration: 3000 });
        }
      } else if (this.inconsistencies.length === 0) {
        console.log('No inconsistencies found during analysis');
        this.snackBar.open('No inconsistencies found. You can proceed to the next step.', 'Close', { duration: 3000 });
      }

      this.stepCompleted.emit({ step: 3, data: { inconsistencies: this.inconsistencies } });
    }, 1000);
  }

  // Step 4: Fill Missing Information
  fillMissingInfo() {
    this.isStep4Loading = true;

    // Simulate API call for finding missing info
    setTimeout(() => {
      this.isStep4Loading = false;

      // If no missing info was found during analysis, we can still proceed
      if (this.missingInfo.length === 0) {
        this.snackBar.open('No missing information found. You can proceed to the next step.', 'Close', { duration: 3000 });
      }

      this.stepCompleted.emit({ step: 4, data: { missingInfo: this.missingInfo } });
    }, 1000);
  }

  editMissingInfo(item: MissingInfoItem) {
    const dialogRef = this.dialog.open(SearchDialogComponent, {
      width: '500px',
      data: {
        title: `Edit ${item.label}`,
        data: { [item.field]: item.value },
        excludedFields: [],
        customFields: [{
          key: item.field,
          label: item.label,
          value: item.value,
          type: item.type,
          required: item.required
        }]
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        item.value = result[item.field];

        // Find or create the entry for this ticket
        let entry = this.missingInfoFilled.find(f => f.ticketCode === item.ticketCode);
        if (!entry) {
          entry = { ticketCode: item.ticketCode, data: {} };
          this.missingInfoFilled.push(entry);
        }
        entry.data[item.field] = item.value;

        // Debug log after updating missingInfoFilled
        console.log('DEBUG: missingInfoFilled after edit:', JSON.stringify(this.missingInfoFilled, null, 2));
      }
    });
  }

  skipMissingInfo(item: MissingInfoItem) {
    // Add to skipped rows
    this.skippedRows.push({
      ticketCode: item.ticketCode,
      field: item.field,
      reason: 'User chose to skip optional field'
    });

    // Remove from missing info list
    const index = this.missingInfo.findIndex(mi =>
      mi.ticketCode === item.ticketCode && mi.field === item.field
    );
    if (index >= 0) {
      this.missingInfo.splice(index, 1);
    }

    this.snackBar.open(`Skipped ${item.label}`, 'Close', { duration: 2000 });
  }

  // Step 5: Validate Data
  validateData() {
    if (!this.analyzedData) {
      this.snackBar.open('No RTR data to validate. Please complete the analysis step first.', 'Close', { duration: 3000 });
      return;
    }

    // Check if all inconsistencies have been resolved (only if there are inconsistencies)
    if (this.analyzedData.inconsistentTickets && this.analyzedData.inconsistentTickets.length > 0) {
      const unresolvedInconsistencies = this.checkUnresolvedInconsistencies();
      if (unresolvedInconsistencies.length > 0) {
        this.snackBar.open(`Please resolve all inconsistencies before validation. ${unresolvedInconsistencies.length} ticket(s) still need decisions.`, 'Close', { duration: 5000 });
        return;
      }
    }

    this.isStep5Loading = true;

    // Build a set of relevant ticket codes (from missingInfoFilled and inconsistentTickets)
    const relevantTicketCodes = new Set([
      ...this.missingInfoFilled.map(t => t.ticketCode),
      ...((this.analyzedData?.inconsistentTickets || []).map((t: any) => t.ticketCode))
    ]);
    // Build the filtered originalParsedTickets
    const filteredOriginalParsedTickets: { [ticketCode: string]: any } = {};
    relevantTicketCodes.forEach(code => {
      if (this.originalParsedTickets[code]) {
        filteredOriginalParsedTickets[code] = this.originalParsedTickets[code];
      }
    });

    // Fix inconsistent tickets structure - ensure each has ticketCode
    const fixedInconsistentTickets = (this.analyzedData?.inconsistentTickets || []).map((ticket: any) => ({
      ...ticket,
      ticketCode: ticket.databaseData?.ticketcode || ticket.taskWoNum || 'UNKNOWN'
    }));

    // Fix missingInfoFilled structure - include all required fields
    const fixedMissingInfoFilled = this.missingInfoFilled.map(item => {
      const originalData = this.originalParsedTickets[item.ticketCode] || {};
      return {
        ticketCode: item.ticketCode,
        data: {
          // Include all required fields from original data
          RESTN_WO_NUM: originalData.RESTN_WO_NUM || item.data?.RESTN_WO_NUM || '',
          TASK_WO_NUM: originalData.TASK_WO_NUM || item.data?.TASK_WO_NUM || item.ticketCode || '',
          ADDRESS: originalData.ADDRESS || item.data?.ADDRESS || '',
          // Include any additional fields from user input
          ...item.data
        }
      };
    });

    // Build the full validation payload including only relevant originalParsedTickets
    const validationData = {
      originalParsedTickets: filteredOriginalParsedTickets,
      newTickets: this.analyzedData?.newTickets || [],
      inconsistentTickets: fixedInconsistentTickets,
      decisions: this.userDecisions,
      missingInfoFilled: fixedMissingInfoFilled,
      skippedRows: Array.isArray(this.skippedRows) ? this.skippedRows : []
    };
    // Print the entire JSON request as a single object
    console.log('DEBUG: Validation request body being sent:', JSON.stringify(validationData, null, 2));

    this.http.post<StepperValidateResponse>(`${environment.apiUrl}/rtr/stepper/validate`, validationData)
      .subscribe({
        next: (response) => {
          console.log('Validation response:', response);

          if (response.success) {
            // Convert validation results to our format
            this.validationResults = [];

            if (response.validation.errors.length > 0) {
              response.validation.errors.forEach(error => {
                this.validationResults.push({
                  field: error.field || 'General',
                  isValid: false,
                  message: error.message || 'Validation error',
                  severity: 'error'
                });
              });
            }

            if (response.validation.warnings.length > 0) {
              response.validation.warnings.forEach(warning => {
                this.validationResults.push({
                  field: warning.field || 'General',
                  isValid: true,
                  message: warning.message || 'Warning',
                  severity: 'warning'
                });
              });
            }

            // Add success messages for valid tickets
            if (response.validation.summary.validTickets > 0) {
              this.validationResults.push({
                field: 'Data Validation',
                isValid: true,
                message: `${response.validation.summary.validTickets} tickets are valid`,
                severity: 'info'
              });
            }

            // If no validation results were added, add a default success message
            if (this.validationResults.length === 0) {
              this.validationResults.push({
                field: 'Data Validation',
                isValid: true,
                message: 'All data has been validated successfully',
                severity: 'info'
              });
            }

            this.snackBar.open(response.message, 'Close', { duration: 3000 });
            this.stepCompleted.emit({ step: 5, data: { validationResults: this.validationResults } });
          } else {
            console.error('Validation failed:', response.message);
            this.snackBar.open(`Validation failed: ${response.message}`, 'Close', { duration: 5000 });
          }
          this.isStep5Loading = false;
        },
        error: (error) => {
          console.error('Validation error:', error);
          console.error('Error details:', {
            status: error.status,
            statusText: error.statusText,
            error: error.error,
            message: error.message
          });

          let errorMessage = 'Validation failed. Please try again.';
          if (error.error?.message) {
            errorMessage = `Validation failed: ${error.error.message}`;
          } else if (error.message) {
            errorMessage = `Validation failed: ${error.message}`;
          }

          this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
          this.isStep5Loading = false;
        }
      });
  }

  getValidationIcon(result: ValidationResult): string {
    if (result.isValid) {
      return result.severity === 'warning' ? 'warning' : 'check_circle';
    }
    return 'error';
  }

  getValidationColor(result: ValidationResult): string {
    switch (result.severity) {
      case 'error': return '#f44336';
      case 'warning': return '#ff9800';
      case 'info': return '#4caf50';
      default: return '#9e9e9e';
    }
  }

  // Step 6: Save to Database
  saveToDatabase() {
    if (!this.analyzedData) {
      this.snackBar.open('No RTR data to save. Please complete the analysis step first.', 'Close', { duration: 3000 });
      return;
    }

    if (!this.uploadedFile) {
      this.snackBar.open('No file available for saving. Please upload a file first.', 'Close', { duration: 3000 });
      return;
    }

    this.isStep6Loading = true;

    // First check if backend is accessible
    this.http.get(`${environment.apiUrl}/health`).subscribe({
      next: () => {
        console.log('✅ Backend is accessible, proceeding with save');
        this.performSave();
      },
      error: (error) => {
        console.error('❌ Backend health check failed:', error);
        this.snackBar.open('Backend server is not accessible. Please check if the server is running.', 'Close', { duration: 5000 });
        this.isStep6Loading = false;
      }
    });
  }

  private performSave() {
    // Convert file to base64 for sending to backend
    const reader = new FileReader();
    reader.onload = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1]; // Remove data URL prefix

      // Build a set of relevant ticket codes (from missingInfoFilled and inconsistentTickets)
      const relevantTicketCodes = new Set([
        ...this.missingInfoFilled.map(t => t.ticketCode),
        ...((this.analyzedData?.inconsistentTickets || []).map((t: any) => t.ticketCode))
      ]);
      // Build the filtered originalParsedTickets
      const filteredOriginalParsedTickets: { [ticketCode: string]: any } = {};
      relevantTicketCodes.forEach(code => {
        if (this.originalParsedTickets[code]) {
          filteredOriginalParsedTickets[code] = this.originalParsedTickets[code];
        }
      });

      // Fix inconsistent tickets structure - ensure each has ticketCode
      const fixedInconsistentTickets = (this.analyzedData?.inconsistentTickets || []).map((ticket: any) => ({
        ...ticket,
        ticketCode: ticket.databaseData?.ticketcode || ticket.taskWoNum || 'UNKNOWN'
      }));

      // Fix missingInfoFilled structure - include all required fields
      const fixedMissingInfoFilled = this.missingInfoFilled.map(item => {
        const originalData = this.originalParsedTickets[item.ticketCode] || {};
        return {
          ticketCode: item.ticketCode,
          data: {
            // Include all required fields from original data
            RESTN_WO_NUM: originalData.RESTN_WO_NUM || item.data?.RESTN_WO_NUM || '',
            TASK_WO_NUM: originalData.TASK_WO_NUM || item.data?.TASK_WO_NUM || item.ticketCode || '',
            ADDRESS: originalData.ADDRESS || item.data?.ADDRESS || '',
            // Include any additional fields from user input
            ...item.data
          }
        };
      });

      // Build the full save payload matching the validation endpoint structure
      const saveData = {
        fileInfo: {
          originalName: this.uploadedFile!.name,
          buffer: base64Data,
          size: this.uploadedFile!.size,
          mimetype: this.uploadedFile!.type
        },
        originalParsedTickets: filteredOriginalParsedTickets,
        newTickets: this.analyzedData?.newTickets || [],
        inconsistentTickets: fixedInconsistentTickets,
        decisions: this.userDecisions,
        missingInfoFilled: fixedMissingInfoFilled,
        skippedRows: Array.isArray(this.skippedRows) ? this.skippedRows : [],
        createdBy: 1, // TODO: Get from auth service
        updatedBy: 1  // TODO: Get from auth service
      };

      // Debug log for the full save request body
      console.log('DEBUG: Save request body being sent:', JSON.stringify(saveData, null, 2));

      // Validate the save data before sending
      const validationErrors = this.validateSaveData(saveData);
      if (validationErrors.length > 0) {
        console.error('❌ Save data validation failed:', validationErrors);
        this.snackBar.open(`Save validation failed: ${validationErrors.join(', ')}`, 'Close', { duration: 5000 });
        this.isStep6Loading = false;
        return;
      }

      // Additional validation for data consistency
      console.log('🔍 VALIDATION CHECKS:');
      console.log('- Has analyzedData:', !!this.analyzedData);
      console.log('- Has uploadedFile:', !!this.uploadedFile);
      console.log('- originalParsedTickets length:', Object.keys(saveData.originalParsedTickets).length);
      console.log('- missingInfoFilled length:', saveData.missingInfoFilled.length);
      console.log('- newTickets length:', saveData.newTickets.length);
      console.log('- inconsistentTickets length:', saveData.inconsistentTickets.length);

      console.log('Saving data with file info:', {
        fileName: this.uploadedFile!.name,
        fileSize: this.uploadedFile!.size,
        originalParsedTicketsCount: Object.keys(saveData.originalParsedTickets).length,
        missingInfoFilledCount: saveData.missingInfoFilled.length,
        newTicketsCount: saveData.newTickets.length,
        inconsistentTicketsCount: saveData.inconsistentTickets.length
      });

      console.log('🔍 SAVE REQUEST JSON:');
      console.log('URL:', `${environment.apiUrl}/rtr/stepper/save`);
      console.log('Request Body:', JSON.stringify(saveData, null, 2));

      // Add detailed debugging for each section
      console.log('📋 SAVE DATA BREAKDOWN:');
      console.log('- fileInfo:', saveData.fileInfo);
      console.log('- originalParsedTickets:', saveData.originalParsedTickets);
      console.log('- newTickets:', saveData.newTickets);
      console.log('- inconsistentTickets:', saveData.inconsistentTickets);
      console.log('- decisions:', saveData.decisions);
      console.log('- missingInfoFilled:', saveData.missingInfoFilled);
      console.log('- skippedRows:', saveData.skippedRows);

      this.http.post<StepperSaveResponse>(`${environment.apiUrl}/rtr/stepper/save`, saveData)
        .subscribe({
          next: (response) => {
            console.log('✅ Save response received:', response);

            if (response.success) {
              this.saveResults = response.results;

              this.snackBar.open(response.message, 'Close', { duration: 5000 });
              this.stepCompleted.emit({ step: 6, data: { saveResults: this.saveResults } });

              // Automatically restart the stepper after successful save
              setTimeout(() => {
                this.completeProcess();
              }, 2000); // Wait 2 seconds to show the success message
            } else {
              console.error('❌ Save failed with response:', response);
              this.snackBar.open(`Save failed: ${response.message}`, 'Close', { duration: 5000 });
            }
            this.isStep6Loading = false;
          },
          error: (error) => {
            console.error('❌ Save error:', error);
            console.error('Error details:', {
              status: error.status,
              statusText: error.statusText,
              error: error.error,
              message: error.message,
              url: error.url
            });

            // Log the request data that was sent
            console.error('Request data that was sent:', {
              originalParsedTicketsCount: Object.keys(saveData.originalParsedTickets).length,
              missingInfoFilledCount: saveData.missingInfoFilled.length,
              newTicketsCount: saveData.newTickets.length,
              inconsistentTicketsCount: saveData.inconsistentTickets.length
            });

            let errorMessage = 'Save failed. Please try again.';

            // Try to extract more specific error information
            if (error.error?.message) {
              errorMessage = `Save failed: ${error.error.message}`;
            } else if (error.error?.error) {
              errorMessage = `Save failed: ${error.error.error}`;
            } else if (error.error?.detail) {
              errorMessage = `Save failed: ${error.error.detail}`;
            } else if (error.message) {
              errorMessage = `Save failed: ${error.message}`;
            }

            // Add specific messages for common 500 errors
            if (error.status === 500) {
              errorMessage += ' (Server error - please check backend logs)';
            }

            this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
            this.isStep6Loading = false;
          }
        });
    };

    reader.onerror = () => {
      console.error('Error reading file for save');
      this.snackBar.open('Error reading file for save. Please try again.', 'Close', { duration: 5000 });
      this.isStep6Loading = false;
    };

    reader.readAsDataURL(this.uploadedFile!);
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
      case 4: return !!this.analyzedData; // Need analyzed data (inconsistencies and missing info are optional)
      case 5: return !!this.analyzedData; // Need analyzed data
      case 6: return !!this.validationResults.length; // Need validation results
      default: return false;
    }
  }

  isStepCompleted(step: number): boolean {
    switch (step) {
      case 1: return !!this.uploadedFile;
      case 2: return !!this.analyzedData;
      case 3: return !!this.analyzedData; // Step 3 is considered complete if analysis is done
      case 4: return !!this.analyzedData; // Step 4 is considered complete if analysis is done
      case 5: return !!this.validationResults.length;
      case 6: return !!this.saveResults;
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

  private checkUnresolvedInconsistencies(): string[] {
    const unresolvedTickets: string[] = [];

    if (this.analyzedData?.inconsistentTickets) {
      for (const ticket of this.analyzedData.inconsistentTickets) {
        // Use the actual ticketId from the backend
        const ticketId = ticket.databaseData.ticketid;

        if (!ticketId) {
          console.error('❌ Ticket without ticketId found during check:', ticket);
          continue; // Skip this ticket
        }

        const ticketDecisions = this.userDecisions[ticketId.toString()];

        // Check if all inconsistencies for this ticket have decisions
        const hasAllDecisions = ticket.inconsistencies && ticket.inconsistencies.every((inconsistency: any) => {
          return ticketDecisions && ticketDecisions[inconsistency.field];
        });

        if (!hasAllDecisions) {
          unresolvedTickets.push(ticket.databaseData.ticketcode || `Ticket ${ticketId}`);
        }
      }
    }

    return unresolvedTickets;
  }

  private initializeUserChoices() {
    // Set default choices for all inconsistencies
    if (this.analyzedData?.inconsistentTickets) {
      this.analyzedData.inconsistentTickets.forEach((ticket: any, index: number) => {
        // Use the actual ticketId from the backend
        const ticketId = ticket.databaseData.ticketid;

        if (!ticketId) {
          console.error('❌ Ticket without ticketId found during initialization:', ticket);
          return; // Skip this ticket
        }

        if (!this.userDecisions[ticketId.toString()]) {
          this.userDecisions[ticketId.toString()] = {};
        }

        // Set default choice (database) for all inconsistencies
        if (ticket.inconsistencies) {
          ticket.inconsistencies.forEach((inconsistency: any) => {
            this.userDecisions[ticketId.toString()][inconsistency.field] = 'database';
          });
        }
      });
    }

    // Update the displayed inconsistencies with default choices
    this.inconsistencies.forEach(item => {
      item.userChoice = 'database';
    });
  }

  private validateSaveData(saveData: any): string[] {
    const errors: string[] = [];

    // Validate originalParsedTickets - should be an object, not an array
    if (!saveData.originalParsedTickets || typeof saveData.originalParsedTickets !== 'object') {
      errors.push('Missing or invalid originalParsedTickets object');
    }

    // Validate missingInfoFilled
    if (!saveData.missingInfoFilled || !Array.isArray(saveData.missingInfoFilled)) {
      errors.push('Missing or invalid missingInfoFilled array');
    }

    // Validate newTickets
    if (!saveData.newTickets || !Array.isArray(saveData.newTickets)) {
      errors.push('Missing or invalid newTickets array');
    }

    // Validate inconsistentTickets
    if (!saveData.inconsistentTickets || !Array.isArray(saveData.inconsistentTickets)) {
      errors.push('Missing or invalid inconsistentTickets array');
    }

    // Validate decisions
    if (!saveData.decisions || typeof saveData.decisions !== 'object') {
      errors.push('Missing or invalid decisions object');
    }

    // Validate skippedRows
    if (!saveData.skippedRows || !Array.isArray(saveData.skippedRows)) {
      errors.push('Missing or invalid skippedRows array');
    }

    // Validate fileInfo (for save endpoint)
    if (saveData.fileInfo) {
      if (!saveData.fileInfo.originalName || !saveData.fileInfo.buffer || !saveData.fileInfo.size) {
        errors.push('Missing required fileInfo fields (originalName, buffer, size)');
      }
    }

    return errors;
  }

  // Test method to verify Excel/Database selection functionality
  testExcelDatabaseSelection() {
    console.log('🧪 Starting Excel/Database Selection Test...');

    // Create test data
    const testInconsistencies: InconsistencyItem[] = [
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
      this.onInconsistencyChoice(item, 'excel');
    });

    console.log('User decisions after Excel selection:', JSON.stringify(this.userDecisions, null, 2));

    // Validate Excel selection
    const excelValidation = this.validateUserDecisions(testInconsistencies, 'excel');
    console.log('Excel selection validation:', excelValidation);

    // Test 2: Select Database for all fields
    console.log('\n📋 Test 2: Selecting Database for all fields');
    this.userDecisions = {};

    testInconsistencies.forEach(item => {
      this.onInconsistencyChoice(item, 'database');
    });

    console.log('User decisions after Database selection:', JSON.stringify(this.userDecisions, null, 2));

    // Validate Database selection
    const databaseValidation = this.validateUserDecisions(testInconsistencies, 'database');
    console.log('Database selection validation:', databaseValidation);

    // Test 3: Mixed selection (Excel for some, Database for others)
    console.log('\n📋 Test 3: Mixed selection (Excel for some, Database for others)');
    this.userDecisions = {};

    // Select Excel for first item, Database for others
    this.onInconsistencyChoice(testInconsistencies[0], 'excel');
    this.onInconsistencyChoice(testInconsistencies[1], 'database');
    this.onInconsistencyChoice(testInconsistencies[2], 'excel');

    console.log('User decisions after mixed selection:', JSON.stringify(this.userDecisions, null, 2));

    // Test 4: Verify data structure for API submission
    console.log('\n📋 Test 4: Verifying data structure for API submission');
    const apiData = this.prepareDataForAPI(testInconsistencies);
    console.log('API submission data:', JSON.stringify(apiData, null, 2));

    // Test 5: Validate that all inconsistencies are resolved
    console.log('\n📋 Test 5: Validating all inconsistencies are resolved');
    const unresolvedInconsistencies = this.checkUnresolvedInconsistencies();
    console.log('Unresolved inconsistencies:', unresolvedInconsistencies);

    // Test 6: Simulate validation step
    console.log('\n📋 Test 6: Simulating validation step');
    const validationData = {
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

    console.log('Validation data structure:', JSON.stringify(validationData, null, 2));

    // Test 7: Verify choice persistence
    console.log('\n📋 Test 7: Verifying choice persistence');
    const originalDecisions = JSON.parse(JSON.stringify(this.userDecisions));

    // Simulate component reset
    this.userDecisions = {};

    // Restore decisions
    this.userDecisions = originalDecisions;

    console.log('Decisions after reset and restore:', JSON.stringify(this.userDecisions, null, 2));
    console.log('Decisions match original:', JSON.stringify(this.userDecisions) === JSON.stringify(originalDecisions));

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
            taskWoNum: "WO-001",
            address: "123 Main St",
            restWoNum: "REST-001",
            excelData: { address: "123 Main Street" },
            databaseData: { ticketid: 1001, ticketcode: "TKT-001", address: "123 Main St" },
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
            taskWoNum: "WO-002",
            address: "456 Oak Ave",
            restWoNum: "REST-002",
            excelData: { /* RTR data */ },
            databaseData: { ticketid: 1002, ticketcode: "TKT-002", address: "456 Oak Ave" }
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
      originalParsedTickets: [
        {
          RESTN_WO_NUM: "REST-001",
          TASK_WO_NUM: "WO-001",
          ADDRESS: "123 Main St",
          SQ_MI: 0.5,
          Earliest_Rpt_Dt: "2024-01-01",
          // ... other RTR fields
        }
      ],
      missingInfoFilled: [
        {
          ticketCode: "TKT-003",
          data: {
            "SAP_ITEM_NUM": "SAP123456"
          }
        }
      ]
    }, null, 2));

    console.log('\n✅ API Structure documentation completed!');
    this.snackBar.open('API structure logged to console. Check console for complete documentation.', 'Close', { duration: 5000 });
  }

  // Helper method to validate user decisions
  private validateUserDecisions(inconsistencies: InconsistencyItem[], expectedChoice: 'excel' | 'database'): {
    isValid: boolean;
    details: string[];
    errors: string[];
  } {
    const details: string[] = [];
    const errors: string[] = [];
    let isValid = true;

    // Group by ticketId
    const ticketsByGroup = this.groupInconsistenciesByTicket(inconsistencies);

    ticketsByGroup.forEach((ticketInconsistencies, ticketId) => {
      const ticketDecisions = this.userDecisions[ticketId];

      if (!ticketDecisions) {
        errors.push(`No decisions found for ticket ${ticketId}`);
        isValid = false;
        return;
      }

      ticketInconsistencies.forEach(inconsistency => {
        const decision = ticketDecisions[inconsistency.field];

        if (!decision) {
          errors.push(`No decision for ticket ${ticketId}, field ${inconsistency.field}`);
          isValid = false;
        } else if (decision !== expectedChoice) {
          errors.push(`Expected ${expectedChoice} for ticket ${ticketId}, field ${inconsistency.field}, got ${decision}`);
          isValid = false;
        } else {
          details.push(`✓ Ticket ${ticketId}, field ${inconsistency.field}: ${decision}`);
        }
      });
    });

    return { isValid, details, errors };
  }

  // Helper method to group inconsistencies by ticket
  private groupInconsistenciesByTicket(inconsistencies: InconsistencyItem[]): Map<string, InconsistencyItem[]> {
    const grouped = new Map<string, InconsistencyItem[]>();

    inconsistencies.forEach(item => {
      const ticketId = item.ticketId.toString();
      if (!grouped.has(ticketId)) {
        grouped.set(ticketId, []);
      }
      grouped.get(ticketId)!.push(item);
    });

    return grouped;
  }

  // Helper method to prepare data for API submission
  private prepareDataForAPI(inconsistencies: InconsistencyItem[]): any {
    const ticketsByGroup = this.groupInconsistenciesByTicket(inconsistencies);
    const inconsistentTickets: any[] = [];

    ticketsByGroup.forEach((ticketInconsistencies, ticketId) => {
      const firstInconsistency = ticketInconsistencies[0];
      const ticketDecisions = this.userDecisions[ticketId] || {};

      const ticketData = {
        ticketId: firstInconsistency.ticketId,
        ticketCode: firstInconsistency.ticketCode,
        taskWoNum: firstInconsistency.taskWoNum,
        address: firstInconsistency.address,
        restWoNum: firstInconsistency.restWoNum,
        excelData: {} as Record<string, any>,
        databaseData: {} as Record<string, any>,
        inconsistencies: ticketInconsistencies.map(item => ({
          field: item.field,
          databaseField: item.field,
          excelValue: item.excelValue,
          databaseValue: item.databaseValue,
          type: 'text',
          userChoice: ticketDecisions[item.field] || 'database'
        }))
      };

      // Build excelData and databaseData objects
      ticketInconsistencies.forEach(item => {
        const choice = ticketDecisions[item.field] || 'database';
        if (choice === 'excel') {
          ticketData.excelData[item.field] = item.excelValue;
        } else {
          ticketData.databaseData[item.field] = item.databaseValue;
        }
      });

      inconsistentTickets.push(ticketData);
    });

    return {
      rtrId: 999,
      newTickets: [],
      inconsistentTickets,
      decisions: this.userDecisions,
      missingInfoFilled: [],
      skippedRows: []
    };
  }

  // Batch choose all for inconsistencies
  batchChooseAll(choice: 'excel' | 'database') {
    // Apply to ALL inconsistencies, not just the displayed ones
    this.inconsistencies.forEach(item => {
      item.userChoice = choice;
      if (item.ticketId) {
        if (!this.userDecisions[item.ticketId.toString()]) {
          this.userDecisions[item.ticketId.toString()] = {};
        }
        // Find the original ticket data to get all inconsistencies
        const originalTicket = this.analyzedData?.inconsistentTickets?.find(
          (ticket: any) => ticket.databaseData.ticketid === item.ticketId
        );
        if (originalTicket) {
          originalTicket.inconsistencies.forEach((inconsistency: any) => {
            this.userDecisions[item.ticketId.toString()][inconsistency.field] = choice;
          });
        } else {
          this.userDecisions[item.ticketId.toString()][item.field] = choice;
        }
      }
    });

    // Show success message with total count
    this.snackBar.open(`Applied ${choice} choice to all ${this.inconsistencies.length} inconsistencies`, 'Close', { duration: 3000 });
  }

  // Pagination methods
  getDisplayedInconsistencies(): InconsistencyItem[] {
    const startIndex = this.currentPage * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.inconsistencies.slice(startIndex, endIndex);
  }

  getTotalPages(): number {
    return Math.ceil(this.inconsistencies.length / this.itemsPerPage);
  }

  previousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
    }
  }

  nextPage(): void {
    if (this.currentPage < this.getTotalPages() - 1) {
      this.currentPage++;
    }
  }

  goToPage(page: number): void {
    if (page >= 0 && page < this.getTotalPages()) {
      this.currentPage = page;
    }
  }
}
