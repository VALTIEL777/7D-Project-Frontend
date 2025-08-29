import { Component, OnInit } from '@angular/core';
import { SitejobLayoutComponent } from '../../../shared/sitejob-layout/sitejob-layout.component';
import { MatTableModule } from '@angular/material/table';
import { MatDividerModule } from '@angular/material/divider';
import { CommonModule } from '@angular/common';
import { MATERIAL_MODULES } from '../../../material';
import { SitejobSidenavbarComponent } from '../../../shared/sitejob-sidenavbar/sitejob-sidenavbar.component';
import { SitejobTabsComponent } from '../../../shared/sitejob-tabs/sitejob-tabs.component';
import { TicketStatusService } from '../../../core/services/route/ticketstatus.service';
import { PeopleService } from '../../../core/services/human-resources/users.service';
import { CrewsService } from '../../../core/services/human-resources/crew.service';
import { CrewEmployeesService } from '../../../core/services/human-resources/crewemployees.service';
import { SkillsService } from '../../../core/services/human-resources/skills.service';
import { PhotoEvidenceService } from '../../../core/services/route/photoevidence.service';
import { TaskstatusService } from '../../../core/services/route/taskstatus.service';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-completed',
  imports: [SitejobLayoutComponent,
    SitejobSidenavbarComponent,
    SitejobTabsComponent,
    MatTableModule,
    MatDividerModule,
    CommonModule,
    FormsModule,
    MATERIAL_MODULES],
  templateUrl: './completed.component.html',
  styleUrl: './completed.component.scss'
})
export class CompletedComponent implements OnInit {
  previousLocations: any[] = [];
  uniqueTickets: any[] = []; // <-- Nuevo array para tickets únicos
  employeeList: any[] = [];
  teamLeader: string = '';
  teamMembers: string[] = [];
  crewId: number = 0;
  crewType: string = '';
  userId: number = 0;
  openedGroups: { [key: string]: boolean } = {};

  // ✅ NUEVAS PROPIEDADES PARA MANEJAR FASES
  allTaskStatuses: any[] = [];
  routeCode: string = '';

  completedFilterText: string = '';
  filteredTickets: any[] = [];
  isLoading: boolean = false;

  constructor(
    private ticketStatusService: TicketStatusService,
    private usersService: PeopleService,
    private crewEmployeesService: CrewEmployeesService,
    private crewsService: CrewsService,
    private skillsService: SkillsService,
    private photoEvidenceService: PhotoEvidenceService,
    private taskstatusService: TaskstatusService
  ) {}

  ngOnInit(): void {
    console.log('🚀 Iniciando carga optimizada del componente completed...');
    
    // 🎯 NUEVO: Verificar si estamos en el navegador antes de hacer cualquier cosa
    if (typeof window === 'undefined' || !window.localStorage) {
      console.warn('⚠️ Ejecutándose en SSR, estableciendo isLoading = false');
      this.isLoading = false;
      return;
    }
    
    // 🎯 NUEVO: Cargar datos críticos en paralelo
    this.loadCriticalDataInParallel();
    
    // 🎯 NUEVO: Cargar datos secundarios después
    setTimeout(() => {
      this.loadSecondaryData();
    }, 50);

    // 🎯 NUEVO: Timeout de seguridad para evitar spinner infinito
    setTimeout(() => {
      if (this.isLoading) {
        console.warn('⚠️ Timeout de seguridad: Forzando fin de carga');
        this.isLoading = false;
      }
    }, 30000); // 30 segundos de timeout
  }

  // 🎯 NUEVO: Método para cargar datos críticos en paralelo
  private loadCriticalDataInParallel(): void {
    console.log('⚡ Cargando datos críticos en paralelo...');
    this.isLoading = true;
    
    // Cargar empleados y fases en paralelo
    forkJoin({
      employees: this.loadEmployeesAsync(),
      taskStatuses: this.loadTaskStatusesAsync()
    }).subscribe({
      next: (results) => {
        console.log('✅ Datos críticos cargados exitosamente');
        
        // 🎯 NUEVO: Cargar tickets completados después de tener los datos críticos
        if (this.crewId) {
          console.log('🎯 CrewId encontrado, cargando tickets completados...');
          this.loadCompletedTicketsOptimized(this.crewId).subscribe({
            next: (result) => {
              console.log('✅ Tickets completados cargados exitosamente');
              this.isLoading = false;
            },
            error: (err) => {
              console.error('❌ Error loading completed tickets:', err);
              console.log('🔄 Intentando método de fallback...');
              this.loadCompletedTicketsFallback(this.crewId);
            }
          });
        } else {
          console.log('⚠️ No se encontró crewId, finalizando carga');
          this.isLoading = false;
        }
      },
      error: (error) => {
        console.error('❌ Error cargando datos críticos:', error);
        console.log('🔄 Intentando método de fallback...');
        this.loadCriticalDataFallback();
      }
    });
  }

  // 🎯 NUEVO: Método de fallback para datos críticos
  private loadCriticalDataFallback(): void {
    console.log('🔄 Usando método de fallback para datos críticos...');
    this.loadEmployees();
  }

  // 🎯 NUEVO: Método de fallback para tickets completados
  private loadCompletedTicketsFallback(crewId: number): void {
    console.log('🔄 Usando método de fallback para tickets completados...');
    this.loadCompletedTickets(crewId);
    this.isLoading = false;
  }

  // 🎯 NUEVO: Método para cargar datos secundarios
  private loadSecondaryData(): void {
    console.log('📦 Cargando datos secundarios...');
    
    // Aquí puedes agregar carga de datos secundarios si es necesario
    console.log('✅ Datos secundarios cargados exitosamente');
  }

 loadEmployees() {
  console.log('🔄 Usando método original de carga de empleados...');
  
  this.loadEmployeesAsync().subscribe({
    next: (result) => {
      console.log('✅ Empleados cargados exitosamente');
      if (this.crewId) {
        this.loadCompletedTickets(this.crewId);
      } else {
        this.isLoading = false;
      }
    },
    error: (err) => {
      console.error('❌ Error loading employee data:', err);
      this.isLoading = false;
    }
  });
}

// 🎯 NUEVO: Método async para cargar empleados
private loadEmployeesAsync() {
  console.log('🔄 Iniciando carga de empleados...');
  
  return forkJoin({
      people: this.usersService.getAllPeople(),
      crewEmployees: this.crewEmployeesService.getAllCrewEmployees(),
      crews: this.crewsService.getAllCrews(),
      skills: this.skillsService.getAllSkills()
  }).pipe(
    map(({ people, crewEmployees, crews, skills }) => {
      console.log('📦 Datos de empleados recibidos:', {
        people: people.length,
        crewEmployees: crewEmployees.length,
        crews: crews.length,
        skills: skills.length
      });

        // 🔁 Mapeo de todos los empleados
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

      console.log('✅ Empleados mapeados:', this.employeeList.length);

        // 🔍 Buscar usuario logueado
      let storedUserId = 0;
      
      // 🎯 NUEVO: Verificar si estamos en el navegador antes de usar localStorage
      if (typeof window !== 'undefined' && window.localStorage) {
        storedUserId = Number(localStorage.getItem('userId'));
        console.log('🔍 Buscando usuario con ID:', storedUserId);
      } else {
        console.warn('⚠️ localStorage no disponible (probablemente SSR)');
        return { success: false };
      }
      
        const person = this.employeeList.find(p => p.userid === storedUserId);

        if (!person) {
          console.warn('⚠️ Usuario logueado no encontrado entre empleados.');
        return { success: false };
        }

      console.log('✅ Usuario encontrado:', person.name);

        this.userId = person.userid;

        const currentCrewId = person.crewid;
        if (!currentCrewId) {
          console.warn('⚠️ El usuario no tiene crew asignado.');
        return { success: false };
        }

        // ✅ Establecer crewId y tipo
        this.crewId = currentCrewId;

        const assignedCrew = crews.find((c: any) => c.crewid === currentCrewId);
        this.crewType = assignedCrew?.type || 'N/A';

        // 👥 Obtener miembros del equipo
        const teamMembers = this.employeeList.filter(e => e.crewid === currentCrewId);
        const leader = teamMembers.find(e => e.crewLeader);
        const members = teamMembers.filter(e => !e.crewLeader).map(e => e.name);

        this.teamLeader = leader?.name || 'N/A';
        this.teamMembers = members;

        console.log('✅ Team Leader:', this.teamLeader);
        console.log('👥 Team Members:', this.teamMembers);
        console.log('👷 crewId detectado:', this.crewId);

      return { success: true };
    })
  );
}

// ✅ NUEVO MÉTODO: Cargar todas las fases disponibles
loadAllTaskStatuses(): void {
  this.loadTaskStatusesAsync().subscribe({
    next: (result) => {
      console.log('✅ Task statuses cargados exitosamente');
    },
    error: (err) => {
      console.error('❌ Error loading task statuses:', err);
    }
  });
}

// 🎯 NUEVO: Método async para cargar task statuses
private loadTaskStatusesAsync() {
  console.log('🔄 Iniciando carga de task statuses...');
  
  return this.taskstatusService.getAllTaskStatuses().pipe(
    map((statuses) => {
      this.allTaskStatuses = statuses;
      console.log('📦 Task statuses cargados:', this.allTaskStatuses.length);
      return { success: true };
    })
  );
}

loadCompletedTickets(crewId: number): void {
  console.log('🔄 Usando método original de carga de tickets completados...');

  this.ticketStatusService.getCompletedTickets().subscribe({
    next: (tickets) => {
      console.log('📋 Tickets recibidos del backend:', tickets.length);

      // ✅ FILTRAR POR CREW ID
      const crewTickets = tickets.filter(ticket => ticket.crewid === crewId);
      console.log('👷 Tickets del crew actual:', crewTickets.length);

      if (crewTickets.length === 0) {
        console.log('⚠️ No hay tickets completados para este crew');
        this.previousLocations = [];
        this.uniqueTickets = [];
        this.filteredTickets = [];
        this.isLoading = false;
        return;
      }

      this.photoEvidenceService.getAllPhotoEvidence().subscribe({
        next: async (photos) => {
          console.log('📸 Fotos recibidas:', photos.length);

          // Procesar imágenes como blobs usando Promise.all
          const locations = await Promise.all(
            crewTickets.map(async ticket => {
              const evidences = photos.filter(p => p.ticketid === ticket.ticketid);
              const images = await Promise.all(
                evidences.map(async (e) => {
                  try {
                    const blob = await this.photoEvidenceService.getPhotoEvidenceFile(e.photoid || e.photoId).toPromise();
                    if (!blob) throw new Error('No blob');
                    const url = URL.createObjectURL(blob);
                    return {
                      url,
                      name: e.name,
                      comment: e.comment
                    };
                  } catch {
                    return {
                      url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjRmNGY0Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlbiBubyBkaXNwb25pYmxlPC90ZXh0Pjwvc3ZnPg==',
                      name: e.name,
                      comment: 'Error loading image'
                    };
                  }
                })
              );

              return {
                ticketId: ticket.ticketid,
                address: this.formatAddress(ticket),
                actions: ['Completed work'],
                images: images,
                startingDate: ticket.startingdate,
                endingDate: ticket.endingdate,
                routeCode: ticket.routecode || 'UNKNOWN',
                completedPhases: this.getCompletedPhasesFromPhotos(evidences)
              };
            })
          );

          this.previousLocations = locations;

          // Agrupar por ticketId y acumular fases completadas
          const ticketMap: { [ticketId: number]: any } = {};
          this.previousLocations.forEach(loc => {
            if (!ticketMap[loc.ticketId]) {
              ticketMap[loc.ticketId] = { ...loc, completedPhases: [...(loc.completedPhases || [])] };
            } else {
              // Acumula fases si no están repetidas
              const existingPhases = ticketMap[loc.ticketId].completedPhases.map((p: any) => p.name);
              (loc.completedPhases || []).forEach((phase: any) => {
                if (!existingPhases.includes(phase.name)) {
                  ticketMap[loc.ticketId].completedPhases.push(phase);
                }
              });
            }
          });
          this.uniqueTickets = Object.values(ticketMap);

          this.filteredTickets = this.uniqueTickets;

          console.log('✅ Ubicaciones completadas procesadas:', this.previousLocations.length);
          this.isLoading = false;
        },
        error: (err) => {
          console.error('❌ Error loading photo evidence:', err);
          this.isLoading = false;
        }
      });
    },
    error: (err) => {
      console.error('❌ Error loading completed tickets:', err);
      this.isLoading = false;
    }
  });
}

// 🎯 NUEVO: Método optimizado para cargar tickets completados
private loadCompletedTicketsOptimized(crewId: number) {
  console.log('🚀 Iniciando carga optimizada de tickets completados para crewId:', crewId);

  return forkJoin({
    tickets: this.ticketStatusService.getCompletedTickets(),
    photos: this.photoEvidenceService.getAllPhotoEvidence()
  }).pipe(
    map(async ({ tickets, photos }) => {
      console.log('📋 Tickets recibidos del backend:', tickets.length);
      console.log('📸 Fotos recibidas:', photos.length);

      // ✅ FILTRAR POR CREW ID
      const crewTickets = tickets.filter(ticket => ticket.crewid === crewId);
      console.log('👷 Tickets del crew actual:', crewTickets.length);

      if (crewTickets.length === 0) {
        console.log('⚠️ No hay tickets completados para este crew');
        this.previousLocations = [];
        this.uniqueTickets = [];
        this.filteredTickets = [];
        return { success: true };
      }

      // 🎯 NUEVO: Procesar tickets en lotes para mejor rendimiento
      const locations = await this.processTicketsInBatches(crewTickets, photos);

      this.previousLocations = locations;

      // 🎯 NUEVO: Procesar agrupación de manera optimizada
      this.processTicketGrouping();

      console.log('✅ Ubicaciones completadas procesadas:', this.previousLocations.length);
      return { success: true };
    })
  );
}

// 🎯 NUEVO: Método para procesar tickets en lotes
private async processTicketsInBatches(crewTickets: any[], photos: any[]): Promise<any[]> {
  console.log('🔄 Procesando tickets en lotes...');
  
  const batchSize = 3; // Procesar 3 tickets a la vez
  const batches = [];
  
  for (let i = 0; i < crewTickets.length; i += batchSize) {
    batches.push(crewTickets.slice(i, i + batchSize));
  }

  let processedCount = 0;
  const allLocations = [];

  for (const batch of batches) {
    const batchPromises = batch.map(async ticket => {
      const evidences = photos.filter(p => p.ticketid === ticket.ticketid);
      const images = await this.processImagesOptimized(evidences);
      
      const location = {
        ticketId: ticket.ticketid,
        address: this.formatAddress(ticket),
        actions: ['Completed work'],
        images: images,
        startingDate: ticket.startingdate,
        endingDate: ticket.endingdate,
        routeCode: ticket.routecode || 'UNKNOWN',
        completedPhases: this.getCompletedPhasesFromPhotos(evidences)
      };

      processedCount++;
      return location;
    });

    const batchResults = await Promise.all(batchPromises);
    allLocations.push(...batchResults);
    
    // 🎯 NUEVO: Pequeña pausa entre lotes para no sobrecargar el servidor
    if (batches.indexOf(batch) < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log(`✅ ${processedCount} tickets procesados en lotes`);
  return allLocations;
}

// 🎯 NUEVO: Método optimizado para procesar imágenes
private async processImagesOptimized(evidences: any[]): Promise<any[]> {
  if (evidences.length === 0) {
    return [];
  }

  const imagePromises = evidences.map(async (e) => {
    try {
      const blob = await this.photoEvidenceService.getPhotoEvidenceFile(e.photoid || e.photoId).toPromise();
      if (!blob) throw new Error('No blob');
      const url = URL.createObjectURL(blob);
      return {
        url,
        name: e.name,
        comment: e.comment
      };
    } catch {
      return {
        url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjRmNGY0Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlbiBubyBkaXNwb25pYmxlPC90ZXh0Pjwvc3ZnPg==',
        name: e.name,
        comment: 'Error loading image'
      };
    }
  });

  return Promise.all(imagePromises);
}

// 🎯 NUEVO: Método optimizado para procesar agrupación de tickets
private processTicketGrouping(): void {
  console.log('🔄 Procesando agrupación de tickets...');
  
  // Agrupar por ticketId y acumular fases completadas
  const ticketMap: { [ticketId: number]: any } = {};
  
  this.previousLocations.forEach(loc => {
    if (!ticketMap[loc.ticketId]) {
      ticketMap[loc.ticketId] = { ...loc, completedPhases: [...(loc.completedPhases || [])] };
    } else {
      // Acumula fases si no están repetidas
      const existingPhases = ticketMap[loc.ticketId].completedPhases.map((p: any) => p.name);
      (loc.completedPhases || []).forEach((phase: any) => {
        if (!existingPhases.includes(phase.name)) {
          ticketMap[loc.ticketId].completedPhases.push(phase);
        }
      });
    }
  });
  
  this.uniqueTickets = Object.values(ticketMap);
  this.filteredTickets = this.uniqueTickets;
  
  console.log('✅ Agrupación de tickets procesada:', this.uniqueTickets.length);
}

// ✅ NUEVO MÉTODO: Obtener fases completadas desde las fotos
private getCompletedPhasesFromPhotos(evidences: any[]): any[] {
  if (!evidences || evidences.length === 0) {
    console.log('  - No hay evidencia fotográfica para este ticket');
    return [];
  }

  // Agrupar fotos por nombre de fase
  const phasesByName = evidences.reduce((groups, evidence) => {
    const phaseName = evidence.name || 'Unknown Phase';
    if (!groups[phaseName]) {
      groups[phaseName] = [];
    }
    groups[phaseName].push(evidence);
    return groups;
  }, {} as { [key: string]: any[] });

  // Convertir a array de fases completadas
  const completedPhases = Object.keys(phasesByName).map(phaseName => ({
    id: null, // No tenemos taskStatusId en las fotos
    name: phaseName,
    photoCount: phasesByName[phaseName].length,
    startingDate: null, // No disponible en las fotos
    endingDate: null // No disponible en las fotos
  }));

  console.log(`  - Fases completadas extraídas de fotos:`, completedPhases);
  return completedPhases;
}

// ✅ NUEVO MÉTODO: Determinar si una fase es opcional
private isPhaseOptional(phaseName: string, routeCode: string): boolean {
  const phaseNameLower = phaseName.toLowerCase();

  if (routeCode.includes('ASPHALT')) {
    return ['stripping', 'install signs'].includes(phaseNameLower);
  } else if (routeCode.includes('CONCRETE')) {
    return ['steel plate pickup'].includes(phaseNameLower);
  } else if (routeCode.includes('SPOTTER')) {
    return ['install signs'].includes(phaseNameLower);
  }

  return false;
}

showImages: boolean = false;

toggleImages() {
  this.showImages = !this.showImages;
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

// ✅ OPTIMIZADO: Método para formatear dirección
private formatAddress(data: any): string {
  // 🎯 NUEVO: Optimización - solo logear en modo debug
  const isDebugMode = false; // Cambiar a true para debugging
  
  if (isDebugMode) {
  console.log('🔍 Formatting address with data:', {
    addressnumber: data.addressnumber,
    addresscardinal: data.addresscardinal,
    addressstreet: data.addressstreet,
    addresssuffix: data.addresssuffix,
    location: data.location,
    fromaddressstreet: data.fromaddressstreet,
    toaddressstreet: data.toaddressstreet,
    fromaddresscardinal: data.fromaddresscardinal,
    fromaddresssuffix: data.fromaddresssuffix,
      address: data.address
    });
  }

  // Priority 1: Use specific address from addresses table (preferred) - ALWAYS include suffix if available
  if (data.addressnumber && data.addresscardinal && data.addressstreet) {
    let formattedAddress = `${data.addressnumber} ${data.addresscardinal} ${data.addressstreet}`;

    // Add suffix if available
    if (data.addresssuffix && data.addresssuffix.trim() !== '') {
      formattedAddress += ` ${data.addresssuffix}`;
      if (isDebugMode) console.log('✅ Formatted address (from addresses table WITH suffix):', formattedAddress.trim());
    } else {
      if (isDebugMode) console.log('✅ Formatted address (from addresses table WITHOUT suffix):', formattedAddress.trim());
    }

    return formattedAddress.trim();
  }

  // Priority 2: Use specific address with suffix from addresses table (fallback for Priority 1)
  if (data.addressnumber && data.addresscardinal && data.addressstreet && data.addresssuffix) {
    const formattedAddress = `${data.addressnumber} ${data.addresscardinal} ${data.addressstreet} ${data.addresssuffix}`.trim();
    if (isDebugMode) console.log('✅ Formatted address (from addresses table with suffix):', formattedAddress);
    return formattedAddress;
  }

  // Priority 3: Use wayfinding from address (range) - ALWAYS include suffix if available
  if (data.fromaddressstreet && data.fromaddresscardinal) {
    let formattedAddress = `${data.fromaddressstreet} ${data.fromaddresscardinal}`;

    // Add suffix if available
    if (data.fromaddresssuffix && data.fromaddresssuffix.trim() !== '') {
      formattedAddress += ` ${data.fromaddresssuffix}`;
      if (isDebugMode) console.log('✅ Formatted address (from wayfinding from WITH suffix):', formattedAddress.trim());
    } else {
      if (isDebugMode) console.log('✅ Formatted address (from wayfinding from WITHOUT suffix):', formattedAddress.trim());
    }

    return formattedAddress.trim();
  }

  // Priority 4: Use wayfinding from address with suffix (fallback for Priority 3)
  if (data.fromaddressstreet && data.fromaddresscardinal && data.fromaddresssuffix) {
    const formattedAddress = `${data.fromaddressstreet} ${data.fromaddresscardinal} ${data.fromaddresssuffix}`.trim();
    if (isDebugMode) console.log('✅ Formatted address (from wayfinding from with suffix):', formattedAddress);
    return formattedAddress;
  }

  // Priority 5: Use wayfinding to address (range)
  if (data.toaddressstreet && data.fromaddresscardinal) {
    const formattedAddress = `${data.toaddressstreet} ${data.fromaddresscardinal}`.trim();
    if (isDebugMode) console.log('✅ Formatted address (from wayfinding to):', formattedAddress);
    return formattedAddress;
  }

  // Priority 6: Check if there's a pre-formatted address field
  if (data.address && typeof data.address === 'string' && data.address.trim() !== '') {
    if (isDebugMode) console.log('✅ Using pre-formatted address field:', data.address);
    return data.address.trim();
  }

  // Priority 7: Try to build address from wayfinding range
  const wayfindingParts: string[] = [];

  // Check for wayfinding fields
  if (data.fromaddressstreet) wayfindingParts.push(data.fromaddressstreet);
  if (data.toaddressstreet) wayfindingParts.push(data.toaddressstreet);
  if (data.fromaddresscardinal) wayfindingParts.push(data.fromaddresscardinal);
  if (data.fromaddresssuffix) wayfindingParts.push(data.fromaddresssuffix);

  // If we found some wayfinding parts, combine them
  if (wayfindingParts.length > 0) {
    const combinedAddress = wayfindingParts.join(' ').trim();
    if (isDebugMode) console.log('✅ Built address from wayfinding parts:', combinedAddress);
    return combinedAddress;
  }

  // Priority 8: Check for location field (but only if it's not just "STREET")
  if (data.location && typeof data.location === 'string' && data.location.trim() !== '' && data.location.trim().toUpperCase() !== 'STREET') {
    if (isDebugMode) console.log('✅ Using location field:', data.location);
    return data.location.trim();
  }

  // Priority 9: Fallback to any available address fields
  const fallbackAddress = `${data.addressstreet || data.fromaddressstreet || data.toaddressstreet || ''} ${data.addresscardinal || data.fromaddresscardinal || ''}`.trim();
  if (isDebugMode) console.log('⚠️ Using fallback address format:', fallbackAddress);
  return fallbackAddress || 'Address not available';
}

onCompletedFilterChange() {
  const filter = this.completedFilterText.trim().toLowerCase();
  if (!filter) {
    this.filteredTickets = this.uniqueTickets;
  } else {
    this.filteredTickets = this.uniqueTickets.filter(ticket =>
      (ticket.address && ticket.address.toLowerCase().includes(filter)) ||
      (ticket.startingDate && ticket.startingDate.toLowerCase().includes(filter)) ||
      (ticket.endingDate && ticket.endingDate.toLowerCase().includes(filter))
    );
  }
}


}
