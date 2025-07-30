import { Component, ViewChild, OnDestroy } from '@angular/core';
import { SitejobLayoutComponent } from '../../../shared/sitejob-layout/sitejob-layout.component';
import { CardWithButtonComponent } from '../../../shared/card-with-button/card-with-button.component';
import { MatTableModule } from '@angular/material/table';
import { MatDividerModule } from '@angular/material/divider';
import { CommonModule } from '@angular/common';
import { MATERIAL_MODULES } from '../../../material';
import { SitejobSidenavbarComponent } from '../../../shared/sitejob-sidenavbar/sitejob-sidenavbar.component';
import { CrewsService } from '../../../core/services/human-resources/crew.service';
import { CrewEmployeesService } from '../../../core/services/human-resources/crewemployees.service';
import { UsedInventoryService } from '../../../core/services/material/used-inventory.service';
import { UsedEquipmentService } from '../../../core/services/material/used-equipment.service';
import { SupplierService } from '../../../core/services/material/supplier.service';
import { PeopleService } from '../../../core/services/human-resources/users.service';
import { SkillsService } from '../../../core/services/human-resources/skills.service';
import { RoutesService } from '../../../core/services/route/route.service';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SitejobTabsComponent } from '../../../shared/sitejob-tabs/sitejob-tabs.component';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { RouteData, MapConfig, LeafletMapComponent } from '../../../shared/leaflet-map/leaflet-map.component';
import { environment } from '../../../../environments/environment';
import * as L from 'leaflet';
import { TicketStatusService } from '../../../core/services/route/ticketstatus.service';
import { TaskstatusService } from '../../../core/services/route/taskstatus.service';


@Component({
  selector: 'app-upcoming',
  imports: [

    SitejobSidenavbarComponent,
    LeafletMapComponent,
    MatTableModule,
    MatDividerModule,
    CommonModule,
    MATERIAL_MODULES,
    FormsModule,
    SitejobTabsComponent],
  templateUrl: './upcoming.component.html',
  styleUrl: './upcoming.component.scss'
})
export class UpcomingComponent implements OnDestroy {

  // Static map properties
  // Google Maps API key removed - now using internal coordinates API

staticMapUrl: string = '';
staticMapWidth: number = 600;
staticMapHeight: number = 400;
showNoRoutesOverlay = false;
currentZoomLevel: number = 15; // Zoom inicial
availableZoomLevels: number[] = [10, 12, 15, 17, 19]; // Diferentes niveles de zoom
currentLocationIndex: number = 0; // Índice de la ubicación actual
  routePath: string = ''; // Para almacenar la ruta optimizada que sigue las calles
  isLoadingDirections: boolean = false; // Para mostrar estado de carga de direcciones
  isUsingStreetRoutes: boolean = false; // Para indicar si se están usando rutas que siguen calles
  assignedRoute: any = null; // Para almacenar la ruta asignada al equipo
  assignedRouteId: number | null = null; // ID de la ruta asignada
employeeList: any[] = [];  // Lista completa de empleados
teamLeader: string = '';   // Nombre del líder del equipo
teamMembers: string[] = []; // Nombres de los demás miembros

  location: {
  address: string;
  job?: string;
  surface?: number;
  width?: number;
  length?: number;
  description?: string; // ✅ AGREGADO: Incluir descripción
  routeCode?: string; // ✅ AGREGADO: Incluir routeCode
  lat?: number;
  lng?: number;
  displayAddress?: string; // ✅ AGREGADO: Para mostrar direcciones consistentes
  ticketcode?: string; // ✅ AGREGADO: Incluir ticketcode
} = {
  address: ''
};

  remainingLocations: {
    address: string;
    job?: string;
    surface?: number;
    width?: number;
    length?: number;
    description?: string; // ✅ AGREGADO: Incluir descripción
    routeCode?: string; // ✅ AGREGADO: Incluir routeCode
    lat?: number;
    lng?: number;
    displayAddress?: string; // ✅ AGREGADO: Para mostrar direcciones consistentes
    ticketcode?: string; // ✅ AGREGADO: Incluir ticketcode
    ticketid?: number; // 🎯 NUEVO: Para identificar el ticket
    // 🎯 NUEVO: Propiedades para el sistema de checks como en current
    checked?: boolean;
    locked?: boolean;
    assigned?: boolean;
    started?: boolean;
    completed?: boolean;
    startDate?: string | null;
    endDate?: string | null;
    isHidden?: boolean; // Mantener para compatibilidad
  }[] = [];

crewType: string = '';

filterText: string = '';
isLoading: boolean = false;
crewDetails: any[] = [];

  leafletRoutes: RouteData[] = [];
  mapConfig: MapConfig = {
    center: [41.8781, -87.6298], // Chicago
    zoom: 13,
    minZoom: 8,
    maxZoom: 18,
    tileLayer: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors'
  };

  // Propiedades necesarias para mostrar rutas en el mapa
  visibleRoutes: Set<number> = new Set();
  routeTypeVisibility: { [key: string]: boolean } = {
    'SPOTTER': true,
    'CONCRETE': true,
    'ASPHALT': true,
    'UPCOMING': true
  };

  @ViewChild(LeafletMapComponent) leafletMap!: LeafletMapComponent;

  constructor(
     private crewsService: CrewsService,
        private crewEmployeesService: CrewEmployeesService,
        private usedInventoryService: UsedInventoryService,
        private usedEquipmentService: UsedEquipmentService,
        private supplierService: SupplierService,
        private usersService: PeopleService,
        private skillsService: SkillsService,
        private routeService: RoutesService,
        private router: Router,

        private http: HttpClient,   // ✅ Still needed for route API calls
        private ticketStatusService: TicketStatusService,  // 🎯 Para verificar estado de fases
        private taskstatusService: TaskstatusService  // 🎯 Para obtener nombres de fases

  ){}

  ngOnInit() {
    this.loadEmployees();

    // 🎯 ESCUCHAR CAMBIOS EN EL ESTADO DE COMPLETADO DE UBICACIONES
    this.setupLocationCompletionListener();

    // 🎯 EXPONER MÉTODOS DE DEBUG PARA CONSOLE
    this.exposeDebugMethods();
  }

  // 🎯 MÉTODO PARA VERIFICAR INMEDIATAMENTE UBICACIONES COMPLETADAS DESPUÉS DE CARGAR
  private checkInitialCompletedLocations(): void {
    // Esperar un poco para que se carguen los datos
    setTimeout(() => {
      this.checkForCompletedLocations();
    }, 2000);
  }

  private completionCheckInterval: any; // 🎯 Para limpiar el intervalo
  private currentCheckIndex: number = 0; // 🎯 Índice rotativo para verificar ubicaciones
  private useCrewTypeMatching: boolean = true; // 🎯 Modo de verificación: true = crew type, false = todas las fases
  private isCheckingLocations: boolean = false; // 🎯 NUEVO: Evitar verificaciones simultáneas
  private lastMapUpdate: number = 0; // 🎯 NUEVO: Controlar frecuencia de actualizaciones del mapa
  private lastCompletionLog: { [key: string]: number } = {}; // 🎯 NUEVO: Evitar logs repetitivos

  // 🎯 MÉTODO PARA ESCUCHAR CUANDO SE COMPLETA UNA UBICACIÓN
  private setupLocationCompletionListener(): void {
    // Verificar cada 30 segundos todas las ubicaciones (reducido de 10 a 30)
    this.completionCheckInterval = setInterval(() => {
      this.checkForCompletedLocations();
    }, 30000);
  }

  // 🎯 MÉTODO PARA LIMPIAR EL INTERVALO CUANDO SE DESTRUYE EL COMPONENTE
  ngOnDestroy(): void {
    console.log('🔄 Componente upcoming destruyéndose...');
    
    // 🎯 NUEVO: Limpiar intervalo de verificación
    if (this.completionCheckInterval) {
      clearInterval(this.completionCheckInterval);
      this.completionCheckInterval = null;
      console.log('✅ Intervalo de verificación limpiado');
    }

    // 🎯 NUEVO: Limpiar estado de verificación
    this.isCheckingLocations = false;
    
    // 🎯 NUEVO: Limpiar logs
    this.lastCompletionLog = {};
    
    // 🎯 NUEVO: Limpiar rutas para evitar accesos posteriores
    this.leafletRoutes = [];
    this.visibleRoutes.clear();
    this.assignedRoute = null;
    
    console.log('✅ Componente upcoming destruido completamente');
  }

  // 🎯 MÉTODO PARA VERIFICAR UBICACIONES COMPLETADAS
  private checkForCompletedLocations(): void {
    // 🎯 NUEVO: Verificar si el componente está siendo destruido
    if (!this.completionCheckInterval) {
      console.log('⚠️ Verificación cancelada - componente en proceso de destrucción');
      return;
    }

    // 🎯 NUEVO: Evitar verificaciones simultáneas
    if (this.isCheckingLocations) {
      return;
    }

    if (this.remainingLocations.length === 0) {
      return;
    }

    // 🎯 NUEVO: Verificar si hay ubicaciones visibles para verificar
    const visibleLocations = this.remainingLocations.filter(loc => !loc.isHidden);
    if (visibleLocations.length === 0) {
      return; // No hay ubicaciones visibles para verificar
    }

    // 🎯 NUEVO: Marcar que estamos verificando
    this.isCheckingLocations = true;

    // Obtener el crewId actual
    const storedUserId = Number(localStorage.getItem('userId'));
    const person = this.employeeList.find(p => p.userid === storedUserId);
    const currentCrewId = person?.crewid;

    if (!currentCrewId) {
      this.isCheckingLocations = false;
      return;
    }

    // 🎯 VERIFICAR SOLO LAS UBICACIONES VISIBLES
    const locationsToCheck = visibleLocations;
    let completedCount = 0;

    const checkPromises = locationsToCheck.map((location, originalIndex) => {
      const ticketId = (location as any).ticketid;
      if (ticketId) {
        // Encontrar el índice actual en remainingLocations (puede haber cambiado)
        const currentIndex = this.remainingLocations.findIndex(loc =>
          (loc as any).ticketid === ticketId && loc.address === location.address
        );

        if (currentIndex !== -1) {
          return this.checkLocationCompletionStatus(ticketId, location, currentIndex).then(() => {
            // 🎯 NUEVO: Incrementar contador si la ubicación fue completada
            if (this.remainingLocations[currentIndex]?.isHidden) {
              completedCount++;
            }
          });
        }
      }
      return Promise.resolve();
    });

    // 🎯 NUEVO: Esperar a que todas las verificaciones terminen
    Promise.all(checkPromises).finally(() => {
      this.isCheckingLocations = false;

      // 🎯 NUEVO: Solo actualizar el mapa si hubo cambios
      if (completedCount > 0) {
        this.updateLeafletRoutes();
      }

      // 🎯 NUEVO: Limpiar logs antiguos (más de 5 minutos)
      const now = Date.now();
      Object.keys(this.lastCompletionLog).forEach(key => {
        if (now - this.lastCompletionLog[key] > 300000) { // 5 minutos
          delete this.lastCompletionLog[key];
        }
      });
    });
  }

  // 🎯 MÉTODO PARA VERIFICAR EL ESTADO DE COMPLETADO DE UNA UBICACIÓN ESPECÍFICA
  private checkLocationCompletionStatus(ticketId: number, location: any, locationIndex: number): Promise<void> {
    // 🎯 NUEVO: Verificar si el componente está siendo destruido
    if (!this.completionCheckInterval) {
      console.log('⚠️ Verificación de ubicación cancelada - componente en proceso de destrucción');
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      this.ticketStatusService.getByTicket(ticketId).subscribe({
        next: (ticketStatuses: any[]) => {
          // 🎯 SOLUCIÓN TEMPORAL: Obtener nombres de fases usando taskstatusid
          this.getPhaseNamesForTicketStatuses(ticketStatuses).then(enhancedTicketStatuses => {
            let isCompleted = false;

            if (this.useCrewTypeMatching) {
              // 🎯 MODO 1: Verificar si la fase completada es idéntica al crew type
              isCompleted = this.isCompletedPhaseMatchingCrewType(enhancedTicketStatuses, location);
            } else {
              // 🎯 MODO 2: Verificar si todas las fases obligatorias están completadas
              isCompleted = this.areAllRequiredPhasesCompleted(enhancedTicketStatuses, location);
            }

            if (isCompleted) {
              // 🎯 NUEVO: Evitar logs repetitivos - solo logear una vez por ubicación por minuto
              const locationKey = `${location.address}-${ticketId}`;
              const now = Date.now();
              const lastLog = this.lastCompletionLog[locationKey] || 0;

              if (now - lastLog > 60000) { // Solo logear una vez por minuto
                console.log(`✅ Ubicación completada detectada: ${location.address} (Ticket: ${ticketId})`);
                this.lastCompletionLog[locationKey] = now;
              }

              // 🎯 IMPORTANTE: Verificar que el ticketId coincida antes de marcar como completada
              if ((location as any).ticketid === ticketId) {
                this.markLocationAsCompleted(locationIndex, enhancedTicketStatuses);
              }
            } else {
              // 🎯 NUEVO: Marcar como pendiente si no está completada
              if ((location as any).ticketid === ticketId) {
                this.markLocationAsPending(locationIndex, enhancedTicketStatuses);
              }
            }
            resolve();
          });
        },
        error: (err) => {
          console.error(`❌ Error verificando estado de ubicación ${ticketId}:`, err);
          // 🎯 NUEVO: Marcar como pendiente en caso de error
          if ((location as any).ticketid === ticketId) {
            this.markLocationAsPending(locationIndex, []);
          }
          resolve();
        }
      });
    });
  }

  // 🎯 NUEVO MÉTODO: Marcar ubicación como completada (similar a current)
  private markLocationAsCompleted(locationIndex: number, ticketStatuses: any[]): void {
    if (locationIndex >= 0 && locationIndex < this.remainingLocations.length) {
      const location = this.remainingLocations[locationIndex];
      
      // 🎯 NUEVO: Aplicar lógica similar a current.component.ts
      location.checked = true;
      location.locked = true; // Bloquear si está completada
      location.assigned = true;
      location.completed = true;
      
      // 🎯 NUEVO: Obtener fechas de inicio y fin
      const completedStatus = ticketStatuses.find(ts => ts.endingdate);
      if (completedStatus) {
        location.startDate = completedStatus.startingdate;
        location.endDate = completedStatus.endingdate;
      }
      
      console.log(`✅ Ubicación marcada como completada: ${location.address}`);
    }
  }

  // 🎯 NUEVO MÉTODO: Marcar ubicación como pendiente (similar a current)
  private markLocationAsPending(locationIndex: number, ticketStatuses: any[]): void {
    if (locationIndex >= 0 && locationIndex < this.remainingLocations.length) {
      const location = this.remainingLocations[locationIndex];
      
      // 🎯 NUEVO: Aplicar lógica similar a current.component.ts
      location.checked = false;
      location.locked = false;
      location.assigned = ticketStatuses.length > 0;
      location.completed = false;
      
      // 🎯 NUEVO: Determinar si está iniciada pero no completada
      const startedStatus = ticketStatuses.find(ts => ts.startingdate && !ts.endingdate);
      if (startedStatus) {
        location.started = true;
        location.checked = true;
        location.startDate = startedStatus.startingdate;
        location.endDate = null;
      } else {
        location.started = false;
        location.startDate = null;
        location.endDate = null;
      }
      
      console.log(`⏳ Ubicación marcada como pendiente: ${location.address}`);
    }
  }

  // 🎯 NUEVO MÉTODO: Verificar si una ubicación está asignada pero no iniciada
  isLocationAssigned(location: any): boolean {
    return location.assigned && !location.started && !location.completed;
  }

  // 🎯 NUEVO MÉTODO: Verificar si una ubicación está iniciada pero no completada
  isLocationStarted(location: any): boolean {
    return location.started && !location.completed;
  }

  // 🎯 NUEVO MÉTODO: Verificar si una ubicación está completada
  isLocationCompleted(location: any): boolean {
    return location.completed;
  }

  // 🎯 NUEVO MÉTODO: Obtener el estado de una ubicación como texto
  getLocationStatus(location: any): string {
    if (location.completed) {
      return 'Completed';
    } else if (location.started) {
      return 'In Progress';
    } else {
      return 'Not Visible'; // 🎯 NUEVO: Para ubicaciones que no se muestran
    }
  }

  // 🎯 NUEVO MÉTODO: Obtener el icono de estado de una ubicación
  getLocationStatusIcon(location: any): string {
    if (location.completed) {
      return 'check_circle';
    } else if (location.started) {
      return 'pending';
    } else {
      return 'visibility_off'; // 🎯 NUEVO: Para ubicaciones que no se muestran
    }
  }

  // 🎯 NUEVO MÉTODO: Obtener nombres de fases usando taskstatusid
  private async getPhaseNamesForTicketStatuses(ticketStatuses: any[]): Promise<any[]> {
    try {
      // Obtener todos los TaskStatus para mapear nombres
      const taskStatuses = await firstValueFrom(this.taskstatusService.getAllTaskStatuses());

      // Crear un mapa de taskstatusid -> name
      const taskStatusMap = new Map();
      (taskStatuses as any[]).forEach((ts: any) => {
        taskStatusMap.set(ts.taskstatusid, ts.name);
      });

      // Enriquecer los ticketStatuses con los nombres de fases
      const enhancedTicketStatuses = ticketStatuses.map(ts => ({
        ...ts,
        name: taskStatusMap.get(ts.taskstatusid) || 'N/A'
      }));

      return enhancedTicketStatuses;
    } catch (error) {
      console.error('❌ Error obteniendo nombres de fases:', error);
      return ticketStatuses; // Retornar original si hay error
    }
  }

  // 🎯 MÉTODO PARA VERIFICAR SI LA FASE COMPLETADA ES IDÉNTICA AL CREW TYPE
  private isCompletedPhaseMatchingCrewType(ticketStatuses: any[], location: any): boolean {
    // Obtener el crewType y crewId actual
    const storedUserId = Number(localStorage.getItem('userId'));
    const person = this.employeeList.find(p => p.userid === storedUserId);
    const currentCrewType = person?.type || this.crewType;
    const currentCrewId = person?.crewid;

    // Verificar si el crew type es válido
    if (!this.isValidCrewType(currentCrewType)) {
      return false;
    }

    // Buscar fases completadas que coincidan con el crew type Y el crewId actual
    const completedPhases = ticketStatuses.filter(ts => {
      const hasEndingDate = ts.endingdate;
      const hasEndingTime = ts.endingtime;
      const hasCompletedStatus = ts.status === 'completed' || ts.status === 'COMPLETED';
      const hasEndDate = ts.enddate;

      // 🎯 IMPORTANTE: Verificar que la fase fue completada por el crew actual
      const wasCompletedByCurrentCrew = ts.crewid === currentCrewId;

      return (hasEndingDate || hasEndingTime || hasCompletedStatus || hasEndDate) && wasCompletedByCurrentCrew;
    });

    // Verificar si alguna fase completada coincide EXACTAMENTE con el crew type
    const matchingCompletedPhase = completedPhases.find(ts => {
      const phaseName = (ts.name || ts.taskname || ts.taskName || ts.phasename || ts.phaseName || ts.description || '').toLowerCase();
      const crewType = currentCrewType?.toLowerCase() || '';

      // 🎯 COMPARACIÓN EXACTA: Crew type debe ser igual al nombre de la fase
      return phaseName === crewType;
    });

    return !!matchingCompletedPhase;
  }

  // 🎯 MÉTODO PARA VERIFICAR SI EL CREW TYPE ES VÁLIDO
  private isValidCrewType(crewType: string): boolean {
    const validCrewTypes = [
      'spotting', 'install signs', 'grind', 'asphalt', 'crack seal', 'stripping',
      'sawcut', 'removal', 'framing', 'concrete', 'pour', 'clean'
    ];

    const normalizedCrewType = crewType?.toLowerCase() || '';
    return validCrewTypes.includes(normalizedCrewType);
  }

  // 🎯 MÉTODO ALTERNATIVO: VERIFICAR SI TODAS LAS FASES OBLIGATORIAS ESTÁN COMPLETADAS
  private areAllRequiredPhasesCompleted(ticketStatuses: any[], location: any): boolean {
    // Obtener el routeCode de la ubicación y el crewId actual
    const routeCode = location.routeCode || '';
    const storedUserId = Number(localStorage.getItem('userId'));
    const person = this.employeeList.find(p => p.userid === storedUserId);
    const currentCrewId = person?.crewid;

    // Definir las fases obligatorias según el tipo de ruta
    let requiredPhases: string[] = [];

    if (routeCode.includes('ASPHALT')) {
      requiredPhases = ['Crack Seal'];
    } else if (routeCode.includes('CONCRETE')) {
      requiredPhases = ['Clean'];
    } else if (routeCode.includes('SPOTTER')) {
      requiredPhases = ['Spotting'];
    }

    if (requiredPhases.length === 0) {
      return false; // No hay fases obligatorias definidas
    }

    // Verificar que todas las fases obligatorias tengan endingDate Y sean completadas por el crew actual
    const completedRequiredPhases = requiredPhases.filter(phaseName => {
      const phaseStatus = ticketStatuses.find(ts =>
        ts.taskname === phaseName &&
        ts.endingdate &&
        ts.crewid === currentCrewId // 🎯 IMPORTANTE: Solo fases completadas por el crew actual
      );
      return phaseStatus !== undefined;
    });

    return completedRequiredPhases.length === requiredPhases.length;
  }

  // 🎯 MÉTODO PARA ELIMINAR UNA UBICACIÓN COMPLETADA DEL LISTADO
  // 🎯 DEPRECATED: Este método ya no oculta ubicaciones, las marca como completadas
  private hideCompletedLocation(locationIndex: number): void {
    console.warn('⚠️ hideCompletedLocation está deprecado. Usar markLocationAsCompleted en su lugar.');
    // 🎯 NUEVO: En lugar de ocultar, marcar como completada
    this.markLocationAsCompleted(locationIndex, []);
  }

  private getVisibleLocationsCount(): number {
    // 🎯 NUEVO: Contar ubicaciones con estado "Completed" o "In Progress"
    return this.remainingLocations.filter(loc => loc.completed || loc.started).length;
  }

  private removeCompletedLocation(locationIndex: number): void {
    if (locationIndex >= 0 && locationIndex < this.remainingLocations.length) {
      const removedLocation = this.remainingLocations[locationIndex];
      console.log(`✅ Ubicación eliminada: ${removedLocation.address} (Restantes: ${this.remainingLocations.length - 1})`);

      // Eliminar la ubicación del array
      this.remainingLocations.splice(locationIndex, 1);

      // Actualizar el índice actual si es necesario
      if (this.currentLocationIndex >= this.remainingLocations.length) {
        this.currentLocationIndex = Math.max(0, this.remainingLocations.length - 1);
      }

      // Actualizar el mapa si hay ubicaciones restantes
      if (this.remainingLocations.length > 0) {
        this.updateLeafletRoutes();
      } else {
        // Si no quedan ubicaciones, limpiar el mapa
        this.leafletRoutes = [];
        this.visibleRoutes.clear();
      }

      // 🎯 IMPORTANTE: Retornar inmediatamente para evitar procesar más ubicaciones
      // ya que el array cambió y los índices ya no son válidos
      return;
    }
  }

  // 🎯 MÉTODO PÚBLICO PARA FORZAR VERIFICACIÓN MANUAL
  public forceCheckCompletedLocations(): void {
    console.log('🔄 Verificación manual de ubicaciones completadas iniciada...');
    this.checkForCompletedLocations();
  }

  // 🎯 MÉTODO PÚBLICO PARA CAMBIAR A MODO CREW TYPE MATCHING
  public setCrewTypeMatchingMode(enabled: boolean): void {
    this.useCrewTypeMatching = enabled;
    console.log(`🎯 Modo crew type matching: ${enabled ? 'ACTIVADO' : 'DESACTIVADO'}`);
  }

  // 🎯 MÉTODO PÚBLICO PARA OBTENER EL MODO ACTUAL
  public getCurrentMode(): string {
    return this.useCrewTypeMatching ? 'Crew Type Matching' : 'All Required Phases';
  }

  // 🎯 MÉTODO PÚBLICO PARA OBTENER TODOS LOS CREW TYPES VÁLIDOS
  public getValidCrewTypes(): string[] {
    return [
      'Spotting', 'Install Signs', 'Grind', 'Asphalt', 'Crack Seal', 'Stripping',
      'Sawcut', 'Removal', 'Framing', 'Concrete', 'Pour', 'Clean'
    ];
  }

  // 🎯 MÉTODO PÚBLICO PARA MOSTRAR TODAS LAS UBICACIONES (INCLUYENDO COMPLETADAS)
  public showAllHiddenLocations(): void {
    // 🎯 NUEVO: Mostrar todas las ubicaciones temporalmente
    this.remainingLocations.forEach(location => {
      location.completed = false;
      location.checked = false;
      location.locked = false;
      location.started = false;
      location.assigned = false;
    });
    console.log(`👁️ Todas las ubicaciones mostradas temporalmente: ${this.remainingLocations.length}`);
    this.updateLeafletRoutes();
  }

  // 🎯 NUEVO MÉTODO: Mostrar solo ubicaciones activas (Completed e In Progress)
  public showOnlyActiveLocations(): void {
    console.log(`🎯 Mostrando solo ubicaciones activas (Completed e In Progress)`);
    this.updateLeafletRoutes();
  }

  // 🎯 NUEVO MÉTODO: Obtener información de ubicaciones visibles
  public getVisibleLocationsInfo(): any {
    const completedCount = this.remainingLocations.filter(loc => loc.completed).length;
    const inProgressCount = this.remainingLocations.filter(loc => loc.started && !loc.completed).length;
    const totalVisible = completedCount + inProgressCount;
    const totalLocations = this.remainingLocations.length;

    return {
      completed: completedCount,
      inProgress: inProgressCount,
      visible: totalVisible,
      total: totalLocations,
      hidden: totalLocations - totalVisible
    };
  }

  // 🎯 NUEVO MÉTODO: Detectar si el error está relacionado con reoptimización automática
  private isOptimizationError(error: any): boolean {
    const errorMessage = error?.message || error?.toString() || '';
    return errorMessage.includes('Unexpected token') && 
           errorMessage.includes('JSON') && 
           errorMessage.includes('position');
  }

  // 🎯 NUEVO MÉTODO: Manejar errores de optimización de manera más robusta
  private handleOptimizationError(routeId: number, rawValue: any): number[] {
    console.warn(`⚠️ Detected optimization error for route ${routeId}`);
    console.warn(`🔄 This might be caused by automatic route reoptimization from current component`);
    console.warn(`🔄 Raw optimizedOrder value:`, rawValue);
    
    // 🎯 NUEVO: Intentar recuperar datos válidos del rawValue
    if (typeof rawValue === 'string') {
      const numbers = rawValue.match(/\d+/g);
      if (numbers && numbers.length > 0) {
        const recoveredOrder = numbers.map(Number);
        console.log(`✅ Recovered valid order from malformed string:`, recoveredOrder);
        return recoveredOrder;
      }
    }
    
    return [];
  }

  // 🎯 MÉTODO PÚBLICO PARA MARCAR UBICACIONES COMPLETADAS
  public hideCompletedLocations(): void {
    console.log('🔄 Verificando y marcando ubicaciones completadas...');
    this.checkForCompletedLocations();
  }

  // 🎯 MÉTODO PÚBLICO PARA DEBUGGEAR LA ASIGNACIÓN DE RUTAS
  public debugRouteAssignment(): void {
    const storedUserId = Number(localStorage.getItem('userId'));
    const person = this.employeeList.find(p => p.userid === storedUserId);
    const currentCrewType = person?.type || this.crewType;
    const currentCrewId = person?.crewid;

    console.log('🔍 === ROUTE ASSIGNMENT DEBUG ===');
    console.log('👤 Current User:', {
      userId: storedUserId,
      name: person?.name || 'Not found',
      crewId: currentCrewId,
      crewType: currentCrewType
    });
    console.log('📍 Remaining Locations:', this.remainingLocations.length);
    console.log('🎫 Ticket IDs:', this.remainingLocations.map(loc => (loc as any).ticketid));
    console.log('🗺️ Assigned Route:', {
      routeId: this.assignedRouteId,
      routeCode: this.assignedRoute?.routecode || this.assignedRoute?.routeCode,
      type: this.assignedRoute?.type,
      hasPolyline: !!(this.assignedRoute?.encodedpolyline || this.assignedRoute?.encodedPolyline),
      ticketsCount: this.assignedRoute?.tickets?.length || 0
    });
    console.log('🔍 === END DEBUG ===');
  }

  // 🎯 MÉTODO PÚBLICO PARA FORZAR UNA RUTA ESPECÍFICA
  public forceRouteAssignment(routeId: number): void {
    console.log(`🎯 Forcing route assignment to ID: ${routeId}`);
    this.forceSpecificRoute(routeId);
  }

  // 🎯 MÉTODO PÚBLICO PARA TESTING - EXPONER EN WINDOW PARA CONSOLE
  public exposeDebugMethods(): void {
    // Expose debug methods to window for console access
    (window as any).debugUpcoming = {
      debugRoute: () => this.debugRouteAssignment(),
      forceRoute: (id: number) => this.forceRouteAssignment(id),
      getCrewInfo: () => {
        const storedUserId = Number(localStorage.getItem('userId'));
        const person = this.employeeList.find(p => p.userid === storedUserId);
        return {
          userId: storedUserId,
          name: person?.name,
          crewId: person?.crewid,
          crewType: person?.type || this.crewType
        };
      },
      getRouteInfo: () => ({
        assignedRouteId: this.assignedRouteId,
        routeCode: this.assignedRoute?.routecode || this.assignedRoute?.routeCode,
        type: this.assignedRoute?.type,
        hasPolyline: !!(this.assignedRoute?.encodedpolyline || this.assignedRoute?.encodedPolyline),
        ticketsCount: this.assignedRoute?.tickets?.length || 0
      }),
      refreshRoute: () => this.getAssignedRoute()
    };
    console.log('🔧 Debug methods exposed to window.debugUpcoming');
  }

  // 🎯 MÉTODO PARA AGRUPAR UBICACIONES POR DIRECCIÓN
  get groupedLocations() {
    // 🎯 NUEVO: Filtrar solo ubicaciones con estado "Completed" o "In Progress"
    const visibleLocations = this.remainingLocations.filter(location => 
      location.completed || location.started
    );

    // Aplicar filtro de búsqueda
    const filter = this.filterText.trim().toLowerCase();
    let filteredLocations = visibleLocations;

    if (filter) {
      filteredLocations = visibleLocations.filter(loc =>
        loc.address.toLowerCase().includes(filter) ||
        loc.job?.toLowerCase().includes(filter)
      );
    }

    // Agrupar por dirección
    const grouped = filteredLocations.reduce((groups: any, location) => {
      const address = location.address;
      if (!groups[address]) {
        groups[address] = [];
      }
      groups[address].push(location);
      return groups;
    }, {});

    // Convertir a array de grupos
    return Object.keys(grouped).map(address => ({
      address: address,
      locations: grouped[address],
      isMultiple: grouped[address].length > 1
    }));
  }

  // Temporary debugging method to force a specific route
  async forceSpecificRoute(routeId: number = 3): Promise<void> {
    try {
      const route = await firstValueFrom(this.routeService.getRouteById(routeId));

      if (route) {
        this.assignedRoute = route;
        this.assignedRouteId = route.routeid;

        // Update the map immediately
        this.updateLeafletRoutes();
      }
    } catch (error) {
      // Error handling silently
    }
  }

  // Method to get the assigned route for the crew
  async getAssignedRoute(): Promise<void> {
    try {
      // Get the current crew type and crew ID
      const storedUserId = Number(localStorage.getItem('userId'));
      const person = this.employeeList.find(p => p.userid === storedUserId);
      const currentCrewType = person?.type || this.crewType;
      const currentCrewId = person?.crewid;

      console.log('🔍 Route Assignment Debug:', {
        crewType: currentCrewType,
        crewId: currentCrewId,
        userId: storedUserId
      });

      // Get routes by type based on crew type
      let allRoutes: any[] = [];

      // Map crew type to route type
      const crewTypeToRouteType: { [key: string]: string } = {
        'spotting': 'spotting',
        'concrete': 'concrete',
        'asphalt': 'asphalt',
        'crack seal': 'asphalt',
        'grind': 'asphalt',
        'stripping': 'asphalt',
        'sawcut': 'concrete',
        'removal': 'concrete',
        'framing': 'concrete',
        'pour': 'concrete',
        'clean': 'concrete',
        'install signs': 'spotting'
      };

      const routeType = crewTypeToRouteType[currentCrewType?.toLowerCase()] || 'spotting';
      console.log('🎯 Mapped route type:', routeType, 'for crew type:', currentCrewType);

      // Get routes for the specific type first
      try {
        const specificRouteResponse = await firstValueFrom(
          this.http.get<any>(`${environment.apiUrl}/routes/${routeType}`)
        );
        if (specificRouteResponse?.routes) {
          allRoutes = [...specificRouteResponse.routes];
          console.log(`✅ Found ${allRoutes.length} routes for type: ${routeType}`);
        }
      } catch (error) {
        console.warn(`⚠️ No routes found for type: ${routeType}`);
      }

      // If no routes found for specific type, get all route types
      if (allRoutes.length === 0) {
        console.log('🔄 Getting all route types as fallback...');

        try {
          const [spottingRoutes, concreteRoutes, asphaltRoutes] = await Promise.all([
            firstValueFrom(this.http.get<any>(`${environment.apiUrl}/routes/spotting`)),
            firstValueFrom(this.http.get<any>(`${environment.apiUrl}/routes/concrete`)),
            firstValueFrom(this.http.get<any>(`${environment.apiUrl}/routes/asphalt`))
          ]);

          allRoutes = [
            ...(spottingRoutes?.routes || []),
            ...(concreteRoutes?.routes || []),
            ...(asphaltRoutes?.routes || [])
          ];

          console.log(`✅ Found ${allRoutes.length} total routes across all types`);
        } catch (error) {
          console.error('❌ Error fetching routes:', error);
        }
      }

      if (allRoutes && allRoutes.length > 0) {
        let assignedRoute = null;

        // Priority 1: Find route with matching tickets for this crew
        const crewTicketIds = this.remainingLocations.map(loc => (loc as any).ticketid).filter((id: any) => id);
        console.log('🎫 Crew ticket IDs:', crewTicketIds);

        for (const route of allRoutes) {
          if (route.tickets && Array.isArray(route.tickets)) {
            const routeTicketIds = route.tickets.map((ticket: any) => ticket.ticketId || ticket.ticketid).filter((id: any) => id);
            const matchingTickets = crewTicketIds.filter((id: any) => routeTicketIds.includes(id));

            if (matchingTickets.length > 0) {
              console.log(`✅ Found route with matching tickets: ${route.routeid || route.routeId} (${matchingTickets.length} matches)`);
              assignedRoute = route;
              break;
            }
          }
        }

        // Priority 2: Find route by type matching crew type
        if (!assignedRoute) {
          const routeTypeMap: { [key: string]: string } = {
            'spotting': 'SPOTTER',
            'concrete': 'CONCRETE',
            'asphalt': 'ASPHALT',
            'crack seal': 'ASPHALT',
            'grind': 'ASPHALT',
            'stripping': 'ASPHALT',
            'sawcut': 'CONCRETE',
            'removal': 'CONCRETE',
            'framing': 'CONCRETE',
            'pour': 'CONCRETE',
            'clean': 'CONCRETE',
            'install signs': 'SPOTTER'
          };

          const expectedRouteType = routeTypeMap[currentCrewType?.toLowerCase()] || 'SPOTTER';
          console.log(`🎯 Looking for route type: ${expectedRouteType}`);

          const matchingRoute = allRoutes.find((route: any) =>
            route.type === expectedRouteType ||
            route.routecode?.toUpperCase().includes(expectedRouteType) ||
            route.routeCode?.toUpperCase().includes(expectedRouteType)
          );

          if (matchingRoute) {
            console.log(`✅ Found matching route by type: ${matchingRoute.routeid || matchingRoute.routeId}`);
            assignedRoute = matchingRoute;
          }
        }

        // Priority 3: Find UPCOMING routes
        if (!assignedRoute) {
          const upcomingRoute = allRoutes.find((route: any) => route.type === 'UPCOMING');
          if (upcomingRoute) {
            console.log(`✅ Found UPCOMING route: ${upcomingRoute.routeid || upcomingRoute.routeId}`);
            assignedRoute = upcomingRoute;
          }
        }

        // Priority 4: Find any route with encoded polyline
        if (!assignedRoute) {
          const routeWithPolyline = allRoutes.find((route: any) =>
            (route.encodedpolyline && route.encodedpolyline.length > 0) ||
            (route.encodedPolyline && route.encodedPolyline.length > 0)
          );
          if (routeWithPolyline) {
            console.log(`✅ Found route with polyline: ${routeWithPolyline.routeid || routeWithPolyline.routeId}`);
            assignedRoute = routeWithPolyline;
          }
        }

        // Priority 5: Use first available route as fallback
        if (!assignedRoute && allRoutes.length > 0) {
          assignedRoute = allRoutes[0];
          console.log(`⚠️ Using fallback route: ${assignedRoute.routeid || assignedRoute.routeId}`);
        }

        // Priority 6: Try to get route ID 3 directly (as a last resort)
        if (!assignedRoute) {
          try {
            const route3 = await firstValueFrom(this.routeService.getRouteById(3));
            if (route3) {
              console.log('✅ Using route ID 3 as last resort');
              assignedRoute = route3;
            }
          } catch (error) {
            console.warn('⚠️ Could not fetch route ID 3');
          }
        }

          // 🎯 NUEVO: Validar optimizedOrder antes de asignar la ruta
  if (assignedRoute && assignedRoute.optimizedOrder) {
    try {
      if (typeof assignedRoute.optimizedOrder === 'string') {
        // 🎯 NUEVO: Limpiar el string antes de parsear
        const cleanedOptimizedOrder = assignedRoute.optimizedOrder
          .replace(/[^\d,\[\]]/g, '') // Remover caracteres no válidos
          .replace(/,\s*,/g, ',') // Remover comas duplicadas
          .replace(/^,+|,+$/g, ''); // Remover comas al inicio y final
        
        if (cleanedOptimizedOrder) {
          assignedRoute.optimizedOrder = JSON.parse(`[${cleanedOptimizedOrder}]`);
        } else {
          assignedRoute.optimizedOrder = [];
        }
      }
          } catch (error) {
        console.error(`❌ Error parsing optimizedOrder for route ${assignedRoute.routeId || assignedRoute.routeid}:`, error);
        console.error('Raw optimizedOrder value:', assignedRoute.optimizedOrder);
        
        // 🎯 NUEVO: Usar el método de manejo de errores de optimización
        if (this.isOptimizationError(error)) {
          assignedRoute.optimizedOrder = this.handleOptimizationError(
            assignedRoute.routeId || assignedRoute.routeid, 
            assignedRoute.optimizedOrder
          );
        } else {
          assignedRoute.optimizedOrder = [];
        }
      }
  }

        // 🎯 NUEVO: Verificar si el componente está siendo destruido antes de asignar
        if (!this.completionCheckInterval) {
          console.log('⚠️ Asignación de ruta cancelada - componente en proceso de destrucción');
          return;
        }

        this.assignedRoute = assignedRoute;
        this.assignedRouteId = assignedRoute?.routeid || assignedRoute?.routeId;

        if (assignedRoute) {
          console.log('🎯 Final assigned route:', {
            routeId: this.assignedRouteId,
            routeCode: assignedRoute.routecode || assignedRoute.routeCode,
            type: assignedRoute.type,
            hasPolyline: !!(assignedRoute.encodedpolyline || assignedRoute.encodedPolyline),
            ticketsCount: assignedRoute.tickets?.length || 0,
            optimizedOrderValid: Array.isArray(assignedRoute.optimizedOrder)
          });
        } else {
          console.warn('❌ No route assigned to crew');
        }
      } else {
        console.warn('❌ No routes available');
      }
    } catch (error) {
      console.error('❌ Error in getAssignedRoute:', error);
    }
  }

loadEmployees() {
  import('rxjs').then(({ forkJoin }) => {
    forkJoin({
      people: this.usersService.getAllPeople(),
      crewEmployees: this.crewEmployeesService.getAllCrewEmployees(),
      crews: this.crewsService.getAllCrews(),
      skills: this.skillsService.getAllSkills()
    }).subscribe({
      next: ({ people, crewEmployees, crews, skills }) => {
        // 🔁 Mapea todos los empleados
        this.employeeList = people.map((person: any) => {
const crewAssignment = crewEmployees.find((ce: any) => ce.employeeid === person.employeeId);
          const assignedCrew = crewAssignment
            ? crews.find((c: any) => c.crewid === crewAssignment.crewid)
            : null;
          const personSkills = skills
            .filter((s: any) => s.userId === person.userId) // CORREGIDO aquí
            .map((s: any) => s.name);

          return {
            employeeid: person.employeeId,
            userid: person.userId, // CORREGIDO aquí
            name: `${person.firstname} ${person.lastname}`,
            crewid: crewAssignment?.crewid || null,
            type: assignedCrew?.type || '',
            workedhours: assignedCrew?.workedhours || 0,
            skills: personSkills,
            crewLeader: crewAssignment?.crewleader ?? false
          };
        });

        // ✅ Obtener el userId logueado correctamente
        const storedUserId = Number(localStorage.getItem('userId')); // CORREGIDO aquí
        const person = this.employeeList.find(p => p.userid === storedUserId); // CORREGIDO aquí

        if (!person) {
          return;
        }

        const currentCrewId = person.crewid;
        if (!currentCrewId) {
          return;
        }

        const assignedCrew = crews.find((c: any) => c.crewid === currentCrewId);
        this.crewType = assignedCrew?.type || 'N/A';

        this.getCrewDetails(currentCrewId);

        const teamMembers = this.employeeList.filter(e => e.crewid === currentCrewId);
        const leader = teamMembers.find(e => e.crewLeader);
        const members = teamMembers.filter(e => !e.crewLeader).map(e => e.name);

        this.teamLeader = leader?.name || 'N/A';
        this.teamMembers = members;

      },
              error: (err) => {
          // Error handling silently
        }
    });
  });
}

getCrewDetails(crewId: number) {
  this.isLoading = true;
  this.crewsService.getCrewDetails(crewId).subscribe({
    next: async (details) => {
      this.crewDetails = details;

      // Mapear todos los tickets asociados a su información de ubicación
      // Evita ubicaciones duplicadas por ticketid
      const uniqueLocationsMap = new Map<number, any>();

      details.forEach((data: any) => {
        if (!uniqueLocationsMap.has(data.ticketid)) {
          // ✅ Usar directamente la dirección del backend si está disponible
          const rawAddress = data.address || this.formatAddress(data);
          const address = this.cleanAddress(rawAddress);

          // 🔍 DEBUG: Ver qué datos llegan del backend
          console.log(`🔍 Ticket ${data.ticketid}:`, {
            backendAddress: data.address,
            formattedAddress: this.formatAddress(data),
            rawAddress: rawAddress,
            finalAddress: address,
            // ✅ DEBUG: Ver todos los campos de dirección disponibles
            addressFields: {
              addressnumber: data.addressnumber,
              addresscardinal: data.addresscardinal,
              addressstreet: data.addressstreet,
              addresssuffix: data.addresssuffix,
              fromaddressnumber: data.fromaddressnumber,
              fromaddresscardinal: data.fromaddresscardinal,
              fromaddressstreet: data.fromaddressstreet,
              fromaddresssuffix: data.fromaddresssuffix,
              toaddressnumber: data.toaddressnumber,
              toaddresscardinal: data.toaddresscardinal,
              toaddressstreet: data.toaddressstreet,
              toaddresssuffix: data.toaddresssuffix,
              location: data.location,

            }
          });

          uniqueLocationsMap.set(data.ticketid, {
            address: address, // ✅ USAR la dirección del backend directamente
            job: data.contractunit_name || '',
            surface: data.surfacetotal,
            width: data.width,
            length: data.length,
            description: data.contractunit_description || '',
            ticketid: data.ticketid,
            ticketcode: data.ticketcode || '', // ✅ AGREGADO: Incluir ticketcode
            contractunitid: data.contractunitid,
            routeCode: data.routecode || '',
            lat: data.latitude,
            lng: data.longitude,
            fromaddressnumber: data.fromaddressnumber || '',
            fromaddresscardinal: data.fromaddresscardinal || '',
            fromaddressstreet: data.fromaddressstreet || '',
            fromaddresssuffix: data.fromaddresssuffix || '',
            toaddressnumber: data.toaddressnumber || '',
            toaddresscardinal: data.toaddresscardinal || '',
            toaddressstreet: data.toaddressstreet || '',
            toaddresssuffix: data.toaddresssuffix || '',
            // 🎯 NUEVO: Propiedades de estado inicializadas
            checked: false,
            locked: false,
            assigned: false,
            started: false,
            completed: false,
            startDate: null,
            endDate: null
          });
        }
      });

      this.remainingLocations = Array.from(uniqueLocationsMap.values());

      // Add display address for better identification of same locations
      this.remainingLocations.forEach(location => {
        (location as any).displayAddress = this.getDisplayAddress(location, this.remainingLocations);
      });

      // 🔍 DEBUG: Log de remainingLocations antes de ordenar (COMENTADO)
      // console.log('📍 remainingLocations ANTES de ordenar:', this.remainingLocations.map((loc, idx) =>
      //   `${idx + 1}. Ticket ${(loc as any).ticketid} - Address: ${(loc as any).displayAddress}`
      // ));

      // ✅ Get coordinates for locations before generating the map
      this.getTicketCoordinates().then(async () => {
        // Get assigned route for the crew
        await this.getAssignedRoute();

        // ✅ Ordenar remainingLocations según el orden de la ruta asignada
        this.orderLocationsByRoute();

        // 🔍 DEBUG: Log de remainingLocations DESPUÉS de ordenar (COMENTADO)
        // console.log('📍 remainingLocations DESPUÉS de ordenar:', this.remainingLocations.map((loc, idx) =>
        //   `${idx + 1}. Ticket ${(loc as any).ticketid} - Address: ${(loc as any).displayAddress}`
        // ));

        // ✅ ÚNICA llamada a updateLeafletRoutes() - sin bucles
        console.log('🔄 ÚNICA actualización del mapa - sin bucles');
        this.updateLeafletRoutes();

        // 🎯 NUEVO: Verificar estado de todas las ubicaciones después de cargar
        setTimeout(() => {
          this.checkForCompletedLocations();
        }, 2000); // Esperar 2 segundos para que se carguen los datos
      }).catch((error: any) => {
        console.error('Error getting coordinates:', error);
      });

      // Si quieres también mostrar la primera location por defecto
      if (this.remainingLocations.length > 0) {
        this.location = this.remainingLocations[0];
      }
                this.isLoading = false;

          // 🎯 VERIFICAR UBICACIONES COMPLETADAS DESPUÉS DE CARGAR
          this.checkInitialCompletedLocations();

          // === INTEGRACIÓN PARA LEAFLET ROUTES ===
          // Esta lógica se maneja ahora en updateLeafletRoutes() que se llama después de getAssignedRoute()
          // === FIN INTEGRACIÓN ===
    },
    error: (err) => {
      this.isLoading = false;
    }
  });
}

// Helper method to format address from wayfinding data
formatAddress(data: any): string {
  // ✅ Priority 1: Concatenar los cuatro campos específicos
  const addressnumber = data.addressnumber || '';
  const addresscardinal = data.addresscardinal || '';
  const addressstreet = data.addressstreet || '';
  const addresssuffix = data.addresssuffix || '';

  // Construir la dirección concatenando los campos
  let formattedAddress = '';

  if (addressnumber && addressnumber.trim() !== '') {
    formattedAddress += addressnumber.trim();
  }

  if (addresscardinal && addresscardinal.trim() !== '') {
    formattedAddress += formattedAddress ? ` ${addresscardinal.trim()}` : addresscardinal.trim();
  }

  if (addressstreet && addressstreet.trim() !== '') {
    formattedAddress += formattedAddress ? ` ${addressstreet.trim()}` : addressstreet.trim();
  }

  if (addresssuffix && addresssuffix.trim() !== '') {
    formattedAddress += formattedAddress ? ` ${addresssuffix.trim()}` : addresssuffix.trim();
  }

  // Si tenemos una dirección válida, la retornamos
  if (formattedAddress.trim() !== '') {
    return formattedAddress.trim();
  }

  // Priority 2: Check if there's a pre-formatted address field
  if (data.address && typeof data.address === 'string' && data.address.trim() !== '') {
    return data.address.trim();
  }

  // Priority 3: Check for location field (but only if it's not just "STREET")
  if (data.location && typeof data.location === 'string' && data.location.trim() !== '' && data.location.trim().toUpperCase() !== 'STREET') {
    return data.location.trim();
  }

  // Priority 4: Fallback to any available address fields (excluding fromaddress/toaddress)
  const fallbackAddress = `${data.addressstreet || ''} ${data.addresscardinal || ''}`.trim();
  return fallbackAddress || 'Address not available';
}

// Helper method to normalize addresses for consistent display
private normalizeAddress(address: string): string {
  if (!address) return '';

  // Remove extra spaces and normalize
  let normalized = address.trim().replace(/\s+/g, ' ');

  // Normalize common variations
  normalized = normalized
    .replace(/\s*-\s*/g, ' - ') // Normalize dashes
    .replace(/\s*,\s*Chicago,\s*Illinois/gi, '') // Remove city/state if present
    .replace(/\s*,\s*IL/gi, '') // Remove state abbreviation
    .trim();

  return normalized;
}

// ✅ Format address to remove coordinates, city, and state
private cleanAddress(address: string): string {
  if (!address) return 'Address not available';

  // Remove coordinates (numbers with decimal points in parentheses)
  let formattedAddress = address.replace(/\([^)]*\)/g, '').trim();

  // Remove common city/state patterns
  // Remove ", Chicago, IL" or similar patterns
  formattedAddress = formattedAddress.replace(/,\s*[^,]+,\s*[A-Z]{2}.*$/i, '');

  // Remove ", Estados Unidos" or similar country names
  formattedAddress = formattedAddress.replace(/,\s*[^,]+$/, '');

  // Remove any remaining trailing commas and whitespace
  formattedAddress = formattedAddress.replace(/,\s*$/, '').trim();

  return formattedAddress || 'Address not available';
}

// Helper method to get display address with ticket count for same locations
private getDisplayAddress(location: any, allLocations: any[]): string {
  const baseAddress = location.address;

  // ✅ Siempre devolver solo la dirección sin ticket ID
  return baseAddress; // ✅ Mantener el formato original: "3558 - 3655 W 84TH PL"
}

private async getTicketCoordinates(): Promise<void> {
  // Get coordinates for locations that don't have them
  const locationsWithoutCoordinates = this.remainingLocations.filter(loc => !loc.lat || !loc.lng);

  if (locationsWithoutCoordinates.length === 0) {
    return; // All locations already have coordinates
  }

  // Process locations in parallel for better performance
  const coordinatePromises = locationsWithoutCoordinates.map(async (loc) => {
    if (!loc.ticketcode) {
      console.warn('Location missing ticketcode:', loc);
      return;
    }

    try {
      const response: any = await firstValueFrom(
        this.http.get(`${environment.apiUrl}/tickets/coordinates/${loc.ticketcode}`)
      );

      if (response.success && response.data && response.data.addresses && response.data.addresses.length > 0) {
        // Use the first address coordinates
        const firstAddress = response.data.addresses[0];
        loc.lat = firstAddress.latitude;
        loc.lng = firstAddress.longitude;

        // ✅ FIXED: Preserve the original address format - don't overwrite it!
        // Only update coordinates, keep the original address for route matching
        console.log(`✅ Got coordinates for ticket ${loc.ticketcode}:`, {
          lat: loc.lat,
          lng: loc.lng,
          originalAddress: loc.address,
          apiAddress: firstAddress.fullAddress
        });
      } else {
        console.warn(`❌ No coordinates found for ticket ${loc.ticketcode}`);
      }
    } catch (err) {
      console.error(`❌ Error getting coordinates for ticket ${loc.ticketcode}:`, err);
    }
  });

  // Wait for all coordinate requests to complete
  await Promise.all(coordinatePromises);
}


goToCurrent(location: any) {
  const storedUserId = Number(localStorage.getItem('userId'));
  const person = this.employeeList.find(p => p.userid === storedUserId);
  const crewId = person?.crewid || 0;

  // Guardar también los campos de wayfinding si existen
  const locationToSave = {
    ...location,
    fromaddressnumber: location.fromaddressnumber || '',
    fromaddresscardinal: location.fromaddresscardinal || '',
    fromaddressstreet: location.fromaddressstreet || '',
    fromaddresssuffix: location.fromaddresssuffix || '',
    toaddressnumber: location.toaddressnumber || '',
    toaddresscardinal: location.toaddresscardinal || '',
    toaddressstreet: location.toaddressstreet || '',
    toaddresssuffix: location.toaddresssuffix || ''
  };

  localStorage.setItem('selectedLocation', JSON.stringify(locationToSave));
  localStorage.setItem('crewId', String(crewId));
  localStorage.setItem('selectedRouteCode', location.routeCode || ''); // ✅ AGREGADO: Guardar routeCode
  this.router.navigate(['/current']);
}


  private updateLeafletRoutes() {
    // 🎯 NUEVO: Verificar si el componente está siendo destruido
    if (!this.completionCheckInterval) {
      console.log('⚠️ Actualización de mapa cancelada - componente en proceso de destrucción');
      return;
    }

    // 🎯 NUEVO: Verificar que el mapa esté disponible y no esté en proceso de actualización
    if (!this.leafletMap || !this.assignedRoute) {
      return;
    }

    // 🎯 NUEVO: Verificar que el mapa esté inicializado
    try {
      const map = (this.leafletMap as any).map;
      if (!map || !map.invalidateSize) {
        console.warn('⚠️ Mapa no está completamente inicializado');
        return;
      }
    } catch (error) {
      console.warn('⚠️ Error verificando estado del mapa:', error);
      return;
    }

    // 🎯 NUEVO: Validar optimizedOrder para evitar errores de parsing
    if (this.assignedRoute.optimizedOrder) {
      try {
        if (typeof this.assignedRoute.optimizedOrder === 'string') {
          // 🎯 NUEVO: Limpiar el string antes de parsear
          const cleanedOptimizedOrder = this.assignedRoute.optimizedOrder
            .replace(/[^\d,\[\]]/g, '') // Remover caracteres no válidos
            .replace(/,\s*,/g, ',') // Remover comas duplicadas
            .replace(/^,+|,+$/g, ''); // Remover comas al inicio y final
          
          if (cleanedOptimizedOrder) {
            this.assignedRoute.optimizedOrder = JSON.parse(`[${cleanedOptimizedOrder}]`);
          } else {
            this.assignedRoute.optimizedOrder = [];
          }
        }
      } catch (error) {
        console.error(`❌ Error parsing optimizedOrder for route ${this.assignedRoute.routeId || this.assignedRoute.routeid}:`, error);
        console.error('Raw optimizedOrder value:', this.assignedRoute.optimizedOrder);
        
        // 🎯 NUEVO: Usar el método de manejo de errores de optimización
        if (this.isOptimizationError(error)) {
          this.assignedRoute.optimizedOrder = this.handleOptimizationError(
            this.assignedRoute.routeId || this.assignedRoute.routeid, 
            this.assignedRoute.optimizedOrder
          );
        } else {
          this.assignedRoute.optimizedOrder = [];
        }
      }
    }

    // Verificar si la ruta tiene polyline (probar ambos formatos de nombres)
    const hasPolyline = this.assignedRoute.encodedpolyline || this.assignedRoute.encodedPolyline;

    if (hasPolyline) {
      this.leafletRoutes = [{
        routeId: this.assignedRoute.routeid || this.assignedRoute.routeId,
        routeCode: this.assignedRoute.routecode || this.assignedRoute.routeCode,
        type: this.assignedRoute.type,
        encodedPolyline: this.assignedRoute.encodedpolyline || this.assignedRoute.encodedPolyline,
        tickets: this.forceCorrectOrder(this.assignedRoute.tickets || [])
      }];

      // Agregar la ruta asignada al conjunto de rutas visibles
      this.visibleRoutes.clear();
      const routeId = this.assignedRoute.routeid || this.assignedRoute.routeId;
      this.visibleRoutes.add(routeId);
    } else {
      this.leafletRoutes = [];
      this.visibleRoutes.clear();
    }

    // 🎯 NUEVO: Usar setTimeout para dar tiempo al mapa a procesar los cambios
    setTimeout(() => {
      if (this.leafletMap) {
        try {
          // Intentar invalidar el tamaño del mapa de forma segura
          const map = (this.leafletMap as any).map;
          if (map && map.invalidateSize && typeof map.invalidateSize === 'function') {
            map.invalidateSize();
          }
        } catch (error) {
          console.warn('⚠️ Error al actualizar el mapa:', error);
        }
      }
    }, 100);
  }

// Zoom control methods
changeZoomLevel(zoomLevel: number): void {
  if (this.availableZoomLevels.includes(zoomLevel)) {
    this.currentZoomLevel = zoomLevel;
    // this.updateStaticMap(); // Removed as per edit hint
  }
}

zoomIn(): void {
  const currentIndex = this.availableZoomLevels.indexOf(this.currentZoomLevel);
  if (currentIndex < this.availableZoomLevels.length - 1) {
    const newZoom = this.availableZoomLevels[currentIndex + 1];
    this.changeZoomLevel(newZoom);
  }
}

zoomOut(): void {
  const currentIndex = this.availableZoomLevels.indexOf(this.currentZoomLevel);
  if (currentIndex > 0) {
    const newZoom = this.availableZoomLevels[currentIndex - 1];
    this.changeZoomLevel(newZoom);
  }
}

// Location navigation methods
goToPreviousLocation(): void {
  if (this.remainingLocations.length > 0) {
    this.currentLocationIndex = (this.currentLocationIndex - 1 + this.remainingLocations.length) % this.remainingLocations.length;
    // this.updateStaticMap(); // Removed as per edit hint
  }
}

goToNextLocation(): void {
  if (this.remainingLocations.length > 0) {
    this.currentLocationIndex = (this.currentLocationIndex + 1) % this.remainingLocations.length;
    // this.updateStaticMap(); // Removed as per edit hint
  }
}

getCurrentLocation(): any {
  if (this.remainingLocations.length > 0) {
    return this.remainingLocations[this.currentLocationIndex];
  }
  return null;
}

getLocationNavigationInfo(): string {
  if (this.remainingLocations.length === 0) {
    return 'No locations';
  }
  return `${this.currentLocationIndex + 1} of ${this.remainingLocations.length}`;
}

showLocationOnMap(locationIndex: number): void {
  if (locationIndex >= 0 && locationIndex < this.remainingLocations.length) {
    this.currentLocationIndex = locationIndex;
    const loc = this.remainingLocations[locationIndex];

    if (loc.lat && loc.lng && this.leafletMap) {
      // Hacer zoom y centrar con animación suave
      this.leafletMap.setCenter(loc.lat, loc.lng);

      // Hacer zoom a un nivel más cercano para ver mejor la ubicación
      setTimeout(() => {
        this.leafletMap.setZoom(17); // Zoom más cercano para ver la ubicación
      }, 100);
    }
  }
}

showAllLocations(): void {
  this.currentLocationIndex = 0; // Reset to first location to show all

  if (this.leafletMap) {
    // Volver a la vista general con zoom más amplio
    this.leafletMap.setZoom(13); // Zoom más amplio para ver todas las ubicaciones
  }
}

// Método adicional para hacer zoom suave a una ubicación específica
showLocationWithSmoothZoom(locationIndex: number): void {
  if (locationIndex >= 0 && locationIndex < this.remainingLocations.length) {
    this.currentLocationIndex = locationIndex;
    const loc = this.remainingLocations[locationIndex];

    if (loc.lat && loc.lng && this.leafletMap) {
      // Crear un bounds pequeño alrededor de la ubicación para zoom suave
      const latLng = [loc.lat, loc.lng] as [number, number];
      const bounds = L.latLngBounds([latLng, latLng]);

      // Hacer zoom suave usando fitBounds
      this.leafletMap.fitBounds(bounds);

      // Después de un delay, hacer zoom más cercano
      setTimeout(() => {
        this.leafletMap.setZoom(17);
      }, 500);
    }
  }
}

onFilterChange(): void {
  const filter = this.filterText.trim().toLowerCase();

  if (!filter) {
    // Si se limpia el filtro, mostrar todas las ubicaciones
    this.currentLocationIndex = 0;
    return;
  }

  // Buscar la primera ubicación que coincida con el filtro
  const firstFilteredIndex = this.remainingLocations.findIndex(loc =>
    loc.address.toLowerCase().includes(filter) ||
    loc.job?.toLowerCase().includes(filter)
  );

  if (firstFilteredIndex !== -1) {
    this.currentLocationIndex = firstFilteredIndex;
    // ✅ NO hacer zoom automático - solo filtrar las ubicaciones
  }
}

clearFilter(): void {
  this.filterText = '';
  this.currentLocationIndex = 0;
  // ✅ NO hacer zoom automático - solo limpiar el filtro
}

// Método para hacer zoom suave a ubicación filtrada
private zoomToFilteredLocation(locationIndex: number): void {
  if (locationIndex >= 0 && locationIndex < this.remainingLocations.length) {
    const loc = this.remainingLocations[locationIndex];

    if (loc.lat && loc.lng && this.leafletMap) {
      // Crear un bounds pequeño alrededor de la ubicación para zoom suave
      const latLng = [loc.lat, loc.lng] as [number, number];
      const bounds = L.latLngBounds([latLng, latLng]);

      // Hacer zoom suave usando fitBounds
      this.leafletMap.fitBounds(bounds);

      // Después de un delay, hacer zoom más cercano
      setTimeout(() => {
        this.leafletMap.setZoom(17);
      }, 500);
    }
  }
}

// ✅ MÉTODO PARA ORDENAR UBICACIONES SEGÚN EL CAMPO QUEUE DE ROUTETICKETS
private orderLocationsByRoute(): void {
  if (!this.assignedRoute || !this.assignedRoute.tickets || this.remainingLocations.length === 0) {
    return;
  }

  // Crear un mapa de ticketId -> queue de RouteTickets
  const routeOrderMap = new Map<number, number>();
  this.assignedRoute.tickets.forEach((ticket: any) => {
    const ticketId = ticket.ticketId || ticket.ticketid;
    if (ticketId) {
      // Usar el campo queue de RouteTickets como orden principal
      routeOrderMap.set(ticketId, ticket.queue ?? 999);
    }
  });

  // Ordenar remainingLocations según el queue de RouteTickets
  this.remainingLocations.sort((a, b) => {
    const aTicketId = (a as any).ticketid;
    const bTicketId = (b as any).ticketid;

    const aQueue = routeOrderMap.get(aTicketId) ?? 999;
    const bQueue = routeOrderMap.get(bTicketId) ?? 999;

    return aQueue - bQueue;
  });

  // console.log('✅ Ubicaciones ordenadas según queue de RouteTickets');
  // console.log('📍 Orden final:', this.remainingLocations.map((loc, idx) =>
  //   `${idx + 1}. Queue ${routeOrderMap.get((loc as any).ticketid) ?? 'N/A'}: ${loc.address}`
  // ));
}

// Método para ordenar tickets según el orden correcto
private sortTicketsByOrder(tickets: any[]): any[] {
  // Crear una copia de los tickets para no modificar el original
  const sortedTickets = [...tickets];

  // Ordenar por queue, order, o índice
  sortedTickets.sort((a, b) => {
    const aOrder = a.queue ?? a.order ?? 0;
    const bOrder = b.queue ?? b.order ?? 0;
    return aOrder - bOrder;
  });

  // Mapear a formato final
  const finalTickets = sortedTickets.map((t: any, idx: number) => {
    const ticket = {
      ticketId: t.ticketId || t.ticketid,
      address: t.address,
      queue: t.queue ?? t.order ?? idx
    };
    return ticket;
  });

  return finalTickets;
}

  // ✅ MÉTODO CORREGIDO: Usar el campo queue de RouteTickets
  private forceCorrectOrder(tickets: any[]): any[] {
    // 🎯 NUEVO: Verificar si el componente está siendo destruido
    if (!this.completionCheckInterval) {
      console.log('⚠️ Ordenamiento de tickets cancelado - componente en proceso de destrucción');
      return tickets;
    }

    if (!tickets || tickets.length === 0) {
      return tickets;
    }

  // ✅ Mapear tickets manteniendo el queue original de RouteTickets
  const finalTickets = tickets.map((t: any) => ({
    ticketId: t.ticketId || t.ticketid,
    address: t.address,
    queue: t.queue ?? 0 // Usar el campo queue de RouteTickets
  }));

  // ✅ Ordenar por queue (orden de RouteTickets)
  finalTickets.sort((a, b) => {
    const aQueue = a.queue ?? 0;
    const bQueue = b.queue ?? 0;
    return aQueue - bQueue;
  });

  console.log('✅ Tickets ordenados por queue de RouteTickets:', finalTickets.map(t => `${t.queue}: ${t.address}`));

  return finalTickets;
}

getZoomDescription(): string {
  switch (this.currentZoomLevel) {
    case 10: return 'City View';
    case 12: return 'Neighborhood View';
    case 15: return 'Street View';
    case 17: return 'Close Street View';
    case 19: return 'Building View';
    default: return 'Street View';
  }
}

// Debug method to check map state
debugMapState(): void {
  // Show all locations on map
  this.showAllLocations();

  // ✅ Debug: Mostrar información del orden basado en RouteTickets (COMENTADO)
  // console.log('🔍 === DEBUG ORDEN DE UBICACIONES (RouteTickets) ===');
  // console.log('📍 Ruta asignada:', this.assignedRoute?.routecode);
  // console.log('📍 Tickets en la ruta (RouteTickets):');
  // if (this.assignedRoute?.tickets) {
  //   this.assignedRoute.tickets.forEach((ticket: any) => {
  //     console.log(`  Queue ${ticket.queue}: Ticket ${ticket.ticketId || ticket.ticketid} - Address: ${ticket.address}`);
  //   });
  // }

  // console.log('📍 Ubicaciones en remainingLocations (ordenadas por queue):');
  // this.remainingLocations.forEach((location, index) => {
  //   const ticketId = (location as any).ticketid;
  //   const queue = this.assignedRoute?.tickets?.find((t: any) =>
  //     (t.ticketId || t.ticketid) === ticketId
  //   )?.queue ?? 'N/A';
  //   console.log(`  ${index + 1}. Queue ${queue}: Ticket ${ticketId} - Address: ${location.address}`);
  // });
  // console.log('🔍 === FIN DEBUG ===');
}

}

