import { Component } from '@angular/core';
import { DashboardLayoutComponent } from "../../../../shared/dashboard-layout/dashboard-layout.component";
import { CardWithButtonComponent } from '../../../../shared/card-with-button/card-with-button.component';
import { MatTableModule } from '@angular/material/table';
import { MatDividerModule } from '@angular/material/divider';
import { CommonModule } from '@angular/common';
import { MATERIAL_MODULES } from '../../../../material';

@Component({
  selector: 'app-fines-penalties',
  imports: [DashboardLayoutComponent, CardWithButtonComponent, MatTableModule, MatDividerModule, CommonModule, MATERIAL_MODULES, ],
  templateUrl: './fines-penalties.component.html',
  styleUrl: './fines-penalties.component.scss'
})
export class FinesPenaltiesComponent {
Fine_table = [
  {
    location: '2354123',
    fine: '123112',
    amount: '300',
    status: 'Paid',
    description: 'Did not retrive all no parking sings',
  }
];


fines = [
  {
    location: '2354123',
    fine: '123112',
    amount: '300',
    status: 'Paid',
    description: 'Did not retrive all no parking sings',
  },
  {
    location: '7845129',
    fine: '981244',
    amount: '150',
    status: 'Unpaid',
    description: 'parked in a no-parking zone near hospital',
  },
  {
    location: '4567890',
    fine: '674512',
    amount: '500',
    status: 'Paid',
    description: 'ran a red light at downtown intersection',
  },
  {
    location: '8921453',
    fine: '128790',
    amount: '75',
    status: 'Unpaid',
    description: 'expired parking meter violation',
  },
  {
    location: '3498765',
    fine: '347891',
    amount: '200',
    status: 'Pending',
    description: 'blocking fire hydrant in residential area',
  },
  {
    location: '1212938',
    fine: '998123',
    amount: '100',
    status: 'Paid',
    description: 'illegal U-turn on main avenue',
  },
  {
    location: '2387465',
    fine: '763241',
    amount: '275',
    status: 'Unpaid',
    description: 'failed to yield at crosswalk',
  },
];

onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
    const file = input.files[0];
    console.log('Archivo seleccionado:', file);
  }
}
}
