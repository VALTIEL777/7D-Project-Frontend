import { Component, AfterViewInit } from '@angular/core';
import { DashboardLayoutComponent } from "../../../../shared/dashboard-layout/dashboard-layout.component";
import { CardWithButtonComponent } from '../../../../shared/card-with-button/card-with-button.component';
import { MatDialog } from '@angular/material/dialog';
import { SearchDialogComponent } from '../../../../shared/search-dialog/search-dialog.component';
import { DataTableComponent } from '../../../../shared/data-table/data-table.component'; // Import the component
import { ConfirmationDialogComponent } from '../../../../shared/confirmation-dialog/confirmation-dialog.component';

// Define ColumnDefinition interface if not already defined in DataTableComponent
interface ColumnDefinition {
  name: string;
  header: string;
  cell: (element: any) => string;
  isActionColumn?: boolean;
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    DashboardLayoutComponent,
    CardWithButtonComponent,
    DataTableComponent,

  ],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss'
})
export class UsersComponent {
  // Define columns property
  columns: ColumnDefinition[] = [
    {
      name: 'fullName',
      header: 'Full Name',
      cell: (user: any) => `${user.firstname} ${user.lastname}`
    },
    {
      name: 'username',
      header: 'Username',
      cell: (user: any) => user.username
    },
    {
      name: 'email',
      header: 'Email',
      cell: (user: any) => user.email
    },
    {
      name: 'phone',
      header: 'Phone',
      cell: (user: any) => user.phone
    },
    {
      name: 'role',
      header: 'Role',
      cell: (user: any) => user.role
    },
    {
      name: 'actions',
      header: 'Actions',
      cell: () => '',
      isActionColumn: true
    }
  ];

  tableData = [
    {
      firstname: 'Ana',
      lastname: 'Ramirez',
      username: 'aramirez',
      email: 'ana@example.com',
      phone: '5551234567',
      role: 'Supervisor'
    },
    {
      firstname: 'John',
      lastname: 'Doe',
      username: 'jdoe',
      email: 'john.doe@example.com',
      phone: '5552345678',
      role: 'Administrator'
    },
    {
      firstname: 'Jane',
      lastname: 'Smith',
      username: 'jsmith',
      email: 'jane.smith@example.com',
      phone: '5553456789',
      role: 'Manager'
    },
    {
      firstname: 'Robert',
      lastname: 'Johnson',
      username: 'rjohnson',
      email: 'robert.j@example.com',
      phone: '5554567890',
      role: 'Developer'
    },
    {
      firstname: 'Emily',
      lastname: 'Williams',
      username: 'ewilliams',
      email: 'emily.w@example.com',
      phone: '5555678901',
      role: 'Designer'
    },
    {
      firstname: 'Michael',
      lastname: 'Brown',
      username: 'mbrown',
      email: 'michael.b@example.com',
      phone: '5556789012',
      role: 'Analyst'
    },
    {
      firstname: 'Sarah',
      lastname: 'Davis',
      username: 'sdavis',
      email: 'sarah.d@example.com',
      phone: '5557890123',
      role: 'Tester'
    },
    {
      firstname: 'David',
      lastname: 'Miller',
      username: 'dmiller',
      email: 'david.m@example.com',
      phone: '5558901234',
      role: 'Support'
    },
    {
      firstname: 'Jessica',
      lastname: 'Wilson',
      username: 'jwilson',
      email: 'jessica.w@example.com',
      phone: '5559012345',
      role: 'HR'
    },
    {
      firstname: 'Thomas',
      lastname: 'Moore',
      username: 'tmoore',
      email: 'thomas.m@example.com',
      phone: '5550123456',
      role: 'Accountant'
    },
    {
      firstname: 'Lisa',
      lastname: 'Taylor',
      username: 'ltaylor',
      email: 'lisa.t@example.com',
      phone: '5551234509',
      role: 'Marketing'
    },
    {
      firstname: 'Daniel',
      lastname: 'Anderson',
      username: 'danderson',
      email: 'daniel.a@example.com',
      phone: '5552345609',
      role: 'Sales'
    },
    {
      firstname: 'Megan',
      lastname: 'Thomas',
      username: 'mthomas',
      email: 'megan.t@example.com',
      phone: '5553456709',
      role: 'Content Writer'
    },
    {
      firstname: 'Andrew',
      lastname: 'Jackson',
      username: 'ajackson',
      email: 'andrew.j@example.com',
      phone: '5554567809',
      role: 'Project Manager'
    },
    {
      firstname: 'Olivia',
      lastname: 'White',
      username: 'owhite',
      email: 'olivia.w@example.com',
      phone: '5555678909',
      role: 'UX Designer'
    },
    {
      firstname: 'James',
      lastname: 'Harris',
      username: 'jharris',
      email: 'james.h@example.com',
      phone: '5556789019',
      role: 'System Admin'
    }
  ];

  constructor(private dialog: MatDialog) {}

  onEdit(user: any) {
    const dialogRef = this.dialog.open(SearchDialogComponent, {
      width: '500px',
      data: {
        title: `User: ${user.username}`,
        data: {
          ...user,
          name: `${user.firstname} ${user.lastname}`
        },
        excludedFields: ['username']
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const [firstname, ...lastnameParts] = result.name.split(' ');
        const lastname = lastnameParts.join(' ');

        const index = this.tableData.findIndex(u => u.username === user.username);
        if (index !== -1) {
          this.tableData[index] = {
            ...user,
            firstname,
            lastname,
            ...result
          };
          // You'll need to trigger change detection or use immutable updates
        }
      }
    });
  }

onDelete(user: any) {
  const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
    width: '450px',
    disableClose: true, // Prevent closing by clicking outside
    panelClass: 'confirmation-dialog',
    data: {
      title: 'Delete User Account',
      message: `You are about to permanently delete ${user.firstname} ${user.lastname}'s account (${user.username}). This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Keep User'
    }
  });

  dialogRef.afterClosed().subscribe(confirmed => {
    if (confirmed) {
      // Remove the user from the array
      this.tableData = this.tableData.filter(u => u.username !== user.username);

      // In a real app, you would call your API service here
      console.log('User deleted:', user);

      // Optional: Show a success notification
      // this.snackBar.open('User deleted successfully', 'Close', { duration: 3000 });
    }
  });
}
}
