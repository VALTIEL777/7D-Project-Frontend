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
import { firstValueFrom, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
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
    console.log('🚀 Iniciando carga optimizada del componente upcoming...');

    // 🎯 NUEVO: Inicializar tracking de usuario
    this.lastCheckedUserId = Number(localStorage.getItem('userId'));
    this.lastCheckedCrewId = this.getCurrentCrewId();

    // 🎯 NUEVO: Cargar datos críticos en paralelo
    this.loadCriticalDataInParallel();

    // 🎯 NUEVO: Cargar datos secundarios después
    setTimeout(() => {
      this.loadSecondaryData();
    }, 50);
  }

  // 🎯 NUEVO: Método para cargar datos críticos en paralelo
  private loadCriticalDataInParallel(): void {
    console.log('⚡ Cargando datos críticos en paralelo...');

    // Cargar empleados y configurar listeners en paralelo
    forkJoin({
      employees: this.loadEmployeesAsync()
    }).subscribe({
      next: (results) => {
        console.log('✅ Datos críticos cargados exitosamente');

        // 🎯 ESCUCHAR CAMBIOS EN EL ESTADO DE COMPLETADO DE UBICACIONES
        this.setupLocationCompletionListener();

        // 🎯 EXPONER MÉTODOS DE DEBUG PARA CONSOLE
        this.exposeDebugMethods();
      },
      error: (error) => {
        console.error('❌ Error cargando datos críticos:', error);
      }
    });
  }

  // 🎯 NUEVO: Método para cargar datos secundarios
  private loadSecondaryData(): void {
    console.log('📦 Cargando datos secundarios...');

    // Aquí puedes agregar carga de datos secundarios si es necesario
    console.log('✅ Datos secundarios cargados exitosamente');
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
    // 🎯 OPTIMIZED: Back to original frequency since buttons are now isolated
    this.completionCheckInterval = setInterval(() => {
      // Only run checks if component is still active
      if (this.completionCheckInterval) {
        this.checkForCompletedLocations();
      }
    }, 30000); // 🎯 BACK TO ORIGINAL: 30 seconds since buttons are now stable

    // 🎯 OPTIMIZED: Initial check with original delay
    setTimeout(() => {
      if (this.completionCheckInterval) {
        this.checkForCompletedLocations();
      }
    }, 5000); // 🎯 BACK TO ORIGINAL: 5 seconds
  }

  //  NUEVO: Método para obtener crewId actual
  private getCurrentCrewId(): number | null {
    const storedUserId = Number(localStorage.getItem('userId'));
    const person = this.employeeList.find(p => p.userid === storedUserId);
    return person?.crewid || null;
  }

  // 🎯 NUEVO: Propiedades para tracking de cambios
  private lastCheckedUserId: number | null = null;
  private lastCheckedCrewId: number | null = null;
  private lastCheckTime: number = 0;

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

    // 🎯 NUEVO: Limpiar tracking de usuario
    this.lastCheckedUserId = null;
    this.lastCheckedCrewId = null;
    this.lastCheckTime = 0;

    // 🎯 NUEVO: Limpiar rutas para evitar accesos posteriores
    this.leafletRoutes = [];
    this.visibleRoutes.clear();
    this.assignedRoute = null;

    console.log('✅ Componente upcoming destruido completamente');
  }

  // 🎯 OPTIMIZADO: Método para verificar ubicaciones completadas con mejor control de cambios
  private checkForCompletedLocations(): void {
    console.log('🔄 Verificando ubicaciones completadas de manera optimizada...');

    // 🎯 NUEVO: Verificar si el componente está siendo destruido
    if (!this.completionCheckInterval) {
      console.log('⚠️ Verificación cancelada - componente en proceso de destrucción');
      return;
    }

    // 🎯 OPTIMIZED: Back to original throttling since buttons are now isolated
    const now = Date.now();
    const lastCheck = this.lastCheckTime || 0;
    if (this.isCheckingLocations && (now - lastCheck) < 30000) { // 🎯 BACK TO ORIGINAL: 30 seconds
      console.log('⚠️ Verificación en progreso, saltando...');
      return;
    }

    if (this.remainingLocations.length === 0) {
      console.log('⚠️ No hay ubicaciones para verificar');
      return;
    }

    // 🎯 NUEVO: Verificar todas las ubicaciones, no solo las visibles
    const allLocations = this.remainingLocations;
    if (allLocations.length === 0) {
      console.log('⚠️ No hay ubicaciones para verificar');
      return;
    }

    // 🎯 NUEVO: Marcar que estamos verificando
    this.isCheckingLocations = true;
    this.lastCheckTime = now;

    // Obtener el crewId actual
    const storedUserId = Number(localStorage.getItem('userId'));
    const person = this.employeeList.find(p => p.userid === storedUserId);
    const currentCrewId = person?.crewid;

    if (!currentCrewId) {
      console.log('⚠️ No se encontró crewId para verificar');
      this.isCheckingLocations = false;
      return;
    }

    console.log(`🔄 Verificando ${allLocations.length} ubicaciones para crew ${currentCrewId}`);

    // 🎯 OPTIMIZED: Verificar ubicaciones en lotes para mejor rendimiento
    this.checkLocationsInBatches(allLocations, currentCrewId);
  }

  // 🎯 NUEVO: Método para verificar ubicaciones en lotes
  private async checkLocationsInBatches(visibleLocations: any[], currentCrewId: number): Promise<void> {
    const batchSize = 3; // Verificar 3 ubicaciones a la vez
    const batches = [];

    for (let i = 0; i < visibleLocations.length; i += batchSize) {
      batches.push(visibleLocations.slice(i, i + batchSize));
    }

    let completedCount = 0;
    let processedCount = 0;

    for (const batch of batches) {
      const batchPromises = batch.map((location, originalIndex) => {
        const ticketId = (location as any).ticketid;
        if (ticketId) {
          // Encontrar el índice actual en remainingLocations (puede haber cambiado)
          const currentIndex = this.remainingLocations.findIndex(loc =>
            (loc as any).ticketid === ticketId && loc.address === location.address
          );

          if (currentIndex !== -1) {
            return this.checkLocationCompletionStatus(ticketId, location, currentIndex).then(() => {
              processedCount++;
              // 🎯 NUEVO: Incrementar contador si la ubicación fue completada
              if (this.remainingLocations[currentIndex]?.completed) {
                completedCount++;
              }
            });
          }
        }
        return Promise.resolve();
      });

      // Esperar a que el lote actual termine
      await Promise.all(batchPromises);

      // 🎯 NUEVO: Pequeña pausa entre lotes para no sobrecargar el servidor
      if (batches.indexOf(batch) < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    this.isCheckingLocations = false;

    console.log(`✅ Verificación completada: ${processedCount} ubicaciones procesadas, ${completedCount} completadas`);

            // 🎯 NUEVO: Solo actualizar el mapa si hubo cambios
        if (completedCount > 0) {
          console.log('🔄 Actualizando mapa debido a ubicaciones completadas');
          this.updateLeafletMap();
        }

    // 🎯 NUEVO: Limpiar logs antiguos (más de 5 minutos)
    const now = Date.now();
    Object.keys(this.lastCompletionLog).forEach(key => {
      if (now - this.lastCompletionLog[key] > 300000) { // 5 minutos
        delete this.lastCompletionLog[key];
      }
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
          console.log(`🔍 Verificando ticket ${ticketId} - TicketStatus encontrados:`, ticketStatuses.length);

          // 🎯 SOLUCIÓN TEMPORAL: Obtener nombres de fases usando taskstatusid
          this.getPhaseNamesForTicketStatuses(ticketStatuses).then(enhancedTicketStatuses => {
            console.log(`🔍 TicketStatus con nombres de fases para ticket ${ticketId}:`, enhancedTicketStatuses);

            let isCompleted = false;
            let isStarted = false;

            if (this.useCrewTypeMatching) {
              // 🎯 MODO 1: Verificar si la fase completada es idéntica al crew type
              isCompleted = this.isCompletedPhaseMatchingCrewType(enhancedTicketStatuses, location);
              isStarted = this.hasStartedPhase(enhancedTicketStatuses, location);
            } else {
              // 🎯 MODO 2: Verificar si todas las fases obligatorias están completadas
              isCompleted = this.areAllRequiredPhasesCompleted(enhancedTicketStatuses, location);
              isStarted = this.hasStartedPhase(enhancedTicketStatuses, location);
            }

            console.log(`🔍 Estado calculado para ${location.address}:`, {
              isCompleted,
              isStarted,
              crewType: this.crewType
            });

            // 🎯 NUEVO: Verificar si hay algún cambio en el estado
            const currentState = {
              completed: location.completed,
              started: location.started,
              assigned: location.assigned
            };

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
            } else if (isStarted) {
              // 🎯 NUEVO: Marcar como iniciada si no está completada pero sí iniciada
              if ((location as any).ticketid === ticketId) {
                this.markLocationAsStarted(locationIndex, enhancedTicketStatuses);
              }
            } else {
              // 🎯 NUEVO: Marcar como pendiente si no está completada ni iniciada
              if ((location as any).ticketid === ticketId) {
                this.markLocationAsPending(locationIndex, enhancedTicketStatuses);
              }
            }

            // 🎯 NUEVO: Verificar si hubo cambio de estado y forzar actualización de UI
            const newState = {
              completed: location.completed,
              started: location.started,
              assigned: location.assigned
            };

            if (JSON.stringify(currentState) !== JSON.stringify(newState)) {
              console.log(`🔄 Cambio de estado detectado para ${location.address}:`, {
                from: currentState,
                to: newState
              });

                    // 🎯 NUEVO: Forzar actualización de la UI inmediatamente
      this.updateLeafletMap();
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

  // 🎯 NUEVO MÉTODO: Marcar ubicación como iniciada
  private markLocationAsStarted(locationIndex: number, ticketStatuses: any[]): void {
    if (locationIndex >= 0 && locationIndex < this.remainingLocations.length) {
      const location = this.remainingLocations[locationIndex];

      // 🎯 NUEVO: Aplicar lógica para ubicación iniciada
      location.checked = true;
      location.locked = false;
      location.assigned = true;
      location.completed = false;
      location.started = true;

      // 🎯 NUEVO: Obtener fecha de inicio
      const startedStatus = ticketStatuses.find(ts => ts.startingdate);
      if (startedStatus) {
        location.startDate = startedStatus.startingdate;
        location.endDate = null;
      }

      console.log(`🔄 Ubicación marcada como iniciada: ${location.address}`);
    }
  }

  // 🎯 NUEVO MÉTODO: Verificar si hay una fase iniciada
  private hasStartedPhase(ticketStatuses: any[], location: any): boolean {
    // Obtener el crewId actual
    const storedUserId = Number(localStorage.getItem('userId'));
    const person = this.employeeList.find(p => p.userid === storedUserId);
    const currentCrewId = person?.crewid;

    // Buscar fases iniciadas (sin filtrar por crewId específico)
    const startedPhases = ticketStatuses.filter(ts => {
      const hasStartingDate = ts.startingdate;
      const hasStartedStatus = ts.status === 'started' || ts.status === 'STARTED';

      return hasStartingDate || hasStartedStatus;
    });

    return startedPhases.length > 0;
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

  // 🎯 NUEVO MÉTODO: Verificar si alguna ubicación del grupo tiene estado
  hasAnyLocationWithStatus(locations: any[]): boolean {
    return locations.some(location => location.completed || location.started);
  }

  // 🎯 NUEVO MÉTODO: Verificar si todas las ubicaciones del grupo están completadas
  hasAllLocationsCompleted(locations: any[]): boolean {
    return locations.every(location => location.completed);
  }

  // 🎯 NUEVO MÉTODO: Verificar si alguna ubicación del grupo está iniciada
  hasAnyLocationStarted(locations: any[]): boolean {
    return locations.some(location => location.started);
  }

  // 🎯 NUEVO MÉTODO: Obtener el icono de estado para un grupo de ubicaciones
  getGroupStatusIcon(locations: any[]): string {
    if (this.hasAllLocationsCompleted(locations)) {
      return 'check_circle';
    } else if (this.hasAnyLocationStarted(locations)) {
      return 'pending';
    } else {
      return 'schedule';
    }
  }

  // 🎯 NUEVO MÉTODO: Obtener el estado de un grupo de ubicaciones
  getGroupStatus(locations: any[]): string {
    if (this.hasAllLocationsCompleted(locations)) {
      return 'Completed';
    } else if (this.hasAnyLocationStarted(locations)) {
      return 'In Progress';
    } else {
      return 'Pending';
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

    console.log(`🔍 Verificando crew type matching para ${location.address}:`, {
      currentCrewType,
      currentCrewId,
      ticketStatusesCount: ticketStatuses.length
    });

    // Verificar si el crew type es válido
    if (!this.isValidCrewType(currentCrewType)) {
      console.log(`❌ Crew type no válido: ${currentCrewType}`);
      return false;
    }

    // Buscar fases completadas que coincidan con el crew type (sin filtrar por crewId específico)
    const completedPhases = ticketStatuses.filter(ts => {
      const hasEndingDate = ts.endingdate;
      const hasEndingTime = ts.endingtime;
      const hasCompletedStatus = ts.status === 'completed' || ts.status === 'COMPLETED';
      const hasEndDate = ts.enddate;

      // 🎯 NUEVO: No filtrar por crewId específico - mostrar todas las fases completadas
      const isCompleted = hasEndingDate || hasEndingTime || hasCompletedStatus || hasEndDate;

      if (isCompleted) {
        console.log(`✅ Fase completada encontrada:`, {
          phaseName: ts.name || ts.taskname || ts.taskName || ts.phasename || ts.phaseName || ts.description,
          crewId: ts.crewid,
          endingDate: ts.endingdate,
          status: ts.status,
          currentCrewId: currentCrewId
        });
      }

      return isCompleted;
    });

    console.log(`📊 Fases completadas encontradas: ${completedPhases.length}`);

    // Verificar si alguna fase completada coincide con el crew type (comparación más flexible)
    const matchingCompletedPhase = completedPhases.find(ts => {
      const phaseName = (ts.name || ts.taskname || ts.taskName || ts.phasename || ts.phaseName || ts.description || '').toLowerCase();
      const crewType = currentCrewType?.toLowerCase() || '';

      console.log(`🔍 Comparando fase: "${phaseName}" con crew type: "${crewType}"`);

      // 🎯 COMPARACIÓN FLEXIBLE: Buscar coincidencias parciales
      let matches = false;

      // Comparación exacta
      if (phaseName === crewType) {
        matches = true;
        console.log(`✅ Coincidencia exacta: "${phaseName}" = "${crewType}"`);
      }
      // Comparación con "spotting" vs "spot"
      else if (crewType === 'spotting' && (phaseName.includes('spot') || phaseName.includes('mark'))) {
        matches = true;
        console.log(`✅ Coincidencia parcial (spotting): "${phaseName}" contiene "spot" o "mark"`);
      }
      // Comparación con "crack seal" vs "crack"
      else if (crewType === 'crack seal' && phaseName.includes('crack')) {
        matches = true;
        console.log(`✅ Coincidencia parcial (crack seal): "${phaseName}" contiene "crack"`);
      }
      // Comparación con "concrete" vs "pour"
      else if (crewType === 'concrete' && (phaseName.includes('pour') || phaseName.includes('concrete'))) {
        matches = true;
        console.log(`✅ Coincidencia parcial (concrete): "${phaseName}" contiene "pour" o "concrete"`);
      }
      // Comparación con "asphalt" vs "pave"
      else if (crewType === 'asphalt' && (phaseName.includes('pave') || phaseName.includes('asphalt'))) {
        matches = true;
        console.log(`✅ Coincidencia parcial (asphalt): "${phaseName}" contiene "pave" o "asphalt"`);
      }
      // Comparación con "clean" vs "clean"
      else if (crewType === 'clean' && phaseName.includes('clean')) {
        matches = true;
        console.log(`✅ Coincidencia parcial (clean): "${phaseName}" contiene "clean"`);
      }

      return matches;
    });

    const result = !!matchingCompletedPhase;
    console.log(`🎯 Resultado final para ${location.address}: ${result}`);

    return result;
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
        this.updateLeafletMap();
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

  // 🎯 NUEVO: Método para forzar verificación cuando cambia el usuario
  public forceCheckForUserChange(): void {
    console.log('🔄 Verificación por cambio de usuario iniciada...');

    // Resetear estado de verificación
    this.isCheckingLocations = false;
    this.lastCompletionLog = {};

    // Forzar verificación inmediata
    setTimeout(() => {
      this.checkForCompletedLocations();
    }, 500);
  }

  // 🎯 NUEVO: Método para forzar actualización de la UI
  private forceUIUpdate(): void {
    console.log('🔄 Forzando actualización de UI...');

    // Forzar detección de cambios de Angular
    setTimeout(() => {
      // Actualizar el mapa
      this.updateLeafletMap();

      // Forzar detección de cambios
      if (this.leafletMap) {
        try {
          const map = (this.leafletMap as any).map;
          if (map && map.invalidateSize) {
            map.invalidateSize();
          }
        } catch (error) {
          console.warn('⚠️ Error al actualizar mapa:', error);
        }
      }
    }, 50);
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
      this.updateLeafletMap();
  }

  // 🎯 NUEVO MÉTODO: Mostrar solo ubicaciones activas (Completed e In Progress)
  public showOnlyActiveLocations(): void {
    console.log(`🎯 Mostrando solo ubicaciones activas (Completed e In Progress)`);
    this.updateLeafletMap();
  }

  // 🎯 NUEVO MÉTODO: Obtener información de ubicaciones visibles
  public getVisibleLocationsInfo(): any {
    const completedCount = this.remainingLocations.filter(loc => loc.completed).length;
    const inProgressCount = this.remainingLocations.filter(loc => loc.started && !loc.completed).length;
    const totalVisible = this.remainingLocations.length; // TEMPORAL: mostrar todas
    const totalLocations = this.remainingLocations.length;

    return {
      completed: completedCount,
      inProgress: inProgressCount,
      visible: totalVisible,
      total: totalLocations,
      hidden: 0 // TEMPORAL: no hay ocultas
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

  // 🎯 MÉTODO PÚBLICO PARA FORZAR VERIFICACIÓN DE UBICACIONES
  public forceLocationCheck(): void {
    console.log('🔄 Forzando verificación de ubicaciones...');
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

  // 🎯 NUEVO MÉTODO: Debug del estado de ubicaciones
  public debugLocationStates(): void {
    console.log('🔍 === LOCATION STATES DEBUG ===');
    console.log('📍 Total Locations:', this.remainingLocations.length);

    this.remainingLocations.forEach((location, index) => {
      console.log(`📍 Location ${index + 1}:`, {
        address: location.address,
        ticketId: (location as any).ticketid,
        completed: location.completed,
        started: location.started,
        assigned: location.assigned,
        checked: location.checked,
        locked: location.locked
      });
    });

    const completedCount = this.remainingLocations.filter(loc => loc.completed).length;
    const startedCount = this.remainingLocations.filter(loc => loc.started).length;
    const assignedCount = this.remainingLocations.filter(loc => loc.assigned).length;

    console.log('📊 Summary:', {
      completed: completedCount,
      started: startedCount,
      assigned: assignedCount,
      total: this.remainingLocations.length
    });
    console.log('🔍 === END LOCATION STATES DEBUG ===');
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
      refreshRoute: () => this.getAssignedRoute(),
      // 🎯 NUEVO: Métodos para debugging de sincronización de estado
      forceUserChangeCheck: () => this.forceCheckForUserChange(),
      checkLocationStates: () => this.debugLocationStates(),
      forceStateCheck: () => {
        console.log('🔄 Forzando verificación de estado...');
        this.isCheckingLocations = false;
        this.lastCompletionLog = {};
        this.checkForCompletedLocations();
      },
      forceStateCheckWithDetails: () => {
        console.log('🔄 Forzando verificación de estado con detalles...');
        console.log('📊 Estado actual del componente:', {
          totalLocations: this.remainingLocations.length,
          crewType: this.crewType,
          currentUserId: Number(localStorage.getItem('userId')),
          currentCrewId: this.getCurrentCrewId()
        });

        // Verificar cada ubicación individualmente con detalles
        this.remainingLocations.forEach((location, index) => {
          const ticketId = (location as any).ticketid;
          if (ticketId) {
            console.log(`🔍 Verificando ubicación ${index + 1}: ${location.address} (Ticket: ${ticketId})`);
            this.ticketStatusService.getByTicket(ticketId).subscribe({
              next: (ticketStatuses: any[]) => {
                console.log(`📊 TicketStatus para ${location.address}:`, ticketStatuses);
                this.getPhaseNamesForTicketStatuses(ticketStatuses).then(enhancedTicketStatuses => {
                  console.log(`📊 TicketStatus con nombres para ${location.address}:`, enhancedTicketStatuses);
                  const isCompleted = this.isCompletedPhaseMatchingCrewType(enhancedTicketStatuses, location);
                  const isStarted = this.hasStartedPhase(enhancedTicketStatuses, location);
                  console.log(`✅ Estado final para ${location.address}:`, {
                    isCompleted,
                    isStarted,
                    crewType: this.crewType
                  });
                });
              },
              error: (err) => {
                console.error(`❌ Error verificando ${location.address}:`, err);
              }
            });
          }
        });
      },
      getCurrentUserInfo: () => ({
        userId: this.lastCheckedUserId,
        crewId: this.lastCheckedCrewId,
        currentUserId: Number(localStorage.getItem('userId')),
        currentCrewId: this.getCurrentCrewId()
      }),
      getLocationStatus: () => {
        return this.remainingLocations.map(loc => ({
          address: loc.address,
          ticketId: (loc as any).ticketid,
          completed: loc.completed,
          started: loc.started,
          assigned: loc.assigned
        }));
      },
      checkSpecificLocation: (address: string) => {
        const location = this.remainingLocations.find(loc => loc.address.includes(address));
        if (location) {
          const ticketId = (location as any).ticketid;
          console.log(`🔍 Verificando ubicación específica: ${address} (Ticket: ${ticketId})`);
          this.ticketStatusService.getByTicket(ticketId).subscribe({
            next: (ticketStatuses: any[]) => {
              console.log('📊 TicketStatus encontrados:', ticketStatuses);
              this.getPhaseNamesForTicketStatuses(ticketStatuses).then(enhancedTicketStatuses => {
                console.log('📊 TicketStatus con nombres de fases:', enhancedTicketStatuses);

                // 🎯 NUEVO: Mostrar todos los nombres de fases disponibles
                const phaseNames = enhancedTicketStatuses.map(ts => ({
                  name: ts.name || ts.taskname || ts.taskName || ts.phasename || ts.phaseName || ts.description,
                  endingDate: ts.endingdate,
                  crewId: ts.crewid,
                  status: ts.status
                }));
                console.log('📋 Nombres de fases disponibles:', phaseNames);

                const isCompleted = this.isCompletedPhaseMatchingCrewType(enhancedTicketStatuses, location);
                console.log(`✅ ¿Está completada? ${isCompleted}`);
              });
            },
            error: (err) => {
              console.error('❌ Error verificando ubicación específica:', err);
            }
          });
        } else {
          console.log(`❌ Ubicación no encontrada: ${address}`);
        }
      },
      showAllPhaseNames: () => {
        console.log('🔍 Mostrando todos los nombres de fases disponibles...');
        this.remainingLocations.forEach((location, index) => {
          const ticketId = (location as any).ticketid;
          if (ticketId) {
            this.ticketStatusService.getByTicket(ticketId).subscribe({
              next: (ticketStatuses: any[]) => {
                this.getPhaseNamesForTicketStatuses(ticketStatuses).then(enhancedTicketStatuses => {
                  const phaseNames = enhancedTicketStatuses.map(ts => ({
                    name: ts.name || ts.taskname || ts.taskName || ts.phasename || ts.phaseName || ts.description,
                    endingDate: ts.endingdate,
                    crewId: ts.crewid,
                    status: ts.status
                  }));
                  console.log(`📍 ${location.address} (Ticket: ${ticketId}):`, phaseNames);
                });
              }
            });
          }
        });
      },
      showCompletedPhases: () => {
        console.log('🔍 Mostrando todas las fases completadas (sin filtro de crew)...');
        this.remainingLocations.forEach((location, index) => {
          const ticketId = (location as any).ticketid;
          if (ticketId) {
            this.ticketStatusService.getByTicket(ticketId).subscribe({
              next: (ticketStatuses: any[]) => {
                this.getPhaseNamesForTicketStatuses(ticketStatuses).then(enhancedTicketStatuses => {
                  // Buscar todas las fases completadas sin importar el crew
                  const completedPhases = enhancedTicketStatuses.filter(ts => {
                    const hasEndingDate = ts.endingdate;
                    const hasEndingTime = ts.endingtime;
                    const hasCompletedStatus = ts.status === 'completed' || ts.status === 'COMPLETED';
                    const hasEndDate = ts.enddate;

                    return hasEndingDate || hasEndingTime || hasCompletedStatus || hasEndDate;
                  });

                  if (completedPhases.length > 0) {
                    console.log(`✅ ${location.address} (Ticket: ${ticketId}) - Fases completadas:`, completedPhases.map(ts => ({
                      name: ts.name || ts.taskname || ts.taskName || ts.phasename || ts.phaseName || ts.description,
                      crewId: ts.crewid,
                      endingDate: ts.endingdate,
                      status: ts.status
                    })));
                  } else {
                    console.log(`⏳ ${location.address} (Ticket: ${ticketId}) - Sin fases completadas`);
                  }
                });
              }
            });
          }
        });
      },
      forceSyncForAllUsers: () => {
        console.log('🔄 Forzando sincronización para todos los usuarios...');

        // Resetear estado de verificación
        this.isCheckingLocations = false;
        this.lastCompletionLog = {};
        this.lastCheckTime = 0;

        // Forzar verificación inmediata
        setTimeout(() => {
          console.log('🔄 Iniciando verificación sin filtro de crew...');
          this.checkForCompletedLocations();
        }, 100);
      }
    };
    console.log('🔧 Debug methods exposed to window.debugUpcoming');
  }

  // 🎯 MÉTODO PARA AGRUPAR UBICACIONES POR DIRECCIÓN
  get groupedLocations() {
    // 🎯 TEMPORAL: Mostrar todas las ubicaciones
    const visibleLocations = this.remainingLocations;

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
        this.updateLeafletMap();
      }
    } catch (error) {
      // Error handling silently
    }
  }

  // �� SIMPLIFIED: Remove all complex route assignment logic and replace with simple approach
  async getAssignedRoute(): Promise<void> {
    console.log('🚀 Getting assigned route with simplified approach...');

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

      // 🎯 SIMPLIFIED: Just get routes from API and use the first one
      const allRoutes = await this.loadRoutesOptimized(currentCrewType);

      if (allRoutes && allRoutes.length > 0) {
        // 🎯 SIMPLIFIED: Use the first available route
        this.assignedRoute = allRoutes[0];
        this.assignedRouteId = this.assignedRoute?.routeid || this.assignedRoute?.routeId;

        console.log('🎯 Assigned route:', {
          routeId: this.assignedRouteId,
          routeCode: this.assignedRoute.routecode || this.assignedRoute.routeCode,
          type: this.assignedRoute.type,
          hasPolyline: !!(this.assignedRoute.encodedpolyline || this.assignedRoute.encodedPolyline),
          ticketsCount: this.assignedRoute.tickets?.length || 0
        });

        // 🎯 SIMPLIFIED: Update the map directly
        this.updateLeafletMap();
      } else {
        console.warn('❌ No routes available');
      }
    } catch (error) {
      console.error('❌ Error in getAssignedRoute:', error);
    }
  }

  // 🎯 SIMPLIFIED: Remove complex optimizedOrder validation
  private validateOptimizedOrder(assignedRoute: any): void {
    // 🎯 SIMPLIFIED: Just ensure it's an array, don't try to parse complex strings
    if (!Array.isArray(assignedRoute.optimizedOrder)) {
      assignedRoute.optimizedOrder = [];
    }
  }

  // 🎯 SIMPLIFIED: Remove all complex map update methods and replace with one simple method
  private updateLeafletMap(): void {
    console.log('🔄 Updating Leaflet map with simplified approach...');

    if (!this.assignedRoute) {
      console.log('⚠️ No assigned route to display');
      this.leafletRoutes = [];
      return;
    }

    // 🎯 SIMPLIFIED: Just like route generator - convert route to Leaflet format
    this.leafletRoutes = [{
      routeId: this.assignedRoute.routeid || this.assignedRoute.routeId,
      routeCode: this.assignedRoute.routecode || this.assignedRoute.routeCode,
      type: 'UPCOMING',
      encodedPolyline: this.assignedRoute.encodedpolyline || this.assignedRoute.encodedPolyline,
      tickets: (this.assignedRoute.tickets || []).map((ticket: any) => ({
        ticketId: ticket.ticketId || ticket.ticketid,
        address: ticket.address,
        queue: ticket.queue || 0,
        coordinates: ticket.coordinates // Include coordinates from API
      }))
    }];

    // 🎯 SIMPLIFIED: Just update visible routes
    this.visibleRoutes.clear();
    const routeId = this.assignedRoute.routeid || this.assignedRoute.routeId;
    this.visibleRoutes.add(routeId);

    console.log('✅ Leaflet map updated successfully');
  }

  // 🎯 REMOVED: All complex methods that were causing issues
  // - createOptimizedLeafletRoutes()
  // - refreshMapOptimized()
  // - forceCorrectOrder()
  // - orderLocationsByRoute()
  // - All the complex coordinate handling

  // 🎯 SIMPLIFIED: Remove complex coordinate loading
  private async loadCoordinatesAndRouteOptimized(): Promise<void> {
    console.log('🔄 Loading coordinates and route with simplified approach...');

    try {
      // 🎯 SIMPLIFIED: Just get the assigned route, don't try to get coordinates separately
      await this.getAssignedRoute();

      console.log('✅ Coordinates and route loaded successfully');
    } catch (error) {
      console.error('❌ Error loading coordinates and route:', error);
    }
  }

  // 🎯 SIMPLIFIED: Add missing loadRoutesOptimized method
  private async loadRoutesOptimized(currentCrewType: string): Promise<any[]> {
    console.log('🔄 Loading routes with simplified approach...');

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

    let allRoutes: any[] = [];

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

    // If no routes found for specific type, get all route types in parallel
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

    return allRoutes;
  }

  // 🎯 SIMPLIFIED: Remove complex ticket coordinate loading
  private async getTicketCoordinates(): Promise<void> {
    // 🎯 SIMPLIFIED: Don't try to get coordinates separately - they come from the API
    console.log('✅ Coordinates come from API - no separate loading needed');
  }

  // 🎯 SIMPLIFIED: Add missing formatAddress method
  private formatAddress(data: any): string {
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

  // 🎯 SIMPLIFIED: Remove complex location processing
  private processLocationsOptimized(details: any[]): void {
    console.log('🔄 Processing locations with simplified approach...');

    // 🎯 SIMPLIFIED: Just map the basic location data
    const uniqueLocationsMap = new Map<number, any>();

    details.forEach((data: any) => {
      if (!uniqueLocationsMap.has(data.ticketid)) {
        const address = data.address || this.formatAddress(data);

        uniqueLocationsMap.set(data.ticketid, {
          address: address,
          job: data.contractunit_name || '',
          surface: data.surfacetotal,
          width: data.width,
          length: data.length,
          description: data.contractunit_description || '',
          ticketid: data.ticketid,
          ticketcode: data.ticketcode || '',
          contractunitid: data.contractunitid,
          routeCode: data.routecode || '',
          lat: data.latitude,
          lng: data.longitude,
          // 🎯 SIMPLIFIED: Basic state properties
          checked: false,
          locked: false,
          assigned: false,
          started: false,
          completed: false
        });
      }
    });

    this.remainingLocations = Array.from(uniqueLocationsMap.values());
    console.log(`✅ ${this.remainingLocations.length} locations processed`);
  }

loadEmployees() {
  this.loadEmployeesAsync().subscribe({
    next: (result) => {
      console.log('✅ Empleados cargados exitosamente');
    },
    error: (err) => {
      console.error('❌ Error loading employee data:', err);
    }
  });
}

// 🎯 NUEVO: Método async para cargar empleados
private loadEmployeesAsync() {
  return forkJoin({
    people: this.usersService.getAllPeople(),
    crewEmployees: this.crewEmployeesService.getAllCrewEmployees(),
    crews: this.crewsService.getAllCrews(),
    skills: this.skillsService.getAllSkills()
  }).pipe(
    map(({ people, crewEmployees, crews, skills }) => {
      // 🔁 Mapea todos los empleados
      this.employeeList = people.map((person: any) => {
        const crewAssignment = crewEmployees.find((ce: any) => ce.employeeid === person.employeeId);
        const assignedCrew = crewAssignment
          ? crews.find((c: any) => c.crewid === crewAssignment.crewid)
          : null;
        const personSkills = skills
          .filter((s: any) => s.userId === person.userId)
          .map((s: any) => s.name);

        return {
          employeeid: person.employeeId,
          userid: person.userId,
          name: `${person.firstname} ${person.lastname}`,
          crewid: crewAssignment?.crewid || null,
          type: assignedCrew?.type || '',
          workedhours: assignedCrew?.workedhours || 0,
          skills: personSkills,
          crewLeader: crewAssignment?.crewleader ?? false
        };
      });

      // ✅ Obtener el userId logueado correctamente
      const storedUserId = Number(localStorage.getItem('userId'));
      const person = this.employeeList.find(p => p.userid === storedUserId);

      if (!person) {
        return { success: false };
      }

      const currentCrewId = person.crewid;
      if (!currentCrewId) {
        return { success: false };
      }

      const assignedCrew = crews.find((c: any) => c.crewid === currentCrewId);
      this.crewType = assignedCrew?.type || 'N/A';

      this.getCrewDetails(currentCrewId);

      const teamMembers = this.employeeList.filter(e => e.crewid === currentCrewId);
      const leader = teamMembers.find(e => e.crewLeader);
      const members = teamMembers.filter(e => !e.crewLeader).map(e => e.name);

      this.teamLeader = leader?.name || 'N/A';
      this.teamMembers = members;

      return { success: true };
    })
  );
}

getCrewDetails(crewId: number) {
  this.isLoading = true;
  console.log('🚀 Iniciando carga optimizada de detalles del crew...');

  this.crewsService.getCrewDetails(crewId).subscribe({
    next: async (details) => {
      console.log(`✅ Detalles del crew cargados: ${details.length} registros`);
      this.crewDetails = details;

      // 🎯 NUEVO: Procesar ubicaciones de manera optimizada
      this.processLocationsOptimized(details);

      // 🎯 NUEVO: Cargar coordenadas y ruta en paralelo
      await this.loadCoordinatesAndRouteOptimized();

      this.isLoading = false;
      console.log('✅ Carga de detalles del crew completada');
    },
    error: (err) => {
      console.error('❌ Error cargando detalles del crew:', err);
      this.isLoading = false;
    }
  });
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

  // 🎯 SIMPLIFIED: Add missing showAllLocations method
  showAllLocations(): void {
    this.currentLocationIndex = 0; // Reset to first location to show all

    if (this.leafletMap) {
      // Volver a la vista general con zoom más amplio
      this.leafletMap.setZoom(13); // Zoom más amplio para ver todas las ubicaciones
    }
  }

  // 🎯 NUEVO: TrackBy function to prevent unnecessary re-rendering of location items
  trackByLocation(index: number, location: any): any {
    // Use static data that doesn't change (address, ticketid) instead of status data
    return location.address + '_' + (location.ticketid || index);
  }

  // 🎯 NUEVO: TrackBy function for groups to prevent unnecessary re-rendering
  trackByGroup(index: number, group: any): any {
    // Use static data that doesn't change
    return group.address + '_' + index;
  }

}

