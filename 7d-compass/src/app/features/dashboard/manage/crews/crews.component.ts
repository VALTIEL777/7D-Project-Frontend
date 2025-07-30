import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { DashboardLayoutComponent } from "../../../../shared/dashboard-layout/dashboard-layout.component";
import { CardWithButtonComponent } from '../../../../shared/card-with-button/card-with-button.component';
import { DataTableComponent } from '../../../../shared/data-table/data-table.component';
import { ConfirmationDialogComponent } from '../../../../shared/confirmation-dialog/confirmation-dialog.component';
import { SearchDialogComponent } from '../../../../shared/search-dialog/search-dialog.component';
import { CrewsService } from '../../../../core/services/human-resources/crew.service';
import { BaseDashboardComponent } from '../../../../shared/base-dashboard.component';
import { FilterService } from '../../../../core/services/filter.service';
import { FabButtonComponent } from '../../../../shared/fab-button/fab-button.component';
import { UsedInventoryService } from '../../../../core/services/material/used-inventory.service';
import { UsedEquipmentService } from '../../../../core/services/material/used-equipment.service';
import { InventoryService } from '../../../../core/services/material/inventory.service';
import { EquipmentService } from '../../../../core/services/material/equipment.service';

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
    { name: 'crewId', header: 'ID', cell: (crew) => `${crew.crewid ?? ''}` },
    { name: 'type', header: 'Type', cell: (crew) => crew.type },
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

  constructor(
    private dialog: MatDialog,
    private crewsService: CrewsService,
    private usedInventoryService: UsedInventoryService,
    private usedEquipmentService: UsedEquipmentService,
    private inventoryService: InventoryService,
    private equipmentService: EquipmentService,
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
      }).subscribe({
        next: (data) => {
          this.tableData = data.crews;
          this.usedInventoryData = data.usedInventory;
          this.usedEquipmentData = data.usedEquipment;
          this.inventoryData = data.inventory;
          this.equipmentData = data.equipment;
          
          this.allData = [...this.tableData];
          this.filteredData = [...this.allData];
        },
        error: (error) => {
          console.error('Error loading crews and related data:', error);
          // Si falla la carga múltiple, intentar solo con crews
          this.crewsService.getCrewsWithEmployees().subscribe({
            next: (data) => {
              this.tableData = data;
              this.allData = [...this.tableData];
              this.filteredData = [...this.allData];
            },
            error: (crewError) => {
              console.error('Error loading crews:', crewError);
            }
          });
        }
      });
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

    // Filtrar inventario usado por este crew
    const crewUsedInventory = this.usedInventoryData.filter(ui => ui.crewId === crewId);
    
    if (crewUsedInventory.length === 0) {
      return 'No inventory assigned';
    }

    // Mapear a nombres de inventario
    const inventoryNames = crewUsedInventory.map(ui => {
      const inventory = this.inventoryData.find(inv => inv.inventoryId === ui.inventoryId);
      return inventory ? inventory.name : `Inventory ID: ${ui.inventoryId}`;
    });

    return inventoryNames.join(', ');
  }

  private formatAssignedEquipment(crewId: number): string {
    if (!crewId || this.usedEquipmentData.length === 0 || this.equipmentData.length === 0) {
      return 'No equipment assigned';
    }

    // Filtrar equipamiento usado por este crew
    const crewUsedEquipment = this.usedEquipmentData.filter(ue => ue.crewId === crewId);
    
    if (crewUsedEquipment.length === 0) {
      return 'No equipment assigned';
    }

    // Mapear a nombres de equipamiento
    const equipmentNames = crewUsedEquipment.map(ue => {
      const equipment = this.equipmentData.find(eq => eq.equipmentId === ue.equipmentId);
      return equipment ? equipment.equipmentName : `Equipment ID: ${ue.equipmentId}`;
    });

    return equipmentNames.join(', ');
  }

  onEdit(crew: any) {
    const dialogRef = this.dialog.open(SearchDialogComponent, {
      width: '500px',
      data: {
        title: `Edit Crew: ${crew.type}`,
        data: {
          ...crew,
          teamMembers: this.formatEmployees(crew.employees),
          equipmentList: this.formatEquipment(crew.equipment)
        },
        excludedFields: ['crewId', 'employees', 'equipment', 'deletedat', 'updatedat', 'createdat', 'createdby', 'updatedby']
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const index = this.tableData.findIndex(c => c.crewId === crew.crewId);
        if (index !== -1) {
          this.tableData[index] = {
            ...this.tableData[index],
            type: result.type || this.tableData[index].type,
            workedHours: result.workedHours || this.tableData[index].workedHours,
            photo: result.photo || this.tableData[index].photo
          };
          this.allData = [...this.tableData];
          this.applyFilters();
        }
      }
    });
  }

  onDelete(crew: any) {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '450px',
      disableClose: true,
      panelClass: 'confirmation-dialog',
      data: {
        title: 'Delete Crew',
        message: `You are about to permanently delete the ${crew.type} crew. This action cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Keep Crew'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.tableData = this.tableData.filter(c => c.crewId !== crew.crewId);
        this.allData = [...this.tableData];
        this.applyFilters();
        console.log('Crew deleted:', crew);
        // Aquí podrías también llamar a this.crewsService.deleteCrew(crew.crewId)
      }
    });
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
