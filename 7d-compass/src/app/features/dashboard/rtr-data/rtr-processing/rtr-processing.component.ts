import { Component } from '@angular/core';
import { DashboardLayoutComponent } from "../../../../shared/dashboard-layout/dashboard-layout.component";
import { CardWithButtonComponent } from '../../../../shared/card-with-button/card-with-button.component';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule } from '@angular/material/table';
import { CommonModule } from '@angular/common';
import { MATERIAL_MODULES } from '../../../../material';

@Component({
  selector: 'app-rtr-processing',
  imports: [DashboardLayoutComponent, CardWithButtonComponent, MatTableModule, MatDividerModule, CommonModule, MATERIAL_MODULES, ],
  templateUrl: './rtr-processing.component.html',
  styleUrl: './rtr-processing.component.scss'
})
export class RtrProcessingComponent {
  receivedRTRs = [
  { date: '05-25-25' },
  { date: '05-17-25' },
  { date: '05-10-25' },
  { date: '05-03-25' },
  { date: '04-26-25' },
  { date: '04-19-25' },
];

sentRTRs = [
  { date: '05-25-25' },
  { date: '05-17-25' },
  { date: '05-10-25' },
  { date: '05-03-25' },
  { date: '04-26-25' },
  { date: '04-19-25' },
];


  comments = [
  { ticket: 'P255704', comment: 'Missing Stripping' },
  { ticket: 'P255704', comment: 'Missing Photo' },
  { ticket: 'P255704', comment: 'Incorrect Date' },
];

permits = [
  { ticket: 'P255704', date: '05/28/25' },
  { ticket: 'P255704', date: '04/15/25' },
  { ticket: 'P255704', date: '06/28/25' },
  { ticket: 'P255704', date: '07/13/25' },
];


inconsistencies = [
  {
    location: 'Austin, TX',
    ticket: 'P255704',
    column: 'Permit Type',
    rtrValue: 'Alteration',
    dbValue: 'Original',
  },
  {
    location: 'Dallas, TX',
    ticket: 'P255705',
    column: 'Photo',
    rtrValue: 'Missing',
    dbValue: 'Present',
  },
  {
    location: 'San Antonio, TX',
    ticket: 'P255706',
    column: 'Stripping',
    rtrValue: 'Wrong',
    dbValue: 'Correct',
  },
  {
    location: 'Houston, TX',
    ticket: 'P255707',
    column: 'Start Date',
    rtrValue: '2025-06-01',
    dbValue: '2025-05-15',
  },
  {
    location: 'Fort Worth, TX',
    ticket: 'P255708',
    column: 'End Date',
    rtrValue: '2025-07-01',
    dbValue: '2025-06-30',
  },
  {
    location: 'El Paso, TX',
    ticket: 'P255709',
    column: 'Zone',
    rtrValue: 'Commercial',
    dbValue: 'Residential',
  },
  {
    location: 'Arlington, TX',
    ticket: 'P255710',
    column: 'Owner Name',
    rtrValue: 'John Smith',
    dbValue: 'Jon Smythe',
  },
  {
    location: 'Corpus Christi, TX',
    ticket: 'P255711',
    column: 'Contractor',
    rtrValue: 'ABC Inc.',
    dbValue: 'XYZ Corp.',
  },
  {
    location: 'Plano, TX',
    ticket: 'P255712',
    column: 'Permit Status',
    rtrValue: 'Inactive',
    dbValue: 'Active',
  }
];

onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
    const file = input.files[0];
    console.log('Archivo seleccionado:', file);
  }
}

}
