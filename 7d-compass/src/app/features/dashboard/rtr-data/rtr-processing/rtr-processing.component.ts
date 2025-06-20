import { Component } from '@angular/core';
import { DashboardLayoutComponent } from "../../../../shared/dashboard-layout/dashboard-layout.component";
import { CardWithButtonComponent } from '../../../../shared/card-with-button/card-with-button.component';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule } from '@angular/material/table';
import { CommonModule } from '@angular/common';
import { MATERIAL_MODULES } from '../../../../material';
import { DragDropUploadComponent } from '../../../../shared/drag-drop-upload/drag-drop-upload.component';

@Component({
  selector: 'app-rtr-processing',
  imports: [DashboardLayoutComponent,
    DragDropUploadComponent,
     CardWithButtonComponent, MatTableModule, MatDividerModule, CommonModule, MATERIAL_MODULES, ],
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

  // New properties for pasted data table
  pastedDataSource: any[] = [];
  pastedDisplayedColumns: string[] = [];
  private pastedText: string = ''; // To store the raw pasted text

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      console.log('Archivo seleccionado:', file);
    }
  }

  handlePaste(event: ClipboardEvent) {
    const clipboardData = event.clipboardData;
    if (clipboardData) {
      this.pastedText = clipboardData.getData('text');
    }
  }

  processPastedData() {
    if (!this.pastedText) {
      return; // No data to process
    }

    const rows = this.pastedText.split(/\r\n|\n/).filter(row => row.trim() !== ''); // Split by new line, remove empty lines
    if (rows.length === 0) {
      return; // No valid rows
    }

    const headers = rows[0].split('\t'); // Assume tab-separated for Excel paste
    this.pastedDisplayedColumns = headers;
    this.pastedDataSource = [];

    for (let i = 1; i < rows.length; i++) {
      const values = rows[i].split('\t');
      const rowData: { [key: string]: string } = {};
      headers.forEach((header, index) => {
        rowData[header] = values[index] || ''; // Assign value or empty string if missing
      });
      this.pastedDataSource.push(rowData);
    }
  }

  clearPastedData() {
    this.pastedDataSource = [];
    this.pastedDisplayedColumns = [];
    this.pastedText = '';
  }

  receivedSearchTerm: string = '';
sentSearchTerm: string = '';

filteredReceivedRTRs = [...this.receivedRTRs];
filteredSentRTRs = [...this.sentRTRs];

applyReceivedFilter(event: Event): void {
  const value = (event.target as HTMLInputElement).value.toLowerCase().trim();
  this.filteredReceivedRTRs = this.receivedRTRs.filter(rtr =>
    rtr.date.toLowerCase().includes(value)
  );
}

applySentFilter(event: Event): void {
  const value = (event.target as HTMLInputElement).value.toLowerCase().trim();
  this.filteredSentRTRs = this.sentRTRs.filter(rtr =>
    rtr.date.toLowerCase().includes(value)
  );
}

}
