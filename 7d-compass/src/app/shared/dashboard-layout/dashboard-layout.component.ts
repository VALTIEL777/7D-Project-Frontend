import { Component } from '@angular/core';
import { SideNavbarComponent } from '../side-navbar/side-navbar.component';
import { RouterOutlet } from '@angular/router';
@Component({
  selector: 'app-dashboard-layout',
  imports: [SideNavbarComponent, RouterOutlet],
  templateUrl: './dashboard-layout.component.html',
  styleUrl: './dashboard-layout.component.scss'
})
export class DashboardLayoutComponent {

}
