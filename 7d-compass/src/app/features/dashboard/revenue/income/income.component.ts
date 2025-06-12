import { Component } from '@angular/core';
import { DashboardLayoutComponent } from "../../../../shared/dashboard-layout/dashboard-layout.component";
import { DataTableComponent } from '../../../../shared/data-table/data-table.component';
import { CardWithButtonComponent } from '../../../../shared/card-with-button/card-with-button.component';
import { ConfirmationDialogComponent } from '../../../../shared/confirmation-dialog/confirmation-dialog.component';
import { SearchDialogComponent } from '../../../../shared/search-dialog/search-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { DomSanitizer } from '@angular/platform-browser';


interface ColumnDefinition {
  name: string;
  header: string;
  cell: (element: any) => string;
  isActionColumn?: boolean;
  isHtml?: boolean; 
}

@Component({
  selector: 'app-income',
  imports: [DashboardLayoutComponent, DataTableComponent,CardWithButtonComponent],
  templateUrl: './income.component.html',
  styleUrl: './income.component.scss'
})
export class IncomeComponent {
  constructor(private dialog: MatDialog,
    private sanitizer: DomSanitizer
   ) {}


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
totalGeneral: number = 0;
    totalIncome: number = 0;

 ngOnInit(): void {
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
}



  onEditTicket(ticket: any): void {
    const dialogRef = this.dialog.open(SearchDialogComponent, {
      width: '500px',
      data: {
        title: `Ticket: #${ticket.ticketnum}`,
        data: { ...ticket },
        excludedFields: []
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const index = this.ticketData.findIndex(t => t.ticketnum === ticket.ticketnum);
        if (index !== -1) {
          const updated = {
            ...this.ticketData[index],
            ...result
          };
          // Recalcular total
          updated.total = (Number(updated.mcost || 0) + Number(updated.wcost || 0) + Number(updated.ecost || 0)).toString();
          this.ticketData[index] = updated;

          console.log('Ticket actualizado:', updated);
        }
      }
    });
  }

  onDeleteTicket(ticket: any): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '450px',
      disableClose: true,
      panelClass: 'confirmation-dialog',
      data: {
        title: 'Eliminar Ticket',
        message: `¿Estás seguro de eliminar el ticket #${ticket.ticketnum}? Esta acción no se puede deshacer.`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.ticketData = this.ticketData.filter(t => t.ticketnum !== ticket.ticketnum);
        console.log('Ticket eliminado:', ticket);
      }
    });
  }

  invoiceColumns: ColumnDefinition[] = [
  {
    name: 'ticketnum',
    header: 'Ticket',
    cell: (ticket: any) => `TK-${ticket.ticketnum}`
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
    name: 'our',
    header: 'Our calculation',
    cell: (ticket: any) => `$${ticket.our}`
  },
  {
    name: 'invoiceweb',
    header: 'Invoice by web',
    cell: (ticket: any) => `$${ticket.invoiceweb}`
  },
  {
  name: 'income',
  header: 'Income',
  cell: (ticket: any) => {
    const diff = Number(ticket.invoiceweb) - Number(ticket.our);
    const sign = diff > 0 ? '+' : diff < 0 ? '-' : '';
    const color = diff > 0 ? 'green' : diff < 0 ? 'red' : 'gray';
    return `<span style="color:${color}; font-weight: bold;">${sign}$${Math.abs(diff)}</span>`;
  },
  isHtml: true
}
,

  
  {
    name: 'actions',
    header: 'Actions',
    cell: () => '',
    isActionColumn: true
  }
];
invoiceData = [
   {
    ticketnum: 17,
    startdate: '05/06/2025',
    enddate: '05/26/2025',
    our: 266,
    invoiceweb: 266,
    income: ''
  },
  {
    ticketnum: 18,
    startdate: '05/06/2025',
    enddate: '05/26/2025',
    our: 265,
    invoiceweb: 267,
    income:''
  },
   {
    ticketnum: 19,
    startdate: '05/07/2025',
    enddate: '05/27/2025',
    our: 270,
    invoiceweb: 270,
    income: ''
  },
  {
    ticketnum: 20,
    startdate: '05/08/2025',
    enddate: '05/28/2025',
    our: 268,
    invoiceweb: 269,
    income: ''
  },
  {
    ticketnum: 21,
    startdate: '05/09/2025',
    enddate: '05/29/2025',
    our: 271,
    invoiceweb: 271,
    income: ''
  },
  {
    ticketnum: 22,
    startdate: '05/10/2025',
    enddate: '05/30/2025',
    our: 273,
    invoiceweb: 272,
    income: ''
  },
  {
    ticketnum: 23,
    startdate: '05/11/2025',
    enddate: '05/31/2025',
    our: 274,
    invoiceweb: 274,
    income: ''
  },
  {
    ticketnum: 24,
    startdate: '05/12/2025',
    enddate: '06/01/2025',
    our: 2789,
    invoiceweb: 788,
    income: ''
  }
];


}
