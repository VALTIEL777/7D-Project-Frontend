import { Component, OnInit } from '@angular/core';
import { DashboardLayoutComponent } from "../../../../shared/dashboard-layout/dashboard-layout.component";
import { CardWithButtonComponent } from '../../../../shared/card-with-button/card-with-button.component';
import { MatDialog } from '@angular/material/dialog';
import { SearchDialogComponent } from '../../../../shared/search-dialog/search-dialog.component';
import { DataTableComponent } from '../../../../shared/data-table/data-table.component';
import { ConfirmationDialogComponent } from '../../../../shared/confirmation-dialog/confirmation-dialog.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SupervisorsService, Supervisor } from '../../../../core/services/human-resources/supervisors.service';
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
      cell: (supervisor: any) => `${supervisor.firstname} ${supervisor.lastname}`
    },
    {
      name: 'phone',
      header: 'Phone',
      cell: (supervisor: any) => supervisor.phone || 'N/A'
    },
    {
      name: 'email',
      header: 'Email',
      cell: (supervisor: any) => supervisor.email || 'N/A'
    },
    {
      name: 'role',
      header: 'Role',
      cell: (supervisor: any) => supervisor.role || 'N/A'
    },
    {
      name: 'quadrants',
      header: 'Assigned Quadrants',
      cell: (supervisor: any) => this.getQuadrantNames(supervisor.assignedQuadrants)
    },
    {
      name: 'actions',
      header: 'Actions',
      cell: () => '',
      isActionColumn: true
    }
  ];

  tableData: Supervisor[] = [];

  constructor(
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private supervisorsService: SupervisorsService,
    filterService: FilterService
  ) {
    super(filterService);
  }

  override ngOnInit(): void {
    super.ngOnInit();
    this.loadSupervisors();
  }

  protected override loadData(): void {
    // Initialize data for filtering
    this.allData = [...this.tableData];
    this.filteredData = [...this.allData];
  }

  // Override text search to include supervisor fields
  protected override matchesTextSearch(item: any, searchTerm: string): boolean {
    const searchableFields = ['firstname', 'lastname', 'phone', 'email', 'role'];

    return searchableFields.some(field => {
      const value = this.getNestedValue(item, field);
      if (value) {
        return String(value).toLowerCase().includes(searchTerm);
      }
      return false;
    }) ||
    // Also search in assigned quadrants
    this.getQuadrantNames(item.assignedQuadrants).toLowerCase().includes(searchTerm);
  }

  loadSupervisors(): void {
    this.supervisorsService.getAllSupervisors().subscribe({
      next: (data) => {
        console.log('API response data:', data);
        this.tableData = data;
        this.allData = [...data];
        this.filteredData = [...data];
      },
      error: (err) => {
        console.error('Error loading supervisors:', err);
        this.snackBar.open('Error loading supervisors', 'Close', { duration: 3000 });
      }
    });
  }

  // Getter for filtered supervisor data
  get filteredSupervisorData() {
    return this.filteredData;
  }

  // Helper function to get quadrant names for a supervisor
  getQuadrantNames(assignedQuadrants: any[]): string {
    if (!assignedQuadrants || assignedQuadrants.length === 0) {
      return 'None';
    }

    // Show only first 4 quadrants
    const displayQuadrants = assignedQuadrants.slice(0, 4);
    const quadrantStrings = displayQuadrants.map(q => {
      const shopInfo = q.shop ? ` (${q.shop})` : '';
      return `${q.name}${shopInfo}`;
    });

    let result = quadrantStrings.join(' | ');

    // Add indicator if there are more quadrants
    if (assignedQuadrants.length > 4) {
      result += ` [+${assignedQuadrants.length - 4}]`;
    }

    return result;
  }

  onEdit(supervisor: Supervisor) {
    const dialogRef = this.dialog.open(SearchDialogComponent, {
      width: '500px',
      data: {
        title: `Edit Supervisor: ${supervisor.firstname} ${supervisor.lastname}`,
        data: {
          ...supervisor,
          name: `${supervisor.firstname} ${supervisor.lastname}`
        },
        excludedFields: ['employeeId', 'userId', 'assignedQuadrants', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy', 'deletedAt'],
        fields: [
          { name: 'firstname', label: 'First Name', type: 'text', required: true },
          { name: 'lastname', label: 'Last Name', type: 'text', required: true },
          { name: 'phone', label: 'Phone', type: 'text', required: true },
          { name: 'email', label: 'Email', type: 'text', required: true },
          {
            name: 'role',
            label: 'Role',
            type: 'select',
            required: true,
            options: [
              { value: 'Supervisor', label: 'Supervisor' },
              { value: 'Zone Manager', label: 'Zone Manager' }
            ]
          }
        ]
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && supervisor.employeeId) {
        const index = this.tableData.findIndex(s => s.employeeId === supervisor.employeeId);
        if (index !== -1) {
          const updatedSupervisor = {
            ...supervisor,
            ...result,
            updatedBy: this.getCurrentUserId()
          };

          this.supervisorsService.updateSupervisor(supervisor.employeeId, updatedSupervisor).subscribe({
            next: () => {
              this.tableData[index] = updatedSupervisor;
              this.allData = [...this.tableData];
              this.applyFilters();
              this.snackBar.open('Supervisor updated successfully', 'Close', { duration: 3000 });
            },
            error: err => {
              console.error('Error updating supervisor:', err);
              this.snackBar.open('Error updating supervisor', 'Close', { duration: 3000 });
            }
          });
        }
      }
    });
  }

  onDelete(supervisor: Supervisor) {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '450px',
      disableClose: true,
      panelClass: 'confirmation-dialog',
      data: {
        title: 'Delete Supervisor',
        message: `Are you sure you want to delete ${supervisor.firstname} ${supervisor.lastname}? This will remove their access and any quadrant assignments.`,
        confirmText: 'Delete',
        cancelText: 'Cancel'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed && supervisor.employeeId) {
        this.supervisorsService.deleteSupervisor(supervisor.employeeId).subscribe({
          next: () => {
            this.tableData = this.tableData.filter(s => s.employeeId !== supervisor.employeeId);
            this.allData = [...this.tableData];
            this.applyFilters();
            this.snackBar.open('Supervisor deleted successfully', 'Close', { duration: 3000 });
          },
          error: (err) => {
            console.error('Error deleting supervisor:', err);
            this.snackBar.open('Error deleting supervisor', 'Close', { duration: 3000 });
          }
        });
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
