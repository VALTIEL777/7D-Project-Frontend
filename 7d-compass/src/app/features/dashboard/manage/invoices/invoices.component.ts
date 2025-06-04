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
  selector: 'app-invoices',
  standalone: true,
  imports: [
    DashboardLayoutComponent,
    CardWithButtonComponent,
    DataTableComponent,
  ],
  templateUrl: './invoices.component.html',
  styleUrl: './invoices.component.scss'
})
export class InvoicesComponent {
  columns: ColumnDefinition[] = [
    {
      name: 'invoiceNumber',
      header: 'Invoice #',
      cell: (invoice: any) => invoice.invoiceNumber
    },
    {
      name: 'ticketId',
      header: 'Ticket ID',
      cell: (invoice: any) => invoice.ticketId.toString()
    },
    {
      name: 'invoiceDate',
      header: 'Date Requested',
      cell: (invoice: any) => invoice.invoiceDateRequested.toLocaleDateString()
    },
    {
      name: 'amount',
      header: 'Amount',
      cell: (invoice: any) => `$${invoice.amountRequested.toFixed(2)}`
    },
    {
      name: 'status',
      header: 'Status',
      cell: (invoice: any) => invoice.status
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
      invoiceId: 1,
      ticketId: 101,
      invoiceNumber: 'INV-2023-001',
      invoiceDateRequested: new Date('2023-01-15'),
      amountRequested: 1250.50,
      status: 'Pending',
      invoiceURL: '/invoices/INV-2023-001'
    },
    {
      invoiceId: 2,
      ticketId: 102,
      invoiceNumber: 'INV-2023-002',
      invoiceDateRequested: new Date('2023-01-18'),
      amountRequested: 875.25,
      status: 'Paid',
      invoiceURL: '/invoices/INV-2023-002'
    },
    {
      invoiceId: 3,
      ticketId: 103,
      invoiceNumber: 'INV-2023-003',
      invoiceDateRequested: new Date('2023-01-20'),
      amountRequested: 2200.00,
      status: 'Rejected',
      invoiceURL: '/invoices/INV-2023-003'
    },
    {
      invoiceId: 4,
      ticketId: 104,
      invoiceNumber: 'INV-2023-004',
      invoiceDateRequested: new Date('2023-01-22'),
      amountRequested: 1500.75,
      status: 'Pending',
      invoiceURL: '/invoices/INV-2023-004'
    },
    {
      invoiceId: 5,
      ticketId: 105,
      invoiceNumber: 'INV-2023-005',
      invoiceDateRequested: new Date('2023-01-25'),
      amountRequested: 3200.00,
      status: 'Approved',
      invoiceURL: '/invoices/INV-2023-005'
    },
    {
      invoiceId: 6,
      ticketId: 106,
      invoiceNumber: 'INV-2023-006',
      invoiceDateRequested: new Date('2023-01-28'),
      amountRequested: 950.40,
      status: 'Paid',
      invoiceURL: '/invoices/INV-2023-006'
    },
    {
      invoiceId: 7,
      ticketId: 107,
      invoiceNumber: 'INV-2023-007',
      invoiceDateRequested: new Date('2023-02-01'),
      amountRequested: 1800.20,
      status: 'Pending',
      invoiceURL: '/invoices/INV-2023-007'
    },
    {
      invoiceId: 8,
      ticketId: 108,
      invoiceNumber: 'INV-2023-008',
      invoiceDateRequested: new Date('2023-02-05'),
      amountRequested: 2750.00,
      status: 'Approved',
      invoiceURL: '/invoices/INV-2023-008'
    }
  ];

  constructor(private dialog: MatDialog) {}

  onEdit(invoice: any) {
    const dialogRef = this.dialog.open(SearchDialogComponent, {
      width: '500px',
      data: {
        title: `Edit Invoice: ${invoice.invoiceNumber}`,
        data: invoice,
        excludedFields: ['invoiceId', 'invoiceNumber', 'invoiceURL']
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const index = this.tableData.findIndex(i => i.invoiceId === invoice.invoiceId);
        if (index !== -1) {
          this.tableData[index] = {
            ...invoice,
            ...result,
            amountRequested: parseFloat(result.amountRequested)
          };
        }
      }
    });
  }

  onDelete(invoice: any) {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '450px',
      disableClose: true,
      panelClass: 'confirmation-dialog',
      data: {
        title: 'Delete Invoice',
        message: `You are about to delete invoice ${invoice.invoiceNumber} for ticket ${invoice.ticketId}. This action cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Cancel'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.tableData = this.tableData.filter(i => i.invoiceId !== invoice.invoiceId);
        console.log('Invoice deleted:', invoice);
      }
    });
  }
}
