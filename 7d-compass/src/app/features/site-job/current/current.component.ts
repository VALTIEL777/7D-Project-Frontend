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
  length?: number;
  
} = {
  address: ''
};
crewDetails: any[] = [];
crewType: string = '';

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

activities: any[] = [];

temporal = {
  
  activities: ['Checked equipment', 'Setup cones', 'Inspected work zone'],
  issues: ['Missing permit', 'Blocked sidewalk', 'Damaged signage'],
  supervisor: {
    name: 'Renee Gonzalez',
    phone: '234-534-2394'
  }
};

permits: { id: number; number: string }[] = [];
diggers: { id: number; number: string }[] = [];


  constructor(
     private crewsService: CrewsService,
        private crewEmployeesService: CrewEmployeesService,

        private ticketStatusService: TicketStatusService,
        private usersService: PeopleService,
        private skillsService: SkillsService,
        private necessaryPhasesService: NecessaryPhasesService,
        private photoEvidenceService: PhotoEvidenceService,

        private contractUnitsPhasesService: ContractUnitsPhasesService,
        private dialog: MatDialog
  ){}

  private isLocationFromStorage = false;

ngOnInit() { 
  const savedLocation = localStorage.getItem('selectedLocation');
  if (savedLocation) {
    const parsedLocation = JSON.parse(savedLocation);
    this.location = parsedLocation;
    this.ticketId = parsedLocation.ticketid || 0;
    this.contractUnitId = Number(parsedLocation.contractunitid) || 0; // Conversión a número
    this.isLocationFromStorage = true; // ✅ Esta línea es la que faltaba
    console.log('🗺️ Location cargada:', this.location);
    console.log('🧾 ticketId cargado:', this.ticketId);
    console.log('🆔 contractUnitId cargado:', this.contractUnitId);
  }

  this.loadEmployees();
    this.loadAllPhases();

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
          const crewAssignment = crewEmployees.find((ce: any) => ce.employeeid === person.employeeid);
          const assignedCrew = crewAssignment
            ? crews.find((c: any) => c.crewid === crewAssignment.crewid)
            : null;
          const personSkills = skills
            .filter((s: any) => s.userid === person.userid) // CORREGIDO aquí
            .map((s: any) => s.name);

          return {
            employeeid: person.employeeid,
            userid: person.userid, // CORREGIDO aquí
            name: `${person.firstname} ${person.lastname}`,
            crewid: crewAssignment?.crewid || null,
            type: assignedCrew?.type || '',
            workedhours: assignedCrew?.workedhours || 0,
            skills: personSkills,
            crewLeader: crewAssignment?.crewleader ?? false
          };
        });

        const detectedLeader = this.employeeList.find(emp => emp.crewLeader);
this.crewId = detectedLeader?.crewid || this.employeeList[0]?.crewid || 0;
console.log('👷 crewId detectado:', this.crewId);


        // ✅ Obtener el userId logueado correctamente
        const storedUserId = Number(localStorage.getItem('userId')); // CORREGIDO aquí
        const person = this.employeeList.find(p => p.userid === storedUserId); // CORREGIDO aquí

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
    this.necessaryPhasesService.getAllPhases().subscribe({
    next: (phases) => {
    this.activities = phases.map((p: any) => ({
  id: p.necessaryphaseid ?? p.id,
  name: p.name,
  description: p.description,
  checked: false
}));

// Guarda el ID de Crack Seal si existe
const crackSealPhase = phases.find((p: any) => p.name.toLowerCase() === 'crack seal');
this.ticketStatusId = crackSealPhase?.necessaryphaseid || 0;

      // Aquí podrías llamar a loadLinkedPhases() para marcar las que estén vinculadas a contractUnitId
      this.loadLinkedPhases();
    },
    error: (err) => {
      console.error('Error loading phases', err);
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
        if (d.permitid && d.permitnumber && !acc.find(p => p.id === d.permitid)) {
          acc.push({ id: d.permitid, number: d.permitnumber });
        }
        return acc;
      }, []);

      // 🔍 Extraer diggers únicos
      this.diggers = details.reduce((acc: { id: number; number: string }[], d: any) => {
        if (d.diggerid && d.diggernumber && !acc.find(dg => dg.id === d.diggerid)) {
          acc.push({ id: d.diggerid, number: d.diggernumber });
        }
        return acc;
      }, []);

      // 🗺️ Solo cargar ubicación por defecto si no viene del localStorage
      if (details.length > 0 && !this.isLocationFromStorage) {
        const data = details[0];

        this.location.address = `${data.fromaddressstreet} ${data.toaddressstreet} ${data.fromaddresscardinal} ${data.fromaddresssuffix}`;
        this.location.job = data.contractunit_name;
        this.location.surface = data.surfacetotal;
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
  this.contractUnitsPhasesService.getByContractUnitId(this.contractUnitId).subscribe({
    next: (linkedPhases) => {
      const normalized = linkedPhases.map(lp => ({
        contractUnitId: lp.contractunitid,
        necessaryPhaseId: lp.necessaryphaseid
      }));

      this.activities.forEach(activity => {
        if (normalized.some(p => p.necessaryPhaseId === activity.id)) {
          activity.checked = true;
          activity.locked = true;
        } else {
          activity.checked = false;
          activity.locked = false;
        }
      });
    },
    error: (err) => {
      console.error('❌ Error al cargar fases vinculadas:', err);
    }
  });
}





saveSelectedActivities() {

  const selectedPhases = this.activities
    .filter(a => a.checked && !a.locked && a.id != null);

  if (selectedPhases.length === 0) {
    console.warn('⚠️ No hay fases nuevas para guardar.');
    return;
  }


  const selectedPhaseRelations = selectedPhases.map(a => ({
    contractUnitId: this.contractUnitId,
    necessaryPhaseId: a.id,
    createdBy: this.userId || 1,
    updatedBy: this.userId || 1
  }));

  const selectedNames = selectedPhases.map(p => p.name).join(', ');

  const dialogRef = this.dialog.open(ConfirmPhaseDialogComponent, {
    width: '400px',
    data: { phaseName: selectedNames }
  });

  dialogRef.afterClosed().subscribe(result => {
    if (result) {
      this.executeSave(selectedPhaseRelations, selectedPhases);
    }
  });
}

private executeSave(selectedPhaseRelations: any[], selectedPhases: any[]) {
  const requests = selectedPhaseRelations.map(phase =>
    this.contractUnitsPhasesService.create(phase)
  );

  forkJoin(requests).subscribe({
    next: () => {
      console.log('✅ Fases nuevas guardadas con éxito.');

      this.loadLinkedPhases();
    },
    error: (err) => console.error('❌ Error al guardar fases', err)
  });


  this.ticketStatusService.getByTicketAndCrew(this.ticketId, this.crewId).subscribe({
    next: (status: any) => {
      if (status) {
        const taskStatusId = status.taskstatusid;
        const ticketId = status.ticketid;

        if (this.activities.some(a => a.name.toLowerCase() === 'clean up' && a.checked)) {
          this.ticketStatusService.update(taskStatusId, ticketId, {
            endingDate: new Date().toISOString(),
            updatedBy: this.userId
          }).subscribe(() => {
            console.log('✅ TicketStatus actualizado con endingDate');
          });
        }
      } else {
        const crackSealPhase = selectedPhases.find(a => a.name.toLowerCase() === 'crack seal' && a.checked);

        if (crackSealPhase) {
          this.ticketStatusService.create({
            ticketId: this.ticketId,
            crewId: this.crewId,
            taskStatusId: crackSealPhase.id,
            startingDate: new Date().toISOString(),
            createdBy: this.userId,
            updatedBy: this.userId
          }).subscribe(() => {
            console.log('✅ TicketStatus creado con startingDate');
          });
        }
      }
    },
    error: (err) => {
      console.error('❌ Error al obtener TicketStatus:', err);
    }
  });
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

uploadPhotoEvidence(): void {
  console.log('📄 Archivo seleccionado:', this.selectedFile);
console.log('🧾 ticketid:', this.ticketId);

  if (!this.selectedFile || !this.ticketId) {
    console.warn('⚠️ Archivo o ticketId no disponible');
    return;
  }

  const formData = new FormData();
  formData.append('file', this.selectedFile);
  formData.append('ticketStatusId', this.ticketStatusId.toString()); // o '1'
formData.append('ticketid', this.ticketId.toString());
  formData.append('name', this.name);
  formData.append('latitude', this.latitude.toString());
  formData.append('longitude', this.longitude.toString());
  formData.append('date', new Date().toISOString());
  formData.append('comment', this.comment);
  formData.append('createdBy', '1'); // puedes usar el userId del login
  formData.append('updatedBy', '1');

  this.photoEvidenceService.uploadPhotoEvidence(formData).subscribe({
    next: (res) => console.log('✅ Evidencia subida:', res),
    error: (err) => console.error('❌ Error al subir evidencia:', err)
  });
}
}
