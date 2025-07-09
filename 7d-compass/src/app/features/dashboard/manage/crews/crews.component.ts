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
    { name: 'workedHours', header: 'Worked Hours',cell: (crew: any) => {
    const hours = typeof crew.workedhours === 'number'
      ? crew.workedhours
      : parseFloat(crew.workedhours);
    return !isNaN(hours) ? hours.toFixed(2) : '0.00';
  }},
    { name: 'equipment', header: 'Assigned Equipment', cell: (crew) => this.formatEquipment(crew.equipment) },
    { name: 'actions', header: 'Actions', cell: () => '', isActionColumn: true }
  ];

  tableData: any[] = [];

  constructor(
    private dialog: MatDialog,
    private crewsService: CrewsService,
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
    this.crewsService.getCrewsWithEmployees().subscribe({
      next: (data) => {
        this.tableData = data;
        this.allData = [...this.tableData];
        this.filteredData = [...this.allData];
      },
      error: (error) => {
        console.error('Error loading crews:', error);
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
}
