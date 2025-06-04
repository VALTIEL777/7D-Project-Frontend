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
export class FinesComponent {
  columns: ColumnDefinition[] = [
    {
      name: 'fineNumber',
      header: 'Fine Number',
      cell: (fine: any) => fine.fineNumber
    },
    {
      name: 'ticketId',
      header: 'Ticket ID',
      cell: (fine: any) => fine.ticketId.toString()
    },
    {
      name: 'amount',
      header: 'Amount',
      cell: (fine: any) => `$${fine.amount.toFixed(2)}`
    },
    {
      name: 'fineDate',
      header: 'Fine Date',
      cell: (fine: any) => new Date(fine.fineDate).toLocaleDateString()
    },
    {
      name: 'paymentDate',
      header: 'Payment Date',
      cell: (fine: any) => fine.paymentDate ? new Date(fine.paymentDate).toLocaleDateString() : 'Unpaid'
    },
    {
      name: 'status',
      header: 'Status',
      cell: (fine: any) => fine.status
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
      fineId: 1,
      ticketId: 101,
      fineNumber: 'F-2023-001',
      fineDate: '2023-01-15',
      paymentDate: '2023-01-20',
      amount: 250.00,
      status: 'Paid',
      fineURL: 'https://example.com/fines/1'
    },
    {
      fineId: 2,
      ticketId: 102,
      fineNumber: 'F-2023-002',
      fineDate: '2023-02-10',
      paymentDate: null,
      amount: 150.00,
      status: 'Pending',
      fineURL: 'https://example.com/fines/2'
    },
    {
      fineId: 3,
      ticketId: 103,
      fineNumber: 'F-2023-003',
      fineDate: '2023-03-05',
      paymentDate: '2023-03-15',
      amount: 350.50,
      status: 'Paid',
      fineURL: 'https://example.com/fines/3'
    },
    {
      fineId: 4,
      ticketId: 104,
      fineNumber: 'F-2023-004',
      fineDate: '2023-04-20',
      paymentDate: null,
      amount: 200.00,
      status: 'Overdue',
      fineURL: 'https://example.com/fines/4'
    },
    {
      fineId: 5,
      ticketId: 105,
      fineNumber: 'F-2023-005',
      fineDate: '2023-05-12',
      paymentDate: '2023-05-18',
      amount: 175.25,
      status: 'Paid',
      fineURL: 'https://example.com/fines/5'
    },
    {
      fineId: 6,
      ticketId: 106,
      fineNumber: 'F-2023-006',
      fineDate: '2023-06-30',
      paymentDate: null,
      amount: 300.00,
      status: 'Pending',
      fineURL: 'https://example.com/fines/6'
    },
    {
      fineId: 7,
      ticketId: 107,
      fineNumber: 'F-2023-007',
      fineDate: '2023-07-22',
      paymentDate: '2023-07-25',
      amount: 225.75,
      status: 'Paid',
      fineURL: 'https://example.com/fines/7'
    },
    {
      fineId: 8,
      ticketId: 108,
      fineNumber: 'F-2023-008',
      fineDate: '2023-08-15',
      paymentDate: null,
      amount: 400.00,
      status: 'Pending',
      fineURL: 'https://example.com/fines/8'
    }
  ];

  constructor(private dialog: MatDialog) {}

  onEdit(fine: any) {
    const dialogRef = this.dialog.open(SearchDialogComponent, {
      width: '500px',
      data: {
        title: `Edit Fine: ${fine.fineNumber}`,
        data: {
          ...fine,
          fineDate: new Date(fine.fineDate),
          paymentDate: fine.paymentDate ? new Date(fine.paymentDate) : null
        },
        excludedFields: ['fineId', 'fineNumber', 'fineURL']
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const index = this.tableData.findIndex(f => f.fineId === fine.fineId);
        if (index !== -1) {
          // Update status based on payment date
          const newStatus = result.paymentDate ? 'Paid' : (fine.status === 'Overdue' ? 'Overdue' : 'Pending');

          this.tableData[index] = {
            ...fine,
            ...result,
            status: newStatus,
            paymentDate: result.paymentDate ? result.paymentDate.toISOString().split('T')[0] : null
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
        message: `You are about to permanently delete fine ${fine.fineNumber} for ticket ${fine.ticketId}. This action cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Keep Fine'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.tableData = this.tableData.filter(f => f.fineId !== fine.fineId);
        console.log('Fine deleted:', fine);
      }
    });
  }
}
