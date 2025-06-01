import { Component } from '@angular/core';
import { SideNavbarComponent } from '../side-navbar/side-navbar.component';
import { RouterOutlet } from '@angular/router';
import { TitleBarComponent } from "../title-bar/title-bar.component";
@Component({
  selector: 'app-dashboard-layout',
  imports: [SideNavbarComponent, TitleBarComponent],
  templateUrl: './dashboard-layout.component.html',
  styleUrl: './dashboard-layout.component.scss'
})
export class DashboardLayoutComponent {

}
