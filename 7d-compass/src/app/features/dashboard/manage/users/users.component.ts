import { Component, OnInit } from '@angular/core';
import { DashboardLayoutComponent } from "../../../../shared/dashboard-layout/dashboard-layout.component";
import { CardWithButtonComponent } from '../../../../shared/card-with-button/card-with-button.component';
import { MatDialog } from '@angular/material/dialog';
import { SearchDialogComponent } from '../../../../shared/search-dialog/search-dialog.component';
import { DataTableComponent } from '../../../../shared/data-table/data-table.component';
import { ConfirmationDialogComponent } from '../../../../shared/confirmation-dialog/confirmation-dialog.component';
import { PeopleService } from '../../../../core/services/human-resources/users.service';

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
export class UsersComponent implements OnInit {
  columns: ColumnDefinition[] = [
    { name: 'fullName', header: 'Full Name', cell: u => `${u.firstname} ${u.lastname}` },
    { name: 'username', header: 'Username', cell: u => u.username },
    { name: 'email', header: 'Email', cell: u => u.email },
    { name: 'phone', header: 'Phone', cell: u => u.phone },
    { name: 'role', header: 'Role', cell: u => u.role },
    { name: 'actions', header: 'Actions', cell: () => '', isActionColumn: true }
  ];

  tableData: any[] = [];

  constructor(
    private dialog: MatDialog,
    private peopleService: PeopleService
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.peopleService.getAllPeople().subscribe({
      next: data => this.tableData = data,
      error: err => console.error('Error loading users:', err)
    });
  }

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

      const index = this.tableData.findIndex(u => u.employeeid === user.employeeid); // 👈 Cambiado

      if (index !== -1) {
        const updatedUser = {
          ...user,
          firstname,
          lastname,
          ...result
        };

        // 👇 Cambiar para enviar employeeid como identificador
        this.peopleService.updatePeople(user.employeeid, updatedUser).subscribe({
          next: () => {
            this.tableData[index] = updatedUser;
          },
          error: err => console.error('Error updating user:', err)
        });
      }
    }
  });
}


onDelete(user: any) {
  console.log('User to delete:', user); 

  const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
    width: '450px',
    disableClose: true,
    panelClass: 'confirmation-dialog',
    data: {
      title: 'Delete User Account',
      message: `You are about to permanently delete ${user.firstname} ${user.lastname}'s account. This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Keep User'
    }
  });

  dialogRef.afterClosed().subscribe(confirmed => {
    if (confirmed) {
      this.peopleService.deletePeople(user.employeeid).subscribe({
        next: () => {
          this.tableData = this.tableData.filter(u => u.employeeid !== user.employeeid);
          console.log('User deleted:', user);
        },
        error: err => console.error('Error deleting user:', err)
      });
    }
  });
}



}
