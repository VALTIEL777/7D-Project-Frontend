import { Component, OnInit } from '@angular/core';
import { DashboardLayoutComponent } from '../../../../shared/dashboard-layout/dashboard-layout.component';
import { CardWithButtonComponent } from '../../../../shared/card-with-button/card-with-button.component';
import { MatDialog } from '@angular/material/dialog';
import { SearchDialogComponent } from '../../../../shared/search-dialog/search-dialog.component';
import { DataTableComponent } from '../../../../shared/data-table/data-table.component';
import { ConfirmationDialogComponent } from '../../../../shared/confirmation-dialog/confirmation-dialog.component';
import { EquipmentService } from '../../../../core/services/material/equipment.service';
import { BaseDashboardComponent } from '../../../../shared/base-dashboard.component';
import { FilterService } from '../../../../core/services/filter.service';

interface ColumnDefinition {
  name: string;
  header: string;
  cell: (element: any) => string;
  isActionColumn?: boolean;
}

@Component({
  selector: 'app-equipment',
  standalone: true,
  imports: [
    DashboardLayoutComponent,
    CardWithButtonComponent,
    DataTableComponent
  ],
  templateUrl: './equipment.component.html',
  styleUrl: './equipment.component.scss'
})
export class EquipmentComponent extends BaseDashboardComponent implements OnInit {
  columns: ColumnDefinition[] = [
    {
      name: 'equipmentname',
      header: 'Equipment Name',
      cell: (e: any) => e.equipmentname
    },
    {
      name: 'owner',
      header: 'Owner',
      cell: (e: any) => e.owner
    },
    {
      name: 'type',
      header: 'Type',
      cell: (e: any) => this.capitalizeFirstLetter(e.type)
    },
    {
      name: 'hourlyrate',
      header: 'Hourly Rate',
      cell: (e: any) =>
  !isNaN(parseFloat(e.hourlyrate))
    ? `$${parseFloat(e.hourlyrate).toFixed(2)}`
    : 'N/A'
    },
    {
      name: 'status',
      header: 'Status',
      cell: (e: any) => this.getStatusText(e)
    },
    {
      name: 'actions',
      header: 'Actions',
      cell: () => '',
      isActionColumn: true
    }
  ];

  tableData: any[] = [];

  constructor(
    private dialog: MatDialog,
    private equipmentService: EquipmentService,
    filterService: FilterService
  ) {
    super(filterService);
  }

  override ngOnInit(): void {
    super.ngOnInit();
    this.loadEquipment();
  }

  protected override loadData(): void {
    // Initialize data for filtering
    this.allData = [...this.tableData];
    this.filteredData = [...this.allData];
  }

  // Override text search to include equipment fields
  protected override matchesTextSearch(item: any, searchTerm: string): boolean {
    const searchableFields = ['equipmentname', 'owner', 'type', 'observation'];

    return searchableFields.some(field => {
      const value = this.getNestedValue(item, field);
      if (value) {
        return String(value).toLowerCase().includes(searchTerm);
      }
      return false;
    });
  }

  loadEquipment() {
    this.equipmentService.getAllEquipment().subscribe({
      next: (data) => {
        this.tableData = data;
        this.allData = [...data];
        this.filteredData = [...data];
      },
      error: (err) => {
        console.error('Error loading equipment:', err);
      }
    });
  }

  // Getter for filtered equipment data
  get filteredEquipmentData() {
    return this.filteredData;
  }

  private capitalizeFirstLetter(text: string): string {
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
  }

  private getStatusText(equipment: any): string {
    return equipment.isavailable ? 'Available' : 'In Use';
  }

  onEdit(equipment: any) {
    const dialogRef = this.dialog.open(SearchDialogComponent, {
      width: '500px',
      data: {
        title: `Edit Equipment: ${equipment.equipmentname}`,
        data: {
          ...equipment,
          status: equipment.isavailable ? 'Available' : 'In Use'
        },
        excludedFields: ['equipmentid', 'deletedat', 'updatedat', 'createdat', 'createdby', 'updatedby'],
        fields: [
          { name: 'equipmentname', label: 'Equipment Name', type: 'text' },
          { name: 'owner', label: 'Owner', type: 'text' },
          {
            name: 'type',
            label: 'Type',
            type: 'select',
            options: [
              { value: 'vehicle', label: 'Vehicle' },
              { value: 'tool', label: 'Tool' },
              { value: 'machine', label: 'Machine' }
            ]
          },
          { name: 'hourlyrate', label: 'Hourly Rate', type: 'number' },
          {
            name: 'status',
            label: 'Status',
            type: 'select',
            options: [
              { value: 'Available', label: 'Available' },
              { value: 'In Use', label: 'In Use' }
            ]
          },
          { name: 'observation', label: 'Notes', type: 'textarea' }
        ]
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const index = this.tableData.findIndex(e => e.equipmentid === equipment.equipmentid);
        if (index !== -1) {
          this.tableData[index] = {
            ...this.tableData[index],
            equipmentname: result.equipmentname,
            owner: result.owner,
            type: result.type.toLowerCase(),
            hourlyrate: parseFloat(result.hourlyrate),
            observation: result.observation,
            isavailable: result.status === 'Available'
          };
          this.allData = [...this.tableData];
          this.applyFilters();
        }
      }
    });
  }

  onDelete(equipment: any) {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '450px',
      disableClose: true,
      panelClass: 'confirmation-dialog',
      data: {
        title: 'Remove Equipment',
        message: `Are you sure you want to remove ${equipment.equipmentname}?`,
        confirmText: 'Remove',
        cancelText: 'Cancel'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.equipmentService.deleteEquipment(equipment.equipmentid).subscribe({
          next: () => {
            this.tableData = this.tableData.filter(e => e.equipmentid !== equipment.equipmentid);
            this.allData = [...this.tableData];
            this.applyFilters();
            console.log('Equipment deleted:', equipment);
          },
          error: (err) => {
            console.error('Delete failed:', err);
          }
        });
      }
    });
  }
}
