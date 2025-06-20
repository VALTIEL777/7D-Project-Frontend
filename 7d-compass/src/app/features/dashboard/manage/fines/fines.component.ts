import { Component, OnInit } from '@angular/core';
import { DashboardLayoutComponent } from "../../../../shared/dashboard-layout/dashboard-layout.component";
import { CardWithButtonComponent } from '../../../../shared/card-with-button/card-with-button.component';
import { MatDialog } from '@angular/material/dialog';
import { SearchDialogComponent } from '../../../../shared/search-dialog/search-dialog.component';
import { DataTableComponent } from '../../../../shared/data-table/data-table.component';
import { ConfirmationDialogComponent } from '../../../../shared/confirmation-dialog/confirmation-dialog.component';
import { FinesService } from '../../../../core/services/payments/fines.service';

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
  ],
  templateUrl: './fines.component.html',
  styleUrl: './fines.component.scss'
})
export class FinesComponent implements OnInit {
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
    private finesService: FinesService
  ) {}

  ngOnInit(): void {
    this.loadFines();
  }

  loadFines(): void {
    this.finesService.getAllFines().subscribe({
      next: (data) => this.tableData = data,
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
        excludedFields: ['fineid', 'finenumber', 'fineURL']
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
            console.log('Fine deleted:', fine);
          },
          error: (err) => {
            console.error('Error deleting fine:', err);
          }
        });
      }
    });
  }
}
