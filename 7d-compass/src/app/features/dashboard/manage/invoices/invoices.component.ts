import { Component, OnInit } from '@angular/core';
import { DashboardLayoutComponent } from "../../../../shared/dashboard-layout/dashboard-layout.component";
import { CardWithButtonComponent } from '../../../../shared/card-with-button/card-with-button.component';
import { MatDialog } from '@angular/material/dialog';
import { SearchDialogComponent } from '../../../../shared/search-dialog/search-dialog.component';
import { DataTableComponent } from '../../../../shared/data-table/data-table.component';
import { ConfirmationDialogComponent } from '../../../../shared/confirmation-dialog/confirmation-dialog.component';
import { Invoice, InvoiceService } from '../../../../core/services/payments/invoices.service';

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
export class InvoicesComponent implements OnInit {
  columns: ColumnDefinition[] = [
  {
    name: 'invoiceNumber',
    header: 'Invoice Number',
    cell: (inv: any) =>  `INV-${inv.invoiceid}`
  },
  {
    name: 'ticketId',
    header: 'Ticket ID',
    cell: (inv: any) => inv.ticketid != null ? `TK-${inv.ticketid}` : ''
  },
  {
    name: 'amountRequested',
    header: 'Amount',
    cell: (inv: any) => {
      const amount = typeof inv.amountrequested === 'number'
        ? inv.amountrequested
        : parseFloat(inv.amountrequested);
      return !isNaN(amount)
        ? `$${amount.toFixed(2)}`
        : 'Invalid amount';
    }
  },
  {
    name: 'invoiceDateRequested',
    header: 'Invoice Date',
    cell: (inv: any) => new Date(inv.invoicedaterequested).toLocaleDateString()
  },
  {
    name: 'paymentDate',
    header: 'Payment Date',
    cell: (inv: any) => inv.paymentdate
      ? new Date(inv.paymentdate).toLocaleDateString()
      : 'Unpaid'
  },
  {
    name: 'status',
    header: 'Status',
    cell: (inv: any) => inv.status
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
    private invoiceService: InvoiceService
  ) {}

  ngOnInit(): void {
    this.loadInvoices();
  }

  loadInvoices(): void {
    this.invoiceService.getAllInvoices().subscribe({
      next: (data) => {
        // Asegurar que la fecha esté en formato Date (por si llega como string)
        this.tableData = data.map(invoice => ({
          ...invoice,
          invoiceDateRequested: new Date(invoice.invoiceDateRequested)
        }));
      },
      error: (err) => {
        console.error('Error loading invoices:', err);
      }
    });
  }

  onEdit(invoice: any) {
    const dialogRef = this.dialog.open(SearchDialogComponent, {
      width: '500px',
      data: {
        title: `Edit Invoice: ${invoice.invoicenumber}`,
        data: invoice,
        excludedFields: ['invoiceid', 'invoicenumber', 'invoiceurl']
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const index = this.tableData.findIndex(i => i.invoiceid === invoice.invoiceid);
        if (index !== -1) {
          this.tableData[index] = {
            ...invoice,
            ...result,
            amountrequested: parseFloat(result.amountrequested)
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
        message: `You are about to delete invoice ${invoice.invoiceid} for ticket ${invoice.ticketId}. This action cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Cancel'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.invoiceService.deleteInvoice(invoice.invoiceid!).subscribe({
          next: () => {
            this.tableData = this.tableData.filter(i => i.invoiceid !== invoice.invoiceid);
            console.log('Invoice deleted:', invoice);
          },
          error: (err) => {
            console.error('Error deleting invoice:', err);
          }
        });
      }
    });
  }
}
