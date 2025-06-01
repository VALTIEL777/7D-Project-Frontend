import { Component } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { SearchBarComponent } from "../search-bar/search-bar.component";
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-title-bar',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatMenuModule,
    MatToolbarModule,
    MatFormFieldModule,
    MatInputModule,
    SearchBarComponent
  ],
  templateUrl: './title-bar.component.html',
  styleUrl: './title-bar.component.scss'
})
export class TitleBarComponent {
  pageTitle: string = 'Dashboard';

  constructor(private router: Router) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.setPageTitle(this.router.url);
    });
  }

  private setPageTitle(url: string) {
    const routeMap: Record<string, string> = {
      '/overview': 'Overview',
      '/rtr-data': 'RTR Data',
      '/user-data': 'User Data',
      '/route-generator': 'Route Generator',
      '/tables': 'Tables',
      '/invoice': 'Invoice',
      '/files-and-permits': 'Files and Permits',
      '/fines-and-penalties': 'Fines and Penalties',
      '/report-center': 'Report Center',
      '/settings': 'Settings'
    };

    this.pageTitle = routeMap[url] || 'Dashboard';
  }
}
