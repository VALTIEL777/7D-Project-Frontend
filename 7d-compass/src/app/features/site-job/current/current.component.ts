import { Component, ViewChild } from '@angular/core';
import { SitejobLayoutComponent } from '../../../shared/sitejob-layout/sitejob-layout.component';
import { MatTableModule } from '@angular/material/table';
import { MatDividerModule } from '@angular/material/divider';
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
import { forkJoin } from 'rxjs';
import { ContractUnitsPhasesService } from '../../../core/services/ticket-logic/contractunitphases.service';
import { NecessaryPhasesService } from '../../../core/services/ticket-logic/necessaryphases.service';
import { TicketStatusService } from '../../../core/services/route/ticketstatus.service';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmPhaseDialogComponent } from '../../../shared/confirm-phase-dialog/confirm-phase-dialog.component';
import { TaskstatusService } from '../../../core/services/route/taskstatus.service';
import { RouteStateService } from '../../../core/services/shared/route-state.service';
import { TicketService } from '../../../core/services/ticket.service';
import { QuadrantsService } from '../../../core/services/location/quadrants.service';
import { RouteData, MapConfig, LeafletMapComponent } from '../../../shared/leaflet-map/leaflet-map.component';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-current',
  imports: [SitejobLayoutComponent,
    SitejobTabsComponent,
    MatTableModule,
    MatDividerModule,
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
  private readonly GOOGLE_MAPS_API_KEY = 'AIzaSyDwEG-Tyq2kpHc4wznqVvSU0Dj2B_idzlY';
  staticMapUrl: string = '';
  staticMapWidth: number = 600;
  staticMapHeight: number = 400;
  currentZoomLevel: number = 15; // Zoom inicial
  availableZoomLevels: number[] = [10, 12, 15, 17, 19]; // Diferentes niveles de zoom

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
userId: number = 0;
selectedFiles: File[] = [];
imagePreviews: (string | ArrayBuffer | null)[] = [];
ticketId: number = 0; // Lo debes asignar al cargar detalles
ticketCode: string = '';
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

activityFilterText: string = '';
filteredActivities: any[] = [];

filterDateFrom: Date | null = null;
filterDateTo: Date | null = null;
filteredTicketImages: any[] = [];

  leafletRoutes: RouteData[] = [];
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
  // 👇 Recuperar userId desde localStorage
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

    // RECONSTRUIR streetFrom y streetTo
    this.location.streetFrom = `${parsedLocation.fromaddressnumber || ''} ${parsedLocation.fromaddressstreet || ''} ${parsedLocation.fromaddresscardinal || ''}`.trim();
    this.location.streetTo = `${parsedLocation.toaddressnumber || ''} ${parsedLocation.toaddressstreet || ''} ${parsedLocation.toaddresscardinal || ''}`.trim();
    if (!this.location.streetFrom) this.location.streetFrom = 'Not available';
    if (!this.location.streetTo) this.location.streetTo = 'Not available';

    // 🗺️ Cargar ruta completa como en upcoming
    setTimeout(() => {
      this.loadFullRoute();
    }, 100);
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

  this.loadEmployees();
  this.loadAllPhases();

  if (this.ticketId) {
    this.loadSupervisor();
    this.loadTicketCode(); //

  }

  const today = new Date();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(today.getMonth() - 6);
  this.filterDateFrom = sixMonthsAgo;
  this.filterDateTo = today;

  // Cargar archivos asociados al ticket para la galería de permits
  if (this.ticketId) {
    this.loadPermitFilesByTicket();
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
          console.warn('⚠️ Usuario logueado no encontrado entre empleados.');
          return;
        }

        const currentCrewId = person.crewid;
        this.currentCrewIdFromLoadEmployees = currentCrewId; // currentCrewId es el que ya tienes en loadEmployees()
        if (!currentCrewId) {
          console.warn('⚠️ El usuario no tiene crew asignado.');
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

        console.log('✅ Team Leader:', this.teamLeader);
        console.log('👥 Team Members:', this.teamMembers);
      },
      error: (err) => console.error('❌ Error loading employee data:', err)
    });
  });
}
loadAllPhases() {
  this.taskstatusService.getAllTaskStatuses().subscribe({
    next: (statuses) => {
      console.log('📦 Statuses recibidos:', statuses);

      let orderedPhaseNames: string[] = [];

      if (this.routeCode.includes('SPOTTER')) {
        orderedPhaseNames = ['Spotting', 'Install Signs'];
      } else if (this.routeCode.includes('ASPHALT')) {
        orderedPhaseNames = ['Spotting', 'Grind', 'Asphalt', 'Crack Seal', 'Stripping'];
      } else if (this.routeCode.includes('CONCRETE')) {
        orderedPhaseNames = [ 'Spotting','Sawcut', 'Removal', 'Framing', 'Concrete', 'Pour', 'Clean'];
      }

      // 🧹 Filtrar y ordenar según orderedPhaseNames
      const filteredStatuses = orderedPhaseNames
        .map(name => statuses.find(s => s.name === name))
        .filter(Boolean); // Elimina los undefined

      // 🔄 Convertir a actividades
      this.activities = filteredStatuses.map((s: any) => ({
        id: s.taskstatusid,
        name: s.name, // Solo una vez
        description: s.description,
        checked: false,
        locked: false,
        optional: this.isPhaseOptional(s.name, this.routeCode),
        selectedFiles: [],
        imagePreviews: [],
        comment: ''
      }));

      // 🔍 Buscar Crack Seal (si está disponible en general)
      const crackSeal = statuses.find((s: any) => s.name?.toLowerCase() === 'crack seal');
      this.ticketStatusId = crackSeal?.taskstatusid || 0;

      this.filteredActivities = this.activities;
      this.loadLinkedPhases();
    },
    error: (err) => {
      console.error('❌ Error loading task statuses', err);
    }
  });
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
    return ['steel plate pickup', 'install signs'].includes(phaseNameLower);
  }

  // Fases opcionales para rutas SPOTTER
  if (routeCode.includes('SPOTTER')) {
    return ['install signs'].includes(phaseNameLower);
  }

  // Por defecto, todas las fases son obligatorias
  return false;
}

loadTicketCode() {
  this.ticketService.getTicketById(this.ticketId).subscribe({
    next: (ticket) => {
      this.ticketCode = ticket.ticketCode || ticket.ticketcode || '';
    },
    error: (err) => {
      console.error('❌ Error cargando ticket code:', err);
      this.ticketCode = 'N/A';
    }
  });
}

loadSupervisor() {
  this.ticketService.getTicketById(this.ticketId).subscribe(ticket => {
   const quadrantId = ticket.quadrantId;
 
   if (!quadrantId) {
     console.warn('⚠️ No se encontró quadrantId en el ticket');
     return;
   }
 
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


      // 🗺️ Solo cargar ubicación por defecto si no viene del localStorage
      if (details.length > 0 && !this.isLocationFromStorage) {
        const data = details[0];

        // Concatenar dirección completa y partes
       this.location.streetFrom = `${data.fromaddressnumber} ${data.fromaddressstreet} ${data.fromaddresscardinal}`.trim();
       this.location.streetTo = `${data.toaddressnumber} ${data.toaddressstreet} ${data.toaddresscardinal}`.trim();
       this.location.fullAddress = `${this.location.streetFrom} → ${this.location.streetTo}`;

       // Agrega este log para verificar
        console.log('streetFrom:', this.location.streetFrom);
        console.log('streetTo:', this.location.streetTo);

        this.location.address = `${data.fromaddressstreet} ${data.toaddressstreet} ${data.fromaddresscardinal}`;  // ${data.fromaddresssuffix}
        this.location.job = data.contractunit_name;
        this.location.surface = data.surfacetotal;
        this.location.description = data.contractunit_description;
        this.location.width = data.width;
        this.location.length = data.length;

        console.log('📍 Dirección por defecto del backend:', this.location.address);
        console.log('📝 Descripción asignada:', this.location.description);
        console.log('📍 Dirección completa:', this.location.fullAddress);

        // 🗺️ Cargar la ruta completa como en upcoming
        this.loadFullRoute();
      } else if (this.isLocationFromStorage) {
        console.log('📍 Dirección seleccionada manualmente:', this.location);
        console.log('📝 Descripción desde localStorage:', this.location.description);

        // 🗺️ Cargar la ruta completa como en upcoming
        this.loadFullRoute();
      }

              // 🗺️ Cargar ruta completa después de cargar la ubicación
        setTimeout(() => {
          this.loadFullRoute();
        }, 500);
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
          console.log(`📋 Fase ${activity.name} asignada pero no iniciada`);
        }
        // ✅ Si tiene startingDate pero no endingDate, está iniciada
        else if (existingStatus.startingdate && !existingStatus.endingdate) {
          activity.checked = true;
          activity.locked = false; // Permitir completar
          activity.assigned = true;
          activity.started = true; // Nueva propiedad
          activity.startDate = existingStatus.startingdate;
          activity.endDate = null;
          console.log(`🔄 Fase ${activity.name} iniciada pero no completada`);
          console.log(`🕐 startingdate del backend: ${existingStatus.startingdate}`);
          console.log(`🕐 startDate asignado: ${activity.startDate}`);
          console.log(`🕐 Tipo de dato: ${typeof existingStatus.startingdate}`);

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
          console.log(`✅ Fase ${activity.name} completada`);
          console.log(`🕐 startingdate del backend: ${existingStatus.startingdate}`);
          console.log(`🕐 endingdate del backend: ${existingStatus.endingdate}`);
          console.log(`🕐 startDate asignado: ${activity.startDate}`);
          console.log(`🕐 endDate asignado: ${activity.endDate}`);

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
      console.log(`📋 ${activity.name}: startDate=${activity.startDate}, endDate=${activity.endDate}`);
    });
    console.log('🔍 === FIN DEBUGGING FECHAS ===');

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
              this.updateTicketComment7d('TK - ON HOLD OFF');
            } else {
              // 🎯 ACTUALIZAR COMMENT7D DEL TICKET A "TK - ON PROGRESS"
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
              this.updateTicketComment7d('TK - ON HOLD OFF');
            } else {
              // 🎯 ACTUALIZAR COMMENT7D DEL TICKET A "TK - ON PROGRESS"
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

            // 🎯 VERIFICAR SI SE COMPLETÓ LA ÚLTIMA FASE OBLIGATORIA
            if (this.isLastRequiredPhaseCompleted()) {
              console.log(`🎉 ¡Última fase obligatoria completada! Actualizando comment7d a TK - COMPLETED`);
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
    if (activity.selectedFiles.length >= 5) {
      return;
    }
    const file = input.files[0];
    if (validImageTypes.includes(file.type)) {
      if (activity.selectedFiles.length < 5) {
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
    }
    input.value = '';
  }
}

// Modificar removeImage para trabajar por activity
removeImage(index: number, activity: any): void {
  activity.selectedFiles.splice(index, 1);
  activity.imagePreviews.splice(index, 1);
}

// Modificar uploadPhotoEvidence para trabajar por activity
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
  
  const formData = new FormData();
  activity.selectedFiles.forEach((file: File, index: number) => {
    formData.append('file', file);
  });
  // Enviar todos los posibles nombres, pero el importante es ticketStatusId
  formData.append('ticketStatusId', taskStatusId.toString()); // <--- El que espera el backend
  formData.append('ticketstatusid', taskStatusId.toString()); // Compatibilidad
  formData.append('taskStatusId', taskStatusId.toString());   // Compatibilidad
  formData.append('taskstatusid', taskStatusId.toString());   // Compatibilidad
  formData.append('ticketId', this.ticketId.toString());
  formData.append('name', activity.name || 'Photo Evidence');
  formData.append('latitude', (this.latitude || 0).toString());
  formData.append('longitude', (this.longitude || 0).toString());
  const now = new Date();
  formData.append('date', now.toISOString());
  console.log(`🕐 Subiendo evidencia - fecha: ${now.toISOString()}`);
  formData.append('comment', activity.comment || '');
  formData.append('createdBy', this.userId.toString());
  formData.append('updatedBy', this.userId.toString());
  this.photoEvidenceService.uploadPhotoEvidence(formData).subscribe({
    next: (res) => {
      // ✅ Remover actividad del set de carga
      this.uploadingActivities.delete(activity.id);
      
      this.clearPhotoInputsActivity(activity);
      this.loadCurrentTicketImages();

      // 🎯 VERIFICAR SI HAY ISSUE REPORTADO
      const hasIssue = activity.comment && activity.comment.trim().length > 0;
      if (hasIssue) {
        console.log(`⚠️ Issue detectado en fase ${activity.name}: ${activity.comment}`);
        this.updateTicketComment7d('TK - ON HOLD OFF');
      }

      this.completePhase(activity);
    },
    error: (err) => {
      // ✅ Remover actividad del set de carga en caso de error
      this.uploadingActivities.delete(activity.id);
      console.error('❌ Error subiendo evidencia:', err);
    }
  });
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
                  comment: 'Error al cargar la imagen',
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
          queue: 0 // Siempre será 0 ya que es la única ubicación
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

// Zoom control methods
changeZoomLevel(zoomLevel: number): void {
  if (this.availableZoomLevels.includes(zoomLevel)) {
    this.currentZoomLevel = zoomLevel;
    console.log(`🔍 Changing zoom level to: ${zoomLevel}`);
    // No hay lógica de Leaflet para cambiar el zoom aquí, ya que Leaflet maneja el zoom internamente
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
  console.log('🔍 === CURRENT MAP DEBUG INFO ===');
  console.log('📍 Location object:', this.location);
  console.log('📍 Location address:', this.location.address);
  console.log('📍 Location lat/lng:', `${this.location.lat}, ${this.location.lng}`);
  console.log('📍 TicketId:', this.ticketId);
  console.log('📍 LeafletRoutes:', this.leafletRoutes);
  console.log('📍 LeafletMap available:', !!this.leafletMap);
  console.log('📍 Static map URL:', this.staticMapUrl);
  console.log('📍 Current zoom level:', this.currentZoomLevel);
  console.log('📍 Available zoom levels:', this.availableZoomLevels);
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
  this.photoEvidenceService.getPhotoEvidenceByTicketId(this.ticketId).subscribe({
    next: (files) => {
      this.permitFilesByTicket = files;
    },
    error: (err) => {
      console.error('❌ Error cargando archivos del ticket:', err);
    }
  });
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
      const updatedTicket = {
        ...currentTicket,
        comment7d: comment,
        updatedBy: this.userId
      };

      this.ticketService.updateTicket(this.ticketId, updatedTicket).subscribe({
        next: (updatedTicketResponse) => {
          console.log(`✅ Comment7d actualizado exitosamente a: ${comment}`);
        },
        error: (err) => {
          console.error('❌ Error actualizando comment7d del ticket:', err);
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

// 🎯 MÉTODO PARA VERIFICAR SI SE COMPLETÓ LA ÚLTIMA FASE OBLIGATORIA
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

// Método para hacer zoom suave a la ubicación actual
zoomToCurrentLocation(): void {
  if (this.location && this.location.lat && this.location.lng && this.leafletMap) {
    console.log(`🎯 Haciendo zoom suave a ubicación actual: ${this.location.address}`);
    console.log(`🎯 Coordenadas: [${this.location.lat}, ${this.location.lng}]`);

    // Forzar actualización del mapa
    this.updateLeafletRoutes();

    // Centrar el mapa
    this.leafletMap.setCenter(this.location.lat, this.location.lng);

    // Hacer zoom suave después de un pequeño delay
    setTimeout(() => {
      this.leafletMap.setZoom(17);
      console.log(`✅ Zoom suave aplicado a ubicación actual`);

      // Forzar refresh del mapa después del zoom
      setTimeout(() => {
        this.leafletMap.refreshMap();
        console.log(`🔄 Mapa refrescado después del zoom`);
      }, 500);
    }, 200);
  } else {
    console.warn(`⚠️ No se pudo hacer zoom a la ubicación actual: coordenadas no disponibles`);
  }
}

  // Método para cargar la ruta completa como en upcoming
  async loadFullRoute(): Promise<void> {
    try {
      console.log('🗺️ Cargando ruta completa para el ticket:', this.ticketId);

      // Obtener todas las rutas disponibles
      const spottingRoutesResponse = await firstValueFrom(this.http.get<any>(`${environment.apiUrl}/routes/spotting`));
      const concreteRoutesResponse = await firstValueFrom(this.http.get<any>(`${environment.apiUrl}/routes/concrete`));
      const asphaltRoutesResponse = await firstValueFrom(this.http.get<any>(`${environment.apiUrl}/routes/asphalt`));

      // Combinar todas las rutas
      const allRoutes = [
        ...(spottingRoutesResponse?.routes || []),
        ...(concreteRoutesResponse?.routes || []),
        ...(asphaltRoutesResponse?.routes || [])
      ];

      // Buscar la ruta que contiene el ticket actual
      let assignedRoute = null;
      for (const route of allRoutes) {
        if (route.tickets && Array.isArray(route.tickets)) {
          const routeTicketIds = route.tickets.map((ticket: any) => ticket.ticketId || ticket.ticketid).filter((id: any) => id);
          if (routeTicketIds.includes(this.ticketId)) {
            assignedRoute = route;
            break;
          }
        }
      }

      if (assignedRoute) {
        console.log('✅ Ruta encontrada:', assignedRoute.routeid || assignedRoute.routeId);
        console.log('🔍 Detalles de la ruta:', {
          routeId: assignedRoute.routeid || assignedRoute.routeId,
          routeCode: assignedRoute.routecode || assignedRoute.routeCode,
          type: assignedRoute.type,
          hasPolyline: !!(assignedRoute.encodedpolyline || assignedRoute.encodedPolyline),
          ticketsCount: assignedRoute.tickets?.length || 0
        });
        
        // ✅ Determinar el tipo correcto basado en routeCode
        let routeType = 'SPOTTER'; // fallback
        if (assignedRoute.routecode || assignedRoute.routeCode) {
          const routeCode = (assignedRoute.routecode || assignedRoute.routeCode).toUpperCase();
          if (routeCode.includes('ASPHALT')) {
            routeType = 'ASPHALT';
          } else if (routeCode.includes('CONCRETE')) {
            routeType = 'CONCRETE';
          } else if (routeCode.includes('SPOTTER')) {
            routeType = 'SPOTTER';
          }
        }
        
        console.log('🎯 Tipo de ruta determinado:', routeType);
        
        // Crear la ruta para Leaflet como en upcoming
        const routeId = assignedRoute.routeid || assignedRoute.routeId;
        this.leafletRoutes = [{
          routeId: routeId,
          routeCode: assignedRoute.routecode || assignedRoute.routeCode || 'CURRENT',
          type: routeType,
          encodedPolyline: assignedRoute.encodedpolyline || assignedRoute.encodedPolyline || '',
          tickets: assignedRoute.tickets || []
        }];

        // ✅ Agregar la ruta al visibleRoutes para que se muestre
        this.visibleRoutes = new Set([routeId]);
        
        console.log('🗺️ Ruta completa cargada:', this.leafletRoutes);
        console.log('✅ VisibleRoutes actualizado:', this.visibleRoutes);
        
        // Actualizar el mapa sin hacer zoom automático
        setTimeout(() => {
          if (this.leafletMap) {
            console.log('🗺️ Antes de refreshMap - leafletRoutes:', this.leafletRoutes);
            this.leafletMap.refreshMap();
            console.log('✅ Mapa actualizado con ruta completa');
            
            // Verificar que la ruta se pintó correctamente
            setTimeout(() => {
              console.log('🔍 Verificando estado del mapa después de 500ms...');
              if (this.leafletMap) {
                this.leafletMap.debugMapState();
              }
            }, 500);
          } else {
            console.warn('⚠️ LeafletMap no disponible');
          }
        }, 100);
      } else {
        console.warn('⚠️ No se encontró ruta para el ticket:', this.ticketId);
        console.log('🔍 Buscando en todas las rutas disponibles...');
        allRoutes.forEach((route, index) => {
          console.log(`  ${index + 1}. Route ${route.routeid || route.routeId}: ${route.tickets?.length || 0} tickets`);
        });
        // Fallback: mostrar solo la ubicación actual
        this.updateLeafletRoutes();
      }
    } catch (error) {
      console.error('❌ Error cargando ruta completa:', error);
      // Fallback: mostrar solo la ubicación actual
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

}
