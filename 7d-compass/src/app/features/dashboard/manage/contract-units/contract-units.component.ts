import { Component } from '@angular/core';
import { DashboardLayoutComponent } from "../../../../shared/dashboard-layout/dashboard-layout.component";
import { CardWithButtonComponent } from '../../../../shared/card-with-button/card-with-button.component';
import { MatDialog } from '@angular/material/dialog';
import { SearchDialogComponent } from '../../../../shared/search-dialog/search-dialog.component';
import { DataTableComponent } from '../../../../shared/data-table/data-table.component';
import { ConfirmationDialogComponent } from '../../../../shared/confirmation-dialog/confirmation-dialog.component';

interface ColumnDefinition {
  name: string;
  header: string;
  cell: (element: any) => string;
  isActionColumn?: boolean;
}

@Component({
  selector: 'app-contract-units',
  standalone: true,
  imports: [
    DashboardLayoutComponent,
    CardWithButtonComponent,
    DataTableComponent,
  ],
  templateUrl: './contract-units.component.html',
  styleUrl: './contract-units.component.scss'
})
export class ContractUnitsComponent {
  columns: ColumnDefinition[] = [
    {
      name: 'itemCode',
      header: 'Item Code',
      cell: (unit: any) => unit.itemCode
    },
    {
      name: 'name',
      header: 'Name',
      cell: (unit: any) => unit.name
    },
    {
      name: 'unit',
      header: 'Unit',
      cell: (unit: any) => unit.unit
    },
    {
      name: 'cost',
      header: 'Cost/Unit',
      cell: (unit: any) => `$${unit.costPerUnit.toFixed(2)}`
    },
    {
      name: 'zone',
      header: 'Zone',
      cell: (unit: any) => unit.zone
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
      contractUnitId: 1,
      itemCode: 'CU-001',
      name: 'Asphalt Paving',
      unit: 'Square Yard',
      description: 'Hot mix asphalt paving, including all materials and labor',
      workNotIncluded: 'Does not include base preparation',
      costPerUnit: 12.50,
      zone: 'North',
      paymentClause: 'Payment upon completion and inspection'
    },
    {
      contractUnitId: 2,
      itemCode: 'CU-002',
      name: 'Concrete Sidewalk',
      unit: 'Linear Foot',
      description: '4" thick concrete sidewalk with broom finish',
      workNotIncluded: 'Does not include subgrade preparation',
      costPerUnit: 8.75,
      zone: 'Central',
      paymentClause: '50% upfront, 50% upon completion'
    },
    {
      contractUnitId: 3,
      itemCode: 'CU-003',
      name: 'Curb Installation',
      unit: 'Linear Foot',
      description: '6" concrete curb with integral gutter',
      workNotIncluded: 'Does not include excavation',
      costPerUnit: 10.20,
      zone: 'South',
      paymentClause: 'Payment upon completion'
    },
    {
      contractUnitId: 4,
      itemCode: 'CU-004',
      name: 'Storm Drain Installation',
      unit: 'Each',
      description: '12" diameter storm drain with all connections',
      workNotIncluded: 'Does not include trenching',
      costPerUnit: 250.00,
      zone: 'West',
      paymentClause: 'Progress payments based on milestones'
    },
    {
      contractUnitId: 5,
      itemCode: 'CU-005',
      name: 'Street Sign Installation',
      unit: 'Each',
      description: 'Standard street sign with post and hardware',
      workNotIncluded: 'Does not include sign design',
      costPerUnit: 85.00,
      zone: 'East',
      paymentClause: 'Payment upon installation'
    },
    {
      contractUnitId: 6,
      itemCode: 'CU-006',
      name: 'Traffic Signal',
      unit: 'Each',
      description: 'Complete traffic signal installation',
      workNotIncluded: 'Does not include wiring to controller',
      costPerUnit: 1200.00,
      zone: 'Central',
      paymentClause: '30% deposit, balance upon completion'
    },
    {
      contractUnitId: 7,
      itemCode: 'CU-007',
      name: 'Pothole Repair',
      unit: 'Square Foot',
      description: 'Cold mix asphalt pothole repair',
      workNotIncluded: 'Does not include full depth repair',
      costPerUnit: 5.25,
      zone: 'All',
      paymentClause: 'Payment upon completion'
    },
    {
      contractUnitId: 8,
      itemCode: 'CU-008',
      name: 'Street Light Installation',
      unit: 'Each',
      description: 'LED street light with pole and foundation',
      workNotIncluded: 'Does not include electrical connection',
      costPerUnit: 950.00,
      zone: 'North',
      paymentClause: 'Payment upon energization'
    }
  ];

  constructor(private dialog: MatDialog) {}

  onEdit(unit: any) {
    const dialogRef = this.dialog.open(SearchDialogComponent, {
      width: '600px',
      data: {
        title: `Edit Contract Unit: ${unit.itemCode}`,
        data: unit,
        excludedFields: ['contractUnitId', 'itemCode']
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const index = this.tableData.findIndex(u => u.contractUnitId === unit.contractUnitId);
        if (index !== -1) {
          this.tableData[index] = {
            ...this.tableData[index],
            ...result
          };
        }
      }
    });
  }

  onDelete(unit: any) {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '450px',
      disableClose: true,
      panelClass: 'confirmation-dialog',
      data: {
        title: 'Delete Contract Unit',
        message: `You are about to delete the contract unit "${unit.name}" (${unit.itemCode}). This action cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Cancel'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.tableData = this.tableData.filter(u => u.contractUnitId !== unit.contractUnitId);
        console.log('Contract unit deleted:', unit);
      }
    });
  }
}
