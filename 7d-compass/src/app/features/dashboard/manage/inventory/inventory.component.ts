import { Component, OnInit } from '@angular/core';
import { DashboardLayoutComponent } from "../../../../shared/dashboard-layout/dashboard-layout.component";
import { CardWithButtonComponent } from '../../../../shared/card-with-button/card-with-button.component';
import { MatDialog } from '@angular/material/dialog';
import { SearchDialogComponent } from '../../../../shared/search-dialog/search-dialog.component';
import { DataTableComponent } from '../../../../shared/data-table/data-table.component';
import { ConfirmationDialogComponent } from '../../../../shared/confirmation-dialog/confirmation-dialog.component';
import { InventoryService } from '../../../../core/services/material/inventory.service';

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
export class InventoryComponent implements OnInit {
  columns: ColumnDefinition[] = [
    {
      name: 'name',
      header: 'Item Name',
      cell: (item: any) => item.name
    },
    {
      name: 'supplier',
      header: 'Supplier',
      cell: (item: any) => item.suppliername || 'N/A'
    },
    {
      name: 'costperunit',
      header: 'Cost Per Unit',
      cell: (item: any) =>
  !isNaN(parseFloat(item.costperunit))
    ? `$${parseFloat(item.costperunit).toFixed(2)}`
    : 'N/A'
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

  tableData: any[] = [];

  constructor(
    private dialog: MatDialog,
    private inventoryService: InventoryService
  ) {}

  ngOnInit(): void {
    this.loadInventory();
  }

  loadInventory(): void {
    this.inventoryService.getAllInventory().subscribe({
      next: (data) => {
        this.tableData = data;
      },
      error: (err) => {
        console.error('Error loading inventory:', err);
      }
    });
  }

  onEdit(item: any) {
    const dialogRef = this.dialog.open(SearchDialogComponent, {
      width: '500px',
      data: {
        title: `Edit: ${item.name}`,
        data: {
          ...item,
          costperunit: item.costperunit.toString()
        },
        excludedFields: ['inventoryid', 'suppliername']
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const index = this.tableData.findIndex(i => i.inventoryid === item.inventoryid);
        if (index !== -1) {
          this.tableData[index] = {
            ...this.tableData[index],
            ...result,
            costperunit: parseFloat(result.costperunit)
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
        this.inventoryService.deleteInventory(item.inventoryid).subscribe({
          next: () => {
            this.tableData = this.tableData.filter(i => i.inventoryid !== item.inventoryid);
            console.log('Deleted:', item);
          },
          error: (err) => {
            console.error('Error deleting item:', err);
          }
        });
      }
    });
  }
}
