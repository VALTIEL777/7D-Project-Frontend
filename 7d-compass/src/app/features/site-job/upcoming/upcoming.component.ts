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
import { SitejobTabsComponent } from '../../../shared/sitejob-tabs/sitejob-tabs.component';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-upcoming',
  imports: [

    SitejobSidenavbarComponent,
    SitejobLayoutComponent,
    MatTableModule,
    MatDividerModule,
    CommonModule,
    MATERIAL_MODULES,
    FormsModule, 
    SitejobTabsComponent],
  templateUrl: './upcoming.component.html',
  styleUrl: './upcoming.component.scss'
})
export class UpcomingComponent {

  // Static map properties
private readonly GOOGLE_MAPS_API_KEY = 'AIzaSyDwEG-Tyq2kpHc4wznqVvSU0Dj2B_idzlY';

staticMapUrl: string = '';
staticMapWidth: number = 600;
staticMapHeight: number = 400;
showNoRoutesOverlay = false;

  employeeList: any[] = [];  // Lista completa de empleados
teamLeader: string = '';   // Nombre del líder del equipo
teamMembers: string[] = []; // Nombres de los demás miembros

  location: {
  address: string;
  job?: string;
  surface?: number;
  width?: number;
  length?: number;
  lat?: number;
  lng?: number;
} = {
  address: ''
};

remainingLocations: {
  address: string;
  job?: string;
  surface?: number;
  width?: number;
  length?: number;
  lat?: number;
  lng?: number;
}[] = [];

crewType: string = '';

filterText: string = '';
isLoading: boolean = false;
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
        private router: Router,
          private http: HttpClient   // ✅ necesario para geocodificación

  ){}

  ngOnInit() {
    this.loadEmployees();
  }

loadEmployees() {
        this.isLoading = true;
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
              this.isLoading = false;

      },
      error: (err) => console.error('❌ Error loading employee data:', err)
    });
  });
}

getCrewDetails(crewId: number) {
  this.isLoading = true;
  this.crewsService.getCrewDetails(crewId).subscribe({
    next: (details) => {
      this.crewDetails = details;

      // Mapear todos los tickets asociados a su información de ubicación
     // Evita ubicaciones duplicadas por ticketid
const uniqueLocationsMap = new Map<number, any>();

details.forEach((data: any) => {
  if (!uniqueLocationsMap.has(data.ticketid)) {
   uniqueLocationsMap.set(data.ticketid, {
  address: `${data.fromaddressstreet} ${data.toaddressstreet} ${data.fromaddresscardinal}`,
  job: data.contractunit_name || '',
  surface: data.surfacetotal,
  width: data.width,
  length: data.length,
  ticketid: data.ticketid,
  contractunitid: data.contractunitid,
  lat: data.latitude,   // ✅ añade estas dos líneas
  lng: data.longitude
});

  }
});

this.remainingLocations = Array.from(uniqueLocationsMap.values());

// ✅ Geocodificar direcciones antes de generar el mapa
this.geocodeRemainingLocations().then(() => {
  this.updateStaticMap();
});





      console.log('📌 Remaining locations:', this.remainingLocations);

      // Si quieres también mostrar la primera location por defecto
      if (this.remainingLocations.length > 0) {
        this.location = this.remainingLocations[0];
        console.log('📍 Primera location activa:', this.location);
      }
      this.isLoading = false;
    },
    error: (err) => {
      console.error('❌ Error obteniendo detalles del crew:', err);
      this.isLoading = false;
    }
  });
}

private async geocodeRemainingLocations(): Promise<void> {
  for (const loc of this.remainingLocations) {
    if (!loc.lat || !loc.lng) {
      try {
        const encodedAddress = encodeURIComponent(loc.address);
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${this.GOOGLE_MAPS_API_KEY}`;

        const response: any = await firstValueFrom(this.http.get(url));
        if (response.status === 'OK' && response.results.length > 0) {
          loc.lat = response.results[0].geometry.location.lat;
          loc.lng = response.results[0].geometry.location.lng;
        }
      } catch (err) {
        console.error(`❌ Error geocodificando ${loc.address}`, err);
      }
    }
  }
}


goToCurrent(location: any) {
  const storedUserId = Number(localStorage.getItem('userId'));
  const person = this.employeeList.find(p => p.userid === storedUserId);
  const crewId = person?.crewid || 0;

  console.log('🧑‍🔧 Guardando crewId:', crewId);

  localStorage.setItem('selectedLocation', JSON.stringify(location));
  localStorage.setItem('crewId', String(crewId));
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

updateStaticMap(): void {
  if (!this.remainingLocations || this.remainingLocations.length === 0) {
    this.staticMapUrl = this.generateChicagoMapWithLabel();
    this.showNoRoutesOverlay = true;
    return;
  }

  this.showNoRoutesOverlay = false;

  const baseUrl = 'https://maps.googleapis.com/maps/api/staticmap';
  const size = `size=${this.staticMapWidth}x${this.staticMapHeight}`;
  const mapType = 'maptype=roadmap';
  const scale = 'scale=2';

  const markers: string[] = [];
  const paths: string[] = [];

  // 🔹 Generar marcadores y path (asumiendo que tienes lat/lng en remainingLocations)
  const coordinates: string[] = [];

  this.remainingLocations.forEach((loc, index) => {
    if (loc.lat && loc.lng) {
      markers.push(`markers=color:blue|label:${this.getMarkerLabel(index + 1)}|${loc.lat},${loc.lng}`);
      coordinates.push(`${loc.lat},${loc.lng}`);
    }
  });

  if (coordinates.length > 1) {
    paths.push(`path=color:0xFF0000FF|weight:4|${coordinates.join('|')}`);
  }

  const urlParts = [
    size,
    mapType,
    scale,
    ...markers,
    ...paths,
    `key=${this.GOOGLE_MAPS_API_KEY}`
  ];

  if (coordinates.length > 0) {
    urlParts.push(`center=${coordinates[0]}`);
  } else {
    urlParts.push('center=Chicago,IL');
  }

  urlParts.push('zoom=13');

  this.staticMapUrl = `${baseUrl}?${urlParts.join('&')}`;
}

generateChicagoMapWithLabel(): string {
  return `https://maps.googleapis.com/maps/api/staticmap?size=${this.staticMapWidth}x${this.staticMapHeight}&scale=2&maptype=roadmap&center=Chicago,IL&zoom=11&key=${this.GOOGLE_MAPS_API_KEY}&markers=color:gray|label:•|Chicago,IL`;
}

private getMarkerLabel(index: number): string {
  if (index <= 26) {
    return String.fromCharCode(64 + index);
  } else if (index <= 52) {
    return String.fromCharCode(96 + (index - 26));
  } else {
    return (index % 9 + 1).toString();
  }
}

}
