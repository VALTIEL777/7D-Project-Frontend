import { Component } from '@angular/core';
import { DashboardLayoutComponent } from "../../../../shared/dashboard-layout/dashboard-layout.component";
import { CardWithButtonComponent } from '../../../../shared/card-with-button/card-with-button.component';
import { MatDialog } from '@angular/material/dialog';
import { SearchDialogComponent } from '../../../../shared/search-dialog/search-dialog.component';
import { DataTableComponent } from '../../../../shared/data-table/data-table.component';
import { ConfirmationDialogComponent } from '../../../../shared/confirmation-dialog/confirmation-dialog.component';
import { MatSnackBar } from '@angular/material/snack-bar';

interface ColumnDefinition {
  name: string;
  header: string;
  cell: (element: any) => string;
  isActionColumn?: boolean;
}

@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [
    DashboardLayoutComponent,
    CardWithButtonComponent,
    DataTableComponent,
  ],
  templateUrl: './payments.component.html',
  styleUrl: './payments.component.scss'
})
export class PaymentsComponent {
  columns: ColumnDefinition[] = [
    {
      name: 'paymentNumber',
      header: 'Payment #',
      cell: (payment: any) => payment.paymentNumber
    },
    {
      name: 'datePaid',
      header: 'Date Paid',
      cell: (payment: any) => this.formatDate(payment.datePaid)
    },
    {
      name: 'amountPaid',
      header: 'Amount',
      cell: (payment: any) => this.formatCurrency(payment.amountPaid)
    },
    {
      name: 'status',
      header: 'Status',
      cell: (payment: any) => payment.status
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
      checkId: 1,
      paymentNumber: 'PYM-2023-001',
      datePaid: '2023-01-15',
      amountPaid: 1250.75,
      status: 'Processed',
      paymentURL: 'https://example.com/payments/1'
    },
    {
      checkId: 2,
      paymentNumber: 'PYM-2023-002',
      datePaid: '2023-02-20',
      amountPaid: 850.50,
      status: 'Processed',
      paymentURL: 'https://example.com/payments/2'
    },
    {
      checkId: 3,
      paymentNumber: 'PYM-2023-003',
      datePaid: '2023-03-10',
      amountPaid: 2200.00,
      status: 'Pending',
      paymentURL: 'https://example.com/payments/3'
    },
    {
      checkId: 4,
      paymentNumber: 'PYM-2023-004',
      datePaid: '2023-04-05',
      amountPaid: 1750.25,
      status: 'Rejected',
      paymentURL: 'https://example.com/payments/4'
    },
    {
      checkId: 5,
      paymentNumber: 'PYM-2023-005',
      datePaid: '2023-05-18',
      amountPaid: 950.00,
      status: 'Processed',
      paymentURL: 'https://example.com/payments/5'
    },
    {
      checkId: 6,
      paymentNumber: 'PYM-2023-006',
      datePaid: '2023-06-22',
      amountPaid: 3200.50,
      status: 'Pending',
      paymentURL: 'https://example.com/payments/6'
    },
    {
      checkId: 7,
      paymentNumber: 'PYM-2023-007',
      datePaid: '2023-07-30',
      amountPaid: 1500.00,
      status: 'Processed',
      paymentURL: 'https://example.com/payments/7'
    },
    {
      checkId: 8,
      paymentNumber: 'PYM-2023-008',
      datePaid: '2023-08-12',
      amountPaid: 2750.75,
      status: 'Processed',
      paymentURL: 'https://example.com/payments/8'
    }
  ];

  constructor(
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  onEdit(payment: any) {
    const dialogRef = this.dialog.open(SearchDialogComponent, {
      width: '500px',
      data: {
        title: `Edit Payment: ${payment.paymentNumber}`,
        data: {
          ...payment,
          datePaid: new Date(payment.datePaid).toISOString().split('T')[0]
        },
        excludedFields: ['checkId', 'paymentNumber', 'paymentURL'],
        fieldTypes: {
          datePaid: 'date',
          amountPaid: 'currency'
        }
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const index = this.tableData.findIndex(p => p.checkId === payment.checkId);
        if (index !== -1) {
          this.tableData[index] = {
            ...this.tableData[index],
            ...result
          };
          this.snackBar.open('Payment updated successfully', 'Close', { duration: 3000 });
        }
      }
    });
  }

  onDelete(payment: any) {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '450px',
      disableClose: true,
      panelClass: 'confirmation-dialog',
      data: {
        title: 'Delete Payment Record',
        message: `You are about to delete payment ${payment.paymentNumber} for ${this.formatCurrency(payment.amountPaid)}. This action cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Cancel'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.tableData = this.tableData.filter(p => p.checkId !== payment.checkId);
        this.snackBar.open('Payment deleted successfully', 'Close', { duration: 3000 });
      }
    });
  }
}
