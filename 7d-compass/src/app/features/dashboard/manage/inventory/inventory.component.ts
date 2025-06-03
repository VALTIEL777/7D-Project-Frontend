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
  selector: 'app-inventory',
  standalone: true,
  imports: [
    DashboardLayoutComponent,
    CardWithButtonComponent,
    DataTableComponent,
  ],
  templateUrl: './inventory.component.html',
  styleUrl: './inventory.component.scss'
})
export class InventoryComponent {
  columns: ColumnDefinition[] = [
    {
      name: 'name',
      header: 'Item Name',
      cell: (item: any) => item.name
    },
    {
      name: 'supplier',
      header: 'Supplier',
      cell: (item: any) => item.supplierName
    },
    {
      name: 'cost',
      header: 'Cost Per Unit',
      cell: (item: any) => `$${item.costPerUnit.toFixed(2)}`
    },
    {
      name: 'unit',
      header: 'Unit',
      cell: (item: any) => item.unit
    },
    {
      name: 'category',
      header: 'Category',
      cell: (item: any) => item.category || 'N/A'
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
      inventoryId: 1,
      name: 'No Parking Signs',
      supplierName: 'Safety Supplies Co.',
      costPerUnit: 24.99,
      unit: 'each',
      category: 'Signage',
      supplierId: 1
    },
    {
      inventoryId: 2,
      name: 'Asphalt Mix',
      supplierName: 'Paving Materials Inc.',
      costPerUnit: 85.50,
      unit: 'ton',
      category: 'Paving Materials',
      supplierId: 2
    },
    {
      inventoryId: 3,
      name: 'Concrete Mix',
      supplierName: 'Construction Supply Ltd.',
      costPerUnit: 120.75,
      unit: 'cubic yard',
      category: 'Paving Materials',
      supplierId: 3
    },
    {
      inventoryId: 4,
      name: 'Traffic Cones',
      supplierName: 'Safety Supplies Co.',
      costPerUnit: 12.95,
      unit: 'each',
      category: 'Traffic Control',
      supplierId: 1
    },
    {
      inventoryId: 5,
      name: 'Rebar',
      supplierName: 'Construction Supply Ltd.',
      costPerUnit: 3.25,
      unit: 'foot',
      category: 'Construction Materials',
      supplierId: 3
    },
    {
      inventoryId: 6,
      name: 'Road Paint',
      supplierName: 'Paving Materials Inc.',
      costPerUnit: 45.80,
      unit: 'gallon',
      category: 'Paving Materials',
      supplierId: 2
    },
    {
      inventoryId: 7,
      name: 'Safety Vests',
      supplierName: 'Safety Supplies Co.',
      costPerUnit: 8.99,
      unit: 'each',
      category: 'Safety Equipment',
      supplierId: 1
    },
    {
      inventoryId: 8,
      name: 'Gravel',
      supplierName: 'Paving Materials Inc.',
      costPerUnit: 15.30,
      unit: 'ton',
      category: 'Paving Materials',
      supplierId: 2
    },
    {
      inventoryId: 9,
      name: 'Caution Tape',
      supplierName: 'Safety Supplies Co.',
      costPerUnit: 5.45,
      unit: 'roll',
      category: 'Safety Equipment',
      supplierId: 1
    },
    {
      inventoryId: 10,
      name: 'Steel Plates',
      supplierName: 'Construction Supply Ltd.',
      costPerUnit: 210.00,
      unit: 'each',
      category: 'Construction Materials',
      supplierId: 3
    }
  ];

  constructor(private dialog: MatDialog) {}

  onEdit(item: any) {
    const dialogRef = this.dialog.open(SearchDialogComponent, {
      width: '500px',
      data: {
        title: `Edit: ${item.name}`,
        data: {
          ...item,
          costPerUnit: item.costPerUnit.toString() // Convert to string for editing
        },
        excludedFields: ['inventoryId', 'supplierName']
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const index = this.tableData.findIndex(i => i.inventoryId === item.inventoryId);
        if (index !== -1) {
          this.tableData[index] = {
            ...this.tableData[index],
            ...result,
            costPerUnit: parseFloat(result.costPerUnit)
          };
        }
      }
    });
  }

  onDelete(item: any) {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '450px',
      disableClose: true,
      panelClass: 'confirmation-dialog',
      data: {
        title: 'Delete Inventory Item',
        message: `Are you sure you want to delete ${item.name}? This action cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Keep Item'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.tableData = this.tableData.filter(i => i.inventoryId !== item.inventoryId);
        console.log('Inventory item deleted:', item);
      }
    });
  }
}
