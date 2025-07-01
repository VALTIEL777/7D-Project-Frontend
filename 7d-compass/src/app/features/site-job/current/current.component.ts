import { Component } from '@angular/core';
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
import { PhotoEvidenceService } from '../../../core/services/route/photoevidence.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-current',
  imports: [SitejobLayoutComponent,MatTableModule, MatDividerModule,CommonModule,MATERIAL_MODULES,SitejobSidenavbarComponent, FormsModule],
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

selectedFile!: File;
ticketId: number = 0; // Lo debes asignar al cargar detalles
ticketStatusId: number = 0; // Id del estado del ticket asociado (si aplica)
comment: string = '';
latitude: number = 0; // puedes obtenerla desde GPS o dejar en 0
longitude: number = 0;
name: string = 'Photo Evidence'; // nombre opcional o dinámico


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
        private usedInventoryService: UsedInventoryService,
        private usedEquipmentService: UsedEquipmentService,
        private supplierService: SupplierService,
        private usersService: PeopleService,
        private skillsService: SkillsService,
        private routeService: RoutesService,
        private photoEvidenceService: PhotoEvidenceService

  ){}

  private isLocationFromStorage = false;

ngOnInit() { 
  const savedLocation = localStorage.getItem('selectedLocation');
  if (savedLocation) {
    const parsedLocation = JSON.parse(savedLocation);
    this.location = parsedLocation;
    this.ticketId = parsedLocation.ticketid || 0;
    this.isLocationFromStorage = true; // ✅ Esta línea es la que faltaba
    console.log('🗺️ Location cargada:', this.location);
    console.log('🧾 ticketId cargado:', this.ticketId);
  }

  this.loadEmployees();
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

        // ✅ Obtener el userId logueado correctamente
        const storedUserId = Number(localStorage.getItem('userId')); // CORREGIDO aquí
        const person = this.employeeList.find(p => p.userid === storedUserId); // CORREGIDO aquí

        if (!person) {
          console.warn('⚠️ Usuario logueado no encontrado entre empleados.');
          return;
        }

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

getCrewDetails(crewId: number) {
  this.crewsService.getCrewDetails(crewId).subscribe({
    next: (details) => {
      this.crewDetails = details;

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
        this.location.job = data.contractunit_description;
        this.location.surface = data.surfacetotal;
        this.location.width = data.width;
        this.location.length = data.length;

        console.log('📍 Dirección por defecto del backend:', this.location.address);
      } else if (this.isLocationFromStorage) {
        console.log('📍 Dirección seleccionada manualmente, no se sobreescribe:', this.location.address);
      }
    },
    error: (err) => {
      console.error('❌ Error obteniendo detalles del crew', err);
    }
  });
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
