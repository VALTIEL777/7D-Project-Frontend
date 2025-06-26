import { Component, ElementRef, ViewChild, OnInit } from '@angular/core';
import { DashboardLayoutComponent } from "../../../../shared/dashboard-layout/dashboard-layout.component";
import { CardWithButtonComponent } from '../../../../shared/card-with-button/card-with-button.component';
import { MatTableModule } from '@angular/material/table';
import { MatDividerModule } from '@angular/material/divider';
import { CommonModule } from '@angular/common';
import { MATERIAL_MODULES } from '../../../../material';
import { BaseDashboardComponent } from '../../../../shared/base-dashboard.component';
import { FilterService } from '../../../../core/services/filter.service';

@Component({
  selector: 'app-fines-penalties',
  imports: [DashboardLayoutComponent, CardWithButtonComponent, MatTableModule, MatDividerModule, CommonModule, MATERIAL_MODULES, ],
  templateUrl: './fines-penalties.component.html',
  styleUrl: './fines-penalties.component.scss'
})
export class FinesPenaltiesComponent extends BaseDashboardComponent implements OnInit {


Fine_table = [
  {
    location: '2354123',
    ticket: 'TK-263',
    fine: '123112',
    amount: '300',
    status: 'Paid',
    description: 'Did not retrive all no parking sings',
  }
];


fines = [
  {
    location: '2354123',
    ticket: 'TK-263',
    fine: '123112',
    amount: '300',
    status: 'Paid',
    description: 'Did not retrive all no parking sings',
  },
  {
    location: '7845129',
    ticket: 'TK-263',
    fine: '981244',
    amount: '150',
    status: 'Unpaid',
    description: 'parked in a no-parking zone near hospital',
  },
  {
    location: '4567890',
    ticket: 'TK-263',
    fine: '674512',
    amount: '500',
    status: 'Paid',
    description: 'ran a red light at downtown intersection',
  },
  {
    location: '8921453',
    ticket: 'TK-263',
    fine: '128790',
    amount: '75',
    status: 'Unpaid',
    description: 'expired parking meter violation',
  },
  {
    location: '3498765',
    ticket: 'TK-263',
    fine: '347891',
    amount: '200',
    status: 'Pending',
    description: 'blocking fire hydrant in residential area',
  },
  {
    location: '1212938',
    ticket: 'TK-263',
    fine: '998123',
    amount: '100',
    status: 'Paid',
    description: 'illegal U-turn on main avenue',
  },
  {
    location: '2387465',
    ticket: 'TK-263',
    fine: '763241',
    amount: '275',
    status: 'Unpaid',
    description: 'failed to yield at crosswalk',
  },
].map(f => ({ ...f, evidence: null }));

constructor(filterService: FilterService) {
  super(filterService);
}

override ngOnInit() {
  super.ngOnInit();
  this.loadData();
}

protected override loadData(): void {
  // Initialize data for filtering
  this.allData = [...this.fines];
  this.filteredData = [...this.allData];
}

// Override text search to include fine fields
protected override matchesTextSearch(item: any, searchTerm: string): boolean {
  const searchableFields = ['location', 'ticket', 'fine', 'status', 'description'];

  return searchableFields.some(field => {
    const value = this.getNestedValue(item, field);
    if (value) {
      return String(value).toLowerCase().includes(searchTerm);
    }
    return false;
  });
}

// Getter for filtered fines data
get filteredFinesData() {
  return this.filteredData;
}

  evidence: File | null = null;

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

// Legacy filter method - now handled by BaseDashboardComponent
applyFilter(event: Event) {
  // This method is now handled by the BaseDashboardComponent filtering system
  // The filter bar in the title bar will handle all filtering automatically
}

}
