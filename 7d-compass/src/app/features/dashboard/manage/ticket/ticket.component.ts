import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardLayoutComponent } from "../../../../shared/dashboard-layout/dashboard-layout.component";
import { CardWithButtonComponent } from '../../../../shared/card-with-button/card-with-button.component';
import { MatDialog } from '@angular/material/dialog';
import { DataTableComponent } from '../../../../shared/data-table/data-table.component';
import { ConfirmationDialogComponent } from '../../../../shared/confirmation-dialog/confirmation-dialog.component';
import { SearchDialogComponent } from '../../../../shared/search-dialog/search-dialog.component';
import { BaseDashboardComponent } from '../../../../shared/base-dashboard.component';
import { FilterService } from '../../../../core/services/filter.service';
import { TicketService, Ticket } from '../../../../core/services/ticket.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FabButtonComponent } from '../../../../shared/fab-button/fab-button.component';

interface ColumnDefinition {
  name: string;
  header: string;
  cell: (element: any) => string;
  isActionColumn?: boolean;
}

@Component({
  selector: 'app-ticket',
  standalone: true,
  imports: [
    CommonModule,
    DashboardLayoutComponent,
    CardWithButtonComponent,
    DataTableComponent,
    ConfirmationDialogComponent,
    SearchDialogComponent,
    FabButtonComponent
  ],
  templateUrl: './ticket.component.html',
  styleUrl: './ticket.component.scss'
})
export class TicketComponent extends BaseDashboardComponent implements OnInit {
  columns: ColumnDefinition[] = [
    {
      name: 'ticketCode',
      header: 'Ticket Code',
      cell: (ticket: any) => ticket.ticketCode || 'N/A'
    },
    {
      name: 'incidentName',
      header: 'Incident Name',
      cell: (ticket: any) => ticket.incidentName || 'N/A'
    },
    {
      name: 'contractUnitName',
      header: 'Contract Unit',
      cell: (ticket: any) => ticket.contractUnitName || 'N/A'
    },
    {
      name: 'quadrantId',
      header: 'Quadrant',
      cell: (ticket: any) => {
        if (ticket.quadrantId && ticket.quadrantId !== null && ticket.quadrantId !== '') {
          return ticket.quadrantId.toString();
        }
        return 'N/A';
      }
    },
    {
      name: 'quantity',
      header: 'Quantity',
      cell: (ticket: any) => {
        if (ticket.quantity !== null && ticket.quantity !== undefined && ticket.quantity !== '') {
          return ticket.quantity.toString();
        }
        return '0';
      }
    },
    {
      name: 'amountToPay',
      header: 'Amount',
      cell: (ticket: any) => {
        if (ticket.amountToPay !== null && ticket.amountToPay !== undefined && ticket.amountToPay !== '') {
          const amount = typeof ticket.amountToPay === 'string' ? parseFloat(ticket.amountToPay) : ticket.amountToPay;
          return isNaN(amount) ? '$0.00' : `$${amount.toFixed(2)}`;
        }
        return '$0.00';
      }
    },
    {
      name: 'comment7d',
      header: 'Status',
      cell: (ticket: any) => ticket.comment7d || 'Pending'
    },
    {
      name: 'actions',
      header: 'Actions',
      cell: () => '',
      isActionColumn: true
    }
  ];

  tableData: Ticket[] = [];
  comment7dOptions = [
    'TK - CANCELLED',
    'TK - COMPLETED',
    'NEEDS PERMISION EXTENDED',
    'ON HOLD OFF',
    'ON PROGRESS',
    'ON SCHEDULE',
    'DIGGER APPLAY',
    'HMA- ON PROGRESS'
  ];

  constructor(
    private dialog: MatDialog,
    private ticketService: TicketService,
    filterService: FilterService,
    private snackBar: MatSnackBar
  ) {
    super(filterService);
  }

  override ngOnInit(): void {
    super.ngOnInit();
    this.loadTickets();
  }

  protected override loadData(): void {
    // Initialize data for filtering
    this.allData = [...this.tableData];
    this.filteredData = [...this.allData];
  }

  // Override text search to include ticket fields
  protected override matchesTextSearch(item: any, searchTerm: string): boolean {
    const searchableFields = ['ticketCode', 'incidentName', 'contractUnitName', 'comment7d'];

    return searchableFields.some(field => {
      const value = this.getNestedValue(item, field);
      if (value) {
        return String(value).toLowerCase().includes(searchTerm);
      }
      return false;
    });
  }

  // Getter for filtered ticket data
  get filteredTicketData() {
    return this.filteredData;
  }

  loadTickets(): void {
    this.ticketService.getAllTickets().subscribe({
      next: (data) => {
        console.log('Tickets API response:', data);
        if (data.length > 0) {
          console.log('First ticket structure:', data[0]);
          console.log('First ticket all keys:', Object.keys(data[0]));
          console.log('ticketCode:', data[0].ticketCode);
          console.log('incidentName:', data[0].incidentName);
          console.log('contractUnitName:', data[0].contractUnitName);
          console.log('quadrantId:', data[0].quadrantId);
          console.log('quantity:', data[0].quantity);
          console.log('amountToPay:', data[0].amountToPay);
          console.log('comment7d:', data[0].comment7d);
        }
        this.tableData = data;
        this.allData = [...data];
        this.filteredData = [...data];
      },
      error: (err) => {
        console.error('Error loading tickets:', err);
        // Removed error toast since backend might not be running
      }
    });
  }

  onCreateTicket(newTicket: any): void {
    const ticketToCreate = {
      ...newTicket,
      createdBy: this.getCurrentUserId(),
      updatedBy: this.getCurrentUserId()
    };

    this.ticketService.createTicket(ticketToCreate).subscribe({
      next: (createdTicket) => {
        this.tableData = [...this.tableData, createdTicket];
        this.allData = [...this.tableData];
        this.applyFilters();
        console.log('Ticket created:', createdTicket);
      },
      error: (err) => {
        console.error('Error creating ticket:', err);
      }
    });
  }

  onEdit(ticket: Ticket) {
    const dialogRef = this.dialog.open(SearchDialogComponent, {
      width: '500px',
      data: {
        title: `Edit Ticket: ${ticket.ticketCode}`,
        data: ticket,
        excludedFields: ['ticketId', 'ticketCode', 'incidentName', 'deletedAt', 'updatedAt', 'createdAt', 'createdBy', 'updatedBy'],
        fields: [
          { name: 'quantity', label: 'Quantity', type: 'number', required: true },
          { name: 'daysOutstanding', label: 'Days Outstanding', type: 'number', required: false },
          { name: 'comment7d', label: 'Status', type: 'select', required: true, options: this.comment7dOptions.map(option => ({ value: option, label: option })) },
          { name: 'partnerComment', label: 'Partner Comment', type: 'textarea', required: false },
          { name: 'partnerSupervisorComment', label: 'Partner Supervisor Comment', type: 'textarea', required: false },
          { name: 'contractNumber', label: 'Contract Number', type: 'text', required: false },
          { name: 'amountToPay', label: 'Amount to Pay', type: 'number', required: false },
          { name: 'ticketType', label: 'Ticket Type', type: 'text', required: true }
        ]
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && ticket.ticketId) {
        const index = this.tableData.findIndex(t => t.ticketId === ticket.ticketId);
        if (index !== -1) {
          const updatedTicket = {
            ...ticket,
            ...result,
            updatedBy: this.getCurrentUserId()
          };

          this.ticketService.updateTicket(ticket.ticketId, updatedTicket).subscribe({
            next: () => {
              this.tableData[index] = updatedTicket;
              this.allData = [...this.tableData];
              this.applyFilters();
              this.snackBar.open('Ticket updated successfully', 'Close', { duration: 3000 });
            },
            error: err => {
              console.error('Error updating ticket:', err);
              this.snackBar.open('Error updating ticket', 'Close', { duration: 3000 });
            }
          });
        }
      }
    });
  }

  onDelete(ticket: Ticket) {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '450px',
      disableClose: true,
      panelClass: 'confirmation-dialog',
      data: {
        title: 'Delete Ticket',
        message: `Are you sure you want to delete ticket ${ticket.ticketCode}? This action cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Keep Ticket'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed && ticket.ticketId) {
        this.ticketService.deleteTicket(ticket.ticketId).subscribe({
          next: () => {
        this.tableData = this.tableData.filter(t => t.ticketId !== ticket.ticketId);
            this.allData = [...this.tableData];
            this.applyFilters();
            this.snackBar.open('Ticket deleted successfully', 'Close', { duration: 3000 });
          },
          error: (err) => {
            console.error('Error deleting ticket:', err);
            this.snackBar.open('Error deleting ticket', 'Close', { duration: 3000 });
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
