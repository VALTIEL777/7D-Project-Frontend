import { Component, ViewChild } from '@angular/core';
import { SitejobLayoutComponent } from '../../../shared/sitejob-layout/sitejob-layout.component';
import { MatTableModule } from '@angular/material/table';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { CommonModule } from '@angular/common';
import { MATERIAL_MODULES } from '../../../material';
import { SitejobSidenavbarComponent } from '../../../shared/sitejob-sidenavbar/sitejob-sidenavbar.component';
import { CrewsService } from '../../../core/services/human-resources/crew.service';
import { CrewEmployeesService } from '../../../core/services/human-resources/crewemployees.service';
import { PeopleService } from '../../../core/services/human-resources/users.service';
import { SkillsService } from '../../../core/services/human-resources/skills.service';
import { PhotoEvidenceService } from '../../../core/services/route/photoevidence.service';
import { FormsModule } from '@angular/forms';
import { SitejobTabsComponent } from '../../../shared/sitejob-tabs/sitejob-tabs.component';
import { forkJoin, firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';
import { ContractUnitsPhasesService } from '../../../core/services/ticket-logic/contractunitphases.service';
import { NecessaryPhasesService } from '../../../core/services/ticket-logic/necessaryphases.service';
import { TicketStatusService } from '../../../core/services/route/ticketstatus.service';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmPhaseDialogComponent } from '../../../shared/confirm-phase-dialog/confirm-phase-dialog.component';
import { ConfirmationDialogComponent } from '../../../shared/confirmation-dialog/confirmation-dialog.component';
import { TaskstatusService } from '../../../core/services/route/taskstatus.service';
import { RouteStateService } from '../../../core/services/shared/route-state.service';
import { TicketService, Ticket } from '../../../core/services/ticket.service';
import { QuadrantsService } from '../../../core/services/location/quadrants.service';
import { RouteData, MapConfig, LeafletMapComponent } from '../../../shared/leaflet-map/leaflet-map.component';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-current',
  imports: [SitejobLayoutComponent,
    SitejobTabsComponent,
    MatTableModule,
    MatDividerModule,
    MatProgressBarModule,
    CommonModule,
    MATERIAL_MODULES,
    SitejobSidenavbarComponent,
    FormsModule,
    LeafletMapComponent // <-- Agregado aquí
  ],
  templateUrl: './current.component.html',
  styleUrl: './current.component.scss'
})
export class CurrentComponent {

  // Static map properties
  staticMapUrl: string = '';
  staticMapWidth: number = 600;
  staticMapHeight: number = 400;

  // Set para rastrear imágenes que ya han cargado
  loadedImageIds = new Set<number>();

  // Set para rastrear actividades que están subiendo fotos
  uploadingActivities = new Set<number>();

  employeeList: any[] = [];  // Lista completa de empleados
teamLeader: string = '';   // Nombre del líder del equipo
teamMembers: string[] = []; // Nombres de los demás miembros
location: {
  address: string;
  job?: string;
  surface?: number;
  width?: number;
  description?: string;
  length?: number;
  lat?: number;
  lng?: number;
  fullAddress?: string;
  streetFrom?: string;
  streetTo?: string;
  fromaddressnumber?: string;
  fromaddressstreet?: string;
  toaddressstreet?: string;
  toaddressnumber?: string;
  fromAddressFull?: string;
  toAddressFull?: string;
} = {
  address: ''
};
  currentCrewIdFromLoadEmployees: number | null = null;
crewDetails: any[] = [];
crewType: string = '';
routeCode: string = '';
contractUnitId: number = 0;
routeId: number = 0;
userId: number = 0;
selectedFiles: File[] = [];
imagePreviews: (string | ArrayBuffer | null)[] = [];
ticketId: number = 0; // Lo debes asignar al cargar detalles
ticketCode: string = '';
partnerSupervisorComment: string = '';
crewId: number = 0;
ticketStatusId: number = 0; // Id del estado del ticket asociado (si aplica)
comment: string = '';
latitude: number = 0; // puedes obtenerla desde GPS o dejar en 0
longitude: number = 0;
name: string = 'Photo Evidence'; // nombre opcional o dinámico
 supervisor: any = {};
 imagePreview: string | ArrayBuffer | null = null;
activities: any[] = [];

permits: { id: number; number: string }[] = [];
diggers: { id: number; number: string }[] = [];

 selectedPermitFile: File | null = null;
 permitFilesByTicket: any[] = [];
 pdfFileError: string | null = null;

// Propiedades para mostrar fotos del ticket actual
currentTicketImages: any[] = [];
openedGroups: { [key: string]: boolean } = {};

// 🎯 Propiedades para la sección de comentarios
filteredComments: any[] = [];
commentFilterText: string = '';
hiddenComments: Set<number> = new Set(); // Controla qué comentarios están ocultos
showAllComments: boolean = true; // Controla si todos los comentarios están visibles
commentsUpdatedMessage: string = ''; // 🎯 NUEVO: Mensaje de actualización de comentarios
galleryUpdatedMessage: string = ''; // 🎯 NUEVO: Mensaje de actualización de galería

public orderedPhaseNames: string[] = [];

// 🎯 NUEVO: Propiedad para actividades opcionales
optionalActivities: any[] = [];

// 🎯 NUEVO: Propiedades para la sección de comments (observations)
filteredObservations: any[] = [];
observationFilterText: string = '';
hiddenObservations: Set<number> = new Set();
showAllObservations: boolean = true;
observationsUpdatedMessage: string = '';

activityFilterText: string = '';
filteredActivities: any[] = [];

filterDateFrom: Date | null = null;
filterDateTo: Date | null = null;
filteredTicketImages: any[] = [];

  leafletRoutes: RouteData[] = [];
  // Store the full assigned route once loaded to resync local data
  assignedRoute: any = null;
  visibleRoutes: Set<number> = new Set();
  mapConfig: MapConfig = {
    center: [41.8781, -87.6298], // Chicago
    zoom: 15,
    minZoom: 8,
    maxZoom: 18,
    tileLayer: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors'
  };
  @ViewChild(LeafletMapComponent) leafletMap!: LeafletMapComponent;

  // 🎯 NUEVO: Propiedad para almacenar quadrantId
  private quadrantId: number | null = null;

  // 🎯 NUEVO: Propiedades para detección de dispositivo móvil
  private isMobileDevice: boolean = false;
  private hasCameraSupport: boolean = false;

  constructor(
     private crewsService: CrewsService,
        private crewEmployeesService: CrewEmployeesService,
        private ticketStatusService: TicketStatusService,
        private usersService: PeopleService,
        private skillsService: SkillsService,
        private taskstatusService: TaskstatusService,
        private photoEvidenceService: PhotoEvidenceService,
        private contractUnitsPhasesService: ContractUnitsPhasesService,
        private dialog: MatDialog,
        private ticketService: TicketService,
        private peopleService: PeopleService,
        private quadrantService: QuadrantsService,
        private http: HttpClient
  ){}

  private isLocationFromStorage = false;

  ngOnInit() {
    console.log('🚀 Iniciando carga optimizada del componente...');

    // 🎯 NUEVO: Detectar dispositivo móvil y soporte de cámara
    this.detectMobileDeviceAndCamera();

    // 👇 Recuperar datos básicos desde localStorage
    this.loadBasicDataFromStorage();

    // 🎯 Cargar ruta completa si hay routeId o ticketId
    if ((this.routeId && this.routeId !== 0) || (this.ticketId && this.ticketId !== 0)) {
      this.loadFullRoute();
    } else {
      console.warn('⚠️ No hay routeId ni ticketId para cargar la ruta.');
    }

    // 🎯 NUEVO: Cargar datos críticos en paralelo
    this.loadCriticalDataInParallel();

    // 🎯 NUEVO: Cargar datos secundarios después
    setTimeout(() => {
      this.loadSecondaryData();
    }, 50);
  }


// 🎯 NUEVO: Método para cargar datos básicos desde localStorage
private loadBasicDataFromStorage(): void {
  const savedUserId = Number(localStorage.getItem('userId'));
  if (savedUserId && savedUserId !== 0) {
    this.userId = savedUserId;
    console.log('🆔 userId cargado desde localStorage:', this.userId);
  } else {
    console.warn('⚠️ userId no encontrado o inválido en localStorage');
  }

  const savedLocation = localStorage.getItem('selectedLocation');
  if (savedLocation) {
    const parsedLocation = JSON.parse(savedLocation);
    this.location = parsedLocation;
    this.ticketId = parsedLocation.ticketid || 0;
    this.contractUnitId = Number(parsedLocation.contractunitid) || 0;
    this.isLocationFromStorage = true;

    // 🎯 NUEVO: Cargar quadrantId desde localStorage si existe
    const savedQuadrantId = localStorage.getItem('currentQuadrantId');
    if (savedQuadrantId) {
      this.quadrantId = Number(savedQuadrantId);
      console.log('🎯 quadrantId cargado desde localStorage:', this.quadrantId);
    }

    // RECONSTRUIR streetFrom y streetTo
    this.location.streetFrom = `${parsedLocation.fromaddressnumber || ''} ${parsedLocation.fromaddressstreet || ''} ${parsedLocation.fromaddresscardinal || ''}`.trim();
    this.location.streetTo = `${parsedLocation.toaddressnumber || ''} ${parsedLocation.toaddressstreet || ''} ${parsedLocation.toaddresscardinal || ''}`.trim();
    if (!this.location.streetFrom) this.location.streetFrom = 'Not available';
    if (!this.location.streetTo) this.location.streetTo = 'Not available';
  }

  const savedCrewId = Number(localStorage.getItem('crewId'));
  if (savedCrewId && savedCrewId !== 0) {
    this.crewId = savedCrewId;
    console.log('🧑‍🔧 crewId cargado desde localStorage:', this.crewId);
  }

  const savedRouteCode = localStorage.getItem('selectedRouteCode');
  if (savedRouteCode) {
    this.routeCode = savedRouteCode;
  }
  const savedRouteId = Number(localStorage.getItem('selectedRouteId'));
  if (savedRouteId && savedRouteId !== 0) {
    this.routeId = savedRouteId;
    console.log('🛣️ routeId cargado desde localStorage:', this.routeId);
  }

  // Configurar filtros de fecha
  const today = new Date();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(today.getMonth() - 6);
  this.filterDateFrom = sixMonthsAgo;
  this.filterDateTo = today;
}

// 🎯 NUEVO: Método para cargar datos críticos en paralelo
private loadCriticalDataInParallel(): void {
  console.log('⚡ Cargando datos críticos en paralelo...');

  // Cargar empleados y fases en paralelo
  forkJoin({
    employees: this.loadEmployeesAsync(),
    phases: this.loadAllPhasesAsync()
  }).subscribe({
    next: (results) => {
      console.log('✅ Datos críticos cargados exitosamente');

      // 🗺️ Cargar ruta completa después de los datos críticos
      if (this.ticketId) {
        this.loadFullRoute();
      }
    },
    error: (error) => {
      console.error('❌ Error cargando datos críticos:', error);
    }
  });
}

// 🎯 NUEVO: Método para cargar datos secundarios
  private loadSecondaryData(): void {
    console.log('📦 Cargando datos secundarios...');

    if (this.ticketId) {
      // Cargar supervisor, ticket code y permit files en paralelo
      forkJoin({
        supervisor: this.loadSupervisorAsync(),
        ticketCode: this.loadTicketCodeAsync(),
        permitFiles: this.loadPermitFilesByTicketAsync()
      }).subscribe({
        next: (results) => {
          console.log('✅ Datos secundarios cargados exitosamente');

          // 🎯 NUEVO: Cargar coordenadas después de que se cargue el ticketCode
          if (this.ticketCode) {
            this.getTicketCoordinates();
          }

          // 🎯 NUEVO: Si ya tenemos assignedRoute, re-sincronizar datos del ticket
          if (this.assignedRoute && this.ticketId) {
            const rt = (this.assignedRoute.tickets || []).find((t: any) => Number(t.ticketId || t.ticketid) === Number(this.ticketId));
            if (rt) {
              this.location.address = rt.address || this.location.address;
              this.ticketCode = rt.ticketCode || rt.ticketcode || this.ticketCode;
            }
          }
        },
        error: (error) => {
          console.error('❌ Error cargando datos secundarios:', error);
        }
      });
    }
  }




loadEmployees() {
  this.loadEmployeesAsync().subscribe({
    next: (result) => {
      console.log('✅ Empleados cargados exitosamente');
    },
    error: (err) => console.error('❌ Error loading employee data:', err)
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
        console.warn('⚠️ Usuario logueado no encontrado entre empleados.');
        return { success: false };
      }

      const currentCrewId = person.crewid;
      this.currentCrewIdFromLoadEmployees = currentCrewId;
      if (!currentCrewId) {
        console.warn('⚠️ El usuario no tiene crew asignado.');
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

      console.log('✅ Team Leader:', this.teamLeader);
      console.log('👥 Team Members:', this.teamMembers);

      return { success: true };
    })
  );
}
loadAllPhases() {
  this.loadAllPhasesAsync().subscribe({
    next: (result) => {
      console.log('✅ Fases cargadas exitosamente');
    },
    error: (err) => {
      console.error('❌ Error loading task statuses', err);
    }
  });
}

// 🎯 NUEVO: Método async para cargar fases
private loadAllPhasesAsync() {
  return this.taskstatusService.getAllTaskStatuses().pipe(
    map((statuses) => {
      console.log('📦 Statuses recibidos:', statuses);

      let orderedPhaseNames: string[] = [];

      if (this.routeCode.includes('SPOTTER')) {
        orderedPhaseNames = ['Spotting', 'No Parking Signs'];
      } else if (this.routeCode.includes('ASPHALT')) {
        orderedPhaseNames = ['Spotting', 'Grind', 'Asphalt', 'Crack Seal', 'Stripping'];
      } else if (this.routeCode.includes('CONCRETE')) {
        orderedPhaseNames = [ 'Spotting', 'No Parking Signs', 'Sawcut', 'Removal', 'Framing', 'Pour', 'Clean','Steel Plate Pickup', 'Install Signs',];
      }

      // 🧹 Filtrar y ordenar según orderedPhaseNames
      const filteredStatuses = orderedPhaseNames
        .map(name => statuses.find(s => s.name === name))
        .filter(Boolean); // Elimina los undefined

      // 🔄 Convertir a actividades (solo las obligatorias)
      this.activities = filteredStatuses
        .filter((s: any) => !this.isPhaseOptional(s.name, this.routeCode)) // 🎯 NUEVO: Filtrar solo actividades obligatorias
        .map((s: any) => ({
          id: s.taskstatusid,
          name: s.name,
          description: s.description,
          checked: false,
          locked: false,
          optional: false, // 🎯 NUEVO: Todas las actividades en la lista principal son obligatorias
          selectedFiles: [],
          imagePreviews: [],
          comment: ''
        }));

        // 🎯 NUEVO: Cargar actividades opcionales
  this.optionalActivities = filteredStatuses
    .filter((s: any) => this.isPhaseOptional(s.name, this.routeCode)) // 🎯 NUEVO: Filtrar solo actividades opcionales
    .map((s: any) => ({
      id: s.taskstatusid,
      name: s.name,
      description: s.description,
      checked: false,
      locked: false,
      optional: true, // 🎯 NUEVO: Todas las actividades opcionales
      selectedFiles: [],
      imagePreviews: [],
      comment: ''
    }));

  // 🎯 NUEVO: Verificar y crear TicketStatus para "No Parking Signs" si es necesario
  this.ensureNoParkingSignsTicketStatus();

      // 🔍 Buscar Crack Seal (si está disponible en general)
      const crackSeal = statuses.find((s: any) => s.name?.toLowerCase() === 'crack seal');
      this.ticketStatusId = crackSeal?.taskstatusid || 0;

      this.filteredActivities = this.activities;
      this.loadLinkedPhases();

      return { success: true };
    })
  );
}

getActivityColor(activityName: string): string {
  switch(activityName) {
    case 'Spotting':
      return '#DCCFC0'; // cafe claro
    case 'Install Signs':
      return '#90C8E0'; // azul pastel
    case 'Grind':
      return '#B3C8CF'; // 
    case 'Asphalt':
      return '#E5E1DA'; // 
    case 'Crack Seal':
      return '#F1F0E8'; // gris medio
    case 'Stripping':
      return '#4CAF50'; // verde controlado (no fosforescente)
    case 'Sawcut':
      return '#AAB99A'; // verde pastel
    case 'Removal':
      return '#D0DDD0'; // verde claro
    case 'Framing':
      return '#F0F0D7'; // amarillo claro
    case 'Concrete':
      return '#B0B0B0'; // gris claro medio
    case 'Pour':
      return '#DCE4C9'; // verdesito
    case 'Clean':
      return '#9CAFAA'; // rosa pastel
    case 'Steel Plate Pickup':
      return '#F7B267'; // naranja claro mate
    case 'No Parking Signs':
      return '#B3C8CF'; // rojo apagado
    default:
      return '#F5F5F5'; // gris neutro de fondo
  }
}



// ✅ NUEVO MÉTODO: Determinar si una fase es opcional según el tipo de ruta
private isPhaseOptional(phaseName: string, routeCode: string): boolean {
  const phaseNameLower = phaseName.toLowerCase();

  // Fases opcionales para rutas ASPHALT
  if (routeCode.includes('ASPHALT')) {
    return ['stripping', 'install signs'].includes(phaseNameLower);
  }

  // Fases opcionales para rutas CONCRETE
  if (routeCode.includes('CONCRETE')) {
    return ['no parking signs','steel plate pickup', 'install signs'].includes(phaseNameLower);
  }

  // Fases opcionales para rutas SPOTTER
  if (routeCode.includes('SPOTTER')) {
    return ['no parking signs'].includes(phaseNameLower);
  }

  // Por defecto, todas las fases son obligatorias
  return false;
}

// 🎯 NUEVO: Verificar y crear TicketStatus para "No Parking Signs" si es necesario
private async ensureNoParkingSignsTicketStatus(): Promise<void> {
  // Solo verificar para rutas CONCRETE y SPOTTER
  if (!this.routeCode.includes('CONCRETE') && !this.routeCode.includes('SPOTTER')) {
    return;
  }

  try {
    // Verificar si ya existe el TicketStatus para "No Parking Signs" (taskstatusid: 14)
    const existingTicketStatus = await firstValueFrom(
      this.ticketStatusService.getById(14, this.ticketId)
    );

    // Si no existe, crearlo
    if (!existingTicketStatus || existingTicketStatus.length === 0) {
      const newTicketStatus = {
        taskstatusid: 14,
        ticketid: this.ticketId,
        crewid: null,
        startingdate: null,
        endingdate: null,
        observation: null,
        createdby: this.userId,
        updatedby: this.userId
      };

      await firstValueFrom(this.ticketStatusService.create(newTicketStatus));
      console.log('✅ TicketStatus creado para "No Parking Signs"');
    }
  } catch (error) {
    console.error('❌ Error al verificar/crear TicketStatus para "No Parking Signs":', error);
  }
}

// 🎯 NUEVO MÉTODO: Obtener actividades opcionales
getOptionalActivities(): any[] {
  return this.optionalActivities || [];
}

loadTicketCode() {
  this.loadTicketCodeAsync().subscribe({
    next: (result) => {
      console.log('✅ Ticket code cargado exitosamente');
    },
    error: (err) => {
      console.error('❌ Error cargando ticket code:', err);
      this.ticketCode = 'N/A';
    }
  });
}

// 🎯 NUEVO: Método async para cargar ticket code
private loadTicketCodeAsync() {
  return this.ticketService.getTicketById(this.ticketId).pipe(
    map(ticket => {
      this.ticketCode = ticket.ticketCode || ticket.ticketcode || '';
      this.partnerSupervisorComment = ticket.partnerSupervisorComment || '';
      return { success: true };
    })
  );
}

loadSupervisor() {
  this.loadSupervisorAsync().subscribe({
    next: (result) => {
      console.log('✅ Supervisor cargado exitosamente');
    },
    error: (err) => {
      console.error('❌ Error loading supervisor:', err);
    }
  });
}

// 🎯 NUEVO: Método async para cargar supervisor
private loadSupervisorAsync() {
  return this.ticketService.getTicketById(this.ticketId).pipe(
    map(ticket => {
      // 🎯 MEJORADO: Usar quadrantId guardado o obtener del ticket
      let quadrantId = this.quadrantId || ticket.quadrantId;

      if (!quadrantId) {
        console.warn('⚠️ No se encontró quadrantId en el ticket ni en localStorage');
        console.log('🔍 Información del ticket:', {
          ticketId: ticket.ticketId || ticket.ticketid,
          ticketCode: ticket.ticketCode || ticket.ticketcode,
          quadrantId: quadrantId
        });

        // 🎯 SOLUCIÓN GENÉRICA: Intentar determinar el cuadrante por coordenadas
        this.findQuadrantByCoordinates();

        return { success: false, reason: 'No quadrantId found' };
      }

      // 🎯 NUEVO: Guardar quadrantId en localStorage para persistencia
      this.quadrantId = quadrantId;
      localStorage.setItem('currentQuadrantId', String(quadrantId));
      console.log('🎯 quadrantId guardado en localStorage:', quadrantId);

      this.quadrantService.getQuadrantById(quadrantId).subscribe(quadrant => {
        const zoneManagerId = quadrant.zoneManagerId;
        if (!zoneManagerId) {
          console.warn('⚠️ No se encontró zoneManagerId en el cuadrante');
          return;
        }

        this.peopleService.getPeopleById(zoneManagerId).subscribe(supervisor => {
          this.supervisor = supervisor;
          console.log('✅ Zone Manager cargado:', this.supervisor);
        });
      });

      return { success: true };
    })
  );
}

// �� NUEVO: Método para obtener coordenadas sin usar Google API (como en upcoming)
private async getTicketCoordinates(): Promise<void> {
  console.log('🔄 Obteniendo coordenadas del ticket sin usar Google API...');

  if (!this.ticketCode) {
    console.warn('⚠️ No hay ticketCode disponible para obtener coordenadas');
    return;
  }

  try {
    const response: any = await firstValueFrom(
      this.http.get(`${environment.apiUrl}/tickets/coordinates/${this.ticketCode}`)
    );

    if (response.success && response.data && response.data.addresses && response.data.addresses.length > 0) {
      // Usar las coordenadas de la primera dirección
      const firstAddress = response.data.addresses[0];
      this.location.lat = firstAddress.latitude;
      this.location.lng = firstAddress.longitude;

      console.log('✅ Coordenadas obtenidas del backend:', {
        lat: this.location.lat,
        lng: this.location.lng,
        ticketCode: this.ticketCode
      });

      // 🎯 NUEVO: Buscar cuadrante por coordenadas después de obtenerlas
      this.findQuadrantByCoordinates();
    } else {
      console.warn(`❌ No se encontraron coordenadas para el ticket ${this.ticketCode}`);
    }
  } catch (err) {
    console.error(`❌ Error obteniendo coordenadas para el ticket ${this.ticketCode}:`, err);
  }
}

// 🎯 NUEVO: Método para encontrar cuadrante por coordenadas
private findQuadrantByCoordinates(): void {
  console.log('🔍 Buscando cuadrante por coordenadas del ticket');

  // Obtener coordenadas del ticket
  const ticketLat = this.latitude || this.location.lat;
  const ticketLng = this.longitude || this.location.lng;

  console.log('📍 Coordenadas del ticket:', { lat: ticketLat, lng: ticketLng });

  if (!ticketLat || !ticketLng) {
    console.warn('⚠️ No se encontraron coordenadas en el ticket');
    return;
  }

  this.quadrantService.getAllQuadrants().subscribe({
    next: (quadrants) => {
      const matchingQuadrant = this.findQuadrantByLocation(ticketLat, ticketLng, quadrants);

      if (matchingQuadrant) {
        console.log(`✅ Cuadrante encontrado por coordenadas:`, matchingQuadrant);
        const zoneManagerId = matchingQuadrant.zoneManagerId;

        // 🎯 NUEVO: Guardar quadrantId encontrado
        this.quadrantId = matchingQuadrant.id;
        localStorage.setItem('currentQuadrantId', String(this.quadrantId));
        console.log('🎯 quadrantId encontrado y guardado:', this.quadrantId);

        if (zoneManagerId) {
          this.loadSupervisorByZoneManagerId(zoneManagerId);
        } else {
          console.warn(`⚠️ No se encontró zoneManagerId en el cuadrante ${matchingQuadrant.name}`);
        }
      } else {
        console.warn(`⚠️ No se encontró cuadrante para las coordenadas (${ticketLat}, ${ticketLng})`);
      }
    },
    error: (err) => {
      console.error('❌ Error buscando cuadrante por coordenadas:', err);
    }
  });
}

// 🎯 NUEVO: Método para determinar cuadrante basado en coordenadas
private findQuadrantByLocation(lat: number, lng: number, quadrants: any[]): any | null {
  console.log(`🔍 Buscando cuadrante para coordenadas (${lat}, ${lng})`);
  console.log(`📊 Total de cuadrantes disponibles: ${quadrants.length}`);

  for (const quadrant of quadrants) {
    const minLat = parseFloat(quadrant.minLatitude);
    const maxLat = parseFloat(quadrant.maxLatitude);
    const minLng = parseFloat(quadrant.minLongitude);
    const maxLng = parseFloat(quadrant.maxLongitude);

    // Verificar si las coordenadas están dentro del rango del cuadrante
    if (lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng) {
      console.log(`✅ Coordenadas (${lat}, ${lng}) están dentro del cuadrante ${quadrant.name}`);
      console.log(`📐 Rango del cuadrante: Lat(${minLat}-${maxLat}), Lng(${minLng}-${maxLng})`);
      return quadrant;
    }
  }

  console.log(`❌ No se encontró cuadrante que contenga las coordenadas (${lat}, ${lng})`);
  return null;
}

// 🎯 NUEVO: Método para cargar supervisor por zoneManagerId
private loadSupervisorByZoneManagerId(zoneManagerId: number): void {
  console.log(`🎯 Cargando supervisor con zoneManagerId: ${zoneManagerId}`);

  this.peopleService.getPeopleById(zoneManagerId).subscribe({
    next: (supervisor) => {
      this.supervisor = supervisor;
      console.log('✅ Supervisor cargado:', this.supervisor);
    },
    error: (err) => {
      console.error('❌ Error cargando supervisor:', err);
    }
  });
}





getCrewDetails(crewId: number) {
  this.crewsService.getCrewDetails(crewId).subscribe({
    next: (details) => {
      this.crewDetails = details;
      // 🔁 Extraer fases únicas (phase_name) como activities




      // 🔍 Extraer permisos únicos
this.permits = details.reduce((acc: { id: number; number: string }[], d: any) => {
  if (
    d.permitid &&
    d.permitnumber &&
    d.ticketid === this.ticketId && // ✅ filtra solo los del ticket actual
    !acc.find(p => p.id === d.permitid)
  ) {
    acc.push({ id: d.permitid, number: d.permitnumber });
  }
  return acc;
}, []);

      // 🔍 Extraer diggers únicos
     this.diggers = details.reduce((acc: { id: number; number: string }[], d: any) => {
  if (
    d.diggerid &&
    d.diggernumber &&
    d.ticketid === this.ticketId && // ✅ filtro opcional
    !acc.find(dg => dg.id === d.diggerid)
  ) {
    acc.push({ id: d.diggerid, number: d.diggernumber });
  }
  return acc;
}, []);


if (details.length > 0) {
  // Use the record that matches the current ticketId; fallback to first if not found
  const data = details.find((d: any) => Number(d.ticketid) === Number(this.ticketId)) || details[0];

  // Always derive streetFrom/streetTo from authoritative crew details for the current ticket
  this.location.streetFrom = `${data.fromaddressnumber || ''} ${data.fromaddressstreet || ''} ${data.fromaddresscardinal || ''}`.trim();
  this.location.streetTo = `${data.toaddressnumber || ''} ${data.toaddressstreet || ''} ${data.toaddresscardinal || ''}`.trim();
  this.location.fullAddress = `${this.location.streetFrom} → ${this.location.streetTo}`;

  this.location.address = data.location || this.location.address;
  this.location.job = data.contractunit_name;
  this.location.surface = data.surfacetotal;
  this.location.description = data.contractunit_description;
  this.location.width = data.width;
  this.location.length = data.length;

  console.log('📍 Dirección actualizada desde backend:', this.location.fullAddress);
  console.log('📝 Descripción:', this.location.description);
} else if (this.isLocationFromStorage) {
  console.log('📍 Dirección seleccionada manualmente:', this.location);
  console.log('📝 Descripción desde localStorage:', this.location.description);
}

// 🗺️ Cargar ruta completa después de establecer la dirección
this.loadFullRoute();
    },
    error: (err) => {
      console.error('❌ Error obteniendo detalles del crew', err);
    }
  });
}

loadLinkedPhases() {
  this.ticketStatusService.getByTicket(this.ticketId).subscribe({
  next: (ticketStatuses: any[] | null) => {
    const safeStatuses = Array.isArray(ticketStatuses) ? ticketStatuses : [];

    console.log('🔍 === DEBUGGING FECHAS ===');
    console.log('📋 TicketStatuses recibidos del backend:', safeStatuses);

    // 🎯 NUEVO: Procesar actividades obligatorias
    this.activities.forEach(activity => {
      const activityId = Number(activity.id);
      const existingStatus = safeStatuses.find(ts => Number(ts.taskstatusid) === activityId);

      if (existingStatus) {
        // ✅ Si existe TicketStatus pero ambas fechas son NULL, está "asignada" pero no iniciada
        if (!existingStatus.startingdate && !existingStatus.endingdate) {
          activity.checked = false;
          activity.locked = false; // Permitir marcar
          activity.assigned = true; // Nueva propiedad para indicar que está asignada
          activity.startDate = null;
          activity.endDate = null;
          // 🎯 NUEVO: Cargar observación si existe
          activity.observation = existingStatus.observation || '';
          console.log(`📋 Fase ${activity.name} asignada pero no iniciada`);
          console.log(`📝 Observación del backend: "${existingStatus.observation}" (tipo: ${typeof existingStatus.observation})`);
          console.log(`📝 Observación asignada: "${activity.observation}" (tipo: ${typeof activity.observation})`);
        }
        // ✅ Si tiene startingDate pero no endingDate, está iniciada
        else if (existingStatus.startingdate && !existingStatus.endingdate) {
          activity.checked = true;
          activity.locked = false; // Permitir completar
          activity.assigned = true;
          activity.started = true; // Nueva propiedad
          activity.startDate = existingStatus.startingdate;
          activity.endDate = null;
          // 🎯 NUEVO: Cargar observación si existe
          activity.observation = existingStatus.observation || '';
          console.log(`🔄 Fase ${activity.name} iniciada pero no completada`);
          console.log(`🕐 startingdate del backend: ${existingStatus.startingdate}`);
          console.log(`🕐 startDate asignado: ${activity.startDate}`);
          console.log(`🕐 Tipo de dato: ${typeof existingStatus.startingdate}`);
          console.log(`📝 Observación del backend: "${existingStatus.observation}" (tipo: ${typeof existingStatus.observation})`);
          console.log(`📝 Observación asignada: "${activity.observation}" (tipo: ${typeof activity.observation})`);

          // Verificar si la fecha del backend tiene hora
          if (existingStatus.startingdate) {
            const backendDate = new Date(existingStatus.startingdate);
            console.log(`🕐 Fecha del backend convertida: ${backendDate.toISOString()}`);
            console.log(`🕐 Hora del backend: ${backendDate.getHours()}:${backendDate.getMinutes()}:${backendDate.getSeconds()}`);
            console.log(`🕐 ¿Tiene hora? ${backendDate.getHours() !== 0 || backendDate.getMinutes() !== 0 || backendDate.getSeconds() !== 0}`);

            // SOLUCIÓN TEMPORAL: Si el backend no tiene hora, usar la hora actual
            const hasTime = backendDate.getHours() !== 0 || backendDate.getMinutes() !== 0 || backendDate.getSeconds() !== 0;
            if (!hasTime) {
              console.log(`⚠️ Backend no tiene hora, aplicando hora actual como solución temporal`);
              const now = new Date();
              const dateOnly = new Date(existingStatus.startingdate);
              const correctedDate = new Date(
                dateOnly.getFullYear(),
                dateOnly.getMonth(),
                dateOnly.getDate(),
                now.getHours(),
                now.getMinutes(),
                now.getSeconds()
              );
              activity.startDate = correctedDate.toISOString();
              console.log(`🕐 Fecha corregida: ${activity.startDate}`);
            }
          }
        }
        // ✅ Si tiene endingDate, está completada
        else if (existingStatus.endingdate) {
          activity.checked = true;
          activity.locked = true; // Bloquear si está completada
          activity.assigned = true;
          activity.completed = true; // Nueva propiedad
          activity.startDate = existingStatus.startingdate;
          activity.endDate = existingStatus.endingdate;
                  // 🎯 NUEVO: Cargar observación si existe
        activity.observation = existingStatus.observation || '';
        console.log(`✅ Fase ${activity.name} completada`);
        console.log(`🕐 startingdate del backend: ${existingStatus.startingdate}`);
        console.log(`🕐 endingdate del backend: ${existingStatus.endingdate}`);
        console.log(`🕐 startDate asignado: ${activity.startDate}`);
        console.log(`🕐 endDate asignado: ${activity.endDate}`);
        console.log(`📝 Observación del backend: "${existingStatus.observation}" (tipo: ${typeof existingStatus.observation})`);
        console.log(`📝 Observación asignada: "${activity.observation}" (tipo: ${typeof activity.observation})`);

          // SOLUCIÓN TEMPORAL: Corregir fechas sin hora para fases completadas
          if (existingStatus.startingdate) {
            const startDate = new Date(existingStatus.startingdate);
            const hasStartTime = startDate.getHours() !== 0 || startDate.getMinutes() !== 0 || startDate.getSeconds() !== 0;
            if (!hasStartTime) {
              console.log(`⚠️ Corrigiendo startDate sin hora para fase completada`);
              const now = new Date();
              const correctedStartDate = new Date(
                startDate.getFullYear(),
                startDate.getMonth(),
                startDate.getDate(),
                now.getHours(),
                now.getMinutes(),
                now.getSeconds()
              );
              activity.startDate = correctedStartDate.toISOString();
            }
          }

          if (existingStatus.endingdate) {
            const endDate = new Date(existingStatus.endingdate);
            const hasEndTime = endDate.getHours() !== 0 || endDate.getMinutes() !== 0 || endDate.getSeconds() !== 0;
            if (!hasEndTime) {
              console.log(`⚠️ Corrigiendo endDate sin hora para fase completada`);
              const now = new Date();
              const correctedEndDate = new Date(
                endDate.getFullYear(),
                endDate.getMonth(),
                endDate.getDate(),
                now.getHours(),
                now.getMinutes(),
                now.getSeconds()
              );
              activity.endDate = correctedEndDate.toISOString();
            }
          }
        }
      } else {
        // ✅ Fase no asignada al ticket
        activity.checked = false;
        activity.locked = false;
        activity.assigned = false;
        activity.startDate = null;
        activity.endDate = null;
        console.log(`📝 Fase ${activity.name} no asignada al ticket`);
      }
    });

    console.log('🔍 === ESTADO FINAL DE ACTIVIDADES ===');
    this.activities.forEach(activity => {
      console.log(`📋 ${activity.name}: startDate=${activity.startDate}, endDate=${activity.endDate}, observation=${activity.observation}`);
    });
    console.log('🔍 === FIN DEBUGGING FECHAS ===');

    // 🎯 NUEVO: Procesar actividades opcionales
    this.optionalActivities.forEach(activity => {
      const activityId = Number(activity.id);
      const existingStatus = safeStatuses.find(ts => Number(ts.taskstatusid) === activityId);

      if (existingStatus) {
        // ✅ Si existe TicketStatus pero ambas fechas son NULL, está "asignada" pero no iniciada
        if (!existingStatus.startingdate && !existingStatus.endingdate) {
          activity.checked = false;
          activity.locked = false;
          activity.assigned = true;
          activity.startDate = null;
          activity.endDate = null;
          activity.observation = existingStatus.observation || '';
        }
        // ✅ Si tiene startingDate pero no endingDate, está iniciada
        else if (existingStatus.startingdate && !existingStatus.endingdate) {
          activity.checked = true;
          activity.locked = false;
          activity.assigned = true;
          activity.started = true;
          activity.startDate = existingStatus.startingdate;
          activity.endDate = null;
          activity.observation = existingStatus.observation || '';
        }
        // ✅ Si tiene endingDate, está completada
        else if (existingStatus.endingdate) {
          activity.checked = true;
          activity.locked = true;
          activity.assigned = true;
          activity.completed = true;
          activity.startDate = existingStatus.startingdate;
          activity.endDate = existingStatus.endingdate;
          activity.observation = existingStatus.observation || '';
        }
      } else {
        // ✅ Fase opcional no asignada al ticket
        activity.checked = false;
        activity.locked = false;
        activity.assigned = false;
        activity.startDate = null;
        activity.endDate = null;
      }
    });

    // 🎯 NUEVO: Inicializar observaciones filtradas
    this.filteredObservations = this.getObservationsFromTicketStatus();

    // Llamar a loadCurrentTicketImages SOLO después de que las actividades estén listas
    this.loadCurrentTicketImages();
  },
  error: (err) => {
    console.error('Error al cargar fases vinculadas:', err);
  }
});
}

// Método para verificar si una fase está asignada pero no iniciada
isPhaseAssigned(activity: any): boolean {
  return activity.assigned && !activity.started && !activity.completed;
}

// Método para verificar si una fase está iniciada pero no completada
isPhaseStarted(activity: any): boolean {
  return activity.started && !activity.completed;
}

// Método para verificar si una fase está completada
isPhaseCompleted(activity: any): boolean {
  return activity.completed;
}

// Método para iniciar una fase asignada
startPhase(activity: any) {
  if (!(this.isPhaseAssigned(activity) || (activity.optional && !activity.assigned))) {
    console.warn(`⚠️ No se puede iniciar la fase ${activity.name}`);
    return;
  }

  const crewIdToUse = this.crewId || this.currentCrewIdFromLoadEmployees;
  if (!crewIdToUse || crewIdToUse === 0) {
    console.error('❌ crewId inválido');
    return;
  }

  this.ticketStatusService.getByTicket(this.ticketId).subscribe({
    next: (ticketStatuses: any[]) => {
      const existingStatus = ticketStatuses.find(ts =>
        Number(ts.taskstatusid) === Number(activity.id)
      );

      if (existingStatus) {
        // Actualizar con startingDate
        // Crear fecha con hora completa para evitar conversión a medianoche
        const now = new Date();
        const newStartingDate = now.toISOString();
        console.log(`🕐 Enviando nueva fecha al backend: ${newStartingDate}`);
        console.log(`🕐 Hora local actual: ${now.toLocaleString()}`);
        console.log(`🕐 Timestamp: ${now.getTime()}`);

        this.ticketStatusService.update(activity.id, this.ticketId, {
          startingDate: newStartingDate,
          updatedBy: this.userId,
          crewId: crewIdToUse // <-- AÑADIDO
        }).subscribe({
          next: (updatedStatus) => {
            console.log(`✅ Fase ${activity.name} iniciada:`, updatedStatus);
            console.log(`🕐 Respuesta del backend - startingDate: ${updatedStatus?.startingdate || updatedStatus?.startingDate}`);
            console.log(`🕐 Respuesta completa del backend:`, updatedStatus);

            activity.started = true;
            activity.checked = true;

            // 🎯 AUTOMÁTICAMENTE LLENAR EL CAMPO PHOTO NAME CON EL NOMBRE DE LA FASE
            this.name = activity.name;
            console.log(`📝 Photo name automáticamente establecido a: ${this.name}`);

            // ✅ SUBIR FOTO SI HAY ARCHIVOS SELECCIONADOS
            if (this.selectedFiles && this.selectedFiles.length > 0) {
              // ✅ CORREGIDO: Usar taskStatusId (activity.id) en lugar de ticketstatusid
              console.log(`📸 Subiendo foto para fase iniciada ${activity.name} con taskStatusId: ${activity.id}`);
              this.uploadPhotoEvidence(activity.id, activity);
            }

            // 🎯 VERIFICAR SI HAY ISSUE REPORTADO AL INICIAR
            const hasIssue = activity.comment && activity.comment.trim().length > 0;
            if (hasIssue) {
              console.log(`⚠️ Issue detectado al iniciar fase ${activity.name}: ${activity.comment}`);
              // this.updateTicketComment7d('TK - ON HOLD OFF');
            } else {
              // 🎯 ACTUALIZAR COMMENT7D DEL TICKET A "TK - ON PROGRESS"
              console.log(`🔄 Llamando a updateTicketComment7d desde startPhase (línea 1) para actividad: ${activity.name}`);
              console.log(`🔍 Estado actual del quadrantId antes de updateTicketComment7d: ${this.quadrantId} (localStorage: ${localStorage.getItem('currentQuadrantId')})`);
              this.updateTicketComment7d('TK - ON PROGRESS');
            }

            this.loadLinkedPhases(); // Recargar para actualizar estado
          },
          error: (err) => {
            console.error(`❌ Error iniciando fase ${activity.name}:`, err);
          }
        });
      } else {
        // Si no existe TicketStatus (por ser opcional no asignada), crear uno nuevo
        this.ticketStatusService.create({
          ticketId: this.ticketId,
          crewId: crewIdToUse,
          taskStatusId: activity.id,
          startingDate: this.getCurrentDateString(),
          createdBy: this.userId,
          updatedBy: this.userId
        }).subscribe({
          next: (newTicketStatus) => {
            console.log(`✅ TicketStatus creado para fase opcional ${activity.name}:`, newTicketStatus);
            console.log(`🕐 Respuesta del backend - startingDate: ${newTicketStatus?.startingdate || newTicketStatus?.startingDate}`);
            console.log(`🕐 Respuesta completa del backend:`, newTicketStatus);
            console.log(`🔍 Tipo de respuesta:`, typeof newTicketStatus);
            console.log(`🔍 Propiedades de newTicketStatus:`, Object.keys(newTicketStatus || {}));
            console.log(`🔍 taskstatusid:`, newTicketStatus?.taskstatusid);
            console.log(`🔍 ticketid:`, newTicketStatus?.ticketid);

            activity.started = true;
            activity.checked = true;
            this.name = activity.name;
            if (activity.selectedFiles && activity.selectedFiles.length > 0) {
              this.uploadPhotoEvidence(activity.id, activity);
            }

            // 🎯 VERIFICAR SI HAY ISSUE REPORTADO AL INICIAR
            const hasIssue = activity.comment && activity.comment.trim().length > 0;
            if (hasIssue) {
              console.log(`⚠️ Issue detectado al iniciar fase ${activity.name}: ${activity.comment}`);
              // this.updateTicketComment7d('TK - ON HOLD OFF');
            } else {
              // 🎯 ACTUALIZAR COMMENT7D DEL TICKET A "TK - ON PROGRESS"
              console.log(`🔄 Llamando a updateTicketComment7d desde startPhase (línea 2) para actividad: ${activity.name}`);
              console.log(`🔍 Estado actual del quadrantId antes de updateTicketComment7d: ${this.quadrantId} (localStorage: ${localStorage.getItem('currentQuadrantId')})`);
              this.updateTicketComment7d('TK - ON PROGRESS');
            }

            this.loadLinkedPhases();
          },
          error: (err) => {
            console.error(`❌ Error creando TicketStatus para fase opcional ${activity.name}:`, err);
          }
        });
      }
    },
    error: (err) => {
      console.error('❌ Error obteniendo TicketStatus:', err);
    }
  });
}

// Método para completar una fase iniciada
completePhase(activity: any) {
  if (!this.isPhaseStarted(activity)) {
    console.warn(`⚠️ No se puede completar la fase ${activity.name}`);
    return;
  }

  const crewIdToUse = this.crewId || this.currentCrewIdFromLoadEmployees;
  if (!crewIdToUse || crewIdToUse === 0) {
    console.error('❌ crewId inválido');
    return;
  }

  // Buscar el TicketStatus existente para actualizar endingDate
  this.ticketStatusService.getByTicket(this.ticketId).subscribe({
    next: (ticketStatuses: any[]) => {
      const existingStatus = ticketStatuses.find(ts =>
        Number(ts.taskstatusid) === Number(activity.id)
      );

      if (existingStatus && existingStatus.startingdate) {
        // Actualizar con endingDate
        const now = new Date();
        const newEndingDate = now.toISOString();
        console.log(`🕐 Completando fase - enviando endingDate: ${newEndingDate}`);
        console.log(`🕐 Hora local actual: ${now.toLocaleString()}`);

        this.ticketStatusService.update(activity.id, this.ticketId, {
          startingDate: existingStatus.startingdate,
          endingDate: newEndingDate,
          updatedBy: this.userId,
          crewId: crewIdToUse // <-- AÑADIDO
        }).subscribe({
          next: (updatedStatus) => {
            console.log(`✅ Fase ${activity.name} completada:`, updatedStatus);
            activity.completed = true;
            activity.locked = true;

            // 🎯 AUTOMÁTICAMENTE LLENAR EL CAMPO PHOTO NAME CON EL NOMBRE DE LA FASE
            this.name = activity.name;
            console.log(`📝 Photo name automáticamente establecido a: ${this.name}`);

            // ✅ SUBIR FOTO SI HAY ARCHIVOS SELECCIONADOS
            if (this.selectedFiles && this.selectedFiles.length > 0) {
              // ✅ CORREGIDO: Usar taskStatusId (activity.id) en lugar de ticketstatusid
              console.log(`📸 Subiendo foto para fase completada ${activity.name} con taskStatusId: ${activity.id}`);
              this.uploadPhotoEvidence(activity.id, activity);
            }

            // 🎯 VERIFICAR SI SE COMPLETÓ CRACK SEAL O CLEAN (ÚNICAS FASES QUE ACTUALIZAN A COMPLETED)
            if (this.shouldUpdateTicketToCompleted(activity.name)) {
              console.log(`🎉 ¡Fase ${activity.name} completada! Actualizando comment7d a TK - COMPLETED`);
              this.updateTicketComment7d('TK - COMPLETED');
            }

            this.loadLinkedPhases(); // Recargar para actualizar estado
            // Verificar si se completó la última fase
            this.checkAndUpdateEndingDate();
          },
          error: (err) => {
            console.error(`❌ Error completando fase ${activity.name}:`, err);
          }
        });
      }
    },
    error: (err) => {
      console.error('❌ Error obteniendo TicketStatus:', err);
    }
  });
}

clearPhotoInputs() {
  this.selectedFiles = [];
  this.imagePreviews = [];
  this.name = '';
  this.comment = '';
}

saveSelectedActivities() {
  console.table(this.activities, ['id', 'name', 'checked', 'locked']);

  const selectedPhases = this.activities
    .filter(a => a.checked && !a.locked && a.id != null);

  console.log('📋 Actividades disponibles:', this.activities);
  console.log('🆕 Seleccionadas para guardar:', selectedPhases);

  if (selectedPhases.length === 0) {
    console.warn('⚠️ No hay fases nuevas para guardar.');
    return;
  }

  const selectedNames = selectedPhases.map(p => p.name).join(', ');

  const dialogRef = this.dialog.open(ConfirmPhaseDialogComponent, {
    width: '400px',
    data: { phaseName: selectedNames }
  });

  dialogRef.afterClosed().subscribe(result => {
    if (result) {
      this.executeSaveAndPhoto(selectedPhases);
    }
  });
}




private executeSaveAndPhoto(selectedPhases: any[]) {
  const crewIdToUse = this.crewId || this.currentCrewIdFromLoadEmployees;

  if (!crewIdToUse || crewIdToUse === 0) {
    console.error('❌ crewId inválido, no se puede guardar TicketStatus');
    return;
  }

  console.log('🔄 === EJECUTANDO GUARDADO Y FOTO ===');
  console.log('📋 Fases seleccionadas:', selectedPhases.map(p => p.name));
  console.log('📁 Archivos seleccionados:', this.selectedFiles.length);

  this.ticketStatusService.getByTicket(this.ticketId).subscribe({
    next: (existingStatuses: any[]) => {
      let alreadyStarted = existingStatuses && existingStatuses.length > 0;
      let startingDateToUse: string | null = null;

      if (alreadyStarted) {
        startingDateToUse = existingStatuses[0].startingdate;
        console.log(`ℹ️ Usando startingDate existente: ${startingDateToUse}`);
      }

      // Contador para manejar las operaciones asíncronas
      let completedOperations = 0;
      const totalOperations = selectedPhases.length;

      selectedPhases.forEach(phase => {
        // Verificar el estado actual de la fase
        const existingPhaseStatus = existingStatuses.find(ts =>
          Number(ts.taskstatusid) === Number(phase.id)
        );

        if (existingPhaseStatus) {
          // La fase ya existe, actualizar según su estado
          if (!existingPhaseStatus.startingdate) {
            // Fase asignada pero no iniciada - iniciar
            this.startPhase(phase);
            completedOperations++;
          } else if (!existingPhaseStatus.endingdate) {
            // Fase iniciada pero no completada - completar
            this.completePhase(phase);
            completedOperations++;
          }
        } else {
          // Fase no asignada - crear nueva
          const currentDate = this.getCurrentDateString();

          const savePhase$ = this.ticketStatusService.create({
            ticketId: this.ticketId,
            crewId: crewIdToUse,
            taskStatusId: phase.id,
            startingDate: !alreadyStarted && !startingDateToUse
              ? (startingDateToUse = currentDate) // primera vez
              : currentDate, // cada fase usa la fecha actual
            createdBy: this.userId,
            updatedBy: this.userId
          });

          savePhase$.subscribe({
            next: (newTicketStatus) => {
              console.log(`✅ TicketStatus creado para fase ${phase.name}:`, newTicketStatus);
              console.log(`🔍 Tipo de respuesta:`, typeof newTicketStatus);
              console.log(`🔍 Propiedades de newTicketStatus:`, Object.keys(newTicketStatus || {}));
              console.log(`🔍 taskstatusid:`, newTicketStatus?.taskstatusid);
              console.log(`🔍 ticketid:`, newTicketStatus?.ticketid);

              completedOperations++;

              // ✅ SUBIR FOTO SOLO SI HAY ARCHIVO SELECCIONADO
              if (this.selectedFiles && this.selectedFiles.length > 0) {
                // ✅ CORREGIDO: Usar taskStatusId (phase.id) en lugar de ticketstatusid
                console.log(`📸 Subiendo foto para fase ${phase.name} con taskStatusId: ${phase.id}`);
                this.uploadPhotoEvidence(phase.id, phase);
              }

              // Verificar si todas las operaciones están completadas
              if (completedOperations === totalOperations) {
                this.loadLinkedPhases();
                this.checkAndUpdateEndingDate();
              }
            },
            error: (err) => {
              console.error(`❌ Error creando TicketStatus para fase ${phase.name}:`, err);
              completedOperations++;

              if (completedOperations === totalOperations) {
                this.loadLinkedPhases();
                this.checkAndUpdateEndingDate();
              }
            }
          });

          alreadyStarted = true;
        }
      });

      // Si no hay operaciones asíncronas, ejecutar inmediatamente
      if (completedOperations === totalOperations) {
        this.loadLinkedPhases();
        this.checkAndUpdateEndingDate();
      }
    },
    error: (err) => {
      console.error('❌ Error al obtener ticketStatus para verificar startingDate:', err);
    }
  });
}

// Método para verificar si se debe actualizar el endingDate
private checkAndUpdateEndingDate() {
  console.log('🔄 Verificando si se debe actualizar ending date...');

  // Obtener todas las fases del ticket actual
  this.ticketStatusService.getByTicket(this.ticketId).subscribe({
    next: (existingStatuses: any[]) => {
      console.log('📋 TicketStatus existentes:', existingStatuses);

      // Obtener los IDs de las fases completadas (con endingDate)
      const completedPhaseIds = existingStatuses
        .filter(ts => ts.endingdate)
        .map(ts => Number(ts.taskstatusid));

      console.log('✅ Fases completadas (con endingDate):', completedPhaseIds);

      // Verificar si todas las fases obligatorias están completadas
      let allRequiredPhasesCompleted = true;
      let lastCompletedPhase = null;
      const missingRequiredPhases: string[] = [];

      for (let i = this.activities.length - 1; i >= 0; i--) {
        const activity = this.activities[i];
        const isCompleted = completedPhaseIds.includes(Number(activity.id));

        if (isCompleted) {
          // Encontrar la última fase completada
          if (!lastCompletedPhase) {
            lastCompletedPhase = activity;
          }
        } else if (!activity.optional) {
          // Si una fase obligatoria no está completada, marcar como incompleta
          allRequiredPhasesCompleted = false;
          missingRequiredPhases.push(activity.name);
        }
        // Si es opcional y no está completada, continuar verificando
      }

      console.log('📊 Estado de fases:');
      console.log('  - Todas las fases obligatorias completadas:', allRequiredPhasesCompleted);
      console.log('  - Última fase completada:', lastCompletedPhase?.name);
      console.log('  - Fases obligatorias faltantes:', missingRequiredPhases);

      if (allRequiredPhasesCompleted && lastCompletedPhase) {
        console.log(`✅ Todas las fases obligatorias completadas. Última fase: ${lastCompletedPhase.name}`);
        // No necesitamos hacer nada más aquí, ya que cada fase se marca como completada individualmente
      } else {
        if (missingRequiredPhases.length > 0) {
          console.log(`ℹ️ Fases obligatorias pendientes: ${missingRequiredPhases.join(', ')}`);
        }
      }
    },
    error: (err) => {
      console.error('❌ Error al verificar fases completadas:', err);
    }
  });
}


get isSaveDisabled(): boolean {
  return (
    this.activities?.every((a: any) => !a.checked) && !this.selectedFiles
  );
}

onPhaseChecked(activity: any) {
  // Verificar si la fase anterior está incompleta
  if (this.isPreviousPhaseIncomplete(activity)) {
    console.warn(`⚠️ No se puede marcar ${activity.name} - fase anterior incompleta`);
    activity.checked = false; // Desmarcar si no se puede
    return;
  }

  if (activity.checked) {
    this.name = activity.name;

    // Si la fase está asignada pero no iniciada, preguntar si quiere iniciarla
    if (this.isPhaseAssigned(activity)) {
      const confirmStart = confirm(`¿Deseas iniciar la fase "${activity.name}"? Esto marcará la fecha de inicio.`);
      if (!confirmStart) {
        activity.checked = false; // Desmarcar si no quiere iniciar
        return;
      }
    }

    // Si la fase está iniciada pero no completada, preguntar si quiere completarla
    if (this.isPhaseStarted(activity)) {
      const confirmComplete = confirm(`¿Deseas completar la fase "${activity.name}"? Esto marcará la fecha de finalización.`);
      if (!confirmComplete) {
        activity.checked = false; // Desmarcar si no quiere completar
        return;
      }
    }
  }
}


isPreviousPhaseIncomplete(currentActivity: any): boolean {
  const currentIndex = this.activities.indexOf(currentActivity);

  // Si es el primero, permitirlo
  if (currentIndex === 0) return false;

  // 🚩 Si la fase actual es opcional, nunca bloquearla
  if (currentActivity.optional) return false;

  // Buscar la última fase obligatoria antes de la actual
  for (let i = currentIndex - 1; i >= 0; i--) {
    const previousActivity = this.activities[i];
    if (previousActivity.optional) continue;
    // Si la anterior obligatoria no está completada, bloquear
    if (!previousActivity.checked) return true;
    // Si está completada, permitir
    break;
  }
  return false;
}


// Método para mostrar los nombres de los archivos seleccionados por fase
getSelectedFileNames(activity: any): string {
  return activity.selectedFiles && activity.selectedFiles.length > 0
    ? activity.selectedFiles.map((f: File) => f.name).join(', ')
    : '';
}

// Modificar onFileSelected para trabajar por activity
onFileSelected(event: Event, activity: any) {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
    const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    
    // Procesar múltiples archivos si están disponibles
    Array.from(input.files).forEach(file => {
      if (activity.selectedFiles.length >= 5) {
        return;
      }
      
      if (validImageTypes.includes(file.type)) {
        // Renombrar el archivo para evitar caracteres especiales
        const fileExtension = file.name.split('.').pop() || 'jpg';
        const safeName = `${Date.now()}_${this.ticketId}_${activity.id}.${fileExtension}`;
        const renamedFile = new File([file], safeName, { type: file.type });

        activity.selectedFiles.push(renamedFile);
        const reader = new FileReader();
        reader.onload = () => {
          activity.imagePreviews.push(reader.result);
        };
        reader.readAsDataURL(renamedFile);
      }
    });
    
    input.value = '';
  }
}

// 🎯 NUEVO: Método específico para fotos de cámara
onCameraPhotoSelected(event: Event, activity: any) {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
    const file = input.files[0];
    const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    
    if (validImageTypes.includes(file.type)) {
      if (activity.selectedFiles.length < 5) {
        // Renombrar el archivo para evitar caracteres especiales
        const fileExtension = file.name.split('.').pop() || 'jpg';
        const safeName = `${Date.now()}_${this.ticketId}_${activity.id}_camera.${fileExtension}`;
        const renamedFile = new File([file], safeName, { type: file.type });

        activity.selectedFiles.push(renamedFile);
        const reader = new FileReader();
        reader.onload = () => {
          activity.imagePreviews.push(reader.result);
        };
        reader.readAsDataURL(renamedFile);
        
        console.log(`📸 Foto de cámara agregada: ${renamedFile.name}`);
        
        // 🎯 NUEVO: Preguntar si quiere tomar otra foto (solo en móviles)
        if (this.isMobileDevice && activity.selectedFiles.length < 5) {
          this.askForAnotherPhoto(activity);
        }
      } else {
        console.warn('⚠️ Máximo de 5 fotos alcanzado');
      }
    }
    
    input.value = '';
  }
}

// Modificar removeImage para trabajar por activity
removeImage(index: number, activity: any): void {
  activity.selectedFiles.splice(index, 1);
  activity.imagePreviews.splice(index, 1);
}

// 🎯 NUEVO: Método para abrir cámara o selector de archivos
openCameraOrFilePicker(activity: any): void {
  console.log(`📸 Abriendo cámara/selector para actividad: ${activity.name}`);
  console.log(`📱 Es dispositivo móvil: ${this.isMobileDevice}`);
  console.log(`📷 Tiene soporte de cámara: ${this.hasCameraSupport}`);
  console.log(`🖥️ User Agent: ${navigator.userAgent}`);
  console.log(`📏 Screen width: ${window.innerWidth}px`);

  // 🎯 HÍBRIDO: Mostrar opciones apropiadas según el dispositivo
  if (this.hasCameraSupport) {
    // Si hay soporte de cámara, mostrar opciones (tanto móvil como desktop)
    console.log(`📷 Soporte de cámara detectado - mostrando opciones`);
    this.showCameraOptions(activity);
  } else {
    // Sin soporte de cámara, abrir selector de archivos normal
    console.log(`❌ Sin soporte de cámara - abriendo selector de archivos`);
    this.openFileSelector(activity);
  }
}

// 🎯 NUEVO: Método para preguntar si quiere tomar otra foto
private askForAnotherPhoto(activity: any): void {
  const remainingSlots = 5 - activity.selectedFiles.length;
  
  if (remainingSlots <= 0) {
    return;
  }

  const message = remainingSlots === 1 
    ? `¿Quieres tomar otra foto? (${remainingSlots} espacio restante)`
    : `¿Quieres tomar otra foto? (${remainingSlots} espacios restantes)`;

  const takeAnother = confirm(message);
  
  if (takeAnother) {
    // Esperar un momento antes de abrir la cámara nuevamente
    setTimeout(() => {
      this.openCamera(activity);
    }, 500);
  } else {
    console.log(`📸 Usuario decidió no tomar más fotos. Total: ${activity.selectedFiles.length} fotos`);
  }
}

// 🎯 OPTIMIZADO: Método para subir evidencia fotográfica con mejor rendimiento
uploadPhotoEvidence(taskStatusId: number, activity: any): void {
  if (!activity.selectedFiles.length || !this.ticketId) {
    console.warn('⚠️ No hay archivos o ticketId');
    return;
  }
  if (!taskStatusId) {
    console.error('❌ taskStatusId es undefined o null');
    return;
  }
  if (!this.userId) {
    console.error('❌ userId es undefined o null');
    return;
  }

  // ✅ Agregar actividad al set de carga
  this.uploadingActivities.add(activity.id);
  console.log(`🚀 Iniciando subida de evidencia para fase ${activity.name}`);

  // 🎯 NUEVO: Optimizar FormData - solo enviar datos necesarios
  const formData = new FormData();

  // 🎯 NUEVO: Comprimir y optimizar archivos antes de enviar
  const optimizedFiles = this.optimizeFilesForUpload(activity.selectedFiles);
  optimizedFiles.forEach((file: File) => {
    formData.append('file', file);
  });

  // 🎯 NUEVO: Solo enviar campos esenciales
  formData.append('ticketStatusId', taskStatusId.toString());
  formData.append('ticketId', this.ticketId.toString());
  formData.append('name', activity.name || 'Photo Evidence');
  formData.append('comment', activity.comment || '');
  formData.append('createdBy', this.userId.toString());
  formData.append('updatedBy', this.userId.toString());

  // 🎯 NUEVO: Usar timestamp más eficiente
  formData.append('date', new Date().toISOString());

  // 🎯 NUEVO: Subida optimizada con timeout y retry
  this.photoEvidenceService.uploadPhotoEvidence(formData).subscribe({
    next: (res) => {
      console.log(`✅ Evidencia subida exitosamente para fase ${activity.name}`);

      // ✅ Remover actividad del set de carga
      this.uploadingActivities.delete(activity.id);

      // 🎯 NUEVO: Limpiar inputs inmediatamente
      this.clearPhotoInputsActivity(activity);

      // 🎯 NUEVO: Actualización optimizada - solo una vez
      this.updateAfterSuccessfulUpload(activity);

      // 🎯 VERIFICAR SI HAY ISSUE REPORTADO
      const hasIssue = activity.comment && activity.comment.trim().length > 0;
      if (hasIssue) {
        console.log(`⚠️ Issue detectado en fase ${activity.name}: ${activity.comment}`);
        // this.updateTicketComment7d('TK - ON HOLD OFF');
      }

      this.completePhase(activity);
    },
    error: (err) => {
      // ✅ Remover actividad del set de carga en caso de error
      this.uploadingActivities.delete(activity.id);
      console.error(`❌ Error subiendo evidencia para fase ${activity.name}:`, err);

      // 🎯 NUEVO: Mostrar mensaje de error al usuario
      this.showUploadError(activity.name);
    }
  });
}

// 🎯 NUEVO: Método para optimizar archivos antes de subir
private optimizeFilesForUpload(files: File[]): File[] {
  return files.map(file => {
    // 🎯 NUEVO: Comprimir imágenes según el nivel de rendimiento
    if (file.size > this.maxImageSize) {
      console.log(`📦 Comprimiendo archivo: ${file.name} (${file.size} bytes)`);
      console.log(`⚡ Tamaño máximo configurado: ${this.maxImageSize} bytes`);
      console.log(`⚡ Calidad configurada: ${(this.maxImageQuality * 100).toFixed(0)}%`);
      return this.compressImageFile(file);
    }
    return file;
  });
}

// 🎯 NUEVO: Método para comprimir imágenes
private compressImageFile(file: File): File {
  // Crear un canvas para comprimir la imagen
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const img = new Image();
  
  return new Promise<File>((resolve) => {
    img.onload = () => {
      // Calcular nuevas dimensiones (máximo 1920x1080)
      const maxWidth = 1920;
      const maxHeight = 1080;
      let { width, height } = img;
      
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Dibujar imagen redimensionada
      ctx?.drawImage(img, 0, 0, width, height);
      
      // Convertir a blob con compresión
      canvas.toBlob((blob) => {
        if (blob) {
          const compressedFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now()
          });
          console.log(`📦 Imagen comprimida: ${file.size} → ${compressedFile.size} bytes`);
          resolve(compressedFile);
        } else {
          resolve(file); // Fallback al archivo original
        }
      }, 'image/jpeg', this.maxImageQuality);
    };
    
    img.src = URL.createObjectURL(file);
  }) as any; // Simplificación para evitar async/await complejo
}

// 🎯 NUEVO: Método para actualización optimizada después de subida exitosa
private updateAfterSuccessfulUpload(activity: any): void {
  console.log(`🔄 Actualizando UI después de subida exitosa para ${activity.name}`);

  // 🎯 NUEVO: Actualizar solo una vez con delay optimizado
  setTimeout(() => {
    this.loadCurrentTicketImages();
    this.updateCommentsAfterUpload();
    this.updateGalleryAfterUpload();
  }, 1000); // 🎯 REDUCIDO: De 2000ms a 1000ms
}

// 🎯 NUEVO: Método para mostrar errores de subida
private showUploadError(activityName: string): void {
  // Aquí puedes implementar un toast o notificación
  console.error(`❌ Error al subir evidencia para ${activityName}`);
}

// Limpiar inputs de una activity
clearPhotoInputsActivity(activity: any) {
  activity.selectedFiles = [];
  activity.imagePreviews = [];
  activity.comment = '';
}

// ✅ Helper method para verificar si una actividad está subiendo fotos
isUploading(activity: any): boolean {
  return this.uploadingActivities.has(activity.id);
}

// ✅ NUEVO MÉTODO: Preguntar si quiere marcar la fase como completada
private askToCompletePhase(taskStatusId: number): void {
  const activity = this.activities.find(a => Number(a.id) === Number(taskStatusId));
  if (!activity) {
    console.warn(`⚠️ Actividad no encontrada para taskStatusId: ${taskStatusId}`);
    return;
  }

  // Solo preguntar si la fase está iniciada pero no completada
  if (this.isPhaseStarted(activity) && !this.isPhaseCompleted(activity)) {
    const confirmComplete = confirm(
      `¿Deseas marcar la fase "${activity.name}" como completada?\n\n` +
      `Esto marcará la fecha de finalización y bloqueará la fase.`
    );

    if (confirmComplete) {
      this.completePhase(activity);
    } else {
      console.log(`ℹ️ Usuario decidió no completar la fase "${activity.name}"`);
    }
  } else {
    console.log(`ℹ️ Fase "${activity.name}" no está en estado para completar (iniciada: ${this.isPhaseStarted(activity)}, completada: ${this.isPhaseCompleted(activity)})`);
  }
}

// 🎯 NUEVO MÉTODO PARA ACTUALIZAR ENDING DATE DEL TICKET STATUS
private updateTicketStatusEndingDate(taskStatusId: number): void {
  console.log(`🔄 Actualizando ending date para TaskStatus ID: ${taskStatusId} y Ticket ID: ${this.ticketId}`);

  this.ticketStatusService.getByTicket(this.ticketId).subscribe({
    next: (ticketStatuses: any[]) => {
      const existingStatus = ticketStatuses.find(ts =>
        Number(ts.taskstatusid) === Number(taskStatusId)
      );

      if (existingStatus && existingStatus.startingdate && !existingStatus.endingdate) {
        // Actualizar con endingDate usando la clave compuesta
        const now = new Date();
        const newEndingDate = now.toISOString();
        console.log(`🕐 Actualizando ending date: ${newEndingDate}`);

        this.ticketStatusService.update(taskStatusId, this.ticketId, {
          startingDate: existingStatus.startingdate,
          endingDate: newEndingDate,
          updatedBy: this.userId,
          crewId: this.crewId || this.currentCrewIdFromLoadEmployees
        }).subscribe({
          next: () => {
            console.log(`✅ Ending date actualizado para TaskStatus ID: ${taskStatusId} y Ticket ID: ${this.ticketId}`);

            // Actualizar la actividad correspondiente en la UI
            const activity = this.activities.find(a => Number(a.id) === Number(taskStatusId));
            if (activity) {
              activity.completed = true;
              activity.locked = true;
              activity.endDate = newEndingDate;
              console.log(`✅ Actividad ${activity.name} marcada como completada`);
            }

            // Recargar fases para actualizar estado
            this.loadLinkedPhases();
          },
          error: (err) => {
            console.error(`❌ Error actualizando ending date para TaskStatus ID: ${taskStatusId}:`, err);
          }
        });
      } else {
        console.warn(`⚠️ TicketStatus con TaskStatus ID: ${taskStatusId} y Ticket ID: ${this.ticketId} no encontrado o ya completado`);
      }
    },
    error: (err) => {
      console.error('❌ Error obteniendo TicketStatus para actualizar ending date:', err);
    }
  });
}

// Métodos para mostrar fotos del ticket actual
loadCurrentTicketImages() {
  if (!this.ticketId) {
    console.warn('⚠️ No hay ticketId para cargar imágenes');
    return;
  }

  console.log('🖼️ Cargando imágenes del ticket:', this.ticketId);

  this.ticketStatusService.getByTicket(this.ticketId).subscribe({
    next: (ticketStatuses: any[]) => {
      console.log('📋 TicketStatus recibidos:', ticketStatuses.length);

      const ticketStatusMap = new Map<string, any>();
      ticketStatuses.forEach(ts => {
        ticketStatusMap.set(`${ts.taskstatusid}_${ts.ticketid}`, ts);
      });

      this.photoEvidenceService.getAllPhotoEvidence().subscribe({
        next: (photos) => {
          console.log('📸 Total de fotos recibidas:', photos.length);

          const ticketPhotos = photos.filter(p => p.ticketid === this.ticketId);
          console.log('📸 Fotos del ticket actual:', ticketPhotos.length);

          if (ticketPhotos.length === 0) {
            this.currentTicketImages = [];
            this.filteredTicketImages = [];
            // 🎯 NUEVO: Aplicar filtros de fecha incluso cuando no hay fotos
            this.applyDateFilter();

            // 🎯 NUEVO: Mostrar notificación de galería vacía
            this.galleryUpdatedMessage = 'Gallery updated - No images found';
            setTimeout(() => {
              this.galleryUpdatedMessage = '';
            }, 2000);

            return;
          }

          // Usar Promise.all para esperar todas las descargas
          const imagePromises = ticketPhotos.map(e =>
            this.photoEvidenceService.getPhotoEvidenceFile(e.photoid || e.photoId).toPromise()
              .then(blob => {
                if (!blob) throw new Error('No se recibió blob');
                const url = URL.createObjectURL(blob);
                const activity = this.activities.find(a => a.name.trim().toLowerCase() === (e.name || '').trim().toLowerCase());
                const taskStatusId = activity ? activity.id : null;
                const ts = taskStatusId ? ticketStatusMap.get(`${taskStatusId}_${e.ticketid}`) : null;
                return {
                  url,
                  name: e.name || 'Not available',
                  comment: e.comment || 'No issues reported',
                  startingdate: ts?.startingdate,
                  endingdate: ts?.endingdate,
                  date: e.date,
                  photoId: e.photoid || e.photoId,
                  photoid: e.photoid || e.photoId,
                  loaded: false,
                  error: false
                };
              })
              .catch(() => {
                // Manejo de error: agrega una imagen placeholder
                const activity = this.activities.find(a => a.name.trim().toLowerCase() === (e.name || '').trim().toLowerCase());
                const taskStatusId = activity ? activity.id : null;
                const ts = taskStatusId ? ticketStatusMap.get(`${taskStatusId}_${e.ticketid}`) : null;
                return {
                  url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjRmNGY0Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlbiBubyBkaXNwb25pYmxlPC90ZXh0Pjwvc3ZnPg==',
                  name: e.name || 'Error al cargar',
                  comment: '',
                  startingdate: ts?.startingdate,
                  endingdate: ts?.endingdate,
                  date: e.date,
                  photoId: e.photoid || e.photoId,
                  photoid: e.photoid || e.photoId,
                  loaded: false,
                  error: true
                };
              })
          );

          Promise.all(imagePromises).then(images => {
            this.currentTicketImages = images;
            this.filteredTicketImages = [...this.currentTicketImages];
            this.applyDateFilter();

            // 🎯 ACTUALIZAR COMENTARIOS FILTRADOS
            this.filteredComments = this.getCommentsFromImages();

            // 🎯 NUEVO: Aplicar filtro de comentarios si existe
            if (this.commentFilterText.trim()) {
              this.onCommentFilterChange();
            }

            // 🎯 NUEVO: Mostrar notificación de galería actualizada si hay imágenes
            if (images.length > 0) {
              this.galleryUpdatedMessage = 'Gallery loaded successfully!';
              setTimeout(() => {
                this.galleryUpdatedMessage = '';
              }, 2000);
            }

            // 🎯 NUEVO: Log para debugging
            console.log(`🖼️ Galería actualizada: ${images.length} imágenes cargadas`);
          });
        },
        error: (err) => {
          console.error('❌ Error loading current ticket images:', err);
          this.filteredTicketImages = [];
        }
      });
    },
    error: (err) => {
      console.error('❌ Error loading ticket statuses for images:', err);
      this.filteredTicketImages = [];
    }
  });
}

applyDateFilter() {
  // Si no hay filtros de fecha configurados, mostrar todas las imágenes
  if (!this.filterDateFrom || !this.filterDateTo) {
    this.filteredTicketImages = [...this.currentTicketImages];
    return;
  }

  this.filteredTicketImages = this.currentTicketImages.filter(img => {
    // Usa startingdate si existe, si no, usa date de la foto
    const dateStr = img.startingdate || img.date;
    if (!dateStr) return false;
    const imgDate = new Date(dateStr);
    return imgDate >= this.filterDateFrom! && imgDate <= this.filterDateTo!;
  });
}

groupImagesByName(images: any[]): { [key: string]: any[] } {
  return images.reduce((groups, img) => {
    if (!groups[img.name]) {
      groups[img.name] = [];
    }
    groups[img.name].push(img);
    return groups;
  }, {} as { [key: string]: any[] });
}

toggleGroup(group: string) {
  this.openedGroups[group] = !this.openedGroups[group];
}

getOrderedGroupedImages(): { key: string, value: any[] }[] {
  const grouped = this.groupImagesByName(this.filteredTicketImages);
  return this.orderedPhaseNames.map(phase => ({
    key: phase,
    value: grouped[phase] || []
  }));

}


// Map methods
  private updateLeafletRoutes() {
    console.log(`🗺️ === updateLeafletRoutes STARTED ===`);
    console.log(`🗺️ Location object:`, this.location);
    console.log(`🗺️ Address: ${this.location?.address}`);
    console.log(`🗺️ Lat: ${this.location?.lat}`);
    console.log(`🗺️ Lng: ${this.location?.lng}`);
    console.log(`🗺️ TicketId: ${this.ticketId}`);

    if (this.location && this.location.address && this.location.lat && this.location.lng) {
      console.log(`✅ Todas las condiciones cumplidas, creando ruta`);

      this.leafletRoutes = [{
        routeId: this.ticketId, // Usar ticketId como routeId para identificación única
        routeCode: this.routeCode || 'SPOTTER',
        type: this.routeCode?.includes('SPOTTER') ? 'SPOTTER' :
              this.routeCode?.includes('CONCRETE') ? 'CONCRETE' :
              this.routeCode?.includes('ASPHALT') ? 'ASPHALT' : 'SPOTTER',
        encodedPolyline: '', // No polyline, solo marcador
        tickets: [{
          ticketId: this.ticketId,
          address: this.location.address,
          queue: 0, // Siempre será 0 ya que es la única ubicación
          coordinates: {
            latitude: this.location.lat,
            longitude: this.location.lng
          }
        }]
      }];

      console.log(`🗺️ LeafletRoutes creado:`, this.leafletRoutes);

      // ✅ NO hacer zoom automático - solo actualizar el mapa
      setTimeout(() => {
        if (this.leafletMap) {
          console.log(`✅ Mapa actualizado sin zoom automático`);
          this.leafletMap.refreshMap();
        } else {
          console.warn(`⚠️ LeafletMap no disponible`);
        }
      }, 100);
    } else {
      console.warn(`⚠️ No se pudo actualizar mapa: coordenadas no disponibles`);
      console.warn(`⚠️ address: ${this.location?.address}, lat: ${this.location?.lat}, lng: ${this.location?.lng}`);
      this.leafletRoutes = [];
    }

    console.log(`🗺️ === updateLeafletRoutes COMPLETED ===`);
  }



// Debug method to check map state
debugMapState(): void {
  console.log('🔍 === CURRENT MAP DEBUG INFO ===');
  console.log('📍 Location object:', this.location);
  console.log('📍 Location address:', this.location.address);
  console.log('📍 Location lat/lng:', `${this.location.lat}, ${this.location.lng}`);
  console.log('📍 TicketId:', this.ticketId);
  console.log('📍 LeafletRoutes:', this.leafletRoutes);
  console.log('📍 LeafletMap available:', !!this.leafletMap);
  console.log('📍 Static map URL:', this.staticMapUrl);
  console.log('📍 Map dimensions:', `${this.staticMapWidth}x${this.staticMapHeight}`);
  console.log('🔍 === END CURRENT MAP DEBUG ===');

  // También llamar al debug del LeafletMap
  if (this.leafletMap) {
    this.leafletMap.debugMapState();
  }
}

// Force map refresh
forceMapRefresh(): void {
  console.log('🔄 Forcing map refresh...');
  // No hay lógica de Leaflet para forzar un refresh aquí, ya que Leaflet maneja el estado interno
}

// Test map generation
testMapGeneration(): void {
  console.log('🧪 Testing map generation...');

  // Test with a known address
  const testAddress = '4840 W WRIGHTWOOD AVE, Chicago, IL';
  console.log('🧪 Using test address:', testAddress);

  // No hay lógica de Leaflet para generar mapas aquí, ya que Leaflet maneja el estado interno
}

onActivityFilterChange() {
  const filter = this.activityFilterText.trim().toLowerCase();
  if (!filter) {
    this.filteredActivities = this.activities;
  } else {
    this.filteredActivities = this.activities.filter(a =>
      a.name.toLowerCase().includes(filter)
    );
  }
}

// 🎯 MÉTODO PARA FILTRAR COMENTARIOS
onCommentFilterChange() {
  const filter = this.commentFilterText.trim().toLowerCase();
  if (!filter) {
    this.filteredComments = this.getCommentsFromImages();
  } else {
    this.filteredComments = this.getCommentsFromImages().filter(comment =>
      comment.text.toLowerCase().includes(filter) ||
      comment.phaseName.toLowerCase().includes(filter) ||
      comment.date.toLowerCase().includes(filter)
    );
  }
}

// 🎯 MÉTODO PARA OBTENER COMENTARIOS DE LAS IMÁGENES
getCommentsFromImages(): any[] {
  if (!this.currentTicketImages || this.currentTicketImages.length === 0) {
    return [];
  }

  // 🎯 NUEVO: Filtrar y eliminar issues duplicados
  const allComments = this.currentTicketImages
    .filter(img => img.comment && img.comment.trim() !== '' && img.comment !== 'No issues reported')
    .map(img => ({
      text: img.comment,
      phaseName: img.name,
      date: img.startingdate || img.date,
      photoId: img.photoId || img.photoid,
      hasIssue: img.comment && img.comment.trim().length > 0 && img.comment !== 'No issues reported'
    }));

  // 🎯 NUEVO: Eliminar duplicados basándose en el texto del comentario
  const uniqueComments = allComments.reduce((acc: any[], current) => {
    const isDuplicate = acc.find(item =>
      item.text.toLowerCase().trim() === current.text.toLowerCase().trim() &&
      item.phaseName === current.phaseName
    );

    if (!isDuplicate) {
      acc.push(current);
    } else {
      console.log(`🔄 Issue duplicado eliminado: "${current.text}" en fase ${current.phaseName}`);
    }

    return acc;
  }, []);

  console.log(`🔍 Issues únicos encontrados: ${uniqueComments.length} de ${allComments.length} total`);

  return uniqueComments
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Ordenar por fecha más reciente
}

// 🎯 MÉTODO PARA ALTERNAR VISIBILIDAD DE UN COMENTARIO ESPECÍFICO
toggleCommentVisibility(commentIndex: number): void {
  if (this.hiddenComments.has(commentIndex)) {
    this.hiddenComments.delete(commentIndex);
  } else {
    this.hiddenComments.add(commentIndex);
  }
}

// 🎯 MÉTODO PARA VERIFICAR SI UN COMENTARIO ESTÁ OCULTO
isCommentHidden(commentIndex: number): boolean {
  return this.hiddenComments.has(commentIndex);
}

// 🎯 MÉTODO PARA OCULTAR/MOSTRAR TODOS LOS COMENTARIOS
toggleAllCommentsVisibility(): void {
  this.showAllComments = !this.showAllComments;

  if (this.showAllComments) {
    // Mostrar todos los comentarios
    this.hiddenComments.clear();
  } else {
    // Ocultar todos los comentarios
    this.filteredComments.forEach((_, index) => {
      this.hiddenComments.add(index);
    });
  }
}

// 🎯 NUEVO: MÉTODO PARA LIMPIAR ISSUE (ACTUALIZAR COMMENT DE PHOTOEVIDENCE)
clearIssue(comment: any): void {
  if (!comment.photoId) {
    console.warn('⚠️ No hay photoId para limpiar issue');
    return;
  }

  // 🎯 NUEVO: Mostrar diálogo de confirmación
  const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
    width: '400px',
    data: {
      title: 'Clear Comment',
      message: `Are you sure you want to clear this comment?\n\n"${comment.text}"\n\nThis action cannot be undone.`,
      confirmText: 'Clear Comment',
      cancelText: 'Cancel'
    }
  });

  dialogRef.afterClosed().subscribe(result => {
    if (result) {
      console.log(`🔄 Limpiando issue para foto ${comment.photoId}: "${comment.text}"`);

      // Crear FormData para actualizar PhotoEvidence
      const formData = new FormData();
      formData.append('comment', ''); // 🎯 LIMPIAR COMMENT A CADENA VACÍA

      this.photoEvidenceService.updatePhotoEvidence(comment.photoId, formData).subscribe({
        next: (updatedPhoto) => {
          console.log(`✅ Issue limpiado para foto ${comment.photoId}:`, updatedPhoto);
          console.log(`🔍 Respuesta del backend después del update:`, updatedPhoto);
          console.log(`🔍 comment en respuesta:`, updatedPhoto?.comment);

          // 🎯 RECARGAR LAS IMÁGENES DESDE EL BACKEND PARA GARANTIZAR SINCRONIZACIÓN
          this.loadCurrentTicketImages();

          // Mostrar notificación
          this.commentsUpdatedMessage = 'Issue cleared successfully!';
          setTimeout(() => {
            this.commentsUpdatedMessage = '';
          }, 3000);
        },
        error: (err) => {
          console.error(`❌ Error limpiando issue para foto ${comment.photoId}:`, err);
        }
      });
    } else {
      console.log(`❌ Usuario canceló la limpieza del issue: "${comment.text}"`);
    }
  });
}

// 🎯 NUEVO: MÉTODOS PARA OBSERVATIONS (COMMENTS)
// 🎯 MÉTODO PARA ALTERNAR VISIBILIDAD DE UNA OBSERVACIÓN ESPECÍFICA
toggleObservationVisibility(observationIndex: number): void {
  if (this.hiddenObservations.has(observationIndex)) {
    this.hiddenObservations.delete(observationIndex);
  } else {
    this.hiddenObservations.add(observationIndex);
  }
}

// 🎯 MÉTODO PARA VERIFICAR SI UNA OBSERVACIÓN ESTÁ OCULTA
isObservationHidden(observationIndex: number): boolean {
  return this.hiddenObservations.has(observationIndex);
}

// 🎯 MÉTODO PARA OCULTAR/MOSTRAR TODAS LAS OBSERVACIONES
toggleAllObservationsVisibility(): void {
  this.showAllObservations = !this.showAllObservations;

  if (this.showAllObservations) {
    // Mostrar todas las observaciones
    this.hiddenObservations.clear();
  } else {
    // Ocultar todas las observaciones
    this.filteredObservations.forEach((_, index) => {
      this.hiddenObservations.add(index);
    });
  }
}

// 🎯 MÉTODO PARA FILTRAR OBSERVACIONES
onObservationFilterChange() {
  const filter = this.observationFilterText.trim().toLowerCase();
  if (!filter) {
    this.filteredObservations = this.getObservationsFromTicketStatus();
  } else {
    this.filteredObservations = this.getObservationsFromTicketStatus().filter(observation =>
      observation.text.toLowerCase().includes(filter) ||
      observation.phaseName.toLowerCase().includes(filter) ||
      observation.date.toLowerCase().includes(filter)
    );
  }
}

// 🎯 MÉTODO PARA OBTENER OBSERVACIONES DE TICKETSTATUS
getObservationsFromTicketStatus(): any[] {
  if ((!this.activities || this.activities.length === 0) && (!this.optionalActivities || this.optionalActivities.length === 0)) {
    return [];
  }

  console.log('🔍 === DEBUGGING OBSERVATIONS ===');
  this.activities.forEach(activity => {
    console.log(`📝 ${activity.name}: observation="${activity.observation}" (tipo: ${typeof activity.observation})`);
  });

  // 🎯 NUEVO: Combinar actividades obligatorias y opcionales
  const allActivities = [...this.activities, ...this.optionalActivities];

  const validObservations = allActivities
    .filter(activity => {
      // 🎯 FILTRAR SOLO ACTIVIDADES CON OBSERVACIÓN VÁLIDA
      const hasValidObservation = activity.observation &&
                                typeof activity.observation === 'string' &&
                                activity.observation.trim() !== '' &&
                                activity.observation !== 'null' &&
                                activity.observation !== null &&
                                activity.observation !== '';

      console.log(`🔍 ${activity.name}: hasValidObservation=${hasValidObservation}`);
      return hasValidObservation;
    })
    .map(activity => ({
      text: activity.observation,
      phaseName: activity.name,
      date: activity.startDate || new Date().toISOString(),
      taskStatusId: activity.id,
      hasObservation: true
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Ordenar por fecha más reciente

  console.log(`✅ Observaciones válidas encontradas: ${validObservations.length}`);
  console.log('🔍 === FIN DEBUGGING OBSERVATIONS ===');

  return validObservations;
}

// 🎯 MÉTODO PARA GUARDAR OBSERVACIÓN
saveObservation(activity: any): void {
  if (!activity.observation || activity.observation.trim().length === 0) {
    console.warn('⚠️ No hay observación para guardar');
    return;
  }

  if (!this.ticketId) {
    console.warn('⚠️ No hay ticketId para guardar observación');
    return;
  }

  const crewIdToUse = this.crewId || this.currentCrewIdFromLoadEmployees;
  if (!crewIdToUse || crewIdToUse === 0) {
    console.error('❌ crewId inválido para guardar observación');
    return;
  }

  console.log(`🔄 Guardando observación para fase ${activity.name}:`, activity.observation);

  // Buscar el TicketStatus existente
  this.ticketStatusService.getByTicket(this.ticketId).subscribe({
    next: (ticketStatuses: any[]) => {
      const existingStatus = ticketStatuses.find(ts =>
        Number(ts.taskstatusid) === Number(activity.id)
      );

      if (existingStatus) {
        // Actualizar observación existente
        this.ticketStatusService.update(activity.id, this.ticketId, {
          startingDate: existingStatus.startingdate,
          endingDate: existingStatus.endingdate,
          observation: activity.observation.trim(),
          updatedBy: this.userId,
          crewId: crewIdToUse
        }).subscribe({
          next: (updatedStatus) => {
            console.log(`✅ Observación guardada para fase ${activity.name}:`, updatedStatus);

            // 🎯 NUEVO: Limpiar el input después de guardar
            activity.observation = '';

            // 🎯 NUEVO: Actualizar comment7d del ticket a TK - ON HOLD OFF
            this.updateTicketComment7d('TK - ON HOLD OFF');

            // 🎯 NUEVO: Recargar las actividades desde el backend para sincronizar
            this.loadLinkedPhases();

            // Mostrar notificación
            this.observationsUpdatedMessage = 'Comment saved successfully!';
            setTimeout(() => {
              this.observationsUpdatedMessage = '';
            }, 3000);
          },
          error: (err) => {
            console.error(`❌ Error guardando observación para fase ${activity.name}:`, err);
          }
        });
      } else {
        // Crear nuevo TicketStatus con observación
        this.ticketStatusService.create({
          ticketId: this.ticketId,
          crewId: crewIdToUse,
          taskStatusId: activity.id,
          observation: activity.observation.trim(),
          createdBy: this.userId,
          updatedBy: this.userId
        }).subscribe({
          next: (newStatus) => {
            console.log(`✅ TicketStatus creado con observación para fase ${activity.name}:`, newStatus);

            // 🎯 NUEVO: Limpiar el input después de guardar
            activity.observation = '';

            // 🎯 NUEVO: Actualizar comment7d del ticket a TK - ON HOLD OFF
            this.updateTicketComment7d('TK - ON HOLD OFF');

            // 🎯 NUEVO: Recargar las actividades desde el backend para sincronizar
            this.loadLinkedPhases();

            // Mostrar notificación
            this.observationsUpdatedMessage = 'Comment saved successfully!';
            setTimeout(() => {
              this.observationsUpdatedMessage = '';
            }, 3000);
          },
          error: (err) => {
            console.error(`❌ Error creando TicketStatus con observación para fase ${activity.name}:`, err);
          }
        });
      }
    },
    error: (err) => {
      console.error('❌ Error obteniendo TicketStatus para guardar observación:', err);
    }
  });
}

// 🎯 NUEVO: MÉTODO PARA LIMPIAR OBSERVACIÓN
clearObservation(observation: any): void {
  if (!this.ticketId) {
    console.warn('⚠️ No hay ticketId para limpiar observación');
    return;
  }

  const crewIdToUse = this.crewId || this.currentCrewIdFromLoadEmployees;
  if (!crewIdToUse || crewIdToUse === 0) {
    console.error('❌ crewId inválido para limpiar observación');
    return;
  }

  // 🎯 NUEVO: Mostrar diálogo de confirmación
  const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
    width: '400px',
    data: {
      title: 'Clear Issue',
      message: `Are you sure you want to clear this issue?\n\n"${observation.text}"\n\nThis action cannot be undone.`,
      confirmText: 'Clear Issue',
      cancelText: 'Cancel'
    }
  });

  dialogRef.afterClosed().subscribe(result => {
    if (result) {
      console.log(`🔄 Limpiando observación para fase ${observation.phaseName}`);

      // Buscar el TicketStatus existente
      this.ticketStatusService.getByTicket(this.ticketId).subscribe({
        next: (ticketStatuses: any[]) => {
          const existingStatus = ticketStatuses.find(ts =>
            Number(ts.taskstatusid) === Number(observation.taskStatusId)
          );

          if (existingStatus) {
            // Actualizar observación a null (o cadena vacía si el backend no procesa null)
            this.ticketStatusService.update(observation.taskStatusId, this.ticketId, {
              startingDate: existingStatus.startingdate,
              endingDate: existingStatus.endingdate,
              observation: '', // 🎯 LIMPIAR OBSERVACIÓN (usar cadena vacía en lugar de null)
              updatedBy: this.userId,
              crewId: crewIdToUse
            }).subscribe({
              next: (updatedStatus) => {
                console.log(`✅ Observación limpiada para fase ${observation.phaseName}:`, updatedStatus);
                console.log(`🔍 Respuesta del backend después del update:`, updatedStatus);
                console.log(`🔍 observation en respuesta:`, updatedStatus?.observation);

                // 🎯 RECARGAR LAS ACTIVIDADES DESDE EL BACKEND PARA GARANTIZAR SINCRONIZACIÓN
                this.loadLinkedPhases();

                // 🎯 NUEVO: Verificar si quedan comentarios y actualizar comment7d
                setTimeout(() => {
                  const remainingObservations = this.getObservationsFromTicketStatus();
                  if (remainingObservations.length === 0) {
                    // Si no hay comentarios, actualizar a ON PROGRESS
                    this.updateTicketComment7d('TK - ON PROGRESS');
                    console.log(`✅ No quedan comentarios - actualizando a TK - ON PROGRESS`);
                  } else {
                    console.log(`ℹ️ Quedan ${remainingObservations.length} comentarios - manteniendo TK - ON HOLD OFF`);
                  }
                }, 1000); // Delay para asegurar que loadLinkedPhases haya terminado

                // Mostrar notificación
                this.observationsUpdatedMessage = 'Comment cleared successfully!';
                setTimeout(() => {
                  this.observationsUpdatedMessage = '';
                }, 3000);
              },
              error: (err) => {
                console.error(`❌ Error limpiando observación para fase ${observation.phaseName}:`, err);
              }
            });
          } else {
            console.warn(`⚠️ TicketStatus no encontrado para limpiar observación de fase ${observation.phaseName}`);
          }
        },
        error: (err) => {
          console.error('❌ Error obteniendo TicketStatus para limpiar observación:', err);
        }
      });
    } else {
      console.log(`❌ Usuario canceló la limpieza del comment: "${observation.text}"`);
    }
  });
}

onPermitFileSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  this.pdfFileError = null;
  if (input.files && input.files.length > 0) {
    const file = input.files[0];
    if (file.type !== 'application/pdf') {
      this.selectedPermitFile = null;
      this.pdfFileError = 'Solo se permite subir archivos PDF.';
      return;
    }
    // Renombrar el archivo para evitar caracteres especiales
    const safeName = `${Date.now()}_${this.ticketId}.pdf`;
    const renamedFile = new File([file], safeName, { type: file.type });
    this.selectedPermitFile = renamedFile;
  } else {
    this.selectedPermitFile = null;
  }
}

uploadPermitFile(permit: any) {
  if (!this.selectedPermitFile || !this.ticketId) return;
  const formData = new FormData();
  formData.append('file', this.selectedPermitFile);
  formData.append('ticketId', this.ticketId.toString());
  formData.append('name', this.selectedPermitFile.name);
  // Puedes agregar más campos si lo deseas (ej: permit.number como comentario)
  formData.append('comment', `Archivo subido para el permit: ${permit.number}`);

  this.photoEvidenceService.uploadPhotoEvidence(formData).subscribe({
    next: (res) => {
      this.selectedPermitFile = null;
      this.loadPermitFilesByTicket();
    },
    error: (err) => {
      console.error('❌ Error subiendo archivo para permit:', err);
    }
  });
}

loadPermitFilesByTicket() {
  this.loadPermitFilesByTicketAsync().subscribe({
    next: (result) => {
      console.log('✅ Archivos del ticket cargados exitosamente');
    },
    error: (err) => {
      console.error('❌ Error cargando archivos del ticket:', err);
    }
  });
}

// 🎯 NUEVO: Método async para cargar archivos del ticket
private loadPermitFilesByTicketAsync() {
  return this.photoEvidenceService.getPhotoEvidenceByTicketId(this.ticketId).pipe(
    map(files => {
      this.permitFilesByTicket = files;
      return { success: true };
    })
  );
}

deletePermitFile(file: any) {
  const photoId = file.photoId || file.photoid;
  if (!photoId) {
    alert('No se pudo identificar el archivo a eliminar.');
    return;
  }
  const confirmed = confirm('¿Estás seguro de que deseas eliminar este archivo?');
  if (!confirmed) return;
  this.photoEvidenceService.deletePhotoEvidence(photoId).subscribe({
    next: () => {
      this.loadPermitFilesByTicket();
    },
    error: (err) => {
      alert('Error eliminando el archivo.');
      console.error('❌ Error eliminando archivo:', err);
    }
  });
}

// 🎯 MÉTODO PARA ACTUALIZAR EL COMMENT7D DEL TICKET
updateTicketComment7d(comment: string) {
  if (!this.ticketId) {
    console.warn('⚠️ No hay ticketId para actualizar comment7d');
    return;
  }

  console.log(`🔄 Actualizando comment7d del ticket ${this.ticketId} a: ${comment}`);

  this.ticketService.getTicketById(this.ticketId).subscribe({
    next: (currentTicket) => {
      console.log(`🔍 Ticket obtenido del backend:`, currentTicket);
      console.log(`🔍 quadrantId del backend: ${currentTicket.quadrantId} (tipo: ${typeof currentTicket.quadrantId})`);
      console.log(`🔍 JSON completo del ticket del backend:`, JSON.stringify(currentTicket, null, 2));

      // 🎯 PRESERVAR EL QUADRANTID DEL ESTADO LOCAL O LOCALSTORAGE
      let quadrantIdToPreserve: number | undefined = undefined;

      // Prioridad 1: Estado local del componente
      if (this.quadrantId !== null && this.quadrantId !== undefined) {
        quadrantIdToPreserve = this.quadrantId;
        console.log(`🎯 Usando quadrantId del estado local: ${quadrantIdToPreserve}`);
      }
      // Prioridad 2: localStorage
      else if (localStorage.getItem('currentQuadrantId')) {
        const storedQuadrantId = Number(localStorage.getItem('currentQuadrantId'));
        if (!isNaN(storedQuadrantId) && storedQuadrantId !== 0) {
          quadrantIdToPreserve = storedQuadrantId;
          console.log(`🎯 Usando quadrantId de localStorage: ${quadrantIdToPreserve}`);
        }
      }
      // Prioridad 3: Valor del ticket actual (solo si no es null)
      else if (currentTicket.quadrantId !== null && currentTicket.quadrantId !== undefined) {
        quadrantIdToPreserve = currentTicket.quadrantId;
        console.log(`🎯 Usando quadrantId del ticket actual: ${quadrantIdToPreserve}`);
      }

      console.log(`🎯 Preservando quadrantId: ${quadrantIdToPreserve} (del estado: ${this.quadrantId}, localStorage: ${localStorage.getItem('currentQuadrantId')}, ticket: ${currentTicket.quadrantId})`);

      // 🎯 DEBUGGING ADICIONAL
      console.log(`🔍 DEBUG - Estado local this.quadrantId: ${this.quadrantId} (tipo: ${typeof this.quadrantId})`);
      console.log(`🔍 DEBUG - localStorage currentQuadrantId: ${localStorage.getItem('currentQuadrantId')} (tipo: ${typeof localStorage.getItem('currentQuadrantId')})`);
      console.log(`🔍 DEBUG - Ticket del backend quadrantId: ${currentTicket.quadrantId} (tipo: ${typeof currentTicket.quadrantId})`);
      console.log(`🔍 DEBUG - Valor final quadrantIdToPreserve: ${quadrantIdToPreserve} (tipo: ${typeof quadrantIdToPreserve})`);

      // 🎯 NUEVO: Crear el objeto updatedTicket sin el spread para evitar incluir quadrantId null
      const updatedTicket: Ticket = {
        ticketId: currentTicket.ticketId || currentTicket.ticketid,
        incidentId: currentTicket.incidentId,
        contractUnitId: currentTicket.contractUnitId,
        wayfindingId: currentTicket.wayfindingId || currentTicket.wayfindingid,
        paymentId: currentTicket.paymentId,
        mobilizationId: currentTicket.mobilizationId,
        ticketCode: currentTicket.ticketCode || currentTicket.ticketcode || 'Not available',
        // ticketcode: currentTicket.ticketCode || currentTicket.ticketcode, // Requerido por la interfaz
        quantity: currentTicket.quantity,
        daysOutstanding: currentTicket.daysOutstanding,
        comment7d: comment,
        PeopleGasComment: currentTicket.partnerComment,
        partnerComment: currentTicket.partnerComment, // ✅ Esta línea es necesaria
        partnerSupervisorComment: currentTicket.partnerSupervisorComment,
        contractNumber: currentTicket.contractNumber,
        amountToPay: currentTicket.amountToPay,
        ticketType: currentTicket.ticketType,
        // quadrantId: quadrantIdToPreserve,
        cuadranteId: quadrantIdToPreserve,
        updatedBy: this.userId
      };

      console.log(`📤 Enviando ticket actualizado:`, updatedTicket);
      console.log(`📤 quadrantId que se envía al backend: ${updatedTicket.quadrantId} (tipo: ${typeof updatedTicket.quadrantId})`);
      console.log(`📤 JSON completo que se envía:`, JSON.stringify(updatedTicket, null, 2));

      this.ticketService.updateTicketB(this.ticketId, updatedTicket).subscribe({
        next: (updatedTicketResponse) => {
          console.log(`✅ Comment7d actualizado exitosamente a: ${comment}`);
          console.log(`✅ Respuesta del backend:`, updatedTicketResponse);
        },
        error: (err) => {
          console.error('❌ Error actualizando comment7d del ticket:', err);
          console.error('❌ Detalles del error:', err.error);
          console.error('❌ Status del error:', err.status);
          console.error('❌ Mensaje del error:', err.message);
        }
      });
    },
    error: (err) => {
      console.error('❌ Error obteniendo ticket para actualizar comment7d:', err);
    }
  });
}

// 🎯 MÉTODO PARA VERIFICAR SI TODAS LAS FASES OBLIGATORIAS ESTÁN COMPLETADAS
checkAllRequiredPhasesCompleted(): boolean {
  const requiredPhases = this.activities.filter(activity => !activity.optional);
  const completedPhases = requiredPhases.filter(activity => this.isPhaseCompleted(activity));

  console.log(`📊 Verificando fases obligatorias: ${requiredPhases.length} total, ${completedPhases.length} completadas`);

  return requiredPhases.length > 0 && completedPhases.length === requiredPhases.length;
}

// 🎯 MÉTODO PARA OBTENER LA ÚLTIMA FASE OBLIGATORIA SEGÚN EL TIPO DE RUTA
getLastRequiredPhase(): string | null {
  if (this.routeCode.includes('ASPHALT')) {
    return 'Crack Seal';
  } else if (this.routeCode.includes('CONCRETE')) {
    return 'Clean';
  } else if (this.routeCode.includes('SPOTTER')) {
    // Para SPOTTER, excluir "Install Signs" y usar "Spotting" como última fase obligatoria
    return 'Spotting';
  }
  return null;
}

  // 🎯 MÉTODO PARA VERIFICAR SI UNA FASE DEBE ACTUALIZAR EL TICKET A COMPLETED
  shouldUpdateTicketToCompleted(activityName: string): boolean {
    // Solo Crack Seal actualizan el ticket a COMPLETED
    return activityName === 'Crack Seal' || activityName === 'Clean';
  }

  // 🎯 MÉTODO PARA VERIFICAR SI SE COMPLETÓ LA ÚLTIMA FASE OBLIGATORIA (DEPRECATED)
  isLastRequiredPhaseCompleted(): boolean {
    // No actualizar a completado si es una ruta SPOTTER
    if (this.routeCode.includes('SPOTTER')) {
      console.log('ℹ️ Ruta SPOTTER detectada - no se actualizará automáticamente a completado');
      return false;
    }

    const lastRequiredPhase = this.getLastRequiredPhase();
    if (!lastRequiredPhase) return false;

    const lastActivity = this.activities.find(activity => activity.name === lastRequiredPhase);
    return lastActivity ? this.isPhaseCompleted(lastActivity) : false;
  }



// 🎯 ELIMINADO: Método geocodeAddress que usa Google API - reemplazado por getTicketCoordinates
// Método para cargar la ruta completa como en upcoming
async loadFullRoute(): Promise<void> {
  try {
    console.log('🗺️ Cargando ruta completa. ticketId:', this.ticketId, 'routeId inicial:', this.routeId);

    // 🔹 0️⃣ Obtener routeId real desde CrewDetails (si no lo tienes o quieres forzar actualización)
    if (!this.routeId || this.routeId === 0) {
      try {
        const crewDetails = await firstValueFrom(this.http.get<any>(`${environment.apiUrl}/crews/${this.crewId}`));
        if (crewDetails?.routeid) {
          this.routeId = Number(crewDetails.routeid);
          console.log('📌 routeId obtenido de getCrewDetailsById:', this.routeId);
        }
      } catch (err) {
        console.warn('⚠️ No se pudo obtener routeId desde getCrewDetailsById', err);
      }
    }

    // 1️⃣ Obtener todas las rutas disponibles
    const spottingRoutesResponse = await firstValueFrom(this.http.get<any>(`${environment.apiUrl}/routes/spotting`));
    const concreteRoutesResponse = await firstValueFrom(this.http.get<any>(`${environment.apiUrl}/routes/concrete`));
    const asphaltRoutesResponse = await firstValueFrom(this.http.get<any>(`${environment.apiUrl}/routes/asphalt`));

    const allRoutes = [
      ...(spottingRoutesResponse?.routes || []),
      ...(concreteRoutesResponse?.routes || []),
      ...(asphaltRoutesResponse?.routes || [])
    ];

    let assignedRoute = null;

    // 2️⃣ Buscar primero por ticketId
    if (this.ticketId) {
      for (const route of allRoutes) {
        if (Array.isArray(route.tickets)) {
          const routeTicketIds = route.tickets
            .map((t: any) => Number(t.ticketId || t.ticketid))
            .filter((id: any) => !isNaN(id));

          if (routeTicketIds.includes(Number(this.ticketId))) {
            assignedRoute = route;
            this.routeId = Number(route.routeid || route.routeId); // 🔹 Actualizar routeId correcto
            console.log('✅ Ruta encontrada por ticketId:', this.ticketId, assignedRoute.routeCode || assignedRoute.routecode);
            break;
          }
        }
      }
    }

    // 3️⃣ Si no se encontró por ticketId, buscar por routeId
    if (!assignedRoute && this.routeId && this.routeId !== 0) {
      assignedRoute = allRoutes.find(route =>
        Number(route.routeid || route.routeId) === Number(this.routeId)
      );
      if (assignedRoute) {
        console.log('✅ Ruta encontrada por routeId:', this.routeId, assignedRoute.routeCode || assignedRoute.routecode);
      }
    }

    // 4️⃣ Si no se encontró nada, salir
    if (!assignedRoute) {
      console.warn('⚠️ No se encontró ruta ni por ticketId ni por routeId.');
      this.updateLeafletRoutes();
      return;
    }

    // 5️⃣ Log de detalles
    console.log('🔍 Detalles de la ruta:', {
      routeId: assignedRoute.routeid || assignedRoute.routeId,
      routeCode: assignedRoute.routecode || assignedRoute.routeCode,
      type: assignedRoute.type,
      hasPolyline: !!(assignedRoute.encodedpolyline || assignedRoute.encodedPolyline),
      ticketsCount: assignedRoute.tickets?.length || 0
    });

    // 6️⃣ Guardar ruta asignada
    this.assignedRoute = assignedRoute;

    // 7️⃣ Sincronizar datos desde el ticket dentro de la ruta
    const rt = (assignedRoute.tickets || []).find((t: any) =>
      Number(t.ticketId || t.ticketid) === Number(this.ticketId)
    );
    if (rt) {
      this.location.address = rt.address || this.location.address;
      this.ticketCode = rt.ticketCode || rt.ticketcode || this.ticketCode;
      if (rt.coordinates) {
        this.latitude = rt.coordinates.lat || this.latitude;
        this.longitude = rt.coordinates.lng || this.longitude;
      }
    }

    // 8️⃣ Determinar tipo de ruta
    let routeType = 'SPOTTER';
    const rc = (assignedRoute.routecode || assignedRoute.routeCode || '').toUpperCase();
    if (rc.includes('ASPHALT')) routeType = 'ASPHALT';
    else if (rc.includes('CONCRETE')) routeType = 'CONCRETE';
    else if (rc.includes('SPOTTER')) routeType = 'SPOTTER';

    // 9️⃣ Crear estructura para Leaflet
    const rId = assignedRoute.routeid || assignedRoute.routeId;
    this.leafletRoutes = [{
      routeId: rId,
      routeCode: assignedRoute.routecode || assignedRoute.routeCode || 'CURRENT',
      type: routeType,
      encodedPolyline: assignedRoute.encodedpolyline || assignedRoute.encodedPolyline || '',
      tickets: assignedRoute.tickets || []
    }];

    this.visibleRoutes = new Set([rId]);

    // 🔟 Refrescar mapa
    setTimeout(() => {
      if (this.leafletMap) {
        this.leafletMap.refreshMap();
        console.log('🔄 Mapa refrescado después de cargar ruta completa');
      }
    }, 1000);

  } catch (error) {
    console.error('❌ Error cargando ruta completa:', error);
    this.updateLeafletRoutes();
  }
}




// Helper method to get current date in local timezone
private getCurrentDateString(): string {
  const now = new Date();
  const isoString = now.toISOString();

  // Log para debugging de fechas
  console.log(`🕐 Fecha actual generada: ${isoString}`);
  console.log(`🕐 Hora local: ${now.toLocaleString()}`);
  console.log(`🕐 Zona horaria: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);

  return isoString;
}

// Método para descargar archivo (imagen o PDF)
downloadFile(photoId: number, fileName: string = 'file') {
  this.photoEvidenceService.downloadPhotoEvidenceFile(photoId, fileName).subscribe({
    next: (blob) => {
      // Crear URL temporal para descarga
      if (typeof window !== 'undefined') {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }

      console.log('✅ Archivo descargado:', fileName);
    },
    error: (err) => {
      console.error('❌ Error descargando archivo:', err);
    }
  });
}

// Método para determinar si un archivo es PDF basado en su URL
isPdfFile(fileUrl: string): boolean {
  if (!fileUrl) return false;

  // Si es una data URL, verificar el tipo MIME
  if (fileUrl.startsWith('data:')) {
    return fileUrl.includes('application/pdf');
  }

  // Si es una blob URL, no podemos determinar el tipo desde la URL
  if (fileUrl.startsWith('blob:')) {
    return false; // Asumimos que no es PDF si es blob URL
  }

  // Para URLs normales, verificar la extensión
  const extension = fileUrl.split('.').pop()?.toLowerCase();
  return extension === 'pdf';
}

// Método para obtener el nombre del archivo desde la URL
getFileNameFromUrl(fileUrl: string): string {
  if (!fileUrl) return 'archivo';
  const parts = fileUrl.split('/');
  return parts[parts.length - 1] || 'archivo';
}

// Método para mostrar PDF en nueva ventana
openPdfInNewWindow(photoId: number, fileName: string) {
  this.photoEvidenceService.getPhotoEvidenceFile(photoId).subscribe({
    next: (blob) => {
      if (typeof window !== 'undefined') {
        const url = window.URL.createObjectURL(blob);
        const newWindow = window.open(url, '_blank');
        if (newWindow) {
          newWindow.document.title = fileName;
        }
        // Limpiar URL después de un tiempo
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
        }, 60000); // 1 minuto
      }
    },
    error: (err) => {
      console.error('❌ Error abriendo PDF:', err);
    }
  });
}

// Método para manejar errores de carga de imágenes
onImageError(event: Event, img: any) {
  console.error(`❌ Error cargando imagen: ${img.name}`, event);

  // Marcar la imagen como con error
  img.error = true;
  img.loaded = false;

  // Reemplazar con una imagen placeholder
  const target = event.target as HTMLImageElement;
  target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjRmNGY0Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlbiBubyBkaXNwb25pYmxlPC90ZXh0Pjwvc3ZnPg==';
  target.alt = 'Error al cargar imagen';
}

// Método para manejar carga exitosa de imágenes
onImageLoad(img: any) {
  console.log(`✅ Imagen cargada exitosamente: ${img.name}`);
  this.loadedImageIds.add(img.photoId || img.photoid);
}

// Método para reintentar la carga de una imagen
retryImageLoad(img: any) {
  console.log(`🔄 Reintentando carga de imagen: ${img.name}`);

  // Resetear estados
  img.loaded = false;
  img.error = false;

  // Si la imagen tiene un photoId, intentar descargarla nuevamente
  if (img.photoId) {
    this.photoEvidenceService.getPhotoEvidenceFile(img.photoId).subscribe({
      next: (blob) => {
        console.log(`✅ Imagen descargada exitosamente en reintento: ${img.name}`);
        const url = URL.createObjectURL(blob);
        img.url = url;
        img.loaded = true;
        img.error = false;
      },
      error: (err) => {
        console.error(`❌ Error en reintento de imagen ${img.name}:`, err);
        img.error = true;
        img.loaded = false;
      }
    });
  } else {
    // Si no tiene photoId, simplemente resetear el estado
    img.error = true;
    img.loaded = false;
  }
}

// Método para limpiar filtros de fecha
clearDateFilters() {
  console.log('🧹 Limpiando filtros de fecha');
  this.filterDateFrom = null;
  this.filterDateTo = null;
  this.applyDateFilter();
}

  // 🎯 NUEVO MÉTODO: Actualizar issues después de subir evidencia
  private updateCommentsAfterUpload(): void {
    console.log('🔄 Actualizando issues después de subir evidencia...');

    // Actualizar los comentarios filtrados
    this.filteredComments = this.getCommentsFromImages();

    // Aplicar el filtro de búsqueda si existe
    if (this.commentFilterText.trim()) {
      this.onCommentFilterChange();
    }

    // 🎯 NUEVO: Mostrar mensaje de actualización temporal
    this.commentsUpdatedMessage = 'Issues updated successfully!';
    setTimeout(() => {
      this.commentsUpdatedMessage = '';
    }, 3000);

    console.log(`✅ Issues actualizados: ${this.filteredComments.length} issues encontrados`);
  }

// 🎯 NUEVO MÉTODO: Actualizar galería después de subir evidencia
private updateGalleryAfterUpload(): void {
  console.log('🖼️ Actualizando galería después de subir evidencia...');

  // 🎯 NUEVO: Recargar imágenes para asegurar que se incluyan las nuevas
  this.loadCurrentTicketImages();

  // Mostrar mensaje de actualización temporal
  this.galleryUpdatedMessage = 'Gallery updated successfully!';
  setTimeout(() => {
    this.galleryUpdatedMessage = '';
  }, 3000);

  console.log(`✅ Galería actualizada: ${this.filteredTicketImages.length} imágenes encontradas`);
}

// 🎯 NUEVO: Método para detectar dispositivo móvil y soporte de cámara
private detectMobileDeviceAndCamera(): void {
  // Detectar si es un dispositivo móvil
  this.isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                       (navigator.maxTouchPoints && navigator.maxTouchPoints > 2) ||
                       window.matchMedia('(max-width: 768px)').matches;

  // Detectar soporte de cámara
  this.hasCameraSupport = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

  // 🎯 NUEVO: Detectar nivel de batería y rendimiento
  this.detectPerformanceLevel();

  console.log(`📱 Dispositivo móvil detectado: ${this.isMobileDevice}`);
  console.log(`📷 Soporte de cámara detectado: ${this.hasCameraSupport}`);
  console.log(`🔍 User Agent: ${navigator.userAgent}`);
}

// 🎯 NUEVO: Propiedades para optimización de rendimiento
private isLowBattery: boolean = false;
private isLowPerformance: boolean = false;
private maxImageSize: number = 1024 * 1024; // 1MB por defecto
private maxImageQuality: number = 0.8; // 80% de calidad por defecto

// 🎯 NUEVO: Método para detectar nivel de rendimiento
private detectPerformanceLevel(): void {
  // Detectar nivel de batería
  if ('getBattery' in navigator) {
    (navigator as any).getBattery().then((battery: any) => {
      this.isLowBattery = battery.level < 0.2; // Menos del 20%
      console.log(`🔋 Nivel de batería: ${(battery.level * 100).toFixed(0)}%`);
      console.log(`🔋 Batería baja: ${this.isLowBattery}`);
      
      if (this.isLowBattery) {
        this.maxImageSize = 512 * 1024; // 512KB para batería baja
        this.maxImageQuality = 0.6; // 60% de calidad para batería baja
        console.log(`⚡ Modo de ahorro de batería activado`);
      }
    });
  }

  // Detectar rendimiento del dispositivo
  if ('deviceMemory' in navigator) {
    const memory = (navigator as any).deviceMemory;
    if (memory && memory < 4) { // Menos de 4GB RAM
      this.isLowPerformance = true;
      this.maxImageSize = 512 * 1024; // 512KB para dispositivos con poca RAM
      this.maxImageQuality = 0.6; // 60% de calidad
      console.log(`⚡ Dispositivo con poca RAM detectado: ${memory}GB`);
      console.log(`⚡ Modo de bajo rendimiento activado`);
    }
  }

  // Detectar conexión lenta
  if ('connection' in navigator) {
    const connection = (navigator as any).connection;
    if (connection && (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g')) {
      this.maxImageSize = 256 * 1024; // 256KB para conexiones lentas
      this.maxImageQuality = 0.5; // 50% de calidad
      console.log(`🌐 Conexión lenta detectada: ${connection.effectiveType}`);
      console.log(`⚡ Modo de conexión lenta activado`);
    }
  }
}

// 🎯 NUEVO: Método para mostrar opciones de cámara (móvil y desktop)
private showCameraOptions(activity: any): void {
  // Crear opciones según el dispositivo
  const options = this.isMobileDevice 
    ? [
        { text: '📷 Tomar foto con cámara', action: 'camera' },
        { text: '📁 Seleccionar de galería', action: 'gallery' }
      ]
    : [
        { text: '📷 Tomar foto con cámara web', action: 'camera' },
        { text: '📁 Seleccionar archivos', action: 'gallery' }
      ];

  // 🎯 NUEVO: Mostrar advertencias de rendimiento si es necesario
  if (this.isLowBattery || this.isLowPerformance) {
    this.showPerformanceWarning();
  }

  // Crear elementos del diálogo
  const dialog = document.createElement('div');
  dialog.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
  `;

  const content = document.createElement('div');
  content.style.cssText = `
    background: white;
    border-radius: 8px;
    padding: 20px;
    max-width: 300px;
    width: 90%;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  `;

  const title = document.createElement('h3');
  title.textContent = 'Seleccionar imagen';
  title.style.cssText = 'margin: 0 0 15px 0; text-align: center;';

  content.appendChild(title);

  options.forEach(option => {
    const button = document.createElement('button');
    button.textContent = option.text;
    button.style.cssText = `
      width: 100%;
      padding: 12px;
      margin: 5px 0;
      border: 1px solid #ddd;
      border-radius: 4px;
      background: white;
      cursor: pointer;
      font-size: 16px;
    `;

    button.addEventListener('click', () => {
      document.body.removeChild(dialog);
      if (option.action === 'camera') {
        this.openCamera(activity);
      } else {
        this.openFileSelector(activity);
      }
    });

    content.appendChild(button);
  });

  // Botón cancelar
  const cancelButton = document.createElement('button');
  cancelButton.textContent = 'Cancelar';
  cancelButton.style.cssText = `
    width: 100%;
    padding: 12px;
    margin: 10px 0 0 0;
    border: 1px solid #ccc;
    border-radius: 4px;
    background: #f5f5f5;
    cursor: pointer;
    font-size: 16px;
  `;

  cancelButton.addEventListener('click', () => {
    document.body.removeChild(dialog);
  });

  content.appendChild(cancelButton);
  dialog.appendChild(content);
  document.body.appendChild(dialog);

  // Cerrar al hacer clic fuera del diálogo
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) {
      document.body.removeChild(dialog);
    }
  });
}

// 🎯 NUEVO: Método para mostrar advertencias de rendimiento
private showPerformanceWarning(): void {
  let warningMessage = '';
  
  if (this.isLowBattery) {
    warningMessage += '⚠️ Batería baja detectada. Las fotos se comprimirán para ahorrar energía.\n';
  }
  
  if (this.isLowPerformance) {
    warningMessage += '⚠️ Dispositivo con recursos limitados. Se aplicará compresión automática.\n';
  }
  
  if (warningMessage) {
    warningMessage += '\n💡 Recomendación: Use la galería para mejor rendimiento.';
    
    // Mostrar notificación temporal
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ff9800;
      color: white;
      padding: 15px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10001;
      max-width: 300px;
      font-size: 14px;
      line-height: 1.4;
    `;
    
    notification.textContent = warningMessage;
    document.body.appendChild(notification);
    
    // Remover después de 5 segundos
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 5000);
    
    console.log(`⚠️ Advertencia de rendimiento mostrada: ${warningMessage}`);
  }
}

// 🎯 NUEVO: Método para abrir la cámara directamente
private openCamera(activity: any): void {
  console.log(`📷 Abriendo cámara para actividad: ${activity.name}`);
  console.log(`📱 Es dispositivo móvil: ${this.isMobileDevice}`);
  
  if (this.isMobileDevice) {
    // En móviles: usar input con capture="environment"
    this.requestCameraPermission().then(hasPermission => {
      if (hasPermission) {
        const cameraInput = document.querySelector('input[capture="environment"]') as HTMLInputElement;
        if (cameraInput) {
          cameraInput.click();
        } else {
          console.warn('⚠️ No se encontró el input de cámara móvil');
          this.openFileSelector(activity);
        }
      } else {
        console.warn('⚠️ Permisos de cámara denegados en móvil');
        this.openFileSelector(activity);
      }
    }).catch(error => {
      console.error('❌ Error solicitando permisos de cámara móvil:', error);
      this.openFileSelector(activity);
    });
  } else {
    // En desktop: usar input con capture="user" para cámara web
    console.log(`🖥️ Abriendo cámara web en desktop`);
    console.log(`🔍 Buscando input con capture="user"`);
    
    const webcamInput = document.querySelector('input[capture="user"]') as HTMLInputElement;
    console.log(`🔍 Input encontrado:`, webcamInput);
    
    if (webcamInput) {
      console.log(`✅ Activando cámara web en desktop`);
      webcamInput.click();
    } else {
      console.warn('⚠️ No se encontró el input de cámara web, usando selector de archivos');
      this.openFileSelector(activity);
    }
  }
}

// 🎯 NUEVO: Método para abrir selector de archivos
private openFileSelector(activity: any): void {
  console.log(`📁 Abriendo selector de archivos para actividad: ${activity.name}`);
  
  const fileInput = document.querySelector('input[type="file"]:not([capture])') as HTMLInputElement;
  if (fileInput) {
    fileInput.click();
  } else {
    console.error('❌ No se encontró el input de archivos');
  }
}

// 🎯 NUEVO: Método para solicitar permisos de cámara
private async requestCameraPermission(): Promise<boolean> {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.warn('⚠️ API de medios no soportada');
      return false;
    }

    console.log('🔐 Solicitando permisos de cámara...');
    
    // Solicitar acceso a la cámara
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: 'environment' }, // Cámara trasera
      audio: false 
    });
    
    // Detener el stream inmediatamente ya que solo queríamos verificar permisos
    stream.getTracks().forEach(track => track.stop());
    
    console.log('✅ Permisos de cámara concedidos');
    return true;
    
  } catch (error: any) {
    console.error('❌ Error solicitando permisos de cámara:', error);
    
    if (error.name === 'NotAllowedError') {
      console.warn('⚠️ Usuario denegó permisos de cámara');
    } else if (error.name === 'NotFoundError') {
      console.warn('⚠️ No se encontró cámara');
    } else if (error.name === 'NotSupportedError') {
      console.warn('⚠️ Cámara no soportada');
    }
    
    return false;
  }
}

}
