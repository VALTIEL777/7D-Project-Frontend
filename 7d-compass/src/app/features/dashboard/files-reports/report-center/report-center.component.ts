import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardLayoutComponent } from '../../../../shared/dashboard-layout/dashboard-layout.component';
import { CardWithButtonComponent } from '../../../../shared/card-with-button/card-with-button.component';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { PlusButtonComponent } from '../../../../shared/plus-button/plus-button.component';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

@Component({
  selector: 'app-report-center',
  standalone: true,
  imports: [
    CommonModule,
    DashboardLayoutComponent,
    CardWithButtonComponent,
    MatDividerModule,
    MatButtonModule,
    PlusButtonComponent,
    MatDialogModule
  ],
  templateUrl: './report-center.component.html',
  styleUrls: ['./report-center.component.scss']
})
export class ReportCenterComponent {
    reports: any[] = [];

  invoiceReports = [
    { code: 'INV-001', date: '2025-05-01' },
    { code: 'INV-002', date: '2025-05-03' },
    { code: 'INV-003', date: '2025-05-05' },
    { code: 'INV-004', date: '2025-05-07' },
  ];

  revenueReports = [
    { code: 'REV-2025A', date: '2025-05-10' },
    { code: 'REV-2025B', date: '2025-05-12' },
    { code: 'REV-2025C', date: '2025-05-14' },
    { code: 'REV-2025D', date: '2025-05-16' },
  ];

  diggerRequests = [
    { code: 'DIG-001', date: '2025-04-20' },
    { code: 'DIG-002', date: '2025-04-22' },
    { code: 'DIG-003', date: '2025-04-24' },
    { code: 'DIG-004', date: '2025-04-26' },
  ];

  spottersReports = [
    { code: 'SPT-001', date: '2025-04-18' },
    { code: 'SPT-002', date: '2025-04-19' },
    { code: 'SPT-003', date: '2025-04-20' },
    { code: 'SPT-004', date: '2025-04-21' },
  ];

  issuesReports = [
    { code: 'ISS-001', date: '2025-05-05' },
    { code: 'ISS-002', date: '2025-05-06' },
    { code: 'ISS-003', date: '2025-05-07' },
    { code: 'ISS-004', date: '2025-05-08' },
  ];

  teamLeaderReports = [
    { code: 'DTL-001', date: '2025-05-01' },
    { code: 'DTL-002', date: '2025-05-02' },
    { code: 'DTL-003', date: '2025-05-03' },
    { code: 'DTL-004', date: '2025-05-04' },
  ];

  ticketEvidenceReports = [
    { code: 'TKT-001', date: '2025-04-25' },
    { code: 'TKT-002', date: '2025-04-26' },
    { code: 'TKT-003', date: '2025-04-27' },
    { code: 'TKT-004', date: '2025-04-28' },
  ];

  myData = {
    id: 1,
    name: '',
    category: '',
    description: '',
    price: ''
  };
    handleResult(result: any) {
    console.log('Created Object:', result);
    // You can add it to a list or trigger a notification
  }


}
