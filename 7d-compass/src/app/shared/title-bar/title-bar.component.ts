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
  notificationCount: number = 11; // Updated to match total notifications

  notifications = [
    {
      id: 1,
      message: 'New user signed up',
      type: 'user',
      data: { type: 'user', name: 'Alice Johnson', role: 'Admin', city: 'New York' }
    },
    {
      id: 2,
      message: 'Invoice #123 generated',
      type: 'invoice',
      data: { type: 'invoice', id: 123, customer: 'Bob Smith', total: 250.75 }
    },
    {
      id: 3,
      message: 'Route updated',
      type: 'route',
      data: { type: 'route', id: 'R23', origin: 'Chicago', destination: 'Houston' }
    },
    {
      id: 4,
      message: 'Payment received for invoice #456',
      type: 'invoice',
      data: { type: 'invoice', id: 456, customer: 'Charlie Brown', total: 420.50, status: 'paid' }
    },
    {
      id: 5,
      message: 'New support ticket created',
      type: 'ticket',
      data: { type: 'ticket', id: 'TKT-789', subject: 'Login issues', priority: 'high' }
    },
    {
      id: 6,
      message: 'Maintenance scheduled for tomorrow',
      type: 'system',
      data: { type: 'system', event: 'maintenance', startTime: '2023-11-15 02:00', duration: '2 hours' }
    },
    {
      id: 7,
      message: 'New comment on document #DOC-101',
      type: 'document',
      data: { type: 'document', id: 'DOC-101', title: 'Project Proposal', commentBy: 'David Wilson' }
    },
    {
      id: 8,
      message: 'Inventory low on Product X',
      type: 'inventory',
      data: { type: 'inventory', product: 'Product X', currentStock: 5, threshold: 10 }
    },
    {
      id: 9,
      message: 'New team member joined',
      type: 'user',
      data: { type: 'user', name: 'Eva Green', role: 'Developer', department: 'Engineering' }
    },
    {
      id: 10,
      message: 'Server backup completed',
      type: 'system',
      data: { type: 'system', event: 'backup', status: 'completed', size: '45GB' }
    },
    {
      id: 11,
      message: 'New feature request submitted',
      type: 'ticket',
      data: { type: 'ticket', id: 'TKT-202', subject: 'Dark mode implementation', priority: 'medium' }
    }
  ];

  constructor(private router: Router, private dialog: MatDialog) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.setPageTitle(this.router.url);
    });
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
    if (!notification.data) {
      console.error('Notification data is missing');
      return;
    }

    this.dialog.open(SearchDialogComponent, {
      width: '600px',
      data: {
        title: this.getNotificationTitle(notification),
        data: notification.data,
        excludedFields: [] // Add any fields you want to exclude
      }
    });
  }

  private getNotificationTitle(notification: any): string {
    switch(notification.type) {
      case 'user': return `User Notification: ${notification.message}`;
      case 'invoice': return `Invoice Notification: ${notification.message}`;
      case 'route': return `Route Notification: ${notification.message}`;
      case 'ticket': return `Ticket Notification: ${notification.message}`;
      case 'system': return `System Notification: ${notification.message}`;
      case 'document': return `Document Notification: ${notification.message}`;
      case 'inventory': return `Inventory Notification: ${notification.message}`;
      default: return notification.message;
    }
  }

  changeProfilePicture() {
    console.log('Change Profile Picture clicked');
  }

  editUserInfo() {
    console.log('Edit User Info clicked');
  }

  logout() {
    console.log('Log Out clicked');
  }
}
