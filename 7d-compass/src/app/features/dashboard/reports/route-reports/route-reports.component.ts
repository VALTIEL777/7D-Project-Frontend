import { Component, OnInit } from '@angular/core';
import { DashboardLayoutComponent } from '../../../../shared/dashboard-layout/dashboard-layout.component';
import { CardWithButtonComponent } from '../../../../shared/card-with-button/card-with-button.component';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule } from '@angular/material/table';
import { CommonModule } from '@angular/common';
import { MATERIAL_MODULES } from '../../../../material';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BaseDashboardComponent } from '../../../../shared/base-dashboard.component';
import { FilterService } from '../../../../core/services/filter.service';

@Component({
  selector: 'app-route-reports',
  imports: [
    DashboardLayoutComponent,
    CardWithButtonComponent,
        MatTableModule,
        MatDividerModule,
        CommonModule,
    MATERIAL_MODULES
  ],
  templateUrl: './route-reports.component.html',
  styleUrl: './route-reports.component.scss'
})
export class RouteReportsComponent extends BaseDashboardComponent implements OnInit {
  // Loading and error states
  loading = false;
  error: string | null = null;

  // Sample data for demonstration
  reportsData: any[] = [
    {
      id: 1,
      reportName: 'Daily Route Summary',
      description: 'Summary of all routes completed today',
      generatedDate: '2024-01-15',
      status: 'Generated',
      type: 'Daily',
      tableData: [
        {
          frequency: 'Day',
          routeName: 'R001 - Main Street Route',
          phaseName: 'Excavation (3 times), Backfill (2 times)',
          ticketsCompleted: 12,
          address: '123 Main St, City, State',
          contractUnit: 'Unit A',
          routeCompletionDate: '2024-01-15'
        },
        {
          frequency: 'Day',
          routeName: 'R002 - Oak Avenue Route',
          phaseName: 'Spotting (4 times), Excavation (3 times)',
          ticketsCompleted: 16,
          address: '456 Oak Ave, City, State',
          contractUnit: 'Unit B',
          routeCompletionDate: '2024-01-15'
        },
        {
          frequency: 'Day',
          routeName: 'R003 - Pine Street Route',
          phaseName: 'Excavation (2 times), Concrete (1 time)',
          ticketsCompleted: 10,
          address: '789 Pine St, City, State',
          contractUnit: 'Unit A',
          routeCompletionDate: '2024-01-15'
        },
        {
          frequency: 'Day',
          routeName: 'R004 - Elm Drive Route',
          phaseName: 'Spotting (5 times), Backfill (3 times)',
          ticketsCompleted: 14,
          address: '321 Elm Dr, City, State',
          contractUnit: 'Unit C',
          routeCompletionDate: '2024-01-15'
        },
        {
          frequency: 'Day',
          routeName: 'R005 - Maple Lane Route',
          phaseName: 'Excavation (4 times), Concrete (2 times)',
          ticketsCompleted: 18,
          address: '654 Maple Ln, City, State',
          contractUnit: 'Unit B',
          routeCompletionDate: '2024-01-15'
        }
      ]
    },
    {
      id: 2,
      reportName: 'Weekly Performance Report',
      description: 'Performance metrics for the past week',
      generatedDate: '2024-01-14',
      status: 'Generated',
      type: 'Weekly',
      tableData: [
        {
          frequency: 'Week 1',
          routeName: 'R001 - Main Street Route',
          phaseName: 'Excavation (15 times), Backfill (12 times)',
          ticketsCompleted: 85,
          address: '123 Main St, City, State',
          contractUnit: 'Unit A',
          routeCompletionDate: '2024-01-14'
        },
        {
          frequency: 'Week 1',
          routeName: 'R002 - Oak Avenue Route',
          phaseName: 'Spotting (20 times), Excavation (18 times)',
          ticketsCompleted: 92,
          address: '456 Oak Ave, City, State',
          contractUnit: 'Unit B',
          routeCompletionDate: '2024-01-14'
        },
        {
          frequency: 'Week 1',
          routeName: 'R003 - Pine Street Route',
          phaseName: 'Excavation (12 times), Concrete (8 times)',
          ticketsCompleted: 67,
          address: '789 Pine St, City, State',
          contractUnit: 'Unit A',
          routeCompletionDate: '2024-01-14'
        },
        {
          frequency: 'Week 1',
          routeName: 'R004 - Elm Drive Route',
          phaseName: 'Spotting (25 times), Backfill (20 times)',
          ticketsCompleted: 78,
          address: '321 Elm Dr, City, State',
          contractUnit: 'Unit C',
          routeCompletionDate: '2024-01-14'
        },
        {
          frequency: 'Week 1',
          routeName: 'R005 - Maple Lane Route',
          phaseName: 'Excavation (18 times), Concrete (15 times)',
          ticketsCompleted: 88,
          address: '654 Maple Ln, City, State',
          contractUnit: 'Unit B',
          routeCompletionDate: '2024-01-14'
        }
      ]
    },
    {
      id: 3,
      reportName: 'Monthly Route Analysis',
      description: 'Comprehensive analysis of route efficiency',
      generatedDate: '2024-01-10',
      status: 'Generated',
      type: 'Monthly',
      tableData: [
        {
          frequency: 'Month',
          routeName: 'R001 - Main Street Route',
          phaseName: 'Excavation (65 times), Backfill (52 times)',
          ticketsCompleted: 485,
          address: '123 Main St, City, State',
          contractUnit: 'Unit A',
          routeCompletionDate: '2024-01-10'
        },
        {
          frequency: 'Month',
          routeName: 'R002 - Oak Avenue Route',
          phaseName: 'Spotting (80 times), Excavation (72 times)',
          ticketsCompleted: 520,
          address: '456 Oak Ave, City, State',
          contractUnit: 'Unit B',
          routeCompletionDate: '2024-01-10'
        },
        {
          frequency: 'Month',
          routeName: 'R003 - Pine Street Route',
          phaseName: 'Excavation (48 times), Concrete (35 times)',
          ticketsCompleted: 598,
          address: '789 Pine St, City, State',
          contractUnit: 'Unit A',
          routeCompletionDate: '2024-01-10'
        },
        {
          frequency: 'Month',
          routeName: 'R004 - Elm Drive Route',
          phaseName: 'Spotting (95 times), Backfill (78 times)',
          ticketsCompleted: 567,
          address: '321 Elm Dr, City, State',
          contractUnit: 'Unit C',
          routeCompletionDate: '2024-01-10'
        },
        {
          frequency: 'Month',
          routeName: 'R005 - Maple Lane Route',
          phaseName: 'Excavation (72 times), Concrete (65 times)',
          ticketsCompleted: 612,
          address: '654 Maple Ln, City, State',
          contractUnit: 'Unit B',
          routeCompletionDate: '2024-01-10'
        }
      ]
    },
  ];

  // History data for weekly and monthly reports
  historyData: any[] = [
    {
      id: 5,
      reportName: 'Weekly Performance Report - Week 1',
      generatedDate: '2024-01-07',
      status: 'Generated',
      type: 'Weekly',
      tableData: [
        {
          frequency: 'Week 1',
          routeName: 'R001 - Main Street Route',
          phaseName: 'Excavation (12 times), Backfill (10 times)',
          ticketsCompleted: 78,
          address: '123 Main St, City, State',
          contractUnit: 'Unit A',
          routeCompletionDate: '2024-01-07'
        },
        {
          frequency: 'Week 1',
          routeName: 'R002 - Oak Avenue Route',
          phaseName: 'Spotting (15 times), Excavation (14 times)',
          ticketsCompleted: 85,
          address: '456 Oak Ave, City, State',
          contractUnit: 'Unit B',
          routeCompletionDate: '2024-01-07'
        }
      ]
    },
    {
      id: 6,
      reportName: 'Weekly Performance Report - Week 2',
      generatedDate: '2024-01-14',
      status: 'Generated',
      type: 'Weekly',
      tableData: [
        {
          frequency: 'Week 2',
          routeName: 'R001 - Main Street Route',
          phaseName: 'Excavation (18 times), Backfill (15 times)',
          ticketsCompleted: 92,
          address: '123 Main St, City, State',
          contractUnit: 'Unit A',
          routeCompletionDate: '2024-01-14'
        },
        {
          frequency: 'Week 2',
          routeName: 'R002 - Oak Avenue Route',
          phaseName: 'Spotting (22 times), Excavation (20 times)',
          ticketsCompleted: 98,
          address: '456 Oak Ave, City, State',
          contractUnit: 'Unit B',
          routeCompletionDate: '2024-01-14'
        }
      ]
    },
    {
      id: 7,
      reportName: 'Monthly Route Analysis - December',
      generatedDate: '2023-12-31',
      status: 'Generated',
      type: 'Monthly',
      tableData: [
        {
          frequency: 'Month',
          routeName: 'R001 - Main Street Route',
          phaseName: 'Excavation (58 times), Backfill (45 times)',
          ticketsCompleted: 445,
          address: '123 Main St, City, State',
          contractUnit: 'Unit A',
          routeCompletionDate: '2023-12-31'
        },
        {
          frequency: 'Month',
          routeName: 'R002 - Oak Avenue Route',
          phaseName: 'Spotting (72 times), Excavation (65 times)',
          ticketsCompleted: 485,
          address: '456 Oak Ave, City, State',
          contractUnit: 'Unit B',
          routeCompletionDate: '2023-12-31'
        }
      ]
    },
    {
      id: 8,
      reportName: 'Monthly Route Analysis - November',
      generatedDate: '2023-11-30',
      status: 'Generated',
      type: 'Monthly',
      tableData: [
        {
          frequency: 'Month',
          routeName: 'R001 - Main Street Route',
          phaseName: 'Excavation (52 times), Backfill (40 times)',
          ticketsCompleted: 398,
          address: '123 Main St, City, State',
          contractUnit: 'Unit A',
          routeCompletionDate: '2023-11-30'
        },
        {
          frequency: 'Month',
          routeName: 'R002 - Oak Avenue Route',
          phaseName: 'Spotting (68 times), Excavation (58 times)',
          ticketsCompleted: 425,
          address: '456 Oak Ave, City, State',
          contractUnit: 'Unit B',
          routeCompletionDate: '2023-11-30'
        }
      ]
    }
  ];

  displayedColumns: string[] = ['reportName', 'description', 'type', 'generatedDate', 'status', 'actions'];
  historyColumns: string[] = ['reportName', 'generatedDate', 'status', 'actions'];
  selectedHistoryTab: string = 'weekly';

  // Giant table properties
  selectedReport: any = null;
  giantTableVisible: boolean = false;
  giantTableData: any[] = [];
  giantTableColumns: string[] = [];

      // Pagination properties
      itemsPerPage: number = 10;
      reportPages: Map<number, number> = new Map(); // reportId -> currentPage

      // History pagination properties
      historyItemsPerPage: number = 12;
      currentHistoryPage: number = 1;


  constructor(
    private snackBar: MatSnackBar,
    filterService: FilterService
  ) {
    super(filterService);
  }

  override ngOnInit(): void {
    super.ngOnInit();
    this.loadReportsData();
  }

  protected override loadData(): void {
    // Implementation required by BaseDashboardComponent
    this.loadReportsData();
  }

  loadReportsData(): void {
    // Simulate loading data
  }

  generateReport(): void {
    this.snackBar.open('Generating new report...', 'Close', {
      duration: 3000
    });
    // Add report generation logic here
  }

  downloadReport(report: any): void {
    this.snackBar.open(`Downloading ${report.reportName} as Excel...`, 'Close', {
      duration: 3000
    });
    // Add download logic here
  }

  downloadPdfReport(report: any): void {
    this.snackBar.open(`Downloading ${report.reportName} as PDF...`, 'Close', {
      duration: 3000
    });
    // Add PDF download logic here
  }

  viewReport(report: any): void {
    this.selectedReport = report;
    this.giantTableData = this.getReportData(report);
    this.giantTableColumns = this.getReportColumns(report);
    this.giantTableVisible = true;

    this.snackBar.open(`Viewing ${report.reportName} in detailed table...`, 'Close', {
      duration: 3000
    });
  }

  closeGiantTable(): void {
    this.giantTableVisible = false;
    this.selectedReport = null;
    this.giantTableData = [];
    this.giantTableColumns = [];
  }


  getStatusColor(status: string): string {
    switch (status) {
      case 'Generated':
        return 'primary';
      case 'Pending':
        return 'warn';
      case 'Failed':
        return 'warn';
      default:
        return 'primary';
    }
  }

  // Excel table methods
  getReportColumns(report: any): string[] {
    if (!report.tableData || report.tableData.length === 0) {
      return [];
    }
    return Object.keys(report.tableData[0]);
  }

  getReportData(report: any): any[] {
    return report.tableData || [];
  }

  getCellValue(row: any, column: string): any {
    return row[column] || '';
  }

      // History methods
      getHistoryData(): any[] {
        return this.historyData.filter(report => report.type.toLowerCase() === this.selectedHistoryTab);
      }

      getPaginatedHistoryData(): any[] {
        const filteredData = this.getHistoryData();
        const startIndex = (this.currentHistoryPage - 1) * this.historyItemsPerPage;
        const endIndex = startIndex + this.historyItemsPerPage;
        return filteredData.slice(startIndex, endIndex);
      }

      getTotalHistoryPages(): number {
        return Math.ceil(this.getHistoryData().length / this.historyItemsPerPage);
      }

      previousHistoryPage(): void {
        if (this.currentHistoryPage > 1) {
          this.currentHistoryPage--;
        }
      }

      nextHistoryPage(): void {
        if (this.currentHistoryPage < this.getTotalHistoryPages()) {
          this.currentHistoryPage++;
        }
      }

      onHistoryTabChange(): void {
        // Reset to first page when changing tabs
        this.currentHistoryPage = 1;
      }

  // Pagination methods for Excel tables
  getCurrentPage(reportId: number): number {
    return this.reportPages.get(reportId) || 1;
  }

  getTotalPages(report: any): number {
    return Math.ceil((report.tableData?.length || 0) / this.itemsPerPage);
  }

  getPaginatedReportData(report: any): any[] {
    const data = report.tableData || [];
    const currentPage = this.getCurrentPage(report.id);
    const startIndex = (currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return data.slice(startIndex, endIndex);
  }

  previousPage(reportId: number): void {
    const currentPage = this.getCurrentPage(reportId);
    if (currentPage > 1) {
      this.reportPages.set(reportId, currentPage - 1);
    }
  }

  nextPage(reportId: number): void {
    const currentPage = this.getCurrentPage(reportId);
    this.reportPages.set(reportId, currentPage + 1);
  }

}
