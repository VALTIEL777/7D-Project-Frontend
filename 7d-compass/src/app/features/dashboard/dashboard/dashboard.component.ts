import { Component } from '@angular/core';
import { DashboardLayoutComponent } from '../../../shared/dashboard-layout/dashboard-layout.component';
import { CardWithButtonComponent } from "../../../shared/card-with-button/card-with-button.component";
@Component({
  selector: 'app-dashboard',
  imports: [DashboardLayoutComponent, CardWithButtonComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {

}
