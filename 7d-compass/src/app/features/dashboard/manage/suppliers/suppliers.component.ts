import { Component, OnInit } from '@angular/core';
import { DashboardLayoutComponent } from "../../../../shared/dashboard-layout/dashboard-layout.component";
import { CardWithButtonComponent } from '../../../../shared/card-with-button/card-with-button.component';
import { MatDialog } from '@angular/material/dialog';
import { SearchDialogComponent } from '../../../../shared/search-dialog/search-dialog.component';
import { DataTableComponent } from '../../../../shared/data-table/data-table.component';
import { ConfirmationDialogComponent } from '../../../../shared/confirmation-dialog/confirmation-dialog.component';
import { SupplierService } from '../../../../core/services/material/supplier.service';
import { BaseDashboardComponent } from '../../../../shared/base-dashboard.component';
import { FilterService } from '../../../../core/services/filter.service';

interface ColumnDefinition {
  name: string;
  header: string;
  cell: (element: any) => string;
  isActionColumn?: boolean;
}

@Component({
  selector: 'app-suppliers',
  standalone: true,
  imports: [
    DashboardLayoutComponent,
    CardWithButtonComponent,
    DataTableComponent,
  ],
  templateUrl: './suppliers.component.html',
  styleUrl: './suppliers.component.scss'
})
export class SuppliersComponent extends BaseDashboardComponent implements OnInit {
  columns: ColumnDefinition[] = [
    {
      name: 'name',
      header: 'Supplier Name',
      cell: (s: any) => s.name
    },
    {
      name: 'phone',
      header: 'Phone',
      cell: (s: any) => s.phone
    },
    {
      name: 'email',
      header: 'Email',
      cell: (s: any) => s.email
    },
    {
      name: 'address',
      header: 'Address',
      cell: (s: any) => s.address
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
    private supplierService: SupplierService,
    filterService: FilterService
  ) {
    super(filterService);
  }

  override ngOnInit(): void {
    super.ngOnInit();
    this.loadSuppliers();
  }

  protected override loadData(): void {
    // Initialize data for filtering
    this.allData = [...this.tableData];
    this.filteredData = [...this.allData];
  }

  // Override text search to include supplier fields
  protected override matchesTextSearch(item: any, searchTerm: string): boolean {
    const searchableFields = ['name', 'phone', 'email', 'address'];

    return searchableFields.some(field => {
      const value = this.getNestedValue(item, field);
      if (value) {
        return String(value).toLowerCase().includes(searchTerm);
      }
      return false;
    });
  }

  loadSuppliers(): void {
    this.supplierService.getAllSuppliers().subscribe({
      next: (suppliers) => {
        this.tableData = suppliers.map(s => ({
          supplierid: s.supplierId,
          name: s.name,
          phone: s.phone,
          email: s.email,
          address: s.address,
          createdby: s.createdBy,
          updatedby: s.updatedBy
        }) as any);
        this.allData = [...this.tableData];
        this.filteredData = [...this.allData];
      },
      error: (err) => console.error('Error loading suppliers', err)
    });
  }

  // Getter for filtered supplier data
  get filteredSupplierData() {
    return this.filteredData;
  }

  onEdit(supplier: any) {
    const dialogRef = this.dialog.open(SearchDialogComponent, {
      width: '500px',
      data: {
        title: `Edit Supplier: ${supplier.name}`,
        data: supplier,
        excludedFields: ['supplierid', 'deletedat', 'updatedat', 'createdat', 'createdby', 'updatedby']
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const index = this.tableData.findIndex(s => s.supplierid === supplier.supplierid);
        if (index !== -1) {
          this.tableData[index] = {
            ...this.tableData[index],
            ...result
          };
          this.allData = [...this.tableData];
          this.applyFilters();
        }
      }
    });
  }

  onDelete(supplier: any) {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '450px',
      disableClose: true,
      panelClass: 'confirmation-dialog',
      data: {
        title: 'Delete Supplier',
        message: `Are you sure you want to delete ${supplier.name}? This action cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Cancel'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.supplierService.deleteSupplier(supplier.supplierid).subscribe({
          next: () => {
            this.tableData = this.tableData.filter(s => s.supplierid !== supplier.supplierid);
            this.allData = [...this.tableData];
            this.applyFilters();
            console.log('Supplier deleted:', supplier);
          },
          error: err => console.error('Error deleting supplier', err)
        });
      }
    });
  }
}
