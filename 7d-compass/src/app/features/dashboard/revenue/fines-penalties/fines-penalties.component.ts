import { Component, ElementRef, ViewChild, OnInit } from '@angular/core';
import { DashboardLayoutComponent } from "../../../../shared/dashboard-layout/dashboard-layout.component";
import { CardWithButtonComponent } from '../../../../shared/card-with-button/card-with-button.component';
import { MatTableModule } from '@angular/material/table';
import { MatDividerModule } from '@angular/material/divider';
import { CommonModule } from '@angular/common';
import { MATERIAL_MODULES } from '../../../../material';
import { BaseDashboardComponent } from '../../../../shared/base-dashboard.component';
import { FilterService } from '../../../../core/services/filter.service';
import { TicketService } from '../../../../core/services/ticket.service';
import { forkJoin } from 'rxjs';
import { FinesService } from '../../../../core/services/payments/fines.service';
import { WayfindingService } from '../../../../core/services/location/wayfinding.service';

@Component({
  selector: 'app-fines-penalties',
  imports: [
    DashboardLayoutComponent,
    CardWithButtonComponent,
    MatTableModule,
    MatDividerModule,
    CommonModule,
    MATERIAL_MODULES,
  ],
  templateUrl: './fines-penalties.component.html',
  styleUrl: './fines-penalties.component.scss'
})
export class FinesPenaltiesComponent extends BaseDashboardComponent implements OnInit {

  Fine_table: any[] = [];
  evidence: File | null = null;

  constructor(
    filterService: FilterService,
    private finesService: FinesService,
    private wayfindingService: WayfindingService,
    private ticketService: TicketService
  ) {
    super(filterService);
  }

  override ngOnInit() {
    super.ngOnInit();
    this.loadData();
  }

protected override loadData(): void {
  forkJoin({
    fines: this.finesService.getAllFines(),
    tickets: this.ticketService.getAllTickets(),
    wayfinding: this.wayfindingService.getAllWayfinding()
  }).subscribe({
    next: ({ fines, tickets, wayfinding }) => {
      console.log('✅ Fines:', fines);
      console.log('✅ Tickets:', tickets);
      console.log('✅ Wayfinding:', wayfinding);

      this.Fine_table = fines.map(fine => {
        const ticket = tickets.find(
          t => (t.ticketid || t.ticketId) === fine.ticketid
        );
        console.log(`🔎 Ticket encontrado para fine ${fine.finenumber}:`, ticket);

        const wayfindingInfo = wayfinding.find(
          w => (w.wayfindingid || w.wayfindingId) === (ticket?.wayfindingid || ticket?.wayfindingId)
        );
        console.log('🔎 Wayfinding encontrado:', wayfindingInfo);

        const locationText = wayfindingInfo
          ? `${wayfindingInfo.fromaddressstreet || ''} ${wayfindingInfo.toaddressstreet || ''} ${wayfindingInfo.fromaddresscardinal || ''}`.trim()
          : 'Unknown';

        const fineDate = fine.finedate
          ? new Date(fine.finedate).toLocaleDateString()
          : 'unknown date';

        return {
          location: locationText,
          ticket: ticket?.ticketcode || ticket?.ticketCode || `TK-${fine.ticketid || 'N/A'}`,
          fine: fine.finenumber || 'N/A',
          amount: fine.amount || '0.00',
          status: fine.status || 'Unknown',
          description: `Fine issued on ${fineDate} - ${fine.status}`,
          evidence: fine.fineurl || null
        };
      });

      this.allData = [...this.Fine_table];
      this.filteredData = [...this.allData];

      console.log('✅ Fine_table cargada:', this.Fine_table);
    },
    error: (err) => console.error('❌ Error cargando datos de Fines:', err)
  });
}




  // ✅ Filtro para la barra de búsqueda (BaseDashboardComponent)
  protected override matchesTextSearch(item: any, searchTerm: string): boolean {
    const searchableFields = ['location', 'ticket', 'fine', 'status', 'description'];
    return searchableFields.some(field => {
      const value = this.getNestedValue(item, field);
      return value ? String(value).toLowerCase().includes(searchTerm) : false;
    });
  }

  get filteredFinesData() {
    return this.filteredData;
  }

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  triggerFileUpload(index: number) {
    const fileInput = document.getElementById(`fileInput-${index}`) as HTMLInputElement;
    fileInput?.click();
  }

  onFileSelected(event: Event, fine: any) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      fine.evidence = file;
      console.log(`Evidencia subida para ${fine.fine}:`, file.name);
    }
  }

  downloadEvidence(fine: any) {
    if (!fine.evidence) return;
    const url = URL.createObjectURL(fine.evidence);
    const a = document.createElement('a');
    a.href = url;
    a.download = fine.evidence.name;
    a.click();
    URL.revokeObjectURL(url);
  }
}
