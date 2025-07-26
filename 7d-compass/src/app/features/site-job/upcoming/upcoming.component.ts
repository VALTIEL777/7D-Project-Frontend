import { Component, ViewChild } from '@angular/core';
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
import { RouteData, MapConfig, LeafletMapComponent } from '../../../shared/leaflet-map/leaflet-map.component';
import { environment } from '../../../../environments/environment';
import * as L from 'leaflet';


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
export class UpcomingComponent {

  // Static map properties
private readonly GOOGLE_MAPS_API_KEY = 'AIzaSyDwEG-Tyq2kpHc4wznqVvSU0Dj2B_idzlY';

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
          private http: HttpClient   // ✅ necesario para geocodificación

  ){}

  ngOnInit() {
    this.loadEmployees();
  }

  // Temporary debugging method to force a specific route
  async forceSpecificRoute(routeId: number = 3): Promise<void> {
    try {
      const route = await firstValueFrom(this.routeService.getRouteById(routeId));

      if (route) {
        this.assignedRoute = route;
        this.assignedRouteId = route.routeid;

        // Update the map immediately
        this.updateLeafletRoutes();
      }
    } catch (error) {
      // Error handling silently
    }
  }

  // Method to get the assigned route for the crew
  async getAssignedRoute(): Promise<void> {
    try {
      // Get routes by type (like route-generator does)
      
      // Get spotting routes first (since crew type is "Spotting")
      const spottingRoutesResponse = await firstValueFrom(this.http.get<any>(`${environment.apiUrl}/routes/spotting`));
      
      // Get concrete routes
      const concreteRoutesResponse = await firstValueFrom(this.http.get<any>(`${environment.apiUrl}/routes/concrete`));
      
      // Get asphalt routes
      const asphaltRoutesResponse = await firstValueFrom(this.http.get<any>(`${environment.apiUrl}/routes/asphalt`));
      
      // Combine all routes
      const allRoutes = [
        ...(spottingRoutesResponse?.routes || []),
        ...(concreteRoutesResponse?.routes || []),
        ...(asphaltRoutesResponse?.routes || [])
      ];

      if (allRoutes && allRoutes.length > 0) {
        // Look for routes that match the crew's work type or have tickets that match this crew's tickets
        let assignedRoute = null;

        // First, try to find a route that has tickets matching this crew's tickets
        const crewTicketIds = this.remainingLocations.map(loc => (loc as any).ticketid).filter((id: any) => id);

        for (const route of allRoutes) {
          if (route.tickets && Array.isArray(route.tickets)) {
            const routeTicketIds = route.tickets.map((ticket: any) => ticket.ticketId || ticket.ticketid).filter((id: any) => id);

            // Check if any tickets match
            const matchingTickets = crewTicketIds.filter((id: any) => routeTicketIds.includes(id));
            if (matchingTickets.length > 0) {
              assignedRoute = route;
              break;
            }
          }
        }

        // If no matching route found, try to find by type
        if (!assignedRoute) {
          // Look for UPCOMING routes first, then SPOTTER routes
          const upcomingRoute = allRoutes.find((route: any) => route.type === 'UPCOMING');
          const spotterRoute = allRoutes.find((route: any) => route.type === 'SPOTTER');

          if (upcomingRoute) {
            assignedRoute = upcomingRoute;
          } else if (spotterRoute) {
            assignedRoute = spotterRoute;
          } else {
            // Use the first available route as fallback
            assignedRoute = allRoutes[0];
          }
        }

        // If still no route found, try to get route ID 3 directly (as a fallback)
        if (!assignedRoute) {
          try {
            const route3 = await firstValueFrom(this.routeService.getRouteById(3));
            if (route3) {
              assignedRoute = route3;
            }
          } catch (error) {
            // Error handling silently
          }
        }

        // If still no route, try to find any route with encoded polyline
        if (!assignedRoute) {
          const routeWithPolyline = allRoutes.find((route: any) => route.encodedpolyline && route.encodedpolyline.length > 0);
          if (routeWithPolyline) {
            assignedRoute = routeWithPolyline;
          }
        }

        this.assignedRoute = assignedRoute;
        this.assignedRouteId = assignedRoute?.routeid || assignedRoute?.routeId;
        
        this.updateLeafletRoutes();
        
        // Forzar actualización del mapa después de un pequeño delay
        setTimeout(() => {
          this.updateLeafletRoutes();
          if (this.leafletMap) {
            this.leafletMap.refreshMap();
          }
        }, 1000);

        if (assignedRoute) {
          // For debugging, let's also check if we can force a specific route
          const hasPolyline = this.assignedRoute.encodedpolyline || this.assignedRoute.encodedPolyline;
          if (!hasPolyline) {
            const routeWithPolyline = allRoutes.find((route: any) => {
              const routePolyline = route.encodedpolyline || route.encodedPolyline;
              return routePolyline && routePolyline.length > 0;
            });
            if (routeWithPolyline) {
              const routeId = routeWithPolyline.routeid || routeWithPolyline.routeId;
              this.assignedRoute = routeWithPolyline;
              this.assignedRouteId = routeId;
            }
          }
        }
      }
    } catch (error) {
      // Error handling silently
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
          return;
        }

        const currentCrewId = person.crewid;
        if (!currentCrewId) {
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

      },
              error: (err) => {
          // Error handling silently
        }
    });
  });
}

getCrewDetails(crewId: number) {
  this.isLoading = true;
  this.crewsService.getCrewDetails(crewId).subscribe({
    next: async (details) => {
      this.crewDetails = details;

      // Mapear todos los tickets asociados a su información de ubicación
     // Evita ubicaciones duplicadas por ticketid
const uniqueLocationsMap = new Map<number, any>();

details.forEach((data: any) => {
  if (!uniqueLocationsMap.has(data.ticketid)) {
   uniqueLocationsMap.set(data.ticketid, {
  address: this.formatAddress(data),
  job: data.contractunit_name || '',
  surface: data.surfacetotal,
  width: data.width,
  length: data.length,
  description: data.contractunit_description || '', // ✅ AGREGADO: Incluir descripción
  ticketid: data.ticketid,
  contractunitid: data.contractunitid,
  routeCode: data.routecode || '', // ✅ AGREGADO: Incluir routeCode
  lat: data.latitude,   // ✅ añade estas dos líneas
  lng: data.longitude,
  fromaddressnumber: data.fromaddressnumber || '',
  fromaddresscardinal: data.fromaddresscardinal || '',
  fromaddressstreet: data.fromaddressstreet || '',
  fromaddresssuffix: data.fromaddresssuffix || '',
  toaddressnumber: data.toaddressnumber || '',
  toaddresscardinal: data.toaddresscardinal || '',
  toaddressstreet: data.toaddressstreet || '',
  toaddresssuffix: data.toaddresssuffix || ''
});

  }
});

this.remainingLocations = Array.from(uniqueLocationsMap.values());

// ✅ Geocodificar direcciones antes de generar el mapa
this.geocodeRemainingLocations().then(async () => {
  // Get assigned route for the crew
  await this.getAssignedRoute();
  this.updateLeafletRoutes();
}).catch(error => {
  // Error handling silently
});





      // Si quieres también mostrar la primera location por defecto
      if (this.remainingLocations.length > 0) {
        this.location = this.remainingLocations[0];
      }
      this.isLoading = false;

      // === INTEGRACIÓN PARA LEAFLET ROUTES ===
      // Esta lógica se maneja ahora en updateLeafletRoutes() que se llama después de getAssignedRoute()
      // === FIN INTEGRACIÓN ===
    },
    error: (err) => {
      this.isLoading = false;
    }
  });
}

// Helper method to format address from wayfinding data
formatAddress(data: any): string {

  // Priority 1: Use specific address from addresses table (preferred) - ALWAYS include suffix if available
  if (data.addressnumber && data.addresscardinal && data.addressstreet) {
    let formattedAddress = `${data.addressnumber} ${data.addresscardinal} ${data.addressstreet}`;

    // Add suffix if available
    if (data.addresssuffix && data.addresssuffix.trim() !== '') {
      formattedAddress += ` ${data.addresssuffix}`;
    }

    return formattedAddress.trim();
  }

  // Priority 2: Use specific address with suffix from addresses table (fallback for Priority 1)
  if (data.addressnumber && data.addresscardinal && data.addressstreet && data.addresssuffix) {
    const formattedAddress = `${data.addressnumber} ${data.addresscardinal} ${data.addressstreet} ${data.addresssuffix}`.trim();
    return formattedAddress;
  }

  // Priority 3: Use wayfinding from address (range) - ALWAYS include suffix if available
  if (data.fromaddressstreet && data.fromaddresscardinal) {
    let formattedAddress = `${data.fromaddressstreet} ${data.fromaddresscardinal}`;

    // Add suffix if available
    if (data.fromaddresssuffix && data.fromaddresssuffix.trim() !== '') {
      formattedAddress += ` ${data.fromaddresssuffix}`;
    }

    return formattedAddress.trim();
  }

  // Priority 4: Use wayfinding from address with suffix (fallback for Priority 3)
  if (data.fromaddressstreet && data.fromaddresscardinal && data.fromaddresssuffix) {
    const formattedAddress = `${data.fromaddressstreet} ${data.fromaddresscardinal} ${data.fromaddresssuffix}`.trim();
    return formattedAddress;
  }

  // Priority 5: Use wayfinding to address (range)
  if (data.toaddressstreet && data.fromaddresscardinal) {
    const formattedAddress = `${data.toaddressstreet} ${data.fromaddresscardinal}`.trim();
    return formattedAddress;
  }

  // Priority 6: Check if there's a pre-formatted address field
  if (data.address && typeof data.address === 'string' && data.address.trim() !== '') {
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
    return combinedAddress;
  }

  // Priority 8: Check for location field (but only if it's not just "STREET")
  if (data.location && typeof data.location === 'string' && data.location.trim() !== '' && data.location.trim().toUpperCase() !== 'STREET') {
    return data.location.trim();
  }

  // Priority 9: Fallback to any available address fields
  const fallbackAddress = `${data.addressstreet || data.fromaddressstreet || data.toaddressstreet || ''} ${data.addresscardinal || data.fromaddresscardinal || ''}`.trim();
  return fallbackAddress || 'Address not available';
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
        // Error handling silently
      }
    }
  }
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


get filteredLocations() {
  const filter = this.filterText.trim().toLowerCase();
  if (!filter) {
    return this.remainingLocations;
  }

  return this.remainingLocations.filter(loc =>
    loc.address.toLowerCase().includes(filter) ||
    loc.job?.toLowerCase().includes(filter)
  );
}

private updateLeafletRoutes() {
  // Verificar si la ruta tiene polyline (probar ambos formatos de nombres)
  const hasPolyline = this.assignedRoute.encodedpolyline || this.assignedRoute.encodedPolyline;
  
  if (this.assignedRoute && hasPolyline) {
    
    this.leafletRoutes = [{
      routeId: this.assignedRoute.routeid || this.assignedRoute.routeId,
      routeCode: this.assignedRoute.routecode || this.assignedRoute.routeCode,
      type: this.assignedRoute.type,
      encodedPolyline: this.assignedRoute.encodedpolyline || this.assignedRoute.encodedPolyline,
      tickets: this.forceCorrectOrder(this.assignedRoute.tickets || [])
    }];
    
    // Agregar la ruta asignada al conjunto de rutas visibles
    this.visibleRoutes.clear();
    const routeId = this.assignedRoute.routeid || this.assignedRoute.routeId;
    this.visibleRoutes.add(routeId);
  } else {
    this.leafletRoutes = [];
    this.visibleRoutes.clear();
  }
}

// Zoom control methods
changeZoomLevel(zoomLevel: number): void {
  if (this.availableZoomLevels.includes(zoomLevel)) {
    this.currentZoomLevel = zoomLevel;
    // this.updateStaticMap(); // Removed as per edit hint
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

// Location navigation methods
goToPreviousLocation(): void {
  if (this.remainingLocations.length > 0) {
    this.currentLocationIndex = (this.currentLocationIndex - 1 + this.remainingLocations.length) % this.remainingLocations.length;
    // this.updateStaticMap(); // Removed as per edit hint
  }
}

goToNextLocation(): void {
  if (this.remainingLocations.length > 0) {
    this.currentLocationIndex = (this.currentLocationIndex + 1) % this.remainingLocations.length;
    // this.updateStaticMap(); // Removed as per edit hint
  }
}

getCurrentLocation(): any {
  if (this.remainingLocations.length > 0) {
    return this.remainingLocations[this.currentLocationIndex];
  }
  return null;
}

getLocationNavigationInfo(): string {
  if (this.remainingLocations.length === 0) {
    return 'No locations';
  }
  return `${this.currentLocationIndex + 1} of ${this.remainingLocations.length}`;
}

showLocationOnMap(locationIndex: number): void {
  if (locationIndex >= 0 && locationIndex < this.remainingLocations.length) {
    this.currentLocationIndex = locationIndex;
    const loc = this.remainingLocations[locationIndex];
    
    if (loc.lat && loc.lng && this.leafletMap) {
      // Hacer zoom y centrar con animación suave
      this.leafletMap.setCenter(loc.lat, loc.lng);
      
      // Hacer zoom a un nivel más cercano para ver mejor la ubicación
      setTimeout(() => {
        this.leafletMap.setZoom(17); // Zoom más cercano para ver la ubicación
      }, 100);
    }
  }
}

showAllLocations(): void {
  this.currentLocationIndex = 0; // Reset to first location to show all
  
  if (this.leafletMap) {
    // Volver a la vista general con zoom más amplio
    this.leafletMap.setZoom(13); // Zoom más amplio para ver todas las ubicaciones
  }
}

// Método adicional para hacer zoom suave a una ubicación específica
showLocationWithSmoothZoom(locationIndex: number): void {
  if (locationIndex >= 0 && locationIndex < this.remainingLocations.length) {
    this.currentLocationIndex = locationIndex;
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

onFilterChange(): void {
  const filter = this.filterText.trim().toLowerCase();

  if (!filter) {
    // Si se limpia el filtro, mostrar todas las ubicaciones
    this.currentLocationIndex = 0;
    
    // Volver a la vista general cuando se limpia el filtro
    if (this.leafletMap) {
      this.leafletMap.setZoom(13);
    }
    return;
  }

  // Buscar la primera ubicación que coincida con el filtro
  const firstFilteredIndex = this.remainingLocations.findIndex(loc =>
    loc.address.toLowerCase().includes(filter) ||
    loc.job?.toLowerCase().includes(filter)
  );

  if (firstFilteredIndex !== -1) {
    this.currentLocationIndex = firstFilteredIndex;
    const foundLocation = this.remainingLocations[firstFilteredIndex];
    
    // Hacer zoom automático a la ubicación encontrada
    if (foundLocation.lat && foundLocation.lng && this.leafletMap) {
      // Usar zoom suave para mejor experiencia visual
      this.zoomToFilteredLocation(firstFilteredIndex);
    }
  }
}

clearFilter(): void {
  this.filterText = '';
  this.currentLocationIndex = 0;
  
  // Restaurar vista general cuando se limpia el filtro
  if (this.leafletMap) {
    this.leafletMap.setZoom(13);
  }
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

// Método para ordenar tickets según el orden correcto
private sortTicketsByOrder(tickets: any[]): any[] {
  // Crear una copia de los tickets para no modificar el original
  const sortedTickets = [...tickets];
  
  // Ordenar por queue, order, o índice
  sortedTickets.sort((a, b) => {
    const aOrder = a.queue ?? a.order ?? 0;
    const bOrder = b.queue ?? b.order ?? 0;
    return aOrder - bOrder;
  });
  
  // Mapear a formato final
  const finalTickets = sortedTickets.map((t: any, idx: number) => {
    const ticket = {
      ticketId: t.ticketId || t.ticketid,
      address: t.address,
      queue: t.queue ?? t.order ?? idx
    };
    return ticket;
  });
  
  return finalTickets;
}

// Método para forzar el orden correcto basado en remainingLocations
private forceCorrectOrder(tickets: any[]): any[] {
  if (this.remainingLocations.length === 0) {
    return tickets;
  }
  
  // Crear un mapa de ticketId -> orden en remainingLocations
  const orderMap = new Map<number, number>();
  this.remainingLocations.forEach((loc, idx) => {
    const ticketId = (loc as any).ticketid;
    if (ticketId) {
      orderMap.set(ticketId, idx);
    }
  });
  
  // Ordenar tickets según el orden de remainingLocations
  const sortedTickets = tickets.sort((a, b) => {
    const aOrder = orderMap.get(a.ticketId || a.ticketid) ?? 999;
    const bOrder = orderMap.get(b.ticketId || b.ticketid) ?? 999;
    return aOrder - bOrder;
  });
  
  // Mapear a formato final
  const finalTickets = sortedTickets.map((t: any, idx: number) => ({
    ticketId: t.ticketId || t.ticketid,
    address: t.address,
    queue: idx // Usar el índice como queue para mantener el orden
  }));
  
  return finalTickets;
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
}

}

