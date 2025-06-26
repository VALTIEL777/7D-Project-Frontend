import { Component, OnInit } from '@angular/core';
import { DashboardLayoutComponent } from "../../../../shared/dashboard-layout/dashboard-layout.component";
import { CardWithButtonComponent } from '../../../../shared/card-with-button/card-with-button.component';
import { MatDialog } from '@angular/material/dialog';
import { SearchDialogComponent } from '../../../../shared/search-dialog/search-dialog.component';
import { DataTableComponent } from '../../../../shared/data-table/data-table.component';
import { ConfirmationDialogComponent } from '../../../../shared/confirmation-dialog/confirmation-dialog.component';
import { BaseDashboardComponent } from '../../../../shared/base-dashboard.component';
import { FilterService } from '../../../../core/services/filter.service';

interface ColumnDefinition {
  name: string;
  header: string;
  cell: (element: any) => string;
  isActionColumn?: boolean;
}

@Component({
  selector: 'app-supervisors',
  standalone: true,
  imports: [
    DashboardLayoutComponent,
    CardWithButtonComponent,
    DataTableComponent,
  ],
  templateUrl: './supervisors.component.html',
  styleUrls: ['./supervisors.component.scss']
})
export class SupervisorsComponent extends BaseDashboardComponent implements OnInit {
  columns: ColumnDefinition[] = [
    {
      name: 'name',
      header: 'Name',
      cell: (supervisor: any) => supervisor.name
    },
    {
      name: 'phone',
      header: 'Phone',
      cell: (supervisor: any) => supervisor.phone
    },
    {
      name: 'email',
      header: 'Email',
      cell: (supervisor: any) => supervisor.email
    },
    {
      name: 'role',
      header: 'Role',
      cell: (supervisor: any) => supervisor.role
    },
    {
      name: 'quadrants',
      header: 'Assigned Quadrants',
      cell: (supervisor: any) => this.getQuadrantNames(supervisor.supervisorId)
    },
    {
      name: 'actions',
      header: 'Actions',
      cell: () => '',
      isActionColumn: true
    }
  ];

  // Mock data based on your database schema
  tableData = [
    {
      supervisorId: 1,
      name: 'Carlos Mendoza',
      phone: '5551234567',
      email: 'carlos.mendoza@example.com',
      role: 'supervisor'
    },
    {
      supervisorId: 2,
      name: 'Ana Ramirez',
      phone: '5552345678',
      email: 'ana.ramirez@example.com',
      role: 'zoneManager'
    },
    {
      supervisorId: 3,
      name: 'Luis Fernandez',
      phone: '5553456789',
      email: 'luis.fernandez@example.com',
      role: 'supervisor'
    },
    {
      supervisorId: 4,
      name: 'Maria Gutierrez',
      phone: '5554567890',
      email: 'maria.gutierrez@example.com',
      role: 'zoneManager'
    }
  ];

  // Mock quadrant data (in a real app, this would come from your Quadrants service)
  quadrants = [
    { quadrantId: 1, name: 'C203', supervisorId: 1 },
    { quadrantId: 2, name: 'C1', supervisorId: 1 },
    { quadrantId: 3, name: 'C75', supervisorId: 2 },
    { quadrantId: 4, name: 'C12', supervisorId: 3 }
  ];

  constructor(
    private dialog: MatDialog,
    filterService: FilterService
  ) {
    super(filterService);
  }

  override ngOnInit(): void {
    super.ngOnInit();
    this.loadData();
  }

  protected override loadData(): void {
    // Initialize data for filtering
    this.allData = [...this.tableData];
    this.filteredData = [...this.allData];
  }

  // Override text search to include supervisor fields
  protected override matchesTextSearch(item: any, searchTerm: string): boolean {
    const searchableFields = ['name', 'phone', 'email', 'role'];

    return searchableFields.some(field => {
      const value = this.getNestedValue(item, field);
      if (value) {
        return String(value).toLowerCase().includes(searchTerm);
      }
      return false;
    }) ||
    // Also search in assigned quadrants
    this.getQuadrantNames(item.supervisorId).toLowerCase().includes(searchTerm);
  }

  // Getter for filtered supervisor data
  get filteredSupervisorData() {
    return this.filteredData;
  }

  // Helper function to get quadrant names for a supervisor
  getQuadrantNames(supervisorId: number): string {
    const assignedQuadrants = this.quadrants.filter(q => q.supervisorId === supervisorId);
    return assignedQuadrants.map(q => q.name).join(', ') || 'None';
  }

  onEdit(supervisor: any) {
    const dialogRef = this.dialog.open(SearchDialogComponent, {
      width: '500px',
      data: {
        title: `Edit Supervisor: ${supervisor.name}`,
        data: supervisor,
        excludedFields: ['supervisorId', 'deletedat', 'updatedat', 'createdat', 'createdby', 'updatedby'],
        fields: [
          { name: 'name', label: 'Full Name', type: 'text', required: true },
          { name: 'phone', label: 'Phone', type: 'tel', required: true },
          { name: 'email', label: 'Email', type: 'email', required: true },
          {
            name: 'role',
            label: 'Role',
            type: 'select',
            options: [
              { value: 'supervisor', label: 'Supervisor' },
              { value: 'zoneManager', label: 'Zone Manager' }
            ],
            required: true
          }
        ]
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const index = this.tableData.findIndex(s => s.supervisorId === supervisor.supervisorId);
        if (index !== -1) {
          this.tableData[index] = { ...supervisor, ...result };
          this.allData = [...this.tableData];
          this.applyFilters();
        }
      }
    });
  }

  onDelete(supervisor: any) {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '450px',
      disableClose: true,
      panelClass: 'confirmation-dialog',
      data: {
        title: 'Delete Supervisor',
        message: `Are you sure you want to delete ${supervisor.name}? This will remove their access and any quadrant assignments.`,
        confirmText: 'Delete',
        cancelText: 'Cancel'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        // Remove the supervisor from the array
        this.tableData = this.tableData.filter(s => s.supervisorId !== supervisor.supervisorId);
        this.allData = [...this.tableData];
        this.applyFilters();

        // In a real app, you would call your API service here
        console.log('Supervisor deleted:', supervisor);
      }
    });
  }
}
