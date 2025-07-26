import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

// Interfaces basadas en la documentación Swagger
export interface Permit {
  PermitId?: number;
  permitId?: number;
  permitid?: number;
  permitNumber?: string;
  permitnumber?: string;
  status: boolean | string;
  startDate?: string;
  startdate?: string;
  expireDate?: string;
  expiredate?: string;
  createdBy: number;
  updatedBy: number;
  deletedAt?: string | null;
  deletedat?: string | null;
}

export interface PermitResponse {
  PermitId: number;
  permitNumber: string;
}

export interface PermitsApiResponse {
  message: string;
  permits: Permit[];
}

export interface DeleteResponse {
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class PermitService {
  private readonly baseUrl = environment.permitServiceUrl;

  constructor(private http: HttpClient) {
    console.log('🔧 PermitService inicializado con URL:', this.baseUrl);
  }

  /**
   * Crear un nuevo permiso
   * POST /permits
   */
  createPermit(permit: Permit): Observable<PermitResponse> {
    console.log('🚀 PermitService.createPermit() llamado');
    console.log('📡 URL de la API:', `${this.baseUrl}`);
    console.log('📦 Datos del permiso:', permit);
    
    return this.http.post<PermitResponse>(`${this.baseUrl}`, permit).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtener un permiso por ID
   * GET /permits/{PermitId}
   */
  getPermitById(permitId: number): Observable<Permit> {
    console.log('🚀 PermitService.getPermitById() llamado con ID:', permitId);
    console.log('📡 URL completa:', `${this.baseUrl}/${permitId}`);
    
    return this.http.get<Permit>(`${this.baseUrl}/${permitId}`).pipe(
      map(response => {
        console.log('✅ Respuesta de getPermitById:', response);
        return response;
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Obtener todos los permisos
   * GET /permits
   */
  getAllPermits(): Observable<Permit[]> {
    console.log('🚀 PermitService.getAllPermits() llamado');
    
    return this.http.get<any>(`${this.baseUrl}`).pipe(
      map(response => {
        console.log('📊 Respuesta completa de la API:', response);
        
        // Manejar diferentes formatos de respuesta
        let permits: any[] = [];
        
        if (Array.isArray(response)) {
          // La API devuelve directamente un array de permisos
          console.log('📋 La API devolvió un array directo de permisos');
          permits = response;
        } else if (response && response.permits && Array.isArray(response.permits)) {
          // La API devuelve un objeto con propiedad 'permits'
          console.log('📋 La API devolvió un objeto con propiedad permits');
          permits = response.permits;
        } else {
          console.log('⚠️ Formato de respuesta inesperado:', response);
          return [];
        }
        
        console.log('📋 Número de permisos encontrados:', permits.length);
        
        // Normalizar los datos para que coincidan con nuestra interfaz
        const normalizedPermits = permits.map(permit => {
          console.log('🔧 Normalizando permiso original:', permit);
          
          const normalized = {
            PermitId: permit.permitid || permit.permitId || permit.PermitId,
            permitId: permit.permitid || permit.permitId || permit.PermitId, // Mantener también en minúsculas
            permitid: permit.permitid || permit.permitId || permit.PermitId, // Mantener también en minúsculas
            permitNumber: permit.permitnumber || permit.permitNumber,
            permitnumber: permit.permitnumber || permit.permitNumber, // Mantener también en minúsculas
            status: permit.status,
            startDate: permit.startdate || permit.startDate,
            startdate: permit.startdate || permit.startDate, // Mantener también en minúsculas
            expireDate: permit.expiredate || permit.expireDate,
            expiredate: permit.expiredate || permit.expireDate, // Mantener también en minúsculas
            createdBy: permit.createdby || permit.createdBy || 1,
            updatedBy: permit.updatedby || permit.updatedBy || 1,
            deletedAt: permit.deletedat || permit.deletedAt || null
          };
          
          console.log('✅ Permiso normalizado:', normalized);
          return normalized;
        });
        
        // Filtrar permisos eliminados (soft delete)
        const activePermits = normalizedPermits.filter(permit => !permit.deletedAt);
        console.log('📊 Permisos activos (no eliminados):', activePermits.length);
        console.log('🗑️ Permisos eliminados filtrados:', normalizedPermits.length - activePermits.length);
        
        console.log('✅ Permisos normalizados finales:', activePermits);
        return activePermits;
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Actualizar un permiso por ID
   * PUT /permits/{PermitId}
   */
  updatePermit(permitId: number, permit: Partial<Permit>): Observable<PermitResponse> {
    console.log('🚀 PermitService.updatePermit() llamado con ID:', permitId);
    console.log('📦 Datos de actualización:', permit);
    
    return this.http.put<PermitResponse>(`${this.baseUrl}/${permitId}`, permit).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Eliminar un permiso por ID
   * DELETE /permits/{PermitId}
   */
  deletePermit(permitId: number): Observable<DeleteResponse> {
    console.log('🚀 PermitService.deletePermit() llamado con ID:', permitId);
    console.log('📡 URL completa:', `${this.baseUrl}/${permitId}`);
    
    return this.http.delete<DeleteResponse>(`${this.baseUrl}/${permitId}`).pipe(
      map(response => {
        console.log('✅ Respuesta de deletePermit:', response);
        return response;
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Manejador de errores centralizado
   */
  private handleError(error: HttpErrorResponse) {
    console.error('❌ Error en PermitService:', error);
    
    let errorMessage = 'Ha ocurrido un error desconocido';
    
    if (error.error instanceof ErrorEvent) {
      // Error del lado del cliente
      errorMessage = `Error del cliente: ${error.error.message}`;
    } else {
      // Error del lado del servidor
      switch (error.status) {
        case 404:
          errorMessage = 'Permiso no encontrado';
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
        getById: `${this.baseUrl}/{permitId}`,
        getAll: `${this.baseUrl}`,
        update: `${this.baseUrl}/{permitId}`,
        delete: `${this.baseUrl}/{permitId}`
      }
    };
  }
}
