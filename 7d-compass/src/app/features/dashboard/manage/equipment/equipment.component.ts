import { Component } from '@angular/core';
import { DashboardLayoutComponent } from "../../../../shared/dashboard-layout/dashboard-layout.component";
import { CardWithButtonComponent } from '../../../../shared/card-with-button/card-with-button.component';
import { MatDialog } from '@angular/material/dialog';
import { SearchDialogComponent } from '../../../../shared/search-dialog/search-dialog.component';
import { DataTableComponent } from '../../../../shared/data-table/data-table.component';
import { ConfirmationDialogComponent } from '../../../../shared/confirmation-dialog/confirmation-dialog.component';

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
    DataTableComponent,
  ],
  templateUrl: './equipment.component.html',
  styleUrl: './equipment.component.scss'
})
export class EquipmentComponent {
  columns: ColumnDefinition[] = [
    {
      name: 'equipmentName',
      header: 'Equipment Name',
      cell: (equipment: any) => equipment.equipmentName
    },
    {
      name: 'owner',
      header: 'Owner',
      cell: (equipment: any) => equipment.owner
    },
    {
      name: 'type',
      header: 'Type',
      cell: (equipment: any) => this.capitalizeFirstLetter(equipment.type)
    },
    {
      name: 'hourlyRate',
      header: 'Hourly Rate',
      cell: (equipment: any) => `$${equipment.hourlyRate.toFixed(2)}`
    },
    {
      name: 'status',
      header: 'Status',
      cell: (equipment: any) => this.getStatusText(equipment)
    },
    {
      name: 'actions',
      header: 'Actions',
      cell: () => '',
      isActionColumn: true
    }
  ];

  tableData = [
    {
      equipmentId: 1,
      equipmentName: 'Excavator CAT 320',
      owner: 'Company Owned',
      type: 'machine',
      hourlyRate: 85.50,
      observation: 'Regular maintenance required',
      isAvailable: true
    },
    {
      equipmentId: 2,
      equipmentName: 'Pickup Truck F-150',
      owner: 'Company Owned',
      type: 'vehicle',
      hourlyRate: 25.00,
      observation: 'New tires installed last month',
      isAvailable: true
    },
    {
      equipmentId: 3,
      equipmentName: 'Jack Hammer',
      owner: '9G equipment Rentals',
      type: 'tool',
      hourlyRate: 12.75,
      observation: 'From United Rentals',
      isAvailable: false
    },
    {
      equipmentId: 4,
      equipmentName: 'Concrete Mixer',
      owner: 'Company Owned',
      type: 'machine',
      hourlyRate: 45.00,
      observation: 'Needs calibration',
      isAvailable: false
    },
    {
      equipmentId: 5,
      equipmentName: 'Survey Equipment Set',
      owner: 'Company Owned',
      type: 'tool',
      hourlyRate: 18.00,
      observation: 'Includes GPS and total station',
      isAvailable: true
    },
    {
      equipmentId: 6,
      equipmentName: 'Backhoe Loader',
      owner: '18F rental',
      type: 'machine',
      hourlyRate: 75.25,
      observation: 'From Sunbelt Rentals',
      isAvailable: true
    },
    {
      equipmentId: 7,
      equipmentName: 'Air Compressor',
      owner: 'Company Owned',
      type: 'machine',
      hourlyRate: 15.50,
      observation: '150 PSI capacity',
      isAvailable: true
    },
    {
      equipmentId: 8,
      equipmentName: 'Generator 7500W',
      owner: 'Company Owned',
      type: 'machine',
      hourlyRate: 22.00,
      observation: 'Diesel powered',
      isAvailable: false
    },
    {
      equipmentId: 9,
      equipmentName: 'Vibratory Plate Compactor',
      owner: '1R Rentals',
      type: 'machine',
      hourlyRate: 30.00,
      observation: 'For soil compaction',
      isAvailable: true
    },
    {
      equipmentId: 10,
      equipmentName: 'Power Drills Set',
      owner: 'Company Owned',
      type: 'tool',
      hourlyRate: 8.50,
      observation: 'Includes various bits',
      isAvailable: true
    }
  ];

  constructor(private dialog: MatDialog) {}

  private capitalizeFirstLetter(string: string): string {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  private getStatusText(equipment: any): string {
    return equipment.isAvailable
      ? 'Available'
      : 'In Use';
  }

  onEdit(equipment: any) {
    const dialogRef = this.dialog.open(SearchDialogComponent, {
      width: '500px',
      data: {
        title: `Edit Equipment: ${equipment.equipmentName}`,
        data: {
          ...equipment,
          status: equipment.isAvailable ? 'Available' : 'In Use'
        },
        fields: [
          { name: 'equipmentName', label: 'Equipment Name', type: 'text' },
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
          { name: 'hourlyRate', label: 'Hourly Rate', type: 'number' },
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
        const index = this.tableData.findIndex(e => e.equipmentId === equipment.equipmentId);
        if (index !== -1) {
          this.tableData[index] = {
            ...this.tableData[index],
            equipmentName: result.equipmentName,
            owner: result.owner,
            type: result.type.toLowerCase(),
            hourlyRate: result.hourlyRate,
            observation: result.observation,
            isAvailable: result.status === 'Available'
          };
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
        message: `Are you sure you want to remove ${equipment.equipmentName} from the equipment inventory?`,
        confirmText: 'Remove',
        cancelText: 'Cancel'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.tableData = this.tableData.filter(e => e.equipmentId !== equipment.equipmentId);
        console.log('Equipment removed:', equipment);
      }
    });
  }
}
