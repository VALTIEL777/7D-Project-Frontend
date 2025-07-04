import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardLayoutComponent } from "../../../../shared/dashboard-layout/dashboard-layout.component";
import { CardWithButtonComponent } from '../../../../shared/card-with-button/card-with-button.component';
import { MatDialog } from '@angular/material/dialog';
import { SearchDialogComponent } from '../../../../shared/search-dialog/search-dialog.component';
import { DataTableComponent } from '../../../../shared/data-table/data-table.component';
import { ConfirmationDialogComponent } from '../../../../shared/confirmation-dialog/confirmation-dialog.component';
import { InventoryService, Inventory } from '../../../../core/services/material/inventory.service';
import { SupplierService } from '../../../../core/services/material/supplier.service';
import { BaseDashboardComponent } from '../../../../shared/base-dashboard.component';
import { FilterService } from '../../../../core/services/filter.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

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
    CommonModule,
    DashboardLayoutComponent,
    CardWithButtonComponent,
    DataTableComponent,
    MatProgressSpinnerModule,
  ],
  templateUrl: './inventory.component.html',
  styleUrl: './inventory.component.scss'
})
export class InventoryComponent extends BaseDashboardComponent implements OnInit {
  columns: ColumnDefinition[] = [
    {
      name: 'name',
      header: 'Item Name',
      cell: (item: any) => item.name
    },
    {
      name: 'supplier',
      header: 'Supplier',
      cell: (item: any) => {
        const supplierName = item.name || 'N/A';
        const supplierPhone = item.phone || '';
        return supplierPhone ? `${supplierName} (${supplierPhone})` : supplierName;
      }
    },
    {
      name: 'costperunit',
      header: 'Cost/Unit',
      cell: (item: any) => {
        const cost = item.costperunit;
        if (cost === null || cost === undefined || cost === '') {
          return '$0.00';
        }
        const numCost = typeof cost === 'string' ? parseFloat(cost) : cost;
        return isNaN(numCost) ? '$0.00' : `$${numCost.toFixed(2)}`;
      }
    },
    {
      name: 'unit',
      header: 'Unit',
      cell: (item: any) => item.unit || 'N/A'
    },
    {
      name: 'actions',
      header: 'Actions',
      cell: () => '',
      isActionColumn: true
    }
  ];

  tableData: Inventory[] = [];
  suppliers: any[] = [];
  suppliersLoading = true;

  constructor(
    private dialog: MatDialog,
    private inventoryService: InventoryService,
    private supplierService: SupplierService,
    filterService: FilterService,
    private snackBar: MatSnackBar
  ) {
    super(filterService);
  }

  override ngOnInit(): void {
    super.ngOnInit();
    this.loadInventory();
    this.loadSuppliers();
  }

  protected override loadData(): void {
    // Initialize data for filtering
    this.allData = [...this.tableData];
    this.filteredData = [...this.allData];
  }

  // Override text search to include inventory fields
  protected override matchesTextSearch(item: any, searchTerm: string): boolean {
    const searchableFields = ['name', 'unit'];

    return searchableFields.some(field => {
      const value = this.getNestedValue(item, field);
      if (value) {
        return String(value).toLowerCase().includes(searchTerm);
      }
      return false;
    });
  }

  // Getter for filtered inventory data
  get filteredInventoryData() {
    return this.filteredData;
  }

  loadInventory(): void {
    this.inventoryService.getAllInventory().subscribe({
      next: (data) => {
        console.log('Inventory API response:', data);
        if (data.length > 0) {
          console.log('First inventory item structure:', data[0]);
          console.log('First inventory all keys:', Object.keys(data[0]));
          console.log('name:', (data[0] as any).name);
        }
        this.tableData = data;
        this.allData = [...data];
        this.filteredData = [...data];
      },
      error: (err) => {
        console.error('Error loading inventory:', err);
        // Removed error toast since backend might not be running
      }
    });
  }

  loadSuppliers(): void {
    this.suppliersLoading = true;
    this.supplierService.getAllSuppliers().subscribe({
      next: (data) => {
        console.log('Suppliers API response:', data);
        if (data.length > 0) {
          console.log('First supplier structure:', data[0]);
          console.log('First supplier all keys:', Object.keys(data[0]));
          console.log('supplierid:', data[0].supplierid);
        }
        this.suppliers = data;
        this.suppliersLoading = false;
      },
      error: (err) => {
        this.suppliersLoading = false;
        console.error('Error loading suppliers:', err);
      }
    });
  }

  onEdit(item: Inventory) {
    if (this.suppliersLoading) {
      this.snackBar.open('Suppliers are still loading. Please try again in a moment.', 'Close', { duration: 3000 });
      return;
    }
    console.log('Suppliers available for dropdown:', this.suppliers);
    console.log('Supplier options:', this.suppliers.map(s => ({ value: s.supplierid, label: s.name })));

    const dialogRef = this.dialog.open(SearchDialogComponent, {
      width: '500px',
      data: {
        title: `Edit Inventory Item: ${item.name}`,
        data: item,
        excludedFields: ['inventoryid', 'supplierid', 'name', 'phone', 'email', 'address', 'createdat', 'updatedat', 'createdby', 'updatedby', 'deletedat'],
        fields: [
          { name: 'name', label: 'Item Name', type: 'text', required: true },
          { name: 'costperunit', label: 'Cost Per Unit', type: 'number', required: true },
          { name: 'unit', label: 'Unit', type: 'text', required: true },
          { name: 'supplierid', label: 'Supplier', type: 'select', required: true, options: this.suppliers.map(s => ({ value: s.supplierid, label: s.name })) }
        ]
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && item.inventoryid) {
        const index = this.tableData.findIndex(i => i.inventoryid === item.inventoryid);
        if (index !== -1) {
          const updatedItem = {
            ...item,
            ...result,
            updatedby: this.getCurrentUserId()
          };

          this.inventoryService.updateInventory(item.inventoryid, updatedItem).subscribe({
            next: () => {
              this.tableData[index] = updatedItem;
              this.allData = [...this.tableData];
              this.applyFilters();
              this.snackBar.open('Inventory item updated successfully', 'Close', { duration: 3000 });
            },
            error: err => {
              console.error('Error updating inventory item:', err);
              this.snackBar.open('Error updating inventory item', 'Close', { duration: 3000 });
            }
          });
        }
      }
    });
  }

  onDelete(item: Inventory) {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '450px',
      disableClose: true,
      panelClass: 'confirmation-dialog',
      data: {
        title: 'Delete Inventory Item',
        message: `Are you sure you want to delete "${item.name}"? This action cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Cancel'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed && item.inventoryid) {
        this.inventoryService.deleteInventory(item.inventoryid).subscribe({
          next: () => {
            this.tableData = this.tableData.filter(i => i.inventoryid !== item.inventoryid);
            this.allData = [...this.tableData];
            this.applyFilters();
            this.snackBar.open('Inventory item deleted successfully', 'Close', { duration: 3000 });
          },
          error: (err) => {
            console.error('Error deleting inventory item:', err);
            this.snackBar.open('Error deleting inventory item', 'Close', { duration: 3000 });
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
