import { Component } from '@angular/core';
import { SideNavbarComponent } from '../side-navbar/side-navbar.component';
import { MatCardModule } from '@angular/material/card';
import { TitleBarComponent } from "../title-bar/title-bar.component";
import { CardGridComponent } from '../card-grid/card-grid.component';
@Component({
  selector: 'app-dashboard-layout',
  imports: [SideNavbarComponent, TitleBarComponent, MatCardModule,CardGridComponent],
  templateUrl: './dashboard-layout.component.html',
  styleUrl: './dashboard-layout.component.scss'
})
export class DashboardLayoutComponent {

}
