import { Component, OnInit } from '@angular/core';
import { DashboardLayoutComponent } from "../../../../shared/dashboard-layout/dashboard-layout.component";
import { CardWithButtonComponent } from '../../../../shared/card-with-button/card-with-button.component';
import { MatDialog } from '@angular/material/dialog';
import { SearchDialogComponent } from '../../../../shared/search-dialog/search-dialog.component';
import { DataTableComponent } from '../../../../shared/data-table/data-table.component';
import { ConfirmationDialogComponent } from '../../../../shared/confirmation-dialog/confirmation-dialog.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PaymentsService, Payment } from '../../../../core/services/payments/payments.service';
import { BaseDashboardComponent } from '../../../../shared/base-dashboard.component';
import { FilterService } from '../../../../core/services/filter.service';

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
export class PaymentsComponent extends BaseDashboardComponent implements OnInit {
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

  tableData: Payment[] = [];

  constructor(
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private paymentsService: PaymentsService,
    filterService: FilterService
  ) {
    super(filterService);
  }

  override ngOnInit(): void {
    super.ngOnInit();
    this.loadPayments();
  }

  protected override loadData(): void {
    // Initialize data for filtering
    this.allData = [...this.tableData];
    this.filteredData = [...this.allData];
  }

  // Override text search to include payment fields
  protected override matchesTextSearch(item: any, searchTerm: string): boolean {
    const searchableFields = ['paymentNumber', 'status'];

    return searchableFields.some(field => {
      const value = this.getNestedValue(item, field);
      if (value) {
        return String(value).toLowerCase().includes(searchTerm);
      }
      return false;
    });
  }

  // Override date range to use payment date
  protected override matchesDateRange(item: any, cutoffDate: Date): boolean {
    const dateValue = item.datePaid;
    if (dateValue) {
      const itemDate = new Date(dateValue);
      if (!isNaN(itemDate.getTime()) && itemDate >= cutoffDate) {
        return true;
      }
    }
    return false;
  }

  loadPayments(): void {
    this.paymentsService.getAllPayments().subscribe({
      next: data => {
        this.tableData = data;
        this.allData = [...data];
        this.filteredData = [...data];
      },
      error: err => console.error('Error loading payments:', err)
    });
  }

  // Getter for filtered payment data
  get filteredPaymentData() {
    return this.filteredData;
  }

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

  onEdit(payment: Payment) {
    const dialogRef = this.dialog.open(SearchDialogComponent, {
      width: '500px',
      data: {
        title: `Edit Payment: ${payment.paymentNumber}`,
        data: {
          ...payment,
          datePaid: new Date(payment.datePaid).toISOString().split('T')[0]
        },
        excludedFields: ['checkId', 'paymentNumber', 'paymentURL', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy'],
        fields: [
          { name: 'datePaid', label: 'Date Paid', type: 'date', required: true },
          { name: 'amountPaid', label: 'Amount Paid', type: 'number', required: true },
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
      if (result && payment.checkId) {
        const index = this.tableData.findIndex(p => p.checkId === payment.checkId);
        if (index !== -1) {
          const updatedPayment = {
            ...payment,
            ...result,
            updatedBy: this.getCurrentUserId()
          };

          this.paymentsService.updatePayment(payment.checkId, updatedPayment).subscribe({
            next: () => {
              this.tableData[index] = updatedPayment;
              this.allData = [...this.tableData];
              this.applyFilters();
              this.snackBar.open('Payment updated successfully', 'Close', { duration: 3000 });
            },
            error: err => {
              console.error('Error updating payment:', err);
              this.snackBar.open('Error updating payment', 'Close', { duration: 3000 });
            }
          });
        }
      }
    });
  }

  onDelete(payment: Payment) {
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
      if (confirmed && payment.checkId) {
        this.paymentsService.deletePayment(payment.checkId).subscribe({
          next: () => {
            this.tableData = this.tableData.filter(p => p.checkId !== payment.checkId);
            this.allData = [...this.tableData];
            this.applyFilters();
            this.snackBar.open('Payment deleted successfully', 'Close', { duration: 3000 });
          },
          error: err => {
            console.error('Error deleting payment:', err);
            this.snackBar.open('Error deleting payment', 'Close', { duration: 3000 });
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
