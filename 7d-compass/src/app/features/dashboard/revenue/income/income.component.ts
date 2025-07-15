import { Component, OnInit } from '@angular/core';
import { DashboardLayoutComponent } from "../../../../shared/dashboard-layout/dashboard-layout.component";
import { DataTableComponent } from '../../../../shared/data-table/data-table.component';
import { CardWithButtonComponent } from '../../../../shared/card-with-button/card-with-button.component';
import { ConfirmationDialogComponent } from '../../../../shared/confirmation-dialog/confirmation-dialog.component';
import { SearchDialogComponent } from '../../../../shared/search-dialog/search-dialog.component';
import { forkJoin } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ColumnDefinition } from '../../../../shared/data-table/data-table.component';
import { CrewsService } from '../../../../core/services/human-resources/crew.service';
import { UsedInventoryService } from '../../../../core/services/material/used-inventory.service';
import { TicketStatusService } from '../../../../core/services/route/ticketstatus.service';
import { UsedEquipmentService } from '../../../../core/services/material/used-equipment.service';
import { RoutesService } from '../../../../core/services/route/route.service';
import { TicketService } from '../../../../core/services/ticket.service';
import { MATERIAL_MODULES } from '../../../../material';
import { CommonModule } from '@angular/common';



// interface ColumnDefinition {
//   name: string;
//   header: string;
//   cell: (element: any) => string | SafeHtml; // ✅ Acepta ambos
//   isActionColumn?: boolean;
//   isHtml?: boolean; 
// }


@Component({
  selector: 'app-income',
  imports: [DashboardLayoutComponent, DataTableComponent,CardWithButtonComponent, MATERIAL_MODULES, CommonModule],
  templateUrl: './income.component.html',
  styleUrl: './income.component.scss'
})
export class IncomeComponent implements OnInit {
  isLoading: boolean = false; 
  constructor(
    private dialog: MatDialog,
    private sanitizer: DomSanitizer,
    private crewsService: CrewsService,
    private ticketStatusService: TicketStatusService,
    private usedInventoryService: UsedInventoryService,
    private usedEquipmentService: UsedEquipmentService,
    private routesService: RoutesService,
     private ticketService: TicketService
  ) {}

  sanitize(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  ticketColumns: ColumnDefinition[] = [
    { name: 'ticketnum', header: 'Ticket', cell: (t: any) => t.ticketnum },
    { name: 'routecode', header: 'Route', cell: (t: any) => t.routecode },
    { name: 'crew', header: 'Crew', cell: (t: any) => t.crew },
    { name: 'startdate', header: 'Start Date', cell: (t: any) => t.startdate },
    { name: 'enddate', header: 'End Date', cell: (t: any) => t.enddate },
    { name: 'mcost', header: 'Material Cost', cell: (t: any) => `$${t.mcost}` },
    { name: 'wcost', header: 'Work Cost', cell: (t: any) => `$${t.wcost}` },
    { name: 'ecost', header: 'Equipment Cost', cell: (t: any) => `$${t.ecost}` },
    { name: 'total', header: 'Total', cell: (t: any) => `$${t.total}` },
    { name: 'actions', header: 'Actions', cell: () => '', isActionColumn: true }
  ];

  ticketData: any[] = [];
  invoiceData: any[] = [];
  totalGeneral: number = 0;
  totalIncome: number = 0;

  invoiceColumns: ColumnDefinition[] = [
    { name: 'ticketnum', header: 'Ticket', cell: (t: any) => t.ticketnum },
    { name: 'startdate', header: 'Start Date', cell: (t: any) => t.startdate },
    { name: 'enddate', header: 'End Date', cell: (t: any) => t.enddate },
    { name: 'our', header: 'Our calculation', cell: (t: any) => `$${t.our}` },
    { name: 'invoiceweb', header: 'Invoice by web', cell: (t: any) => `$${t.invoiceweb}` },
    {
      name: 'income',
      header: 'Income',
      cell: (t: any) => {
        const diff = Number(t.invoiceweb) - Number(t.our);
        const sign = diff > 0 ? '+' : diff < 0 ? '-' : '';
        const color = diff > 0 ? 'green' : diff < 0 ? 'red' : 'gray';
        return this.sanitize(`<span style="color:${color}; font-weight:bold;">${sign}$${Math.abs(diff)}</span>`);
      },
      isHtml: true
    },
    { name: 'actions', header: 'Actions', cell: () => '', isActionColumn: true }
  ];

  ngOnInit(): void {
    this.loadTicketData();
  }

  /** ✅ Carga datos reales usando forkJoin */
private loadTicketData(): void {
   this.isLoading = true;
  forkJoin({
    crews: this.crewsService.getAllCrews(),
    ticketStatus: this.ticketStatusService.getAll(),
    usedInventory: this.usedInventoryService.getAllUsedInventory(),
    usedEquipment: this.usedEquipmentService.getAllUsedEquipment(),
    routes: this.routesService.getAllRoutes(),
    tickets: this.ticketService.getAllTickets()
  }).subscribe({
    next: ({ crews, ticketStatus, usedInventory, usedEquipment, routes, tickets }) => {
      const routeList = Array.isArray(routes) ? routes : routes.routes;

      this.ticketData = ticketStatus.map((ticket: any) => {
        const crewId = ticket.crewid || ticket.crewId;
        const crew = crews.find((c: any) => c.crewid === crewId || c.crewId === crewId);

        const mcost = usedInventory
          .filter((inv: any) => inv.crewid === crewId || inv.crewId === crewId)
          .reduce((sum: number, inv: any) => sum + Number(inv.materialcost || inv.MaterialCost || 0), 0);

        const ecost = usedEquipment
          .filter((eq: any) => eq.crewid === crewId || eq.crewId === crewId)
          .reduce((sum: number, eq: any) => sum + Number(eq.equipmentcost || eq.equipmentCost || 0), 0);

        const wcost = Number(crew?.workedhours || 0) * 20;

        const route = routeList.find((r: any) => r.routeid === crew?.routeid);
        const routecode = route?.routecode || 'No Route';

        const ticketInfo = tickets.find((t: any) => t.ticketId === ticket.ticketid || t.ticketid === ticket.ticketid);
        const ticketCode = ticketInfo?.ticketCode || `TK-${ticket.ticketid}`;

        // ✅ Formatear fechas y permitir que sean opcionales
        const formatDate = (dateStr: string | null | undefined): string =>
          dateStr ? new Date(dateStr).toLocaleDateString('en-US') : 'No start date';

        return {
          ticketnum: ticketCode,
          crew: crew?.type || 'Unknown',
          routecode,
          startdate: formatDate(ticket.startingdate), // ✅ Ahora está formateado y no falla si es null
          enddate: ticket.endingdate ? new Date(ticket.endingdate).toLocaleDateString('en-US') : 'Not finalized yet',
          mcost,
          wcost,
          ecost,
          total: '' // Se calcula abajo
        };
      });

      // ✅ Calcular total individual por ticket
      this.ticketData.forEach(ticket => {
        const m = Number(ticket.mcost) || 0;
        const w = Number(ticket.wcost) || 0;
        const e = Number(ticket.ecost) || 0;
        ticket.total = (m + w + e).toString();
      });

      // ✅ Agrupar para InvoiceData
      const groupedTickets = this.ticketData.reduce((acc, ticket) => {
        if (!acc[ticket.ticketnum]) {
          acc[ticket.ticketnum] = {
            ticketnum: ticket.ticketnum,
            startdate: ticket.startdate,
            enddate: ticket.enddate,
            our: 0,
            invoiceweb: 0,
            income: ''
          };
        }
        acc[ticket.ticketnum].our += Number(ticket.total || 0);
        return acc;
      }, {} as Record<string, any>);

      this.invoiceData = Object.values(groupedTickets).map(invoice => {
        const inv = invoice as any;
        const diff = inv.invoiceweb - inv.our;
        inv.income = `${diff > 0 ? '+' : diff < 0 ? '-' : ''}$${Math.abs(diff)}`;
        return inv;
      });

      // ✅ Totales generales
      this.totalGeneral = this.ticketData.reduce((sum, t) => sum + (Number(t.total) || 0), 0);
      this.totalIncome = this.invoiceData.reduce((sum, i) => sum + (Number(i.income.replace(/[^0-9\-\.]/g, '')) || 0), 0);

      console.log('✅ TicketData procesado:', this.ticketData);
      console.log('✅ InvoiceData calculado dinámicamente:', this.invoiceData);
    },
 error: err => {
        console.error('❌ Error cargando datos en IncomeComponent:', err);
        this.isLoading = false; // 🔥 Oculta loader en caso de error
      },
      complete: () => {
        this.isLoading = false; // 🔥 Oculta loader cuando termina
      }  });
}



  /** 
 * ✅ Obtiene el total general sumando todos los registros con el mismo ticketnum
 * @param ticketnum El código del ticket a sumar
 */
getTotalGeneralByTicket(ticketnum: string): number {
  return this.ticketData
    .filter(t => t.ticketnum === ticketnum)
    .reduce((sum, t) => sum + (Number(t.total) || 0), 0);
}


onEditTicket(ticket: any): void {
  // Abre el diálogo para editar el ticket, pasando los datos actuales
  const dialogRef = this.dialog.open(SearchDialogComponent, {
    width: '500px',
    data: { 
      title: `Ticket: #${ticket.ticketnum}`, 
      data: { ...ticket }, 
      excludedFields: [] 
    }
  });

  // Se suscribe al cierre del diálogo para procesar los cambios
  dialogRef.afterClosed().subscribe(result => {
    if (result) {
      // Busca el índice del ticket que se editó
      const index = this.ticketData.findIndex(t => t.ticketnum === ticket.ticketnum);
      if (index !== -1) {
        // Mezcla los datos existentes con los actualizados
        const updated = { ...this.ticketData[index], ...result };
        
        // Recalcula el total sumando costos, asegurando que sean números
        const mcost = Number(updated.mcost) || 0;
        const wcost = Number(updated.wcost) || 0;
        const ecost = Number(updated.ecost) || 0;
        updated.total = (mcost + wcost + ecost).toString();

        // Actualiza el array con el ticket modificado
        this.ticketData[index] = updated;

        // Opcional: actualizar totales generales si usas esa lógica
        this.updateTotals();

        console.log('Ticket actualizado:', updated);
      }
    }
  });
}

// Método para actualizar totales generales (si no lo tienes, puedes agregarlo)
private updateTotals(): void {
  this.totalGeneral = this.ticketData.reduce((sum, t) => sum + (Number(t.total) || 0), 0);
  // Puedes actualizar otros totales o estados relacionados aquí
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

  private updateInvoiceTotals(): void {
  this.totalIncome = this.invoiceData.reduce((sum, inv) => {
    const diff = Number(inv.invoiceweb) - Number(inv.our);
    return sum + diff;
  }, 0);

  console.log('✅ Total income recalculado:', this.totalIncome);
}


  
  onEditInvoice(invoice: any) {
  const dialogRef = this.dialog.open(SearchDialogComponent, {
    width: '500px',
    data: {
      title: `Invoice: ${invoice.ticketnum}`,
      data: { ...invoice },
      excludedFields: []
    }
  });

  dialogRef.afterClosed().subscribe(result => {
    if (result) {
      const index = this.invoiceData.findIndex(inv => inv.ticketnum === invoice.ticketnum);
      if (index !== -1) {
        // Mezclamos datos actualizados
        const updated = { ...this.invoiceData[index], ...result };

        // Recalculamos income
        const diff = Number(updated.invoiceweb) - Number(updated.our);
        updated.income = `${diff > 0 ? '+' : diff < 0 ? '-' : ''}$${Math.abs(diff)}`;

        // ✅ Actualizamos el array
        this.invoiceData[index] = updated;

        // ✅ Forzamos el cambio de referencia (IMPORTANTE)
        this.invoiceData = [...this.invoiceData];

        // Opcional: recalcular totales generales
        this.updateInvoiceTotals();

        console.log('✅ Invoice actualizado:', updated);
      }
    }
  });
}



}
