import { Component } from '@angular/core';
import { DashboardLayoutComponent } from "../../../../shared/dashboard-layout/dashboard-layout.component";
import { CardWithButtonComponent } from '../../../../shared/card-with-button/card-with-button.component';
import { MatDialog } from '@angular/material/dialog';
import { DataTableComponent } from '../../../../shared/data-table/data-table.component';
import { ConfirmationDialogComponent } from '../../../../shared/confirmation-dialog/confirmation-dialog.component';
import { SearchDialogComponent } from '../../../../shared/search-dialog/search-dialog.component';

interface ColumnDefinition {
  name: string;
  header: string;
  cell: (element: any) => string;
  isActionColumn?: boolean;
}

@Component({
  selector: 'app-crews',
  standalone: true,
  imports: [
    DashboardLayoutComponent,
    CardWithButtonComponent,
    DataTableComponent,
  ],
  templateUrl: './crews.component.html',
  styleUrl: './crews.component.scss'
})
export class CrewsComponent {
  columns: ColumnDefinition[] = [
    {
      name: 'crewId',
      header: 'ID',
      cell: (crew: any) => crew.crewId
    },
    {
      name: 'type',
      header: 'Type',
      cell: (crew: any) => crew.type
    },
    {
      name: 'employees',
      header: 'Team Members',
      cell: (crew: any) => this.formatEmployees(crew.employees)
    },
    {
      name: 'leader',
      header: 'Team Leader',
      cell: (crew: any) => this.getLeader(crew.employees)
    },
    {
      name: 'workedHours',
      header: 'Worked Hours',
      cell: (crew: any) => crew.workedHours?.toString() || '0'
    },
    {
      name: 'equipment',
      header: 'Assigned Equipment',
      cell: (crew: any) => this.formatEquipment(crew.equipment)
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
      crewId: 1,
      type: 'Excavation',
      photo: 'excavation-team.jpg',
      workedHours: 120.5,
      employees: [
        { employeeId: 101, firstname: 'John', lastname: 'Doe', crewLeader: true },
        { employeeId: 102, firstname: 'Jane', lastname: 'Smith', crewLeader: false },
        { employeeId: 103, firstname: 'Robert', lastname: 'Johnson', crewLeader: false }
      ],
      equipment: [
        { equipmentId: 1, equipmentName: 'Excavator', type: 'machine' },
        { equipmentId: 2, equipmentName: 'Truck', type: 'vehicle' }
      ]
    },
    {
      crewId: 2,
      type: 'Paving',
      photo: 'paving-team.jpg',
      workedHours: 85.25,
      employees: [
        { employeeId: 104, firstname: 'Emily', lastname: 'Williams', crewLeader: true },
        { employeeId: 105, firstname: 'Michael', lastname: 'Brown', crewLeader: false },
        { employeeId: 106, firstname: 'Sarah', lastname: 'Davis', crewLeader: false }
      ],
      equipment: [
        { equipmentId: 3, equipmentName: 'Paving Machine', type: 'machine' },
        { equipmentId: 4, equipmentName: 'Roller', type: 'machine' }
      ]
    },
    {
      crewId: 3,
      type: 'Concrete',
      photo: 'concrete-team.jpg',
      workedHours: 65.75,
      employees: [
        { employeeId: 107, firstname: 'David', lastname: 'Miller', crewLeader: true },
        { employeeId: 108, firstname: 'Jessica', lastname: 'Wilson', crewLeader: false }
      ],
      equipment: [
        { equipmentId: 5, equipmentName: 'Concrete Mixer', type: 'machine' }
      ]
    },
    {
      crewId: 4,
      type: 'Survey',
      photo: 'survey-team.jpg',
      workedHours: 42.0,
      employees: [
        { employeeId: 109, firstname: 'Thomas', lastname: 'Moore', crewLeader: true },
        { employeeId: 110, firstname: 'Lisa', lastname: 'Taylor', crewLeader: false }
      ],
      equipment: [
        { equipmentId: 6, equipmentName: 'Survey Equipment', type: 'tool' }
      ]
    },
    {
      crewId: 5,
      type: 'Maintenance',
      photo: 'maintenance-team.jpg',
      workedHours: 110.0,
      employees: [
        { employeeId: 111, firstname: 'Daniel', lastname: 'Anderson', crewLeader: true },
        { employeeId: 112, firstname: 'Megan', lastname: 'Thomas', crewLeader: false },
        { employeeId: 113, firstname: 'Andrew', lastname: 'Jackson', crewLeader: false }
      ],
      equipment: [
        { equipmentId: 7, equipmentName: 'Service Truck', type: 'vehicle' },
        { equipmentId: 8, equipmentName: 'Tool Set', type: 'tool' }
      ]
    }
  ];

  constructor(private dialog: MatDialog) {}

  private formatEmployees(employees: any[]): string {
    return employees.map(e => `${e.firstname} ${e.lastname}`).join(', ');
  }

  private getLeader(employees: any[]): string {
    const leader = employees.find(e => e.crewLeader);
    return leader ? `${leader.firstname} ${leader.lastname}` : 'No leader';
  }

  private formatEquipment(equipment: any[]): string {
    return equipment.map(e => e.equipmentName).join(', ');
  }

  onEdit(crew: any) {
    const dialogRef = this.dialog.open(SearchDialogComponent, {
      width: '500px',
      data: {
        title: `Edit Crew: ${crew.type}`,
        data: {
          ...crew,
          // Flatten some data for the form
          teamMembers: this.formatEmployees(crew.employees),
          equipmentList: this.formatEquipment(crew.equipment)
        },
        excludedFields: ['crewId', 'employees', 'equipment']
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const index = this.tableData.findIndex(c => c.crewId === crew.crewId);
        if (index !== -1) {
          this.tableData[index] = {
            ...this.tableData[index],
            type: result.type || this.tableData[index].type,
            workedHours: result.workedHours || this.tableData[index].workedHours,
            photo: result.photo || this.tableData[index].photo
          };
        }
      }
    });
  }

  onDelete(crew: any) {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '450px',
      disableClose: true,
      panelClass: 'confirmation-dialog',
      data: {
        title: 'Delete Crew',
        message: `You are about to permanently delete the ${crew.type} crew. This action cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Keep Crew'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.tableData = this.tableData.filter(c => c.crewId !== crew.crewId);
        console.log('Crew deleted:', crew);
      }
    });
  }
}
