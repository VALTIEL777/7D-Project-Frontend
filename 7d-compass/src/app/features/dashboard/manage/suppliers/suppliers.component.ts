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
export class SuppliersComponent {
  columns: ColumnDefinition[] = [
    {
      name: 'name',
      header: 'Supplier Name',
      cell: (supplier: any) => supplier.name
    },
    {
      name: 'phone',
      header: 'Phone',
      cell: (supplier: any) => supplier.phone
    },
    {
      name: 'email',
      header: 'Email',
      cell: (supplier: any) => supplier.email
    },
    {
      name: 'address',
      header: 'Address',
      cell: (supplier: any) => supplier.address
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
      supplierId: 1,
      name: 'ABC Construction Supplies',
      phone: '5551234567',
      email: 'contact@abcconstruction.com',
      address: '123 Main St, Denver, CO'
    },
    {
      supplierId: 2,
      name: 'XYZ Building Materials',
      phone: '5552345678',
      email: 'sales@xyzmaterials.com',
      address: '456 Oak Ave, Boulder, CO'
    },
    {
      supplierId: 3,
      name: 'Quality Tools Inc.',
      phone: '5553456789',
      email: 'info@qualitytools.com',
      address: '789 Pine Rd, Aurora, CO'
    },
    {
      supplierId: 4,
      name: 'Global Equipment',
      phone: '5554567890',
      email: 'support@globalequip.com',
      address: '321 Elm Blvd, Colorado Springs, CO'
    },
    {
      supplierId: 5,
      name: 'Safety First Supplies',
      phone: '5555678901',
      email: 'orders@safetyfirst.com',
      address: '654 Cedar Ln, Fort Collins, CO'
    },
    {
      supplierId: 6,
      name: 'Precision Parts Co.',
      phone: '5556789012',
      email: 'service@precisionparts.com',
      address: '987 Maple Dr, Lakewood, CO'
    },
    {
      supplierId: 7,
      name: 'Heavy Machinery Ltd.',
      phone: '5557890123',
      email: 'rentals@heavymachinery.com',
      address: '159 Birch St, Littleton, CO'
    },
    {
      supplierId: 8,
      name: 'Eco-Friendly Materials',
      phone: '5558901234',
      email: 'green@ecofriendly.com',
      address: '753 Spruce Ave, Englewood, CO'
    }
  ];

  constructor(private dialog: MatDialog) {}

  onEdit(supplier: any) {
    const dialogRef = this.dialog.open(SearchDialogComponent, {
      width: '500px',
      data: {
        title: `Edit Supplier: ${supplier.name}`,
        data: supplier,
        excludedFields: ['supplierId']
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const index = this.tableData.findIndex(s => s.supplierId === supplier.supplierId);
        if (index !== -1) {
          this.tableData[index] = {
            ...this.tableData[index],
            ...result
          };
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
        this.tableData = this.tableData.filter(s => s.supplierId !== supplier.supplierId);
        console.log('Supplier deleted:', supplier);
      }
    });
  }
}
