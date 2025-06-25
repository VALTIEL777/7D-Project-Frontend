import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface RTRFile {
  rtrId: number;
  name: string;
  url: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface RTRData {
  RESTN_WO_NUM: string;
  TASK_WO_NUM: string;
  'PGL ComD:Wments': string;
  'Contractor Comments': string;
  SHOP: string;
  SQ_MI: number;
  Earliest_Rpt_Dt: string;
  ADDRESS: string;
  STREET_FROM_RES: string;
  STREET_TO_RES: string;
  NOTES2_RES: string;
  SAP_ITEM_NUM: string;
  LOCATION2_RES: string;
  length_x_width: string;
  AGENCY_NO: number;
  ILL_ONLY: string;
  START_DATE: string;
  EXP_DATE: string;
}

export interface Inconsistency {
  field: string;
  databaseField: string;
  excelValue: any;
  databaseValue: any;
  type: 'text' | 'string' | 'number' | 'date';
}

export interface NewTicket {
  excelData: RTRData;
  ticketCode: string;
}

export interface InconsistentTicket {
  ticketId: number;
  ticketCode: string;
  excelData: RTRData;
  databaseData: any;
  inconsistencies: Inconsistency[];
}

export interface AnalysisSummary {
  total: number;
  new: number;
  inconsistent: number;
  matching: number;
}

export interface AnalysisResult {
  success: boolean;
  analysis: {
    newTickets: NewTicket[];
    inconsistentTickets: InconsistentTicket[];
    summary: AnalysisSummary;
  };
}

export interface SaveDecisionsRequest {
  newTickets: NewTicket[];
  inconsistentTickets: InconsistentTicket[];
  decisions: { [ticketId: string]: { [field: string]: 'excel' | 'database' } };
  createdBy: number;
  updatedBy: number;
}

export interface SaveDecisionsResponse {
  success: boolean;
  results: {
    newTicketsCreated: any[];
    ticketsUpdated: any[];
    errors: any[];
  };
}

// Legacy interfaces for backward compatibility
export interface UserDecisions {
  [ticketId: string]: {
    [field: string]: 'excel' | 'database';
  };
}

export interface SaveRequest {
  newTickets: NewTicket[];
  inconsistentTickets: InconsistentTicket[];
  decisions: UserDecisions;
  createdBy: number;
  updatedBy: number;
}

export interface SaveResult {
  success: boolean;
  results: {
    newTicketsCreated: Array<{
      ticketCode: string;
      result: any;
    }>;
    ticketsUpdated: Array<{
      ticketId: number;
      ticketCode: string;
      result: any;
    }>;
    errors: any[];
  };
}

@Injectable({
  providedIn: 'root'
})
export class RTRService {
  private baseUrl = environment.rtrServiceUrl;

  constructor(private http: HttpClient) {}

  // Upload an RTR Excel file with compatibility layer
  uploadRTR(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<any>(`${this.baseUrl}/`, formData).pipe(
      map(response => {
        // Handle different response formats
        if (response.success !== undefined) {
          return response;
        }
        // If response doesn't have success property, assume it's successful
        return {
          success: true,
          sheetCount: response.sheetCount || 1,
          results: response.results || response.data || [],
          ...response
        };
      }),
      catchError(error => {
        console.error('Upload error:', error);
        return throwError(() => error);
      })
    );
  }

  // Analyze RTR data for conflicts with compatibility layer
  analyzeRTRData(data: RTRData[]): Observable<AnalysisResult> {
    return this.http.post<any>(`${this.baseUrl}/analyze`, { data }).pipe(
      map(response => {
        // Handle different response formats
        if (response.success !== undefined) {
          return response as AnalysisResult;
        }
        // If response doesn't have success property, assume it's successful
        return {
          success: true,
          analysis: response.analysis || response,
          ...response
        } as AnalysisResult;
      }),
      catchError(error => {
        console.error('Analysis error:', error);
        return throwError(() => error);
      })
    );
  }

  // Save RTR data with user decisions (enhanced version) with compatibility layer
  saveWithDecisions(request: SaveDecisionsRequest): Observable<SaveDecisionsResponse> {
    return this.http.post<any>(`${this.baseUrl}/save-with-decisions`, request).pipe(
      map(response => {
        // Handle different response formats
        if (response.success !== undefined) {
          return response as SaveDecisionsResponse;
        }
        // If response doesn't have success property, assume it's successful
        return {
          success: true,
          results: response.results || {
            newTicketsCreated: response.newTicketsCreated || [],
            ticketsUpdated: response.ticketsUpdated || [],
            errors: response.errors || []
          },
          ...response
        } as SaveDecisionsResponse;
      }),
      catchError(error => {
        console.error('Save error:', error);
        return throwError(() => error);
      })
    );
  }

  // Legacy save method for backward compatibility
  saveWithDecisionsLegacy(request: SaveRequest): Observable<SaveResult> {
    return this.http.post<any>(`${this.baseUrl}/save-with-decisions`, request).pipe(
      map(response => {
        // Handle different response formats
        if (response.success !== undefined) {
          return response as SaveResult;
        }
        // If response doesn't have success property, assume it's successful
        return {
          success: true,
          results: response.results || {
            newTicketsCreated: response.newTicketsCreated || [],
            ticketsUpdated: response.ticketsUpdated || [],
            errors: response.errors || []
          },
          ...response
        } as SaveResult;
      }),
      catchError(error => {
        console.error('Save error:', error);
        return throwError(() => error);
      })
    );
  }

  // List all RTR Excel files with compatibility layer
  listRTRs(): Observable<{ success: boolean; rtrs: RTRFile[] }> {
    return this.http.get<any>(`${this.baseUrl}/list`).pipe(
      map(response => {
        // Handle different response formats
        if (response.success !== undefined) {
          return response;
        }
        // If response doesn't have success property, assume it's successful
        return {
          success: true,
          rtrs: response.rtrs || response.data || [],
          ...response
        };
      }),
      catchError(error => {
        console.error('List RTRs error:', error);
        return throwError(() => error);
      })
    );
  }

  // Download a specific RTR Excel file by rtrId
  downloadRTR(rtrId: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/download/${rtrId}`, { responseType: 'blob' }).pipe(
      catchError(error => {
        console.error('Download error:', error);
        return throwError(() => error);
      })
    );
  }

  // Test API connectivity and get endpoint information
  testApiConnectivity(): Observable<any> {
    return this.http.get(`${environment.apiUrl}/health`).pipe(
      map(response => {
        console.log('API Health Check Response:', response);
        return response;
      }),
      catchError(error => {
        console.error('API Health Check Error:', error);
        // Return a mock response for testing
        return throwError(() => ({
          error: 'API not available',
          status: error.status,
          message: 'RTR API endpoint is not responding. Check if the backend server is running.',
          details: error
        }));
      })
    );
  }

  // Get API endpoint information for debugging
  getApiInfo(): any {
    return {
      baseUrl: this.baseUrl,
      endpoints: {
        upload: `${this.baseUrl}/`,
        analyze: `${this.baseUrl}/analyze`,
        save: `${this.baseUrl}/save-with-decisions`,
        list: `${this.baseUrl}/list`,
        download: `${this.baseUrl}/download/{rtrId}`,
        health: `${this.baseUrl}/health`
      }
    };
  }
}
