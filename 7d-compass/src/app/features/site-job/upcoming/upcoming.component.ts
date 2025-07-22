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
    console.log('🔧 ===== FORCE SPECIFIC ROUTE STARTED =====');
    console.log('🔧 FORCING specific route for debugging:', routeId);
    
    try {
      console.log('🔧 Calling routeService.getRouteById...');
      const route = await firstValueFrom(this.routeService.getRouteById(routeId));
      console.log('🔧 Route response received:', route);
      
      if (route) {
        this.assignedRoute = route;
        this.assignedRouteId = route.routeid;
        console.log('🔧 Forced route assigned:', {
          routeid: this.assignedRoute.routeid,
          routecode: this.assignedRoute.routecode,
          type: this.assignedRoute.type,
          hasPolyline: !!this.assignedRoute.encodedpolyline,
          polylineLength: this.assignedRoute.encodedpolyline?.length || 0
        });
        
        // Update the map immediately
        console.log('🔧 Updating static map with forced route...');
        this.updateLeafletRoutes();
      } else {
        console.log('❌ Could not find route with ID:', routeId);
      }
    } catch (error) {
      console.error('❌ Error forcing specific route:', error);
    }
    console.log('🔧 ===== FORCE SPECIFIC ROUTE COMPLETED =====');
  }

  // Method to get the assigned route for the crew
  async getAssignedRoute(): Promise<void> {
    console.log('🛣️ ===== getAssignedRoute STARTED =====');
    console.log('🛣️ Getting assigned route for crew...');
    console.log('🛣️ Current crew type:', this.crewType);
    console.log('🛣️ Remaining locations count:', this.remainingLocations.length);
    
    try {
      // Get all routes to find the one assigned to this crew
      const allRoutes = await firstValueFrom(this.routeService.getAllRoutes());
      console.log('🛣️ All routes received:', allRoutes);
      console.log('🛣️ Number of routes:', allRoutes?.length || 0);
      
      if (allRoutes && allRoutes.length > 0) {
        // Look for routes that match the crew's work type or have tickets that match this crew's tickets
        let assignedRoute = null;
        
        // First, try to find a route that has tickets matching this crew's tickets
        const crewTicketIds = this.remainingLocations.map(loc => (loc as any).ticketid).filter((id: any) => id);
        console.log('🛣️ Crew ticket IDs:', crewTicketIds);
        
        // For debugging, let's also log the first few routes to see their structure
        console.log('🛣️ First route structure:', allRoutes[0]);
        console.log('🛣️ First route tickets:', allRoutes[0]?.tickets);
        
        for (const route of allRoutes) {
          console.log(`🛣️ Checking route ${route.routeid} (${route.type}):`, route.routecode);
          if (route.tickets && Array.isArray(route.tickets)) {
            const routeTicketIds = route.tickets.map((ticket: any) => ticket.ticketId || ticket.ticketid).filter((id: any) => id);
            console.log(`🛣️ Route ${route.routeid} ticket IDs:`, routeTicketIds);
            
            // Check if any tickets match
            const matchingTickets = crewTicketIds.filter((id: any) => routeTicketIds.includes(id));
            if (matchingTickets.length > 0) {
              assignedRoute = route;
              console.log(`✅ Found matching route ${route.routeid} with ${matchingTickets.length} matching tickets`);
              break;
            }
          } else {
            console.log(`🛣️ Route ${route.routeid} has no tickets array`);
          }
        }
        
        // If no matching route found, try to find by type
        if (!assignedRoute) {
          console.log('🛣️ No matching tickets found, trying to find by type...');
          // Look for UPCOMING routes first, then SPOTTER routes
          const upcomingRoute = allRoutes.find((route: any) => route.type === 'UPCOMING');
          const spotterRoute = allRoutes.find((route: any) => route.type === 'SPOTTER');
          
          console.log('🛣️ UPCOMING route found:', !!upcomingRoute);
          console.log('🛣️ SPOTTER route found:', !!spotterRoute);
          
          if (upcomingRoute) {
            assignedRoute = upcomingRoute;
            console.log('✅ Found UPCOMING route:', upcomingRoute.routeid);
          } else if (spotterRoute) {
            assignedRoute = spotterRoute;
            console.log('✅ Found SPOTTER route:', spotterRoute.routeid);
          } else {
            // Use the first available route as fallback
            assignedRoute = allRoutes[0];
            console.log('✅ Using first available route:', allRoutes[0].routeid);
          }
        }
        
        // If still no route found, try to get route ID 3 directly (as a fallback)
        if (!assignedRoute) {
          console.log('��️ No route found by type, trying to get route ID 3 directly...');
          try {
            const route3 = await firstValueFrom(this.routeService.getRouteById(3));
            if (route3) {
              assignedRoute = route3;
              console.log('✅ Found route 3 directly:', route3.routeid);
            }
          } catch (error) {
            console.log('❌ Could not get route 3 directly:', error);
          }
        }
        
        // If still no route, try to find any route with encoded polyline
        if (!assignedRoute) {
          console.log('🛣️ No route found, trying to find any route with polyline...');
          const routeWithPolyline = allRoutes.find((route: any) => route.encodedpolyline && route.encodedpolyline.length > 0);
          if (routeWithPolyline) {
            assignedRoute = routeWithPolyline;
            console.log('✅ Found route with polyline:', routeWithPolyline.routeid);
          }
        }
        
        this.assignedRoute = assignedRoute;
        this.assignedRouteId = assignedRoute?.routeid;
        this.updateLeafletRoutes();
        
        if (assignedRoute) {
          console.log('🛣️ Final assigned route:', {
            routeid: this.assignedRoute.routeid,
            routecode: this.assignedRoute.routecode,
            type: this.assignedRoute.type,
            hasPolyline: !!this.assignedRoute.encodedpolyline,
            polylineLength: this.assignedRoute.encodedpolyline?.length || 0
          });
          
          // For debugging, let's also check if we can force a specific route
          if (!this.assignedRoute.encodedpolyline) {
            console.log('⚠️ Assigned route has no encoded polyline, trying to find one with polyline...');
            const routeWithPolyline = allRoutes.find((route: any) => route.encodedpolyline && route.encodedpolyline.length > 0);
            if (routeWithPolyline) {
              console.log('✅ Found route with polyline:', routeWithPolyline.routeid);
              this.assignedRoute = routeWithPolyline;
              this.assignedRouteId = routeWithPolyline.routeid;
            }
          }
        } else {
          console.log('❌ No route could be assigned');
        }
      } else {
        console.log('❌ No routes available');
      }
    } catch (error) {
      console.error('❌ Error getting assigned route:', error);
    }
    console.log('🛣️ ===== getAssignedRoute COMPLETED =====');
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
  console.log('🚀 getCrewDetails called with crewId:', crewId);
  this.isLoading = true;
  this.crewsService.getCrewDetails(crewId).subscribe({
    next: async (details) => {
      console.log('🚀 getCrewDetails response received, details count:', details?.length || 0);
      this.crewDetails = details;
      
      // 🔍 Debug: Log the first few details to see the data structure
      console.log('🔍 Raw crew details (first 3 items):', details.slice(0, 3));
      if (details.length > 0) {
        console.log('🔍 Sample data object keys:', Object.keys(details[0]));
        console.log('🔍 Sample data object:', details[0]);
      }

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
  lng: data.longitude
});

  }
});

this.remainingLocations = Array.from(uniqueLocationsMap.values());
console.log('🚀 Remaining locations mapped:', this.remainingLocations.length);

// ✅ Geocodificar direcciones antes de generar el mapa
console.log('🚀 Starting geocoding process...');
this.geocodeRemainingLocations().then(async () => {
  console.log('🚀 Geocoding completed, getting assigned route...');
  // Get assigned route for the crew
  await this.getAssignedRoute();
  console.log('🚀 Assigned route process completed, updating static map...');
  this.updateLeafletRoutes();
}).catch(error => {
  console.error('❌ Error in geocoding or route assignment:', error);
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

// Helper method to format address from wayfinding data
formatAddress(data: any): string {
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

private async geocodeRemainingLocations(): Promise<void> {
  console.log('🌍 Starting geocoding process...');
  console.log('📍 Locations to geocode:', this.remainingLocations.length);

  for (const loc of this.remainingLocations) {
    if (!loc.lat || !loc.lng) {
      console.log(`🌍 Geocoding: ${loc.address}`);
      
      try {
        const encodedAddress = encodeURIComponent(loc.address);
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${this.GOOGLE_MAPS_API_KEY}`;

        console.log(`🌍 Geocoding URL: ${url.substring(0, 100)}...`);

        const response: any = await firstValueFrom(this.http.get(url));
        
        if (response.status === 'OK' && response.results.length > 0) {
          loc.lat = response.results[0].geometry.location.lat;
          loc.lng = response.results[0].geometry.location.lng;
          console.log(`✅ Geocoded successfully: ${loc.address} → ${loc.lat}, ${loc.lng}`);
        } else {
          console.warn(`⚠️ Geocoding failed for: ${loc.address} - Status: ${response.status}`);
        }
      } catch (err) {
        console.error(`❌ Error geocoding ${loc.address}:`, err);
      }
    } else {
      console.log(`✅ Already has coordinates: ${loc.address} → ${loc.lat}, ${loc.lng}`);
    }
  }

  console.log('🌍 Geocoding process completed');
  console.log('📍 Final locations with coordinates:', this.remainingLocations.filter(loc => loc.lat && loc.lng).length);
}


goToCurrent(location: any) {
  const storedUserId = Number(localStorage.getItem('userId'));
  const person = this.employeeList.find(p => p.userid === storedUserId);
  const crewId = person?.crewid || 0;

  console.log('🧑‍🔧 Guardando crewId:', crewId);
  console.log('📍 Guardando ubicación con descripción:', location.description);
  console.log('🛣️ Guardando routeCode:', location.routeCode);

  localStorage.setItem('selectedLocation', JSON.stringify(location));
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
  if (this.assignedRoute && this.assignedRoute.encodedpolyline) {
    this.leafletRoutes = [{
      routeId: this.assignedRoute.routeid,
      routeCode: this.assignedRoute.routecode,
      type: this.assignedRoute.type,
      encodedPolyline: this.assignedRoute.encodedpolyline,
      tickets: (this.assignedRoute.tickets || []).map((t: any, idx: number) => ({
        ticketId: t.ticketId || t.ticketid,
        address: t.address,
        queue: t.queue ?? idx
      }))
    }];
  } else {
    this.leafletRoutes = [];
  }
}

// Zoom control methods
changeZoomLevel(zoomLevel: number): void {
  if (this.availableZoomLevels.includes(zoomLevel)) {
    this.currentZoomLevel = zoomLevel;
    console.log(`🔍 Changing zoom level to: ${zoomLevel}`);
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
    console.log(`⬅️ Going to previous location: ${this.currentLocationIndex + 1}/${this.remainingLocations.length}`);
    // this.updateStaticMap(); // Removed as per edit hint
  }
}

goToNextLocation(): void {
  if (this.remainingLocations.length > 0) {
    this.currentLocationIndex = (this.currentLocationIndex + 1) % this.remainingLocations.length;
    console.log(`➡️ Going to next location: ${this.currentLocationIndex + 1}/${this.remainingLocations.length}`);
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
      this.leafletMap.setCenter(loc.lat, loc.lng);
    }
    console.log(`🎯 Centrado en la ubicación ${locationIndex + 1}: ${loc.address}`);
  }
}

showAllLocations(): void {
  this.currentLocationIndex = 0; // Reset to first location to show all
  console.log('🗺️ Showing all locations on map');
  // this.updateStaticMap(); // Removed as per edit hint
}

onFilterChange(): void {
  const filter = this.filterText.trim().toLowerCase();
  
  if (!filter) {
    // Si se limpia el filtro, mostrar todas las ubicaciones
    this.currentLocationIndex = 0;
    console.log('🔍 Filter cleared: showing all locations');
    // this.updateStaticMap(); // Removed as per edit hint
    return;
  }

  // Buscar la primera ubicación que coincida con el filtro
  const firstFilteredIndex = this.remainingLocations.findIndex(loc => 
    loc.address.toLowerCase().includes(filter) ||
    loc.job?.toLowerCase().includes(filter)
  );

  if (firstFilteredIndex !== -1) {
    this.currentLocationIndex = firstFilteredIndex;
    console.log(`🔍 Filter applied: showing location ${firstFilteredIndex + 1} (${this.remainingLocations[firstFilteredIndex].address})`);
    // this.updateStaticMap(); // Removed as per edit hint
  } else {
    console.log('🔍 No locations found matching filter');
    // Mantener el mapa actual pero mostrar mensaje
  }
}

clearFilter(): void {
  this.filterText = '';
  this.currentLocationIndex = 0;
  console.log('🔍 Filter cleared: showing all locations');
  // this.updateStaticMap(); // Removed as per edit hint
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
  console.log('🔍 === UPCOMING MAP DEBUG INFO ===');
  console.log('📍 Remaining locations:', this.remainingLocations);
  console.log('📍 Current location index:', this.currentLocationIndex);
  console.log('📍 Current location:', this.getCurrentLocation());
  console.log('📍 Navigation info:', this.getLocationNavigationInfo());
  console.log('📍 Static map URL:', this.staticMapUrl);
  console.log('📍 Current zoom level:', this.currentZoomLevel);
  console.log('📍 Available zoom levels:', this.availableZoomLevels);
  console.log('📍 Map dimensions:', `${this.staticMapWidth}x${this.staticMapHeight}`);
  console.log('🔍 === END UPCOMING MAP DEBUG ===');
  
  // Show all locations on map
  this.showAllLocations();
}

}

