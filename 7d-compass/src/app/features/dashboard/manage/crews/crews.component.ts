import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DashboardLayoutComponent } from "../../../../shared/dashboard-layout/dashboard-layout.component";
import { CardWithButtonComponent } from '../../../../shared/card-with-button/card-with-button.component';
import { DataTableComponent } from '../../../../shared/data-table/data-table.component';
import { ConfirmationDialogComponent } from '../../../../shared/confirmation-dialog/confirmation-dialog.component';
import { SearchDialogComponent } from '../../../../shared/search-dialog/search-dialog.component';
import { CrewsService } from '../../../../core/services/human-resources/crew.service';
import { CrewEmployeesService } from '../../../../core/services/human-resources/crewemployees.service';
import { BaseDashboardComponent } from '../../../../shared/base-dashboard.component';
import { FilterService } from '../../../../core/services/filter.service';
import { FabButtonComponent } from '../../../../shared/fab-button/fab-button.component';
import { UsedInventoryService } from '../../../../core/services/material/used-inventory.service';
import { UsedEquipmentService } from '../../../../core/services/material/used-equipment.service';
import { InventoryService } from '../../../../core/services/material/inventory.service';
import { EquipmentService } from '../../../../core/services/material/equipment.service';
import { RoutesService } from '../../../../core/services/route/route.service';
import { forkJoin, map, catchError, of } from 'rxjs';

interface ColumnDefinition {
  name: string;
  header: string;
  cell: (element: any) => string;
  isActionColumn?: boolean;
}

@Component({
  selector: 'app-crews',
  standalone: true,
  imports: [
    DashboardLayoutComponent,
    CardWithButtonComponent,
    DataTableComponent,
    FabButtonComponent,
  ],
  templateUrl: './crews.component.html',
  styleUrl: './crews.component.scss'
})
export class CrewsComponent extends BaseDashboardComponent implements OnInit {
  columns: ColumnDefinition[] = [
    // { name: 'crewid', header: 'ID', cell: (crew) => `${crew.crewid ?? ''}` }, // ✅ OCULTADA
    { name: 'type', header: 'Type', cell: (crew) => crew.type },
    { name: 'routecode', header: 'Route Code', cell: (crew) => crew.routecode || this.formatRouteCode(crew.routeid) },
    { name: 'employees', header: 'Team Members', cell: (crew) => this.formatEmployees(crew.employees) },
    { name: 'leader', header: 'Team Leader', cell: (crew) => this.getLeader(crew.employees) },
    { name: 'inventory', header: 'Assigned Inventory', cell: (crew) => this.formatAssignedInventory(crew.crewid) },
    { name: 'equipment', header: 'Assigned Equipment', cell: (crew) => this.formatAssignedEquipment(crew.crewid) },
    { name: 'actions', header: 'Actions', cell: () => '', isActionColumn: true }
  ];

  tableData: any[] = [];
  
  // Propiedades para almacenar datos de inventario y equipamiento
  usedInventoryData: any[] = [];
  usedEquipmentData: any[] = [];
  inventoryData: any[] = [];
  equipmentData: any[] = [];
  routesData: any[] = []; // ✅ Nueva propiedad para almacenar rutas

  constructor(
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private crewsService: CrewsService,
    private crewEmployeesService: CrewEmployeesService,
    private usedInventoryService: UsedInventoryService,
    private usedEquipmentService: UsedEquipmentService,
    private inventoryService: InventoryService,
    private equipmentService: EquipmentService,
    private routesService: RoutesService,
    filterService: FilterService
  ) {
    super(filterService);
  }

  override ngOnInit(): void {
    super.ngOnInit();
    this.loadCrews();
  }

  protected override loadData(): void {
    // Initialize data for filtering
    this.allData = [...this.tableData];
    this.filteredData = [...this.allData];
  }

  // Override text search to include crew fields
  protected override matchesTextSearch(item: any, searchTerm: string): boolean {
    const searchableFields = ['crewid', 'type'];

    return searchableFields.some(field => {
      const value = this.getNestedValue(item, field);
      if (value) {
        return String(value).toLowerCase().includes(searchTerm);
      }
      return false;
    }) ||
    // ✅ También buscar en routecode
    (item.routeId && this.formatRouteCode(item.routeId).toLowerCase().includes(searchTerm)) ||
    // Also search in employee names
    (item.employees && Array.isArray(item.employees) &&
     item.employees.some((emp: any) => {
       const fullName = emp.fullName || `${emp.firstname} ${emp.lastname}`;
       return fullName.toLowerCase().includes(searchTerm);
     })) ||
    // Search in equipment names
    (item.equipment && Array.isArray(item.equipment) &&
     item.equipment.some((eq: any) => eq.equipmentName.toLowerCase().includes(searchTerm)));
  }

  // Getter for filtered crew data
  get filteredCrewData() {
    return this.filteredData;
  }

  private loadCrews(): void {
    // Cargar crews y datos relacionados en paralelo
    import('rxjs').then(({ forkJoin }) => {
      forkJoin({
        crews: this.crewsService.getCrewsWithEmployees(),
        usedInventory: this.usedInventoryService.getAllUsedInventory(),
        usedEquipment: this.usedEquipmentService.getAllUsedEquipment(),
        inventory: this.inventoryService.getAllInventory(),
        equipment: this.equipmentService.getAllEquipment()
        // ✅ Remover routes del forkJoin para cargarlo por separado
      }).subscribe({
        next: (data) => {
          this.tableData = data.crews;
          this.usedInventoryData = data.usedInventory;
          this.usedEquipmentData = data.usedEquipment;
          this.inventoryData = data.inventory;
          this.equipmentData = data.equipment;
          
          // ✅ DEBUG: Log de datos cargados
          console.log('📦 Crews loaded:', this.tableData.length);
          console.log('📦 UsedInventory loaded:', this.usedInventoryData.length);
          console.log('📦 Inventory loaded:', this.inventoryData.length);
          console.log('📦 UsedEquipment loaded:', this.usedEquipmentData.length);
          console.log('📦 Equipment loaded:', this.equipmentData.length);
          
          // ✅ DEBUG: Mostrar estructura completa de los primeros crews
          if (this.tableData.length > 0) {
            console.log('📦 Sample crew data (complete structure):', this.tableData[0]);
            console.log('📦 All crew properties:', Object.keys(this.tableData[0]));
          }
          
          // ✅ DEBUG: Sample data
          if (this.usedInventoryData.length > 0) {
            console.log('📦 Sample usedInventory:', this.usedInventoryData[0]);
          }
          if (this.inventoryData.length > 0) {
            console.log('📦 Sample inventory:', this.inventoryData[0]);
          }
          if (this.usedEquipmentData.length > 0) {
            console.log('📦 Sample usedEquipment:', this.usedEquipmentData[0]);
          }
          if (this.equipmentData.length > 0) {
            console.log('📦 Sample equipment:', this.equipmentData[0]);
          }
          
          // ✅ DEBUG: Verificar si equipment data está vacío
          if (this.equipmentData.length === 0) {
            console.warn('⚠️ Equipment data is empty - this might cause equipment names not to display');
          }
          
          // ✅ DEBUG: Equipment data
          this.debugEquipmentData();
          
          this.allData = [...this.tableData];
          this.filteredData = [...this.allData];
          
          // ✅ Cargar rutas por separado después de cargar crews
          this.loadRoutesSeparately();
          
          // ✅ Cargar detalles de crews con información de rutas
          this.loadCrewsWithRouteDetails();
        },
        error: (error) => {
          console.error('Error loading crews and related data:', error);
          // Si falla la carga múltiple, intentar solo con crews
          this.crewsService.getCrewsWithEmployees().subscribe({
            next: (data) => {
              this.tableData = data;
              this.allData = [...this.tableData];
              this.filteredData = [...this.allData];
              
              // ✅ Intentar cargar rutas por separado
              this.loadRoutesSeparately();
              
              // ✅ Cargar detalles de crews con información de rutas
              this.loadCrewsWithRouteDetails();
            },
            error: (crewError) => {
              console.error('Error loading crews:', crewError);
            }
          });
        }
      });
    });
  }

  private loadCrewsWithRouteDetails(): void {
    console.log('🛣️ Loading crew details with route information...');
    
    // ✅ Cargar detalles de cada crew para obtener la información de rutas
    const crewDetailsPromises = this.tableData.map(crew => {
      const crewId = crew.crewid || crew.crewId;
      if (!crewId) {
        console.warn('⚠️ Crew ID is missing for route loading:', crew);
        return Promise.resolve({ ...crew, routeid: null, routecode: null });
      }
      
      return this.crewsService.getCrewDetails(crewId).toPromise()
        .then(crewDetails => {
          console.log(`🛣️ Crew ${crewId} details (raw):`, crewDetails);
          
          // ✅ Manejar múltiples filas - tomar la primera fila que tenga routeid
          let routeid = null;
          let routecode = null;
          
          if (Array.isArray(crewDetails) && crewDetails.length > 0) {
            // ✅ Buscar la primera fila que tenga routeid
            const firstRowWithRoute = crewDetails.find(row => row.routeid || row.routeId);
            if (firstRowWithRoute) {
              routeid = firstRowWithRoute.routeid || firstRowWithRoute.routeId;
              routecode = firstRowWithRoute.routecode || firstRowWithRoute.routeCode;
              console.log(`🛣️ Crew ${crewId} - Found route info:`, { routeid, routecode });
            } else {
              console.log(`🛣️ Crew ${crewId} - No route info found in any row`);
            }
          } else if (crewDetails && typeof crewDetails === 'object') {
            // ✅ Si es un objeto único
            routeid = crewDetails.routeid || crewDetails.routeId;
            routecode = crewDetails.routecode || crewDetails.routeCode;
            console.log(`🛣️ Crew ${crewId} - Single object route info:`, { routeid, routecode });
          }
          
          return {
            ...crew,
            routeid,
            routecode
          };
        })
        .catch(error => {
          console.error(`❌ Error loading details for crew ${crewId}:`, error);
          return { ...crew, routeid: null, routecode: null };
        });
    });

    Promise.all(crewDetailsPromises).then(crewsWithRoutes => {
      this.tableData = crewsWithRoutes;
      this.allData = [...this.tableData];
      this.filteredData = [...this.allData];
      
      console.log('📦 Crews with route details loaded:', this.tableData.length);
      
      // ✅ DEBUG: Verificar que los crews ahora tienen routeid
      this.tableData.forEach(crew => {
        console.log(`🛣️ Crew ${crew.crewid} - routeid: ${crew.routeid}, routecode: ${crew.routecode}`);
      });
    });
  }

  private loadRoutesSeparately(): void {
    console.log('🛣️ Loading routes separately...');
    this.routesService.getAllRoutes().subscribe({
      next: (data) => {
        console.log('🛣️ Raw routes response:', data);
        
        // ✅ Manejar diferentes formatos de respuesta
        if (Array.isArray(data)) {
          this.routesData = data;
          console.log('🛣️ Routes loaded as array:', this.routesData.length);
        } else if (data && Array.isArray(data.routes)) {
          this.routesData = data.routes;
          console.log('🛣️ Routes loaded from data.routes:', this.routesData.length);
        } else if (data && Array.isArray(data.data)) {
          this.routesData = data.data;
          console.log('🛣️ Routes loaded from data.data:', this.routesData.length);
        } else {
          this.routesData = [];
          console.warn('⚠️ Unexpected routes data format:', data);
        }
        
        console.log('📦 Routes loaded separately:', this.routesData.length);
        if (this.routesData.length > 0) {
          console.log('📦 Sample route data:', this.routesData[0]);
        } else {
          console.warn('⚠️ No routes found in response');
        }
        
        // ✅ DEBUG: Routes data
        this.debugRoutesData();
      },
      error: (error) => {
        console.error('❌ Error loading routes separately:', error);
        console.error('❌ Error details:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          url: error.url
        });
        this.routesData = [];
      }
    });
  }

  // ✅ MÉTODO PARA DEBUGGEAR EQUIPMENT DATA
  private debugEquipmentData(): void {
    console.log('🔍 Equipment Debug:');
    console.log('  - Equipment data length:', this.equipmentData.length);
    console.log('  - UsedEquipment data length:', this.usedEquipmentData.length);
    
    if (this.equipmentData.length > 0) {
      console.log('  - Sample equipment:', this.equipmentData[0]);
    }
    
    if (this.usedEquipmentData.length > 0) {
      console.log('  - Sample usedEquipment:', this.usedEquipmentData[0]);
    }
    
    // ✅ Verificar si hay crews con equipment asignado
    this.tableData.forEach(crew => {
      const crewId = crew.crewid || crew.crewId;
      const crewUsedEquipment = this.usedEquipmentData.filter(ue => 
        ue.crewId === crewId || 
        ue.crewid === crewId || 
        ue.CrewId === crewId
      );
      
      if (crewUsedEquipment.length > 0) {
        console.log(`  - Crew ${crewId} has ${crewUsedEquipment.length} equipment assignments`);
        crewUsedEquipment.forEach(ue => {
          const equipment = this.equipmentData.find(eq => 
            eq.equipmentId === ue.equipmentid || 
            eq.equipmentid === ue.equipmentid ||
            eq.id === ue.equipmentid
          );
          console.log(`    * UsedEquipment: ${ue.equipmentid}, Found equipment:`, equipment);
          if (equipment) {
            console.log(`      Equipment name: ${equipment.equipmentname}`);
          }
        });
      }
    });
  }

  // ✅ MÉTODO PARA DEBUGGEAR ROUTES DATA
  private debugRoutesData(): void {
    console.log('🛣️ Routes Debug:');
    console.log('  - Routes data length:', this.routesData.length);
    
    if (this.routesData.length > 0) {
      console.log('  - Sample route:', this.routesData[0]);
    }
    
    // ✅ Verificar si hay crews con route asignado (usar routeid en minúsculas)
    this.tableData.forEach(crew => {
      const crewId = crew.crewid || crew.crewId;
      
      console.log(`  - Crew ${crewId} complete data:`, crew);
      console.log(`  - Crew ${crewId} all properties:`, Object.keys(crew));
      
      // ✅ Buscar cualquier propiedad que contenga "route"
      const routeProperties = Object.keys(crew).filter(key => key.toLowerCase().includes('route'));
      console.log(`  - Crew ${crewId} route-related properties:`, routeProperties);
      
      // ✅ Buscar específicamente routeid en minúsculas
      const routeId = crew.routeid || crew.routeId || crew.route_id || crew.routeId;
      
      console.log(`  - Crew ${crewId} routeId value:`, routeId);
      console.log(`  - Crew ${crewId} crew.routeid:`, crew.routeid);
      console.log(`  - Crew ${crewId} crew.routeId:`, crew.routeId);
      
      if (routeId) {
        console.log(`  - Crew ${crewId} has routeId: ${routeId}`);
        const route = this.routesData.find(r => 
          r.routeId === routeId || 
          r.routeid === routeId || 
          r.id === routeId
        );
        
        if (route) {
          console.log(`    * Found route: ${route.routecode || route.routeCode || 'N/A'}`);
        } else {
          console.log(`    * Route not found for routeId: ${routeId}`);
        }
      } else {
        console.log(`  - Crew ${crewId} has no route assigned`);
      }
    });
  }

  private formatEmployees(employees: any[] = []): string {
    return employees.map(e => `${e.fullName || e.firstname + ' ' + e.lastname}`).join(', ');
  }

  private getLeader(employees: any[] = []): string {
    const leader = employees.find(e => e.crewLeader);
    return leader ? (leader.fullName || `${leader.firstname} ${leader.lastname}`) : 'No leader';
  }

  private formatEquipment(equipment: any[] = []): string {
    return equipment.map(e => e.equipmentName).join(', ');
  }

  private formatAssignedInventory(crewId: number): string {
    if (!crewId || this.usedInventoryData.length === 0 || this.inventoryData.length === 0) {
      return 'No inventory assigned';
    }

    // ✅ Filtrar inventario usado por este crew (usar nombres correctos de los logs)
    const crewUsedInventory = this.usedInventoryData.filter(ui => 
      ui.crewId === crewId || 
      ui.crewid === crewId || 
      ui.CrewId === crewId
    );
    
    if (crewUsedInventory.length === 0) {
      return 'No inventory assigned';
    }

    // ✅ Mapear a nombres de inventario (usar nombres correctos de los logs)
    const inventoryNames = crewUsedInventory.map(ui => {
      const inventory = this.inventoryData.find(inv => 
        inv.inventoryId === ui.inventoryid || 
        inv.inventoryid === ui.inventoryid ||
        inv.id === ui.inventoryid
      );
      return inventory ? inventory.name : `Inventory ID: ${ui.inventoryid}`;
    });

    return inventoryNames.join(', ');
  }

  private formatAssignedEquipment(crewId: number): string {
    if (!crewId || this.usedEquipmentData.length === 0 || this.equipmentData.length === 0) {
      return 'No equipment assigned';
    }

    // ✅ Filtrar equipamiento usado por este crew (usar nombres correctos de los logs)
    const crewUsedEquipment = this.usedEquipmentData.filter(ue => 
      ue.crewId === crewId || 
      ue.crewid === crewId || 
      ue.CrewId === crewId
    );
    
    if (crewUsedEquipment.length === 0) {
      return 'No equipment assigned';
    }

    // ✅ Mapear a nombres de equipamiento (usar equipmentname en minúsculas)
    const equipmentNames = crewUsedEquipment.map(ue => {
      const equipment = this.equipmentData.find(eq => 
        eq.equipmentId === ue.equipmentid || 
        eq.equipmentid === ue.equipmentid ||
        eq.id === ue.equipmentid
      );
      return equipment ? equipment.equipmentname : `Equipment ID: ${ue.equipmentid}`;
    });

    return equipmentNames.join(', ');
  }

  private formatRouteCode(routeId: number): string {
    if (!routeId || this.routesData.length === 0) {
      return 'No route assigned';
    }

    // ✅ Buscar la ruta por diferentes posibles nombres de propiedades (usar routeid en minúsculas)
    const route = this.routesData.find(r => 
      r.routeId === routeId || 
      r.routeid === routeId || 
      r.id === routeId
    );

    if (route) {
      // ✅ Obtener el routecode de diferentes posibles nombres de propiedades (usar routecode en minúsculas)
      const routeCode = route.routeCode || route.routecode || route.code || 'N/A';
      console.log(`🛣️ FormatRouteCode: routeId=${routeId}, found route:`, route, `routeCode: ${routeCode}`);
      return routeCode;
    }

    // ✅ Si no se encuentra la ruta, mostrar el ID
    console.log(`🛣️ FormatRouteCode: routeId=${routeId}, route not found`);
    return `Route ID: ${routeId}`;
  }

  // ✅ MÉTODO PARA VERIFICAR SI UN CREW TIENE RUTA ASIGNADA
  private hasRouteAssigned(crew: any): boolean {
    return !!(crew.routeId || crew.routeid);
  }

  // ✅ MÉTODO PARA DEBUGGEAR
  private debugCrewData(crew: any, action: string): void {
    console.log(`🔍 Debug ${action}:`, {
      crew: crew,
      crewId: crew.crewid || crew.crewId,
      type: crew.type,
      routeId: crew.routeId || crew.routeid,
      hasRoute: this.hasRouteAssigned(crew),
      routeCode: this.formatRouteCode(crew.routeId || crew.routeid),
      hasEmployees: !!crew.employees,
      employeeCount: crew.employees?.length || 0
    });
    
    // ✅ DEBUG: Verificar inventory y equipment para este crew
    const crewId = crew.crewid || crew.crewId;
    if (crewId) {
      const crewUsedInventory = this.usedInventoryData.filter(ui => 
        ui.crewId === crewId || 
        ui.crewid === crewId || 
        ui.CrewId === crewId
      );
      const crewUsedEquipment = this.usedEquipmentData.filter(ue => 
        ue.crewId === crewId || 
        ue.crewid === crewId || 
        ue.CrewId === crewId
      );
      
      console.log(`🔍 Crew ${crewId} - UsedInventory:`, crewUsedInventory);
      console.log(`🔍 Crew ${crewId} - UsedEquipment:`, crewUsedEquipment);
    }
  }

  onEdit(crew: any) {
    this.debugCrewData(crew, 'EDIT');
    
    const dialogRef = this.dialog.open(SearchDialogComponent, {
      width: '500px',
      data: {
        title: `Edit Crew: ${crew.type}`,
        data: {
          ...crew,
          teamMembers: this.formatEmployees(crew.employees),
          equipmentList: this.formatEquipment(crew.equipment)
        },
        excludedFields: ['crewid', 'employees', 'equipment', 'deletedat', 'updatedat', 'createdat', 'createdby', 'updatedby']
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // ✅ Llamar al servicio para actualizar en el backend
        const crewId = crew.crewid || crew.crewId;
        if (crewId) {
          this.crewsService.updateCrew(crewId, {
            type: result.type || crew.type,
            workedHours: result.workedHours || crew.workedHours,
            photo: result.photo || crew.photo,
            updatedBy: this.getCurrentUserId()
          }).subscribe({
            next: (updatedCrew) => {
              // ✅ Actualizar en la tabla local
              const index = this.tableData.findIndex(c => (c.crewid || c.crewId) === crewId);
              if (index !== -1) {
                this.tableData[index] = {
                  ...this.tableData[index],
                  ...updatedCrew
                };
                this.allData = [...this.tableData];
                this.applyFilters();
                console.log('✅ Crew updated successfully:', updatedCrew);
                
                // ✅ Mostrar mensaje de éxito
                this.snackBar.open('✅ Crew updated successfully!', 'Close', {
                  duration: 3000,
                  horizontalPosition: 'center',
                  verticalPosition: 'top',
                  panelClass: ['success-snackbar']
                });
              }
            },
            error: (err) => {
              console.error('❌ Error updating crew:', err);
              
              // ✅ Mostrar mensaje de error
              this.snackBar.open('❌ Error updating crew. Please try again.', 'Close', {
                duration: 5000,
                horizontalPosition: 'center',
                verticalPosition: 'top',
                panelClass: ['error-snackbar']
              });
            }
          });
        }
      }
    });
  }

  onDelete(crew: any) {
    this.debugCrewData(crew, 'DELETE');
    
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '450px',
      disableClose: true,
      panelClass: 'confirmation-dialog',
      data: {
        title: 'Delete Crew',
        message: `You are about to permanently delete the ${crew.type} crew and remove all employee assignments. This action cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Keep Crew'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        const crewId = crew.crewid || crew.crewId;
        if (crewId) {
          console.log(`🗑️ Starting deletion process for crew ${crewId}...`);
          
          // ✅ Primero eliminar todas las relaciones de empleados con este crew
          this.deleteCrewEmployeeRelations(crewId, crew.employees || []).then(() => {
            // ✅ Después eliminar el crew
            this.crewsService.deleteCrew(crewId).subscribe({
              next: (response) => {
                // ✅ Eliminar de la tabla local
                this.tableData = this.tableData.filter(c => (c.crewid || c.crewId) !== crewId);
                this.allData = [...this.tableData];
                this.applyFilters();
                console.log('✅ Crew deleted successfully:', response);
                
                // ✅ Mostrar mensaje de éxito
                this.snackBar.open('✅ Crew and employee assignments deleted successfully!', 'Close', {
                  duration: 3000,
                  horizontalPosition: 'center',
                  verticalPosition: 'top',
                  panelClass: ['success-snackbar']
                });
              },
              error: (err) => {
                console.error('❌ Error deleting crew:', err);
                
                // ✅ Mostrar mensaje de error
                this.snackBar.open('❌ Error deleting crew. Please try again.', 'Close', {
                  duration: 5000,
                  horizontalPosition: 'center',
                  verticalPosition: 'top',
                  panelClass: ['error-snackbar']
                });
              }
            });
          }).catch(error => {
            console.error('❌ Error deleting crew employee relations:', error);
            this.snackBar.open('❌ Error removing employee assignments. Please try again.', 'Close', {
              duration: 5000,
              horizontalPosition: 'center',
              verticalPosition: 'top',
              panelClass: ['error-snackbar']
            });
          });
        } else {
          console.error('❌ No crew ID found for deletion');
        }
      }
    });
  }

  // ✅ NUEVO MÉTODO: Eliminar todas las relaciones de empleados con un crew
  private async deleteCrewEmployeeRelations(crewId: number, employees: any[]): Promise<void> {
    console.log(`🗑️ Deleting employee relations for crew ${crewId}...`);
    
    if (!employees || employees.length === 0) {
      console.log(`📝 No employees to remove from crew ${crewId}`);
      return Promise.resolve();
    }

    const deletePromises = employees.map(employee => {
      const employeeId = employee.employeeid || employee.employeeId || employee.id;
      if (!employeeId) {
        console.warn(`⚠️ Employee ID not found for employee:`, employee);
        return Promise.resolve();
      }

      console.log(`🗑️ Removing employee ${employeeId} from crew ${crewId}...`);
      
      return this.crewEmployeesService.deleteCrewEmployee(crewId, employeeId).toPromise()
        .then(response => {
          console.log(`✅ Employee ${employeeId} removed from crew ${crewId}:`, response);
          return response;
        })
        .catch(error => {
          console.error(`❌ Error removing employee ${employeeId} from crew ${crewId}:`, error);
          // No lanzar error aquí para continuar con los demás empleados
          return null;
        });
    });

    try {
      await Promise.all(deletePromises);
      console.log(`✅ All employee relations deleted for crew ${crewId}`);
    } catch (error) {
      console.error(`❌ Error in deleteCrewEmployeeRelations for crew ${crewId}:`, error);
      throw error;
    }
  }

  onCreateCrew(newCrew: any): void {
    const crewToCreate = {
      ...newCrew,
      createdBy: this.getCurrentUserId(),
      updatedBy: this.getCurrentUserId()
    };

    this.crewsService.createCrew(crewToCreate).subscribe({
      next: (createdCrew) => {
        this.tableData = [...this.tableData, createdCrew];
        this.allData = [...this.tableData];
        this.applyFilters();
        console.log('Crew created:', createdCrew);
      },
      error: (err) => {
        console.error('Error creating crew:', err);
      }
    });
  }

  // Helper method to get current user ID (should be replaced with actual auth service)
  private getCurrentUserId(): number {
    // TODO: Implement this when auth service is available
    // return this.authService.getCurrentUser()?.id || 1;
    return 1; // Default for now
  }
}