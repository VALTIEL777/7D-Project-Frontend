import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface RTRFile {
  name: string;
  size: number;
  lastModified: string;
  type: 'uploaded' | 'generated';
  url: string;
}

export interface RTRData {
  RESTN_WO_NUM: string;
  TASK_WO_NUM?: string;
  'PGL ComD:Wments'?: string;
  'Contractor Comments'?: string;
  SHOP?: string;
  SQ_MI: number;
  Earliest_Rpt_Dt: string;
  ADDRESS: string;
  STREET_FROM_RES?: string;
  STREET_TO_RES?: string;
  NOTES2_RES?: string;
  SAP_ITEM_NUM?: string;
  LOCATION2_RES?: string;
  length_x_width?: string;
  AGENCY_NO?: string | number;
  ILL_ONLY?: string;
  START_DATE?: string;
  EXP_DATE?: string;
  ticketType?: string;
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

export interface MatchingTicket {
  ticketId: number;
  ticketCode: string;
  excelData: RTRData;
  databaseData: any;
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
    matchingTickets?: MatchingTicket[];
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

export interface TicketCreationResult {
  success: boolean;
  ticketId: number;
  incidentId: number;
  wayfindingId: number;
  addressId: number;
  permitId: number;
  message: string;
}

export interface TicketUpdateResult {
  ticketId: number;
  updated: boolean;
  message: string;
  updatedTicket: any;
}

export interface SaveDecisionsResponse {
  success: boolean;
  results: {
    newTicketsCreated: Array<{
      ticketCode: string;
      result: TicketCreationResult[];
    }>;
    ticketsUpdated: Array<{
      ticketId: number;
      ticketCode: string;
      result: TicketUpdateResult;
    }>;
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

  // Health check - matches API documentation
  healthCheck(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/health`).pipe(
      map(response => {
        console.log('Health check response:', response);
        return response;
      }),
      catchError(error => {
        console.error('Health check error:', error);
        return throwError(() => error);
      })
    );
  }

  // Upload an RTR Excel file - matches API documentation exactly
  uploadRTR(file: File, createdBy: number = 1, updatedBy: number = 1): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('createdBy', createdBy.toString());
    formData.append('updatedBy', updatedBy.toString());

    console.log('🚀 Uploading to:', `${this.baseUrl}/`);
    console.log('📁 File:', file.name, 'Size:', file.size, 'Type:', file.type);

    return this.http.post<any>(`${this.baseUrl}/`, formData).pipe(
      map(response => {
        console.log('✅ Upload response:', response);

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
        console.error('❌ Upload error:', error);

        // Provide more detailed error information
        let errorMessage = 'Upload failed';
        if (error.status === 500) {
          errorMessage = 'Server error - please check backend logs';
        } else if (error.status === 413) {
          errorMessage = 'File too large for server';
        } else if (error.status === 415) {
          errorMessage = 'Unsupported file type';
        } else if (error.status === 0) {
          errorMessage = 'Network error - please check your connection';
        } else if (error.error?.error) {
          errorMessage = error.error.error;
        } else if (error.message) {
          errorMessage = error.message;
        }

        return throwError(() => ({
          ...error,
          userMessage: errorMessage
        }));
      })
    );
  }

  // Analyze RTR data for conflicts - matches the exact API structure
  analyzeRTRData(data: RTRData[]): Observable<AnalysisResult> {
    const requestBody = { data };

    return this.http.post<AnalysisResult>(`${this.baseUrl}/analyze`, requestBody).pipe(
      map(response => {
        console.log('Analysis response:', response);
        return response;
      }),
      catchError(error => {
        console.error('Analysis error:', error);
        return throwError(() => error);
      })
    );
  }

  // Save RTR data with user decisions - matches the exact API structure
  saveWithDecisions(request: SaveDecisionsRequest): Observable<SaveDecisionsResponse> {
    return this.http.post<SaveDecisionsResponse>(`${this.baseUrl}/save-with-decisions`, request).pipe(
      map(response => {
        console.log('Save response:', response);
        return response;
      }),
      catchError(error => {
        console.error('Save error:', error);
        return throwError(() => error);
      })
    );
  }

  // Legacy save method for backward compatibility
  saveWithDecisionsLegacy(request: SaveRequest): Observable<SaveResult> {
    return this.http.post<SaveResult>(`${this.baseUrl}/save-with-decisions`, request).pipe(
      map(response => {
        console.log('Legacy save response:', response);
        return response;
      }),
      catchError(error => {
        console.error('Legacy save error:', error);
        return throwError(() => error);
      })
    );
  }

  // List RTR database records - matches API documentation
  listRTRRecords(): Observable<{ success: boolean; rtrs: any[] }> {
    return this.http.get<{ success: boolean; rtrs: any[] }>(`${this.baseUrl}/list`).pipe(
      map(response => {
        console.log('RTR records response:', response);
        return response;
      }),
      catchError(error => {
        console.error('Error listing RTR records:', error);
        return throwError(() => error);
      })
    );
  }

  // List RTR files - updated for new API structure
  listRTRs(): Observable<{ success: boolean; files: { uploaded: RTRFile[]; generated: RTRFile[] } }> {
    return this.http.get<{ success: boolean; files: { uploaded: RTRFile[]; generated: RTRFile[] } }>(`${this.baseUrl}/files`).pipe(
      map(response => {
        console.log('RTR files response:', response);
        return response;
      }),
      catchError(error => {
        console.error('Error listing RTR files:', error);
        // Return empty structure on error
        return throwError(() => ({
          success: false,
          files: {
            uploaded: [],
            generated: []
          }
        }));
      })
    );
  }

  // Download RTR file
  downloadRTR(rtrId: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/download/${rtrId}`, { responseType: 'blob' }).pipe(
      catchError(error => {
        console.error('Download error:', error);
        return throwError(() => error);
      })
    );
  }

  // Test API connectivity
  testApiConnectivity(): Observable<any> {
    return this.healthCheck().pipe(
      map(response => {
        console.log('✅ RTR API is accessible:', response);
        return response;
      }),
      catchError(error => {
        console.warn('⚠️ RTR API connectivity issue:', error);
        return throwError(() => error);
      })
    );
  }

  // Get API information
  getApiInfo(): any {
    return {
      baseUrl: this.baseUrl,
      endpoints: {
        health: `${this.baseUrl}/health`,
        upload: `${this.baseUrl}/`,
        list: `${this.baseUrl}/list`,
        files: `${this.baseUrl}/files`,
        download: `${this.baseUrl}/download/{rtrId}`,
        analyze: `${this.baseUrl}/analyze`,
        saveWithDecisions: `${this.baseUrl}/save-with-decisions`
      }
    };
  }
}
