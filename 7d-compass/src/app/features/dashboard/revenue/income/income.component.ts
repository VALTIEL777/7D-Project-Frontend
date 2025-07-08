import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardLayoutComponent } from "../../../../shared/dashboard-layout/dashboard-layout.component";
import { DataTableComponent } from '../../../../shared/data-table/data-table.component';
import { CardWithButtonComponent } from '../../../../shared/card-with-button/card-with-button.component';
import { ConfirmationDialogComponent } from '../../../../shared/confirmation-dialog/confirmation-dialog.component';
import { SearchDialogComponent } from '../../../../shared/search-dialog/search-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { BaseDashboardComponent } from '../../../../shared/base-dashboard.component';
import { FilterService } from '../../../../core/services/filter.service';
import { ColumnDefinition } from '../../../../shared/data-table/data-table.component';

@Component({
  selector: 'app-income',
  standalone: true,
  imports: [
    CommonModule,
    DashboardLayoutComponent,
    DataTableComponent,
    CardWithButtonComponent,
    ConfirmationDialogComponent,
    SearchDialogComponent
  ],
  templateUrl: './income.component.html',
  styleUrl: './income.component.scss'
})

export class IncomeComponent extends BaseDashboardComponent {
  override allData: any[] = [];
  override filteredData: any[] = [];
  totalGeneral: number = 0;
  totalIncome: number = 0;
  invoiceData: any[] = [];
  invoiceColumns: ColumnDefinition[] = [
    // Define columns as needed, similar to ticketColumns
  ];

  constructor(
    private dialog: MatDialog,
    private sanitizer: DomSanitizer,
    protected override filterService: FilterService
  ) {
    super(filterService);
    // Initialize data here if needed
    // this.allData = ...;
    // this.filteredData = [...this.allData];
  }

  sanitize(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  // Override text search to include ticket and invoice fields
  protected override matchesTextSearch(item: any, searchTerm: string): boolean {
    const searchableFields = ['ticketnum', 'crew', 'startdate', 'enddate', 'invoicenum'];
    return searchableFields.some(field => {
      const value = this.getNestedValue(item, field);
      if (value) {
        return String(value).toLowerCase().includes(searchTerm);
      }
      return false;
    });
  }

  // Override date range to use startdate for tickets and invoice date for invoices
  protected override matchesDateRange(item: any, cutoffDate: Date): boolean {
    if (item.type === 'ticket' && item.startdate) {
      const itemDate = new Date(item.startdate);
      if (!isNaN(itemDate.getTime()) && itemDate >= cutoffDate) {
        return true;
      }
    } else if (item.type === 'invoice' && item.invoicedate) {
      const itemDate = new Date(item.invoicedate);
      if (!isNaN(itemDate.getTime()) && itemDate >= cutoffDate) {
        return true;
      }
    }
    return false;
  }

  // Getter for filtered ticket data
  get filteredTicketData() {
    return this.filteredData.filter(item => item.type === 'ticket');
  }

  // Getter for filtered invoice data
  get filteredInvoiceData() {
    return this.filteredData.filter(item => item.type === 'invoice');
  }

  // Custom data initialization
  initializeData(): void {
    // Calcular total general de tickets
    this.totalGeneral = 0;
    this.ticketData.forEach(ticket => {
      const m = Number(ticket.mcost) || 0;
      const w = Number(ticket.wcost) || 0;
      const e = Number(ticket.ecost) || 0;
      const totalTicket = m + w + e;
      ticket.total = totalTicket.toString();
      this.totalGeneral += totalTicket;
    });
    // Sincronizar "total" con "our"
    this.invoiceData = this.invoiceData.map(invoice => {
      const matchedTicket = this.ticketData.find(t => t.ticketnum === invoice.ticketnum);
      if (matchedTicket) {
        invoice.our = Number(matchedTicket.total); // Asegura que se pase como número
      }
      const diff = invoice.invoiceweb - invoice.our;
      invoice.income = `${diff > 0 ? '+' : diff < 0 ? '-' : ''}$${Math.abs(diff)}`;
      this.totalIncome += diff;
      return invoice;
    });
    // Initialize filtering data
    this.loadData();
  }

  override loadData(): void {
    // Implement data loading logic here or leave as a stub
    // For now, just copy ticketData and invoiceData to allData and filteredData
    this.allData = [...this.ticketData, ...this.invoiceData];
    this.filteredData = [...this.allData];
  }

  ticketColumns: ColumnDefinition[] = [
    {
      name: 'ticketnum',
      header: 'Ticket',
      cell: (ticket: any) => `TK-${ticket.ticketnum}`
    },
    {
      name: 'crew',
      header: 'Crew',
      cell: (ticket: any) => ticket.crew
    },
    {
      name: 'startdate',
      header: 'Start Date',
      cell: (ticket: any) => ticket.startdate
    },
    {
      name: 'enddate',
      header: 'End Date',
      cell: (ticket: any) => ticket.enddate
    },
    {
      name: 'mcost',
      header: 'Material Cost',
      cell: (ticket: any) => `$${ticket.mcost}`
    },
    {
      name: 'wcost',
      header: 'Work Cost',
      cell: (ticket: any) => `$${ticket.wcost}`
    },
    {
      name: 'ecost',
      header: 'Equipment Cost',
      cell: (ticket: any) => `$${ticket.ecost}`
    },
    {
      name: 'total',
      header: 'Total',
      cell: (ticket: any) => `$${ticket.total}`
    },
    {
      name: 'actions',
      header: 'Actions',
      cell: () => '',
      isActionColumn: true
    }
  ];
  ticketData = [
    {
      ticketnum: 17,
      crew: 'Team A',
      startdate: '05/06/2025',
      enddate: '05/26/2025',
      mcost: 266,
      wcost: 266,
      ecost: 266,
      total: ''
    },
    {
      ticketnum: 18,
      crew: 'Team B',
      startdate: '05/06/2025',
      enddate: '05/26/2025',
      mcost: 356,
      wcost: 348,
      ecost: 834,
      total: ''
    },
    {
      ticketnum: 19,
      crew: 'Team C',
      startdate: '05/07/2025',
      enddate: '05/27/2025',
      mcost: 275,
      wcost: 310,
      ecost: 290,
      total: ''
    },
    {
      ticketnum: 20,
      crew: 'Team A',
      startdate: '05/08/2025',
      enddate: '05/28/2025',
      mcost: 260,
      wcost: 305,
      ecost: 275,
      total: ''
    },
    {
      ticketnum: 21,
      crew: 'Team D',
      startdate: '05/09/2025',
      enddate: '05/29/2025',
      mcost: 312,
      wcost: 298,
      ecost: 410,
      total: ''
    },
    {
      ticketnum: 22,
      crew: 'Team B',
      startdate: '05/10/2025',
      enddate: '05/30/2025',
      mcost: 330,
      wcost: 289,
      ecost: 390,
      total: ''
    },
    {
      ticketnum: 23,
      crew: 'Team E',
      startdate: '05/11/2025',
      enddate: '05/31/2025',
      mcost: 299,
      wcost: 320,
      ecost: 360,
      total: ''
    },
    {
      ticketnum: 24,
      crew: 'Team C',
      startdate: '05/12/2025',
      enddate: '06/01/2025',
      mcost: 310,
      wcost: 310,
      ecost: 310,
      total: ''
    }
  ];

  onEditTicket(event: any): void {
    // TODO: Implement edit logic or leave as stub
    console.log('Edit ticket', event);
  }

  onDeleteTicket(event: any): void {
    // TODO: Implement delete logic or leave as stub
    console.log('Delete ticket', event);
  }
}
