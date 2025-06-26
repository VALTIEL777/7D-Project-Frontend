import { Component, OnInit } from '@angular/core';
import { DashboardLayoutComponent } from "../../../../shared/dashboard-layout/dashboard-layout.component";
import { CardWithButtonComponent } from '../../../../shared/card-with-button/card-with-button.component';
import { MatDialog } from '@angular/material/dialog';
import { SearchDialogComponent } from '../../../../shared/search-dialog/search-dialog.component';
import { DataTableComponent } from '../../../../shared/data-table/data-table.component';
import { ConfirmationDialogComponent } from '../../../../shared/confirmation-dialog/confirmation-dialog.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Invoice, InvoiceService } from '../../../../core/services/payments/invoices.service';
import { BaseDashboardComponent } from '../../../../shared/base-dashboard.component';
import { FilterService } from '../../../../core/services/filter.service';

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
export class InvoicesComponent extends BaseDashboardComponent implements OnInit {
  columns: ColumnDefinition[] = [
    {
      name: 'invoiceNumber',
      header: 'Invoice Number',
      cell: (inv: any) => inv.invoiceNumber || `INV-${inv.invoiceId}`
    },
    {
      name: 'ticketId',
      header: 'Ticket ID',
      cell: (inv: any) => inv.ticketId != null ? `TK-${inv.ticketId}` : 'N/A'
    },
    {
      name: 'amountRequested',
      header: 'Amount',
      cell: (inv: any) => {
        const amount = inv.amountRequested;
        if (amount === null || amount === undefined || amount === '') {
          return '$0.00';
        }
        const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
        return isNaN(numAmount) ? '$0.00' : `$${numAmount.toFixed(2)}`;
      }
    },
    {
      name: 'invoiceDateRequested',
      header: 'Invoice Date',
      cell: (inv: any) => {
        const date = inv.invoiceDateRequested;
        return date ? new Date(date).toLocaleDateString() : 'N/A';
      }
    },
    {
      name: 'paymentDate',
      header: 'Payment Date',
      cell: (inv: any) => {
        const date = inv.paymentDate;
        return date ? new Date(date).toLocaleDateString() : 'Unpaid';
      }
    },
    {
      name: 'status',
      header: 'Status',
      cell: (inv: any) => inv.status || 'N/A'
    },
    {
      name: 'actions',
      header: 'Actions',
      cell: () => '',
      isActionColumn: true
    }
  ];

  tableData: Invoice[] = [];

  constructor(
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private invoiceService: InvoiceService,
    filterService: FilterService
  ) {
    super(filterService);
  }

  override ngOnInit(): void {
    super.ngOnInit();
    this.loadInvoices();
  }

  protected override loadData(): void {
    // Initialize data for filtering
    this.allData = [...this.tableData];
    this.filteredData = [...this.allData];
  }

  // Override text search to include invoice fields
  protected override matchesTextSearch(item: any, searchTerm: string): boolean {
    const searchableFields = ['invoiceNumber', 'ticketId', 'status'];

    return searchableFields.some(field => {
      const value = this.getNestedValue(item, field);
      if (value) {
        return String(value).toLowerCase().includes(searchTerm);
      }
      return false;
    });
  }

  // Override date range to use invoice date
  protected override matchesDateRange(item: any, cutoffDate: Date): boolean {
    const dateValue = item.invoiceDateRequested;
    if (dateValue) {
      const itemDate = new Date(dateValue);
      if (!isNaN(itemDate.getTime()) && itemDate >= cutoffDate) {
        return true;
      }
    }
    return false;
  }

  loadInvoices(): void {
    this.invoiceService.getAllInvoices().subscribe({
      next: (data) => {
        console.log('API response data:', data);
        if (data.length > 0) {
          console.log('First invoice structure:', data[0]);
          console.log('First invoice all keys:', Object.keys(data[0]));
          console.log('invoiceId:', data[0].invoiceId);
          console.log('invoicenumber:', (data[0] as any).invoicenumber);
          console.log('ticketId:', data[0].ticketId);
          console.log('ticketid:', (data[0] as any).ticketid);
        }
        this.tableData = data;
        this.allData = [...data];
        this.filteredData = [...data];
      },
      error: (err) => {
        console.error('Error loading invoices:', err);
        this.snackBar.open('Error loading invoices', 'Close', { duration: 3000 });
      }
    });
  }

  // Getter for filtered invoice data
  get filteredInvoiceData() {
    return this.filteredData;
  }

  onEdit(invoice: Invoice) {
    const dialogRef = this.dialog.open(SearchDialogComponent, {
      width: '500px',
      data: {
        title: `Edit Invoice: ${invoice.invoiceNumber}`,
        data: {
          ...invoice,
          invoiceDateRequested: new Date(invoice.invoiceDateRequested).toISOString().split('T')[0],
          paymentDate: invoice.paymentDate ? new Date(invoice.paymentDate).toISOString().split('T')[0] : ''
        },
        excludedFields: ['invoiceId', 'invoiceNumber', 'invoiceURL', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy'],
        fields: [
          { name: 'ticketId', label: 'Ticket ID', type: 'number', required: true },
          { name: 'invoiceDateRequested', label: 'Invoice Date', type: 'date', required: true },
          { name: 'amountRequested', label: 'Amount Requested', type: 'number', required: true },
          { name: 'paymentDate', label: 'Payment Date', type: 'date', required: false },
          { name: 'status', label: 'Status', type: 'select', required: true, options: [
            { value: 'Pending', label: 'Pending' },
            { value: 'Completed', label: 'Completed' },
            { value: 'Failed', label: 'Failed' },
            { value: 'Cancelled', label: 'Cancelled' }
          ]}
        ]
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && invoice.invoiceId) {
        const index = this.tableData.findIndex(i => i.invoiceId === invoice.invoiceId);
        if (index !== -1) {
          const updatedInvoice = {
            ...invoice,
            ...result,
            paymentDate: result.paymentDate || null, // Convert empty string to null
            updatedBy: this.getCurrentUserId()
          };

          this.invoiceService.updateInvoice(invoice.invoiceId, updatedInvoice).subscribe({
            next: () => {
              this.tableData[index] = updatedInvoice;
              this.allData = [...this.tableData];
              this.applyFilters();
              this.snackBar.open('Invoice updated successfully', 'Close', { duration: 3000 });
            },
            error: err => {
              console.error('Error updating invoice:', err);
              this.snackBar.open('Error updating invoice', 'Close', { duration: 3000 });
            }
          });
        }
      }
    });
  }

  onDelete(invoice: Invoice) {
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
      if (confirmed && invoice.invoiceId) {
        this.invoiceService.deleteInvoice(invoice.invoiceId).subscribe({
          next: () => {
            this.tableData = this.tableData.filter(i => i.invoiceId !== invoice.invoiceId);
            this.allData = [...this.tableData];
            this.applyFilters();
            this.snackBar.open('Invoice deleted successfully', 'Close', { duration: 3000 });
          },
          error: (err) => {
            console.error('Error deleting invoice:', err);
            this.snackBar.open('Error deleting invoice', 'Close', { duration: 3000 });
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
