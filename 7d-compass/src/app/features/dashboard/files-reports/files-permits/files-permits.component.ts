import { Component } from '@angular/core';
import { DashboardLayoutComponent } from "../../../../shared/dashboard-layout/dashboard-layout.component";
import { CardWithButtonComponent } from '../../../../shared/card-with-button/card-with-button.component';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button'; // Add this import
import { CommonModule } from '@angular/common';
import { PlusButtonComponent } from '../../../../shared/plus-button/plus-button.component';


@Component({
  selector: 'app-files-permits',
  imports: [
    DashboardLayoutComponent,
    CardWithButtonComponent,
    MatDividerModule,
    CommonModule,
    MatButtonModule,
    PlusButtonComponent
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
}
