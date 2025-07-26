import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

// Interfaces basadas en la documentación Swagger
export interface PermitedTicket {
  permitId: number;
  ticketId: number;
  createdBy: number;
  updatedBy: number;
}

export interface PermitedTicketApiResponse {
  permitid: number;
  ticketid: number;
  createdat: string;
  updatedat: string;
  deletedat: string | null;
  createdby: number;
  updatedby: number;
}

export interface PermitedTicketResponse {
  permitId: number;
  ticketId: number;
}

export interface DeleteResponse {
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class PermitedticketsService {
  private readonly baseUrl = environment.permitedTicketsServiceUrl;

  constructor(private http: HttpClient) {
    console.log('🔧 PermitedticketsService inicializado con URL:', this.baseUrl);
  }

  /**
   * Crear una nueva asociación de permiso-ticket
   * POST /permitedtickets
   */
  createPermitedTickets(permitedTicket: PermitedTicket): Observable<PermitedTicketResponse> {
    console.log('🚀 PermitedticketsService.createPermitedTickets() llamado');
    console.log('📡 URL de la API:', `${this.baseUrl}`);
    console.log('📦 Datos de la asociación:', permitedTicket);
    
    // Convertir a la estructura que espera la API
    const apiData = {
      permitid: permitedTicket.permitId,
      ticketid: permitedTicket.ticketId,
      createdby: permitedTicket.createdBy,
      updatedby: permitedTicket.updatedBy
    };
    
    console.log('📦 Datos para la API:', apiData);
    
    return this.http.post<PermitedTicketResponse>(`${this.baseUrl}`, apiData).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtener una asociación de permiso-ticket por permitId y ticketId
   * GET /permitedtickets/{permitId}/{ticketId}
   */
  getPermitedTicketsById(permitId: number, ticketId: number): Observable<PermitedTicket> {
    console.log('🚀 PermitedticketsService.getPermitedTicketsById() llamado');
    console.log('📋 PermitId:', permitId, 'TicketId:', ticketId);
    
    return this.http.get<PermitedTicket>(`${this.baseUrl}/${permitId}/${ticketId}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtener todas las asociaciones de permisos-tickets
   * GET /permitedtickets
   */
  getAllPermitedTickets(): Observable<PermitedTicket[]> {
    console.log('🚀 PermitedticketsService.getAllPermitedTickets() llamado');
    
    return this.http.get<PermitedTicketApiResponse[]>(`${this.baseUrl}`).pipe(
      map(response => {
        console.log('📊 Respuesta completa de permitedtickets API:', response);
        console.log('📋 Número de asociaciones:', response.length);
        
        // Normalizar los datos para que coincidan con nuestra interfaz
        const normalizedPermitedTickets = response.map(item => ({
          permitId: item.permitid,
          ticketId: item.ticketid,
          createdBy: item.createdby,
          updatedBy: item.updatedby
        }));
        
        console.log('✅ Permited tickets normalizados:', normalizedPermitedTickets);
        return normalizedPermitedTickets;
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Actualizar una asociación de permiso-ticket por permitId y ticketId
   * PUT /permitedtickets/{permitId}/{ticketId}
   */
  updatePermitedTickets(permitId: number, ticketId: number, updateData: { updatedBy: number }): Observable<PermitedTicketResponse> {
    console.log('🚀 PermitedticketsService.updatePermitedTickets() llamado');
    console.log('📋 PermitId:', permitId, 'TicketId:', ticketId);
    console.log('📦 Datos de actualización:', updateData);
    
    return this.http.put<PermitedTicketResponse>(`${this.baseUrl}/${permitId}/${ticketId}`, updateData).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Eliminar una asociación de permiso-ticket por permitId y ticketId
   * DELETE /permitedtickets/{permitId}/{ticketId}
   */
  deletePermitedTickets(permitId: number, ticketId: number): Observable<DeleteResponse> {
    console.log('🚀 PermitedticketsService.deletePermitedTickets() llamado');
    console.log('📋 PermitId:', permitId, 'TicketId:', ticketId);
    
    return this.http.delete<DeleteResponse>(`${this.baseUrl}/${permitId}/${ticketId}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtener todas las asociaciones de un permiso específico
   * GET /permitedtickets?permitId={permitId}
   */
  getPermitedTicketsByPermitId(permitId: number): Observable<PermitedTicket[]> {
    console.log('🚀 PermitedticketsService.getPermitedTicketsByPermitId() llamado');
    console.log('📋 PermitId:', permitId);
    
    return this.http.get<PermitedTicket[]>(`${this.baseUrl}?permitId=${permitId}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtener todas las asociaciones de un ticket específico
   * GET /permitedtickets?ticketId={ticketId}
   */
  getPermitedTicketsByTicketId(ticketId: number): Observable<PermitedTicket[]> {
    console.log('🚀 PermitedticketsService.getPermitedTicketsByTicketId() llamado');
    console.log('📋 TicketId:', ticketId);
    
    return this.http.get<PermitedTicket[]>(`${this.baseUrl}?ticketId=${ticketId}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Manejador de errores centralizado
   */
  private handleError(error: HttpErrorResponse) {
    console.error('❌ Error en PermitedticketsService:', error);
    
    let errorMessage = 'Ha ocurrido un error desconocido';
    
    if (error.error instanceof ErrorEvent) {
      // Error del lado del cliente
      errorMessage = `Error del cliente: ${error.error.message}`;
    } else {
      // Error del lado del servidor
      switch (error.status) {
        case 404:
          errorMessage = 'Asociación de permiso-ticket no encontrada';
          break;
        case 400:
          errorMessage = 'Datos de entrada inválidos';
          break;
        case 500:
          errorMessage = 'Error interno del servidor';
          break;
        default:
          errorMessage = `Error del servidor: ${error.status} - ${error.message}`;
      }
    }
    
    console.error('📋 Mensaje de error:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }

  /**
   * Obtener información de la API
   */
  getApiInfo(): any {
    return {
      baseUrl: this.baseUrl,
      endpoints: {
        create: `${this.baseUrl}`,
        getById: `${this.baseUrl}/{permitId}/{ticketId}`,
        getAll: `${this.baseUrl}`,
        update: `${this.baseUrl}/{permitId}/{ticketId}`,
        delete: `${this.baseUrl}/{permitId}/{ticketId}`,
        getByPermitId: `${this.baseUrl}?permitId={permitId}`,
        getByTicketId: `${this.baseUrl}?ticketId={ticketId}`
      }
    };
  }
}
