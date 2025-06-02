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
import { MatBadgeModule } from '@angular/material/badge';
import { MatDialog } from '@angular/material/dialog';
import { SearchDialogComponent } from '../search-dialog/search-dialog.component';

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
    SearchBarComponent,
    MatBadgeModule
  ],
  templateUrl: './title-bar.component.html',
  styleUrl: './title-bar.component.scss'
})
export class TitleBarComponent {
  pageTitle: string = 'Dashboard';
  notificationCount: number = 3; // Mock value

notifications = [
  { id: 1, message: 'New user signed up', type: 'user' },
  { id: 2, message: 'Invoice #123 generated', type: 'invoice' },
  { id: 3, message: 'Backup completed', type: 'route' },
  { id: 4, message: 'Server restarted', type: 'user' },
  { id: 5, message: 'Weekly report available', type: 'invoice' },
  { id: 6, message: 'New comment on ticket', type: 'route' },
  { id: 7, message: 'Payment received for invoice #456', type: 'invoice' },
  { id: 8, message: 'New feature released', type: 'user' },
  { id: 9, message: 'System maintenance scheduled', type: 'route' },
  { id: 10, message: 'New document uploaded to shared drive', type: 'user' },
  { id: 11, message: 'New comment on ticket #789', type: 'route' },
  { id: 12, message: 'New supplier added', type: 'user' },
  { id: 13, message: 'Equipment maintenance due', type: 'route' },
  { id: 14, message: 'New contract unit assigned', type: 'user' },
  { id: 15, message: 'New payment method added', type: 'invoice' }
];

  constructor(private router: Router, private dialog: MatDialog) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.setPageTitle(this.router.url);
    });

    // Simulate a later update (optional)
    setTimeout(() => {
      this.notificationCount = 5; // simulate change
    }, 5000);
  }

  private setPageTitle(url: string) {
    const routeMap: Record<string, string> = {
      '/overview': 'Overview',
      '/rtr-processing': 'RTR Processing',
      '/misc-generation': 'Misc Generation',
      '/report-center': 'Report Center',
      '/files-permits': 'Files & Permits',
      '/route-generator': 'Route Generator',
      '/route-history': 'Route History',
      '/route-tracker': 'Route Tracker',
      '/income': 'Income',
      '/fines-penalties': 'Fines & Penalties',
      '/users': 'Users',
      '/contract-units': 'Contract Units',
      '/payments': 'Payments',
      '/invoices': 'Invoices',
      '/fines': 'Fines',
      '/supervisors': 'Supervisors',
      '/inventory': 'Inventory',
      '/suppliers': 'Suppliers',
      '/equipment': 'Equipment',
      '/crews': 'Crews',
      '/ticket': 'Ticket'
    };

    this.pageTitle = routeMap[url] || 'Dashboard';
  }

  openNotificationDialog(notification: any): void {
    this.dialog.open(SearchDialogComponent, {
      width: '400px',
      data: notification
    });
  }

  changeProfilePicture() {
    console.log('Change Profile Picture clicked');
    // Implement your logic here, like opening a dialog or navigating
  }

  editUserInfo() {
    console.log('Edit User Info clicked');
    // Implement your logic here
  }

  logout() {
    console.log('Log Out clicked');
    // Implement logout logic here
  }
}
