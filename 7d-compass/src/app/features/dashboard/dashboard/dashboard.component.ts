import { Component } from '@angular/core';
import { DashboardLayoutComponent } from '../../../shared/dashboard-layout/dashboard-layout.component';
import { CardWithButtonComponent } from "../../../shared/card-with-button/card-with-button.component";
import { MatTableModule } from '@angular/material/table';
import { MatDividerModule } from '@angular/material/divider';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  imports: [DashboardLayoutComponent, CardWithButtonComponent,MatTableModule, MatDividerModule,CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
  displayedColumns: string[] = ['name', 'email'];

  // ✅ Define the data
  tableData = [
    { name: 'Alice Johnson', email: 'alice@example.com', status: 'Active' },
    { name: 'Bob Smith', email: 'bob@example.com', status: 'Inactive' },
    { name: 'Charlie Davis', email: 'charlie@example.com', status: 'Pending' },
  ];
  dividerItems = [
  { label: 'Revenue', value: '$45,000' },
  { label: 'Expenses', value: '$20,000' },
  { label: 'Net Profit', value: '$25,000' }
];
}
