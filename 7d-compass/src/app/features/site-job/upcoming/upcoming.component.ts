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
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-upcoming',
  imports: [SitejobLayoutComponent,SitejobSidenavbarComponent,MatTableModule, MatDividerModule,CommonModule,MATERIAL_MODULES, FormsModule],
  templateUrl: './upcoming.component.html',
  styleUrl: './upcoming.component.scss'
})
export class UpcomingComponent {

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

crewType: string = '';

remainingLocations: {
  address: string;
  job?: string;
  surface?: number;
  width?: number;
  length?: number;
}[] = [];

filterText: string = '';

crewDetails: any[] = [];

  constructor(
     private crewsService: CrewsService,
        private crewEmployeesService: CrewEmployeesService,
        private usedInventoryService: UsedInventoryService,
        private usedEquipmentService: UsedEquipmentService,
        private supplierService: SupplierService,
        private usersService: PeopleService,
        private skillsService: SkillsService,
        private routeService: RoutesService,
        private router: Router
  ){}

  ngOnInit() {
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

      // Mapear todos los tickets asociados a su información de ubicación
      this.remainingLocations = details.map((data: any) => ({
        address: `${data.fromaddressstreet} ${data.toaddressstreet} ${data.fromaddresscardinal} ${data.fromaddresssuffix}`,
        job: data.contractunit_description || '',
        surface: data.surfacetotal,
        width: data.width,
        length: data.length,
        ticketid: data.ticketid
      }));

      console.log('📌 Remaining locations:', this.remainingLocations);

      // Si quieres también mostrar la primera location por defecto
      if (this.remainingLocations.length > 0) {
        this.location = this.remainingLocations[0];
        console.log('📍 Primera location activa:', this.location);
      }
    },
    error: (err) => {
      console.error('❌ Error obteniendo detalles del crew:', err);
    }
  });
}


goToCurrent(location: any) {
  // Aquí podrías navegar a /current y guardar la info seleccionada
  localStorage.setItem('selectedLocation', JSON.stringify(location));
  this.router.navigate(['/current']);

}

get filteredLocations() {
  const filter = this.filterText.trim().toLowerCase();
  if (!filter) return this.remainingLocations;

  return this.remainingLocations.filter(loc =>
    loc.address.toLowerCase().includes(filter) ||
    loc.job?.toLowerCase().includes(filter)
  );
}


}
