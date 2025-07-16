import { Component } from '@angular/core';
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

@Component({
  selector: 'app-current',
  imports: [SitejobLayoutComponent,
    SitejobTabsComponent,
    MatTableModule,
    MatDividerModule,
    CommonModule,
    MATERIAL_MODULES,
    SitejobSidenavbarComponent, 
    FormsModule],
  templateUrl: './current.component.html',
  styleUrl: './current.component.scss'
})
export class CurrentComponent {

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
} = {
  address: ''
};
  currentCrewIdFromLoadEmployees: number | null = null;
crewDetails: any[] = [];
crewType: string = '';
routeCode: string = '';
contractUnitId: number = 0;
userId: number = 0;
selectedFile!: File;
ticketId: number = 0; // Lo debes asignar al cargar detalles
crewId: number = 0;
ticketStatusId: number = 0; // Id del estado del ticket asociado (si aplica)
comment: string = '';
latitude: number = 0; // puedes obtenerla desde GPS o dejar en 0
longitude: number = 0;
name: string = 'Photo Evidence'; // nombre opcional o dinámico
 supervisor: any = {};

activities: any[] = [];

permits: { id: number; number: string }[] = [];
diggers: { id: number; number: string }[] = [];


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
        private quadrantService: QuadrantsService
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
        orderedPhaseNames = ['Dirt', 'Grind', 'Asphalt', 'Clean'];
      } else if (this.routeCode.includes('CONCRETE')) {
        orderedPhaseNames = ['Stripping', 'Spotting', 'Install Signs'];
      }

      // 🧹 Filtrar y ordenar según orderedPhaseNames
      const filteredStatuses = orderedPhaseNames
        .map(name => statuses.find(s => s.name === name))
        .filter(Boolean); // Elimina los undefined

      // 🔄 Convertir a actividades
      this.activities = filteredStatuses.map((s: any) => ({
        id: s.taskstatusid,
        name: s.name,
        description: s.description,
        checked: false,
        locked: false
      }));

      // 🔍 Buscar Crack Seal (si está disponible en general)
      const crackSeal = statuses.find((s: any) => s.name?.toLowerCase() === 'crack seal');
      this.ticketStatusId = crackSeal?.taskstatusid || 0;

      this.loadLinkedPhases();
    },
    error: (err) => {
      console.error('❌ Error loading task statuses', err);
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
    const supervisorId = quadrant.supervisorId;
    if (!supervisorId) {
      console.warn('⚠️ No se encontró supervisorId en el cuadrante');
      return;
    }

    this.peopleService.getPeopleById(supervisorId).subscribe(supervisor => {
      this.supervisor = supervisor;
      console.log('✅ Supervisor cargado:', this.supervisor);
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

        this.location.address = `${data.fromaddressstreet} ${data.toaddressstreet} ${data.fromaddresscardinal}`;  // ${data.fromaddresssuffix}
        this.location.job = data.contractunit_name;
        this.location.surface = data.surfacetotal;
        this.location.description = data.contractunit_description;
        this.location.width = data.width;
        this.location.length = data.length;

        console.log('📍 Dirección por defecto del backend:', this.location.address);
      } else if (this.isLocationFromStorage) {
        console.log('📍 Dirección seleccionada manualmente:', this.location.address);
      }
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
    const normalized = safeStatuses.map(ts => Number(ts.taskstatusid));

    this.activities.forEach(activity => {
      const activityId = Number(activity.id);
      if (normalized.includes(activityId)) {
        activity.checked = true;
        activity.locked = true;
      } else {
        activity.checked = false;
        activity.locked = false;
      }
    });
  },
  error: (err) => {
    console.error('Error al cargar fases vinculadas:', err);
  }
});


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

  this.ticketStatusService.getByTicket(this.ticketId).subscribe({
    next: (existingStatuses: any[]) => {
      let alreadyStarted = existingStatuses && existingStatuses.length > 0;
      let startingDateToUse: string | null = null;

      if (alreadyStarted) {
        startingDateToUse = existingStatuses[0].startingdate;
        console.log(`ℹ️ Usando startingDate existente: ${startingDateToUse}`);
      }

      selectedPhases.forEach(phase => {
        const savePhase$ = this.ticketStatusService.create({
          ticketId: this.ticketId,
          crewId: crewIdToUse,
          taskStatusId: phase.id,
          startingDate: !alreadyStarted && !startingDateToUse
            ? (startingDateToUse = new Date().toISOString()) // primera vez
            : startingDateToUse,
          createdBy: this.userId,
          updatedBy: this.userId
        });

        savePhase$.subscribe(() => {
          console.log(`✅ TicketStatus creado para fase ${phase.name}`);
          this.loadLinkedPhases();

          // ✅ SUBIR FOTO SOLO SI HAY ARCHIVO SELECCIONADO
          if (this.selectedFile) {
            this.uploadPhotoEvidence(phase.id); // Mandamos el taskStatusId (es tu ticketStatusId)
          }
        });

        alreadyStarted = true;
      });

      // ✅ endingDate solo para CLEAN
      const cleanPhase = selectedPhases.find(p => p.name.toLowerCase() === 'clean');
      if (cleanPhase) {
        this.ticketStatusService.update(cleanPhase.id, this.ticketId, {
          startingDate: startingDateToUse,
          endingDate: new Date().toISOString(),
          updatedBy: this.userId
        }).subscribe(() => {
          console.log(`✅ endingDate actualizado (CLEAN)`);
        });
      }
    },
    error: (err) => {
      console.error('❌ Error al obtener ticketStatus para verificar startingDate:', err);
    }
  });
}



get isSaveDisabled(): boolean {
  return (
    this.activities?.every((a: any) => !a.checked) && !this.selectedFile
  );
}




isPreviousPhaseIncomplete(currentActivity: any): boolean {
  const currentIndex = this.activities.indexOf(currentActivity);

  // Si es el primero, permitirlo
  if (currentIndex === 0) return false;

  // Revisar si la fase anterior fue marcada
  const previousActivity = this.activities[currentIndex - 1];
  return !previousActivity.checked;
}


onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
    const file = input.files[0];
    const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    if (validImageTypes.includes(file.type)) {
      this.selectedFile = file;
      console.log('✅ Archivo seleccionado:', file);
    } else {
      console.error('❌ El archivo no es una imagen válida');
      input.value = '';
    }
  }
}

uploadPhotoEvidence(taskStatusId: number): void {
  console.log('📸 Subiendo evidencia para fase:', taskStatusId);

  if (!this.selectedFile || !this.ticketId) {
    console.warn('⚠️ No hay archivo o ticketId');
    return;
  }

  const formData = new FormData();
  formData.append('file', this.selectedFile);
  formData.append('ticketStatusId', taskStatusId.toString()); // ✅ taskStatusId = ticketStatusId
  formData.append('ticketId', this.ticketId.toString());
  formData.append('name', this.name);
  formData.append('latitude', this.latitude.toString());
  formData.append('longitude', this.longitude.toString());
  formData.append('date', new Date().toISOString());
  formData.append('comment', this.comment);
  formData.append('createdBy', this.userId.toString());
  formData.append('updatedBy', this.userId.toString());

  this.photoEvidenceService.uploadPhotoEvidence(formData).subscribe({
    next: (res) => console.log('✅ Evidencia subida correctamente:', res),
    error: (err) => console.error('❌ Error subiendo evidencia:', err)
  });
}

}
