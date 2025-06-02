import { Component } from '@angular/core';
import { DashboardLayoutComponent } from '../../../shared/dashboard-layout/dashboard-layout.component';
import { CardWithButtonComponent } from "../../../shared/card-with-button/card-with-button.component";
import { MatTableModule } from '@angular/material/table';
@Component({
  selector: 'app-dashboard',
  imports: [DashboardLayoutComponent, CardWithButtonComponent,MatTableModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
  displayedColumns: string[] = ['name', 'email'];

  // ✅ Define the data
  data = [
    { name: 'Alice Johnson', email: 'alice@example.com' },
    { name: 'Bob Smith', email: 'bob@example.com' },
    { name: 'Charlie Davis', email: 'charlie@example.com' },
  ];
}
