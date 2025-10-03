import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';

import { RouteReportsComponent } from './route-reports.component';

describe('RouteReportsComponent', () => {
  let component: RouteReportsComponent;
  let fixture: ComponentFixture<RouteReportsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouteReportsComponent],
      providers: [
        { provide: MatSnackBar, useValue: {} }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RouteReportsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load reports data on init', () => {
    spyOn(component, 'loadReportsData');
    component.ngOnInit();
    expect(component.loadReportsData).toHaveBeenCalled();
  });

  it('should have correct displayed columns', () => {
    expect(component.displayedColumns).toEqual([
      'reportName', 'description', 'type', 'generatedDate', 'status', 'actions'
    ]);
  });

  it('should have sample reports data with table data', () => {
    expect(component.reportsData.length).toBeGreaterThan(0);
    expect(component.reportsData[0]).toHaveProperty('reportName');
    expect(component.reportsData[0]).toHaveProperty('description');
    expect(component.reportsData[0]).toHaveProperty('type');
    expect(component.reportsData[0]).toHaveProperty('generatedDate');
    expect(component.reportsData[0]).toHaveProperty('status');
    expect(component.reportsData[0]).toHaveProperty('tableData');
  });

  it('should have history data', () => {
    expect(component.historyData.length).toBeGreaterThan(0);
    expect(component.historyData[0]).toHaveProperty('reportName');
    expect(component.historyData[0]).toHaveProperty('generatedDate');
    expect(component.historyData[0]).toHaveProperty('status');
    expect(component.historyData[0]).toHaveProperty('type');
  });

  it('should get report columns correctly', () => {
    const report = component.reportsData[0];
    const columns = component.getReportColumns(report);
    expect(columns.length).toBeGreaterThan(0);
    expect(columns).toContain('routeCode');
  });

  it('should get report data correctly', () => {
    const report = component.reportsData[0];
    const data = component.getReportData(report);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]).toHaveProperty('routeCode');
  });

  it('should get cell value correctly', () => {
    const report = component.reportsData[0];
    const data = component.getReportData(report);
    const cellValue = component.getCellValue(data[0], 'routeCode');
    expect(cellValue).toBe('R001');
  });

  it('should filter history data by selected tab', () => {
    component.selectedHistoryTab = 'weekly';
    const weeklyData = component.getHistoryData();
    expect(weeklyData.every(report => report.type.toLowerCase() === 'weekly')).toBe(true);

    component.selectedHistoryTab = 'monthly';
    const monthlyData = component.getHistoryData();
    expect(monthlyData.every(report => report.type.toLowerCase() === 'monthly')).toBe(true);
  });

  it('should show giant table when viewing report', () => {
    const report = component.reportsData[0];
    component.viewReport(report);

    expect(component.selectedReport).toBe(report);
    expect(component.giantTableVisible).toBe(true);
    expect(component.giantTableData.length).toBeGreaterThan(0);
    expect(component.giantTableColumns.length).toBeGreaterThan(0);
  });

  it('should close giant table', () => {
    const report = component.reportsData[0];
    component.viewReport(report);
    component.closeGiantTable();

    expect(component.giantTableVisible).toBe(false);
    expect(component.selectedReport).toBeNull();
    expect(component.giantTableData.length).toBe(0);
    expect(component.giantTableColumns.length).toBe(0);
  });

  it('should have updated data structure with phases and tickets completed', () => {
    const dailyReport = component.reportsData[0];
    expect(dailyReport.tableData[0]).toHaveProperty('phases');
    expect(dailyReport.tableData[0]).toHaveProperty('completedTickets');

    const monthlyReport = component.reportsData[2];
    expect(monthlyReport.tableData[0]).toHaveProperty('ticketsCompleted');
    expect(monthlyReport.tableData[0]).not.toHaveProperty('fuelCost');
  });
});
