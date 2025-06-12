import { Component } from '@angular/core';
import { DashboardLayoutComponent } from "../../../../shared/dashboard-layout/dashboard-layout.component";
import { CardWithButtonComponent } from '../../../../shared/card-with-button/card-with-button.component';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button'; // Add this import
import { CommonModule } from '@angular/common';
import { PlusButtonComponent } from '../../../../shared/plus-button/plus-button.component';
import { MATERIAL_MODULES } from '../../../../material';
import { FormsModule, NgModel } from '@angular/forms';


@Component({
  selector: 'app-files-permits',
  imports: [
    DashboardLayoutComponent,
    CardWithButtonComponent,
    MatDividerModule,
    CommonModule,
    MatButtonModule,
    FormsModule,
    MATERIAL_MODULES
  ],
  templateUrl: './files-permits.component.html',
  styleUrl: './files-permits.component.scss'
})
export class FilesPermitsComponent {
  permits = [
    { location: '7829S Turner', ticket: 'P456347' },
    { location: '7351S Butter', ticket: 'P12381' },
    { location: '904 S Butter', ticket: 'P12345' },
    { location: '301S Butter', ticket: 'P123451' }
  ];

  constructionPermits = [
    { project: 'Downtown Renovation', permitNumber: 'CP-2023-0456' },
    { project: 'Highway Expansion', permitNumber: 'CP-2023-0789' }
  ];

  missingPhotos = [
    { site: 'Site A', date: '2024-06-01' },
    { site: 'Site B', date: '2024-05-15' }
  ];

  invoices = [
    { vendor: 'ABC Construction', amount: '$12,000' },
    { vendor: 'XYZ Supplies', amount: '$3,200' }
  ];

  previousDiggerPermits = [
    { location: '801S Turner', date: '2024-04-22' },
    { location: '902S Maple', date: '2024-03-19' }
  ];

  previousConstructionPermits = [
    { project: 'Mall Expansion', date: '2024-02-11' },
    { project: 'Bridge Reinforcement', date: '2024-01-08' }
  ];

  photoEvidence = [
    { site: 'Warehouse A', date: '2024-04-10' },
    { site: 'Depot B', date: '2024-03-02' }
  ];

  previousInvoices = [
    { vendor: 'LMN Rentals', date: '2024-03-20' },
    { vendor: 'CementCo', date: '2024-02-25' }
  ];


  permitsFilter = '';
constructionPermitsFilter = '';
missingPhotosFilter = '';
invoicesFilter = '';
previousDiggerPermitsFilter = '';
previousConstructionPermitsFilter = '';
photoEvidenceFilter = '';
previousInvoicesFilter = '';

filteredPermits = [...this.permits];
filteredConstructionPermits = [...this.constructionPermits];
filteredMissingPhotos = [...this.missingPhotos];
filteredInvoices = [...this.invoices];
filteredPreviousDiggerPermits = [...this.previousDiggerPermits];
filteredPreviousConstructionPermits = [...this.previousConstructionPermits];
filteredPhotoEvidence = [...this.photoEvidence];
filteredPreviousInvoices = [...this.previousInvoices];


  applyPermitFilter(event: Event): void {
  const value = (event.target as HTMLInputElement).value.toLowerCase().trim();
  this.filteredPermits = this.permits.filter(p =>
    p.location.toLowerCase().includes(value) || p.ticket.toLowerCase().includes(value)
  );
}

applyConstructionPermitFilter(event: Event): void {
  const value = (event.target as HTMLInputElement).value.toLowerCase().trim();
  this.filteredConstructionPermits = this.constructionPermits.filter(cp =>
    cp.project.toLowerCase().includes(value) || cp.permitNumber.toLowerCase().includes(value)
  );
}

applyMissingPhotosFilter(event: Event): void {
  const value = (event.target as HTMLInputElement).value.toLowerCase().trim();
  this.filteredMissingPhotos = this.missingPhotos.filter(mp =>
    mp.site.toLowerCase().includes(value) || mp.date.includes(value)
  );
}

applyInvoiceFilter(event: Event): void {
  const value = (event.target as HTMLInputElement).value.toLowerCase().trim();
  this.filteredInvoices = this.invoices.filter(inv =>
    inv.vendor.toLowerCase().includes(value) || inv.amount.toLowerCase().includes(value)
  );
}

applyPreviousDiggerFilter(event: Event): void {
  const value = (event.target as HTMLInputElement).value.toLowerCase().trim();
  this.filteredPreviousDiggerPermits = this.previousDiggerPermits.filter(d =>
    d.location.toLowerCase().includes(value) || d.date.includes(value)
  );
}

applyPreviousConstructionFilter(event: Event): void {
  const value = (event.target as HTMLInputElement).value.toLowerCase().trim();
  this.filteredPreviousConstructionPermits = this.previousConstructionPermits.filter(p =>
    p.project.toLowerCase().includes(value) || p.date.includes(value)
  );
}

applyPhotoEvidenceFilter(event: Event): void {
  const value = (event.target as HTMLInputElement).value.toLowerCase().trim();
  this.filteredPhotoEvidence = this.photoEvidence.filter(p =>
    p.site.toLowerCase().includes(value) || p.date.includes(value)
  );
}

applyPreviousInvoiceFilter(event: Event): void {
  const value = (event.target as HTMLInputElement).value.toLowerCase().trim();
  this.filteredPreviousInvoices = this.previousInvoices.filter(p =>
    p.vendor.toLowerCase().includes(value) || p.date.includes(value)
  );
}

}
