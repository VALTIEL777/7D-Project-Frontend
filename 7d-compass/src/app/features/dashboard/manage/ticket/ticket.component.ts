import { Component, OnInit } from '@angular/core';
import { DashboardLayoutComponent } from "../../../../shared/dashboard-layout/dashboard-layout.component";
import { CardWithButtonComponent } from '../../../../shared/card-with-button/card-with-button.component';
import { MatDialog } from '@angular/material/dialog';
import { DataTableComponent } from '../../../../shared/data-table/data-table.component';
import { ConfirmationDialogComponent } from '../../../../shared/confirmation-dialog/confirmation-dialog.component';
import { SearchDialogComponent } from '../../../../shared/search-dialog/search-dialog.component';
import { BaseDashboardComponent } from '../../../../shared/base-dashboard.component';
import { FilterService } from '../../../../core/services/filter.service';

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
    DashboardLayoutComponent,
    CardWithButtonComponent,
    DataTableComponent,
  ],
  templateUrl: './ticket.component.html',
  styleUrl: './ticket.component.scss'
})
export class TicketComponent extends BaseDashboardComponent implements OnInit {
  columns: ColumnDefinition[] = [
    {
      name: 'ticketCode',
      header: 'Ticket Code',
      cell: (ticket: any) => ticket.ticketCode
    },
    {
      name: 'mxNumber',
      header: 'MX Number',
      cell: (ticket: any) => ticket.incidentId ? `MX-${ticket.incidentId}` : 'N/A'
    },
    {
      name: 'contractUnit',
      header: 'Contract Unit',
      cell: (ticket: any) => ticket.contractUnitName || 'N/A'
    },
    {
      name: 'quadrant',
      header: 'Quadrant',
      cell: (ticket: any) => ticket.quadrantName || 'N/A'
    },
    {
      name: 'quantity',
      header: 'Quantity',
      cell: (ticket: any) => ticket.quantity?.toString() || '0'
    },
    {
      name: 'amount',
      header: 'Amount',
      cell: (ticket: any) => ticket.amountToPay ? `$${ticket.amountToPay.toFixed(2)}` : '$0.00'
    },
    {
      name: 'status',
      header: 'Status',
      cell: (ticket: any) => ticket.status || 'Pending'
    },
    {
      name: 'actions',
      header: 'Actions',
      cell: () => '',
      isActionColumn: true
    }
  ];

  // Sample data based on your database schema
  tableData = [
    {
      ticketId: 1,
      ticketCode: 'TCK-001',
      incidentId: 1001,
      contractUnitId: 5,
      contractUnitName: 'Asphalt Patching',
      quadrantId: 3,
      quadrantName: 'Northwest',
      quantity: 5,
      amountToPay: 1250.50,
      status: 'In Progress',
      ticketType: 'regular',
      daysOutstanding: 3,
      contractNumber: 'CNTR-2023-001'
    },
    {
      ticketId: 2,
      ticketCode: 'TCK-002',
      incidentId: 1002,
      contractUnitId: 7,
      contractUnitName: 'Concrete Repair',
      quadrantId: 1,
      quadrantName: 'Southwest',
      quantity: 2,
      amountToPay: 850.75,
      status: 'Completed',
      ticketType: 'regular',
      daysOutstanding: 0,
      contractNumber: 'CNTR-2023-002'
    },
    {
      ticketId: 3,
      ticketCode: 'TCK-003',
      incidentId: 1003,
      contractUnitId: 12,
      contractUnitName: 'Utility Cut Repair',
      quadrantId: 2,
      quadrantName: 'Northeast',
      quantity: 1,
      amountToPay: 420.00,
      status: 'Pending',
      ticketType: 'mobilization',
      daysOutstanding: 7,
      contractNumber: 'CNTR-2023-003'
    },
    {
      ticketId: 4,
      ticketCode: 'TCK-004',
      incidentId: 1004,
      contractUnitId: 8,
      contractUnitName: 'Pothole Repair',
      quadrantId: 4,
      quadrantName: 'Southeast',
      quantity: 8,
      amountToPay: 960.25,
      status: 'In Progress',
      ticketType: 'regular',
      daysOutstanding: 2,
      contractNumber: 'CNTR-2023-004'
    },
    {
      ticketId: 5,
      ticketCode: 'TCK-005',
      incidentId: 1005,
      contractUnitId: 15,
      contractUnitName: 'Sidewalk Repair',
      quadrantId: 1,
      quadrantName: 'Southwest',
      quantity: 3,
      amountToPay: 1375.40,
      status: 'Completed',
      ticketType: 'regular',
      daysOutstanding: 0,
      contractNumber: 'CNTR-2023-005'
    },
    {
      ticketId: 6,
      ticketCode: 'TCK-006',
      incidentId: 1006,
      contractUnitId: 5,
      contractUnitName: 'Asphalt Patching',
      quadrantId: 3,
      quadrantName: 'Northwest',
      quantity: 4,
      amountToPay: 1100.00,
      status: 'Pending',
      ticketType: 'regular',
      daysOutstanding: 5,
      contractNumber: 'CNTR-2023-006'
    },
    {
      ticketId: 7,
      ticketCode: 'TCK-007',
      incidentId: 1007,
      contractUnitId: 9,
      contractUnitName: 'Curb Repair',
      quadrantId: 2,
      quadrantName: 'Northeast',
      quantity: 2,
      amountToPay: 725.30,
      status: 'In Progress',
      ticketType: 'regular',
      daysOutstanding: 1,
      contractNumber: 'CNTR-2023-007'
    },
    {
      ticketId: 8,
      ticketCode: 'TCK-008',
      incidentId: 1008,
      contractUnitId: 11,
      contractUnitName: 'Traffic Control',
      quadrantId: 4,
      quadrantName: 'Southeast',
      quantity: 1,
      amountToPay: 350.00,
      status: 'Completed',
      ticketType: 'mobilization',
      daysOutstanding: 0,
      contractNumber: 'CNTR-2023-008'
    },
    {
      ticketId: 9,
      ticketCode: 'TCK-009',
      incidentId: 1009,
      contractUnitId: 7,
      contractUnitName: 'Concrete Repair',
      quadrantId: 1,
      quadrantName: 'Southwest',
      quantity: 6,
      amountToPay: 1850.60,
      status: 'Pending',
      ticketType: 'regular',
      daysOutstanding: 4,
      contractNumber: 'CNTR-2023-009'
    },
    {
      ticketId: 10,
      ticketCode: 'TCK-010',
      incidentId: 1010,
      contractUnitId: 13,
      contractUnitName: 'Street Sweeping',
      quadrantId: 3,
      quadrantName: 'Northwest',
      quantity: 1,
      amountToPay: 280.00,
      status: 'Completed',
      ticketType: 'mobilization',
      daysOutstanding: 0,
      contractNumber: 'CNTR-2023-010'
    }
  ];

  constructor(
    private dialog: MatDialog,
    filterService: FilterService
  ) {
    super(filterService);
  }

  override ngOnInit(): void {
    super.ngOnInit();
    this.loadData();
  }

  protected override loadData(): void {
    // Initialize data for filtering
    this.allData = [...this.tableData];
    this.filteredData = [...this.allData];
  }

  // Override text search to include ticket fields
  protected override matchesTextSearch(item: any, searchTerm: string): boolean {
    const searchableFields = ['ticketCode', 'incidentId', 'contractUnitName', 'quadrantName', 'status', 'contractNumber'];

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

  onEdit(ticket: any) {
    const dialogRef = this.dialog.open(SearchDialogComponent, {
      width: '500px',
      data: {
        title: `Edit Ticket: ${ticket.ticketCode}`,
        data: { ...ticket },
        excludedFields: ['ticketId', 'ticketCode', 'incidentId', 'deletedat', 'updatedat', 'createdat', 'createdby', 'updatedby']
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const index = this.tableData.findIndex(t => t.ticketId === ticket.ticketId);
        if (index !== -1) {
          this.tableData[index] = {
            ...this.tableData[index],
            ...result
          };
          this.allData = [...this.tableData];
          this.applyFilters();
        }
      }
    });
  }

  onDelete(ticket: any) {
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
      if (confirmed) {
        this.tableData = this.tableData.filter(t => t.ticketId !== ticket.ticketId);
        this.allData = [...this.tableData];
        this.applyFilters();
        console.log('Ticket deleted:', ticket);
      }
    });
  }
}
