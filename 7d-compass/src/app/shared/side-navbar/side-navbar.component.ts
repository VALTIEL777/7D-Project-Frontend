import { Component, ViewChild } from '@angular/core';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatSidenavContainer } from '@angular/material/sidenav';
import { MatSidenavContent } from '@angular/material/sidenav';
import { RouterModule } from '@angular/router';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import {FormControl, FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatInputModule} from '@angular/material/input';
import {MatSelectModule} from '@angular/material/select';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatCheckboxModule} from '@angular/material/checkbox';
import { Router, NavigationEnd } from '@angular/router';

@Component({
  selector: 'app-side-navbar',
  imports: [
    MatSidenavModule,
    MatSidenavContainer,
    MatSidenavContent,
    RouterModule,
    MatExpansionModule,
    MatDividerModule,
    MatIconModule,
    MatButtonModule,
    MatListModule,
    MatCheckboxModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
  ],
  templateUrl: './side-navbar.component.html',
  styleUrl: './side-navbar.component.scss'
})
export class SideNavbarComponent {
  isMobile = false;

  selectedCompany = 'option1';

  currentRoute = '';

  @ViewChild('sidenav') sidenav!: MatSidenav;

toggle() {
  this.sidenav.toggle();
}

constructor(private router: Router) {
  this.router.events.subscribe(event => {
    if (event instanceof NavigationEnd) {
      this.currentRoute = event.urlAfterRedirects;
    }
  });

  // Responsive check
  this.checkScreenSize();
  window.addEventListener('resize', () => this.checkScreenSize());
}
checkScreenSize() {
  this.isMobile = window.innerWidth <= 768;
}

  isExpanded(routes: string[]): boolean {
    const currentUrl = this.router.url;

    // Return true if currentUrl matches exactly or starts with one of the routes
    return routes.some(route => currentUrl === route || currentUrl.startsWith(route + '/'));
  }

}
