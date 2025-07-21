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
    this.loadEmployees(); // 👈 primero carga empleados
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
        // 🔁 Mapeo de todos los empleados
        this.employeeList = people.map((person: any) => {
          const crewAssignment = crewEmployees.find((ce: any) => ce.employeeid === person.employeeId); // <-- corregido
          const assignedCrew = crewAssignment
            ? crews.find((c: any) => c.crewid === crewAssignment.crewid)
            : null;
          const personSkills = skills
            .filter((s: any) => s.userId === person.userId) // <-- corregido
            .map((s: any) => s.name);

          return {
            employeeid: person.employeeId,  // <-- corregido
            userid: person.userId,          // <-- corregido
            name: `${person.firstname} ${person.lastname}`,
            crewid: crewAssignment?.crewid || null,
            type: assignedCrew?.type || '',
            workedhours: assignedCrew?.workedhours || 0,
            skills: personSkills,
            crewLeader: crewAssignment?.crewleader ?? false
          };
        });

        // 🔍 Buscar usuario logueado
        const storedUserId = Number(localStorage.getItem('userId'));
        const person = this.employeeList.find(p => p.userid === storedUserId);

        if (!person) {
          console.warn('⚠️ Usuario logueado no encontrado entre empleados.');
          return;
        }

        this.userId = person.userid;

        const currentCrewId = person.crewid;
        if (!currentCrewId) {
          console.warn('⚠️ El usuario no tiene crew asignado.');
          return;
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

        // ⏬ Cargar todas las fases disponibles primero
        this.loadAllTaskStatuses();
      },
      error: (err) => console.error('❌ Error loading employee data:', err)
    });
  });
}

// ✅ NUEVO MÉTODO: Cargar todas las fases disponibles
loadAllTaskStatuses(): void {
  this.taskstatusService.getAllTaskStatuses().subscribe({
    next: (statuses) => {
      this.allTaskStatuses = statuses;
      console.log('📦 Todas las fases cargadas:', this.allTaskStatuses);
      
      // ⏬ Ahora cargar tickets completados
      this.loadCompletedTickets(this.crewId);
    },
    error: (err) => {
      console.error('❌ Error loading task statuses:', err);
      // Intentar cargar tickets de todas formas
      this.loadCompletedTickets(this.crewId);
    }
  });
}

loadCompletedTickets(crewId: number): void {
  console.log('🔄 Cargando tickets completados para crewId:', crewId);
  console.log('🔄 Tipo de crewId:', typeof crewId);
  
  this.ticketStatusService.getCompletedTickets().subscribe({
    next: (tickets) => {
      console.log('📋 Tickets recibidos del backend:', tickets);
      console.log('📋 Total de tickets recibidos:', tickets.length);
      
      // ✅ FILTRAR POR CREW ID (habilitado ahora que enviamos crewId)
      const crewTickets = tickets.filter(ticket => ticket.crewid === crewId);
      console.log('👷 Tickets del crew actual:', crewTickets);
      console.log('👷 Total de tickets del crew:', crewTickets.length);
      
      if (crewTickets.length === 0) {
        console.log('⚠️ No hay tickets completados para este crew');
        this.previousLocations = [];
        return;
      }
      
      this.photoEvidenceService.getAllPhotoEvidence().subscribe({
        next: (photos) => {
          console.log('📸 Fotos recibidas:', photos);
          console.log('📸 Total de fotos recibidas:', photos.length);
          
          // ✅ SIMPLIFICADO: Procesar tickets directamente sin verificación adicional
          // El backend ya devuelve tickets "completados", solo necesitamos las fotos
          this.previousLocations = crewTickets.map(ticket => {
            console.log(`🔍 Procesando ticket ${ticket.ticketid}:`, ticket);
            
            
            const evidences = photos.filter(p => p.ticketid === ticket.ticketid);
            console.log(`📸 Fotos encontradas para ticket ${ticket.ticketid}:`, evidences.length);
            
            const images = evidences.map(e => ({
              url: e.photourl,
              name: e.name,
              comment: e.comment
            }));

            const location = {
              ticketId: ticket.ticketid,
              address: this.formatAddress(ticket), // <-- CAMBIADO: usar formatAddress
              actions: ['Completed work'],
              images: images,
              startingDate: ticket.startingdate,
              endingDate: ticket.endingdate,
              routeCode: ticket.routecode || 'UNKNOWN',
              completedPhases: this.getCompletedPhasesFromPhotos(evidences)
            };
            
            console.log(`✅ Ubicación procesada para ticket ${ticket.ticketid}:`, location);
            console.log(`🔍 Campos de dirección disponibles en ticket ${ticket.ticketid}:`, {
              // Campos de addresses
              addressnumber: ticket.addressnumber,
              addresscardinal: ticket.addresscardinal,
              addressstreet: ticket.addressstreet,
              addresssuffix: ticket.addresssuffix,
              // Campos de wayfinding
              fromaddressstreet: ticket.fromaddressstreet,
              toaddressstreet: ticket.toaddressstreet,
              fromaddresscardinal: ticket.fromaddresscardinal,
              fromaddresssuffix: ticket.fromaddresssuffix,
              // Otros campos
              address: ticket.address,
              location: ticket.location,
              // Todos los campos del ticket
              allFields: Object.keys(ticket).filter(key => 
                key.toLowerCase().includes('address') || 
                key.toLowerCase().includes('street') || 
                key.toLowerCase().includes('location')
              )
            });
            
            // ✅ TEMPORAL: Mostrar todos los campos del ticket para debuggear
            console.log(`🔍 ALL FIELDS for ticket ${ticket.ticketid}:`, ticket);
            return location;
          });

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

          console.log('✅ Ubicaciones completadas procesadas:', this.previousLocations);
          console.log('✅ Total de ubicaciones procesadas:', this.previousLocations.length);
        },
        error: (err) => console.error('❌ Error loading photo evidence:', err)
      });
    },
    error: (err) => console.error('❌ Error loading completed tickets:', err)
  });
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

// ✅ NUEVO MÉTODO: Formatear dirección como en upcoming
private formatAddress(data: any): string {
  console.log('🔍 Formatting address with data:', {
    // Campos de addresses (tabla addresses)
    addressnumber: data.addressnumber,
    addresscardinal: data.addresscardinal,
    addressstreet: data.addressstreet,
    addresssuffix: data.addresssuffix,
    // Campos de wayfinding (tabla wayfinding)
    location: data.location,
    fromaddressstreet: data.fromaddressstreet,
    toaddressstreet: data.toaddressstreet,
    fromaddresscardinal: data.fromaddresscardinal,
    fromaddresssuffix: data.fromaddresssuffix,
    // Otros campos
    address: data.address,
    // Check for any other address-related fields
    ...Object.keys(data).filter(key => key.toLowerCase().includes('address') || key.toLowerCase().includes('street')).reduce((acc, key) => {
      acc[key] = data[key];
      return acc;
    }, {} as any)
  });

  // Priority 1: Use specific address from addresses table (preferred) - ALWAYS include suffix if available
  if (data.addressnumber && data.addresscardinal && data.addressstreet) {
    let formattedAddress = `${data.addressnumber} ${data.addresscardinal} ${data.addressstreet}`;
    
    // Add suffix if available
    if (data.addresssuffix && data.addresssuffix.trim() !== '') {
      formattedAddress += ` ${data.addresssuffix}`;
      console.log('✅ Formatted address (from addresses table WITH suffix):', formattedAddress.trim());
    } else {
      console.log('✅ Formatted address (from addresses table WITHOUT suffix):', formattedAddress.trim());
    }
    
    console.log('🔍 Priority 1 used - addresssuffix available?', !!data.addresssuffix, 'Value:', data.addresssuffix);
    return formattedAddress.trim();
  }
  
  // Priority 2: Use specific address with suffix from addresses table (fallback for Priority 1)
  if (data.addressnumber && data.addresscardinal && data.addressstreet && data.addresssuffix) {
    const formattedAddress = `${data.addressnumber} ${data.addresscardinal} ${data.addressstreet} ${data.addresssuffix}`.trim();
    console.log('✅ Formatted address (from addresses table with suffix):', formattedAddress);
    return formattedAddress;
  }

  // Priority 3: Use wayfinding from address (range) - ALWAYS include suffix if available
  if (data.fromaddressstreet && data.fromaddresscardinal) {
    let formattedAddress = `${data.fromaddressstreet} ${data.fromaddresscardinal}`;
    
    // Add suffix if available
    if (data.fromaddresssuffix && data.fromaddresssuffix.trim() !== '') {
      formattedAddress += ` ${data.fromaddresssuffix}`;
      console.log('✅ Formatted address (from wayfinding from WITH suffix):', formattedAddress.trim());
    } else {
      console.log('✅ Formatted address (from wayfinding from WITHOUT suffix):', formattedAddress.trim());
    }
    
    console.log('🔍 Priority 3 used - fromaddresssuffix available?', !!data.fromaddresssuffix, 'Value:', data.fromaddresssuffix);
    return formattedAddress.trim();
  }

  // Priority 4: Use wayfinding from address with suffix (fallback for Priority 3)
  if (data.fromaddressstreet && data.fromaddresscardinal && data.fromaddresssuffix) {
    const formattedAddress = `${data.fromaddressstreet} ${data.fromaddresscardinal} ${data.fromaddresssuffix}`.trim();
    console.log('✅ Formatted address (from wayfinding from with suffix):', formattedAddress);
    return formattedAddress;
  }

  // Priority 5: Use wayfinding to address (range)
  if (data.toaddressstreet && data.fromaddresscardinal) {
    const formattedAddress = `${data.toaddressstreet} ${data.fromaddresscardinal}`.trim();
    console.log('✅ Formatted address (from wayfinding to):', formattedAddress);
    return formattedAddress;
  }

  // Priority 6: Check if there's a pre-formatted address field
  if (data.address && typeof data.address === 'string' && data.address.trim() !== '') {
    console.log('✅ Using pre-formatted address field:', data.address);
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
    console.log('✅ Built address from wayfinding parts:', combinedAddress);
    return combinedAddress;
  }

  // Priority 8: Check for location field (but only if it's not just "STREET")
  if (data.location && typeof data.location === 'string' && data.location.trim() !== '' && data.location.trim().toUpperCase() !== 'STREET') {
    console.log('✅ Using location field:', data.location);
    return data.location.trim();
  }
  
  // Priority 9: Fallback to any available address fields
  const fallbackAddress = `${data.addressstreet || data.fromaddressstreet || data.toaddressstreet || ''} ${data.addresscardinal || data.fromaddresscardinal || ''}`.trim();
  console.log('⚠️ Using fallback address format:', fallbackAddress);
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