import { Component, OnInit } from '@angular/core';
import { DashboardLayoutComponent } from "../../../../shared/dashboard-layout/dashboard-layout.component";
import { CardWithButtonComponent } from '../../../../shared/card-with-button/card-with-button.component';
import { MatDialog } from '@angular/material/dialog';
import { SearchDialogComponent } from '../../../../shared/search-dialog/search-dialog.component';
import { DataTableComponent } from '../../../../shared/data-table/data-table.component';
import { ConfirmationDialogComponent } from '../../../../shared/confirmation-dialog/confirmation-dialog.component';
import { ContractUnitsService, ContractUnit } from '../../../../core/services/contract-units.service';
import { BaseDashboardComponent } from '../../../../shared/base-dashboard.component';
import { FilterService } from '../../../../core/services/filter.service';

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
export class ContractUnitsComponent extends BaseDashboardComponent implements OnInit {
  columns: ColumnDefinition[] = [
    {
      name: 'itemCode',
      header: 'Item Code',
      cell: (unit: any) => unit.itemCode || 'N/A'
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
      cell: (unit: any) => {
        const cost = unit.costPerUnit;
        if (cost === null || cost === undefined || cost === '') {
          return '$0.00';
        }
        const numCost = typeof cost === 'string' ? parseFloat(cost) : cost;
        return isNaN(numCost) ? '$0.00' : `$${numCost.toFixed(2)}`;
      }
    },
    {
      name: 'zone',
      header: 'Zone',
      cell: (unit: any) => unit.zone || 'N/A'
    },
    {
      name: 'actions',
      header: 'Actions',
      cell: () => '',
      isActionColumn: true
    }
  ];

  tableData: ContractUnit[] = [];

  constructor(
    private dialog: MatDialog,
    private contractUnitsService: ContractUnitsService,
    filterService: FilterService
  ) {
    super(filterService);
  }

  override ngOnInit(): void {
    super.ngOnInit();
    this.loadContractUnits();
  }

  protected override loadData(): void {
    // Initialize data for filtering
    this.allData = [...this.tableData];
    this.filteredData = [...this.allData];
  }

  // Override text search to include contract unit fields
  protected override matchesTextSearch(item: any, searchTerm: string): boolean {
    const searchableFields = ['itemCode', 'name', 'unit', 'zone', 'description'];

    return searchableFields.some(field => {
      const value = this.getNestedValue(item, field);
      if (value) {
        return String(value).toLowerCase().includes(searchTerm);
      }
      return false;
    });
  }

  loadContractUnits(): void {
    this.contractUnitsService.getAllContractUnits().subscribe({
      next: data => {
        console.log('API response data:', data);
        if (data.length > 0) {
          console.log('First item structure:', data[0]);
          console.log('First item ID field:', data[0].contractUnitId);
          console.log('First item all keys:', Object.keys(data[0]));
        }
        this.tableData = data;
        this.allData = [...data];
        this.filteredData = [...data];
      },
      error: err => console.error('Error loading contract units:', err)
    });
  }

  // Getter for filtered contract unit data
  get filteredContractUnitData() {
    return this.filteredData;
  }

  onEdit(unit: ContractUnit) {
    const dialogRef = this.dialog.open(SearchDialogComponent, {
      width: '600px',
      data: {
        title: `Edit Contract Unit: ${unit.itemCode}`,
        data: unit,
        excludedFields: ['contractUnitId', 'itemCode', 'deletedAt', 'updatedAt', 'createdAt', 'createdBy', 'updatedBy'],
        fields: [
          { name: 'name', label: 'Name', type: 'text', required: true },
          { name: 'unit', label: 'Unit', type: 'select', required: true, options: [
            { value: 'each', label: 'Each' },
            { value: 'square foot', label: 'Square Foot' },
            { value: 'foot', label: 'Foot' }
          ]},
          { name: 'description', label: 'Description', type: 'textarea', required: false },
          { name: 'workNotIncluded', label: 'Work Not Included', type: 'textarea', required: false },
          { name: 'costPerUnit', label: 'Cost Per Unit', type: 'number', required: false },
          { name: 'zone', label: 'Zone', type: 'select', required: false, options: [
            { value: 'central', label: 'Central' },
            { value: 'north', label: 'North' }
          ]},
          { name: 'paymentClause', label: 'Payment Clause', type: 'textarea', required: false },
          { name: 'neededMobilization', label: 'Needed Mobilization', type: 'number', required: false },
          { name: 'neededContractUnit', label: 'Needed Contract Unit', type: 'number', required: false },
          { name: 'cdotStandardImg', label: 'CDOT Standard Image', type: 'text', required: false }
        ]
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && unit.contractUnitId) {
        const index = this.tableData.findIndex(u => u.contractUnitId === unit.contractUnitId);
        if (index !== -1) {
          const updatedUnit = {
            ...unit,
            ...result,
            updatedBy: this.getCurrentUserId()
          };

          this.contractUnitsService.updateContractUnit(unit.contractUnitId, updatedUnit).subscribe({
            next: () => {
              this.tableData[index] = updatedUnit;
              this.allData = [...this.tableData];
              this.applyFilters();
            },
            error: err => console.error('Error updating contract unit:', err)
          });
        }
      }
    });
  }

  onDelete(unit: ContractUnit) {
    console.log('Delete unit object:', unit);
    console.log('Unit ID (contractUnitId):', unit.contractUnitId);

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
      if (confirmed && unit.contractUnitId) {
        console.log('Attempting to delete with ID:', unit.contractUnitId);
        this.contractUnitsService.deleteContractUnit(unit.contractUnitId).subscribe({
          next: () => {
            this.tableData = this.tableData.filter(u => u.contractUnitId !== unit.contractUnitId);
            this.allData = [...this.tableData];
            this.applyFilters();
            console.log('Contract unit deleted:', unit);
          },
          error: err => {
            console.error('Error deleting contract unit:', err);
            console.error('Error details:', err.error);
          }
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
