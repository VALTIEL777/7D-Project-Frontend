import { Component, OnInit } from '@angular/core';
import { DashboardLayoutComponent } from "../../../../shared/dashboard-layout/dashboard-layout.component";
import { CardWithButtonComponent } from '../../../../shared/card-with-button/card-with-button.component';
import { MatDialog } from '@angular/material/dialog';
import { SearchDialogComponent } from '../../../../shared/search-dialog/search-dialog.component';
import { DataTableComponent } from '../../../../shared/data-table/data-table.component';
import { ConfirmationDialogComponent } from '../../../../shared/confirmation-dialog/confirmation-dialog.component';
import { PeopleService } from '../../../../core/services/human-resources/users.service';
import { BaseDashboardComponent } from '../../../../shared/base-dashboard.component';
import { FilterService } from '../../../../core/services/filter.service';
import { FabButtonComponent } from '../../../../shared/fab-button/fab-button.component';

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
    FabButtonComponent,
  ],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss'
})
export class UsersComponent extends BaseDashboardComponent implements OnInit {
  columns: ColumnDefinition[] = [
    { name: 'fullName', header: 'Full Name', cell: u => `${u.firstname} ${u.lastname}` },
    { name: 'username', header: 'Username', cell: u => u.user?.username || 'No username' },
    { name: 'email', header: 'Email', cell: u => u.email },
    { name: 'phone', header: 'Phone', cell: u => u.phone },
    { name: 'role', header: 'Role', cell: u => u.role },
    { name: 'actions', header: 'Actions', cell: () => '', isActionColumn: true }
  ];

  tableData: any[] = [];

  constructor(
    private dialog: MatDialog,
    private peopleService: PeopleService,
    filterService: FilterService
  ) {
    super(filterService);
  }

  override ngOnInit(): void {
    super.ngOnInit();
    this.loadUsers();
  }

  protected override loadData(): void {
    // Initialize data for filtering
    this.allData = [...this.tableData];
    this.filteredData = [...this.allData];
  }

  // Override text search to include user fields
  protected override matchesTextSearch(item: any, searchTerm: string): boolean {
    const searchableFields = ['firstname', 'lastname', 'role'];
    const username = item.user?.username || '';

    return searchableFields.some(field => {
      const value = this.getNestedValue(item, field);
      if (value) {
        return String(value).toLowerCase().includes(searchTerm);
      }
      return false;
    }) || username.toLowerCase().includes(searchTerm);
  }

  loadUsers(): void {
    this.peopleService.getAllPeople().subscribe({
      next: data => {
        console.log('✅ API Response received:', data);
        console.log('📊 Total users:', data.length);

        // Log each user's key properties
        data.forEach((user, index) => {
          console.log(`👤 User ${index + 1}:`, {
            employeeId: user.employeeId,
            userId: user.userId,
            firstname: user.firstname,
            lastname: user.lastname,
            username: user.user?.username || 'No username',
            email: user.email,
            phone: user.phone,
            role: user.role,
            hasUserAccount: !!user.user,
            userObject: user.user,
            allKeys: Object.keys(user)
          });
        });

        this.tableData = data;
        this.allData = [...data];
        this.filteredData = [...data];

        console.log('✅ Users loaded successfully. Total users:', this.tableData.length);
      },
      error: err => {
        console.error('❌ Error loading users:', err);
        console.error('❌ Error details:', {
          status: err.status,
          statusText: err.statusText,
          message: err.message,
          url: err.url
        });
      }
    });
  }

  // Getter for filtered user data
  get filteredUserData() {
    return this.filteredData;
  }

  onCreateUser(newUser: any): void {
    const userToCreate = {
      ...newUser,
      createdBy: this.getCurrentUserId(),
      updatedBy: this.getCurrentUserId()
    };

    this.peopleService.createPeople(userToCreate).subscribe({
      next: (createdUser) => {
        this.tableData = [...this.tableData, createdUser];
        this.allData = [...this.tableData];
        this.applyFilters();
        console.log('User created:', createdUser);
      },
      error: (err) => {
        console.error('Error creating user:', err);
      }
    });
  }

onEdit(user: any) {
  const dialogRef = this.dialog.open(SearchDialogComponent, {
    width: '500px',
    data: {
      title: `User: ${user.user?.username || user.firstname} ${user.lastname}`,
      data: {
        ...user,
        name: `${user.firstname} ${user.lastname}`,
        username: user.user?.username || ''
      },
        excludedFields: ['userId', 'name', 'employeeId', 'deletedAt', 'updatedAt', 'createdAt', 'createdBy', 'updatedBy', 'user'],
        fields: [
          { name: 'firstname', label: 'First Name', type: 'text', required: true },
          { name: 'lastname', label: 'Last Name', type: 'text', required: true },
          { name: 'username', label: 'Username', type: 'text', required: true },
          { name: 'password', label: 'Password', type: 'password', required: false, placeholder: 'Leave blank to keep current password' },
          { name: 'email', label: 'Email', type: 'text', required: false },
          { name: 'phone', label: 'Phone', type: 'text', required: false },
          { name: 'role', label: 'Role', type: 'select', required: false, options: [
            { value: 'Regional Manager', label: 'Regional Manager' },
            { value: 'Quadrant Manager', label: 'Quadrant Manager' },
            { value: 'Admin', label: 'Admin' },
            { value: 'Operator', label: 'Operator' }
          ]}
        ]
    }
  });

  dialogRef.afterClosed().subscribe(result => {
    if (result) {
      const index = this.tableData.findIndex(u => u.employeeId === user.employeeId);

      if (index !== -1) {
        const updatedUser = {
          ...user,
          ...result,
          updatedBy: this.getCurrentUserId()
        };

        // Remove password if it's empty to keep current password
        if (!updatedUser.password || updatedUser.password.trim() === '') {
          delete updatedUser.password;
        }

        this.peopleService.updatePeople(user.employeeId, updatedUser).subscribe({
          next: () => {
            this.tableData[index] = updatedUser;
            this.allData = [...this.tableData];
            this.applyFilters();
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
      if (!user.employeeId) {
        console.error('Cannot delete user: employeeId is undefined', user);
        return;
      }

      const deletePayload = {
        deleteUser: true,
        updatedBy: this.getCurrentUserId()
      };

      this.peopleService.deletePeople(user.employeeId, deletePayload).subscribe({
        next: () => {
          this.tableData = this.tableData.filter(u => u.employeeId !== user.employeeId);
          this.allData = [...this.tableData];
          this.applyFilters();
          console.log('User deleted:', user);
        },
        error: err => console.error('Error deleting user:', err)
      });
    }
  });
}

  // Helper method to get current user ID (should be replaced with actual auth service)
  private getCurrentUserId(): number {
    // TODO: Implement this when auth service is available
    // return this.authService.getCurrentUser()?.id || 1;
    return 1; // Default for now
  }
}
