import { Component, OnInit } from '@angular/core';
import { DashboardLayoutComponent } from "../../../../shared/dashboard-layout/dashboard-layout.component";
import { CardWithButtonComponent } from '../../../../shared/card-with-button/card-with-button.component';
import { MatDialog } from '@angular/material/dialog';
import { SearchDialogComponent } from '../../../../shared/search-dialog/search-dialog.component';
import { DataTableComponent } from '../../../../shared/data-table/data-table.component';
import { ConfirmationDialogComponent } from '../../../../shared/confirmation-dialog/confirmation-dialog.component';
import { FinesService } from '../../../../core/services/payments/fines.service';
import { BaseDashboardComponent } from '../../../../shared/base-dashboard.component';
import { FilterService } from '../../../../core/services/filter.service';
import { FabButtonComponent } from '../../../../shared/fab-button/fab-button.component';

interface ColumnDefinition {
  name: string;
  header: string;
  cell: (element: any) => string;
  isActionColumn?: boolean;
}

@Component({
  selector: 'app-fines',
  standalone: true,
  imports: [
    DashboardLayoutComponent,
    CardWithButtonComponent,
    DataTableComponent,
    FabButtonComponent,
  ],
  templateUrl: './fines.component.html',
  styleUrl: './fines.component.scss'
})
export class FinesComponent extends BaseDashboardComponent implements OnInit {
  columns: ColumnDefinition[] = [
    { name: 'fineNumber', header: 'Fine Number', cell: f => `FINE-${f.fineid}` },
    { name: 'ticketId', header: 'Ticket ID',   cell: (f: any) => f.ticketid != null ? `TK-${f.ticketid}` : ''},
     {
    name: 'amount',
    header: 'Amount',
    cell: (fine: any) => {
      const amount = typeof fine.amount === 'number'
        ? fine.amount
        : parseFloat(fine.amount);
      return !isNaN(amount)
        ? `$${amount.toFixed(2)}`
        : 'Invalid amount';
    }
  },
    { name: 'fineDate', header: 'Fine Date', cell: f => new Date(f.finedate).toLocaleDateString() },
    { name: 'paymentDate', header: 'Payment Date', cell: f => f.paymentdate ? new Date(f.paymentdate).toLocaleDateString() : 'Unpaid' },
    { name: 'status', header: 'Status', cell: f => f.status },
    { name: 'actions', header: 'Actions', cell: () => '', isActionColumn: true }
  ];


  tableData: any[] = [];

  constructor(
    private dialog: MatDialog,
    private finesService: FinesService,
    filterService: FilterService
  ) {
    super(filterService);
  }

  override ngOnInit(): void {
    super.ngOnInit();
    this.loadFines();
  }

  protected override loadData(): void {
    // Initialize data for filtering
    this.allData = [...this.tableData];
    this.filteredData = [...this.allData];
  }

  // Override text search to include fine fields
  protected override matchesTextSearch(item: any, searchTerm: string): boolean {
    const searchableFields = ['fineid', 'ticketid', 'status'];

    return searchableFields.some(field => {
      const value = this.getNestedValue(item, field);
      if (value) {
        return String(value).toLowerCase().includes(searchTerm);
      }
      return false;
    });
  }

  // Override date range to use fine date
  protected override matchesDateRange(item: any, cutoffDate: Date): boolean {
    const dateValue = item.finedate;
    if (dateValue) {
      const itemDate = new Date(dateValue);
      if (!isNaN(itemDate.getTime()) && itemDate >= cutoffDate) {
        return true;
      }
    }
    return false;
  }

  // Getter for filtered fine data
  get filteredFineData() {
    return this.filteredData;
  }

  loadFines(): void {
    this.finesService.getAllFines().subscribe({
      next: (data) => {
        this.tableData = data;
        this.allData = [...this.tableData];
        this.filteredData = [...this.allData];
      },
      error: (err) => console.error('Error loading fines:', err)
    });
  }

  onEdit(fine: any) {
    const dialogRef = this.dialog.open(SearchDialogComponent, {
      width: '500px',
      data: {
        title: `Edit Fine: ${fine.fineid}`,
        data: {
          ...fine,
          fineDate: new Date(fine.fineDate),
          paymentDate: fine.paymentDate ? new Date(fine.paymentDate) : null
        },
        excludedFields: ['fineid', 'finenumber', 'fineURL', 'deletedat', 'updatedat', 'createdat', 'createdby', 'updatedby']
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const index = this.tableData.findIndex(f => f.fineid === fine.fineid);
        if (index !== -1) {
          const newStatus = result.paymentDate ? 'Paid' : (fine.status === 'Overdue' ? 'Overdue' : 'Pending');
          this.tableData[index] = {
            ...fine,
            ...result,
            status: newStatus,
            paymentdate: result.paymentdate ? result.paymentDate.toISOString().split('T')[0] : null
          };
          this.allData = [...this.tableData];
          this.applyFilters();
        }
      }
    });
  }

  onDelete(fine: any) {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '450px',
      disableClose: true,
      panelClass: 'confirmation-dialog',
      data: {
        title: 'Delete Fine Record',
        message: `You are about to permanently delete fine ${fine.fineid} for ticket ${fine.ticketid}. This action cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Keep Fine'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.finesService.deleteFine(fine.fineid).subscribe({
          next: () => {
            this.tableData = this.tableData.filter(f => f.fineid !== fine.fineid);
            this.allData = [...this.tableData];
            this.applyFilters();
            console.log('Fine deleted:', fine);
          },
          error: (err) => {
            console.error('Error deleting fine:', err);
          }
        });
      }
    });
  }

  onCreateFine(newFine: any): void {
    const fineToCreate = {
      ...newFine,
      createdBy: this.getCurrentUserId(),
      updatedBy: this.getCurrentUserId()
    };

    this.finesService.createFine(fineToCreate).subscribe({
      next: (createdFine) => {
        this.tableData = [...this.tableData, createdFine];
        this.allData = [...this.tableData];
        this.applyFilters();
        console.log('Fine created:', createdFine);
      },
      error: (err) => {
        console.error('Error creating fine:', err);
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
