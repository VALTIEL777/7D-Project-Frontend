// data-table.component.ts
import { Component, Input, Output, EventEmitter, ViewChild, AfterViewInit } from '@angular/core';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';

export interface ColumnDefinition {
  name: string;
  header: string;
  cell: (element: any) => string;
  isActionColumn?: boolean;
}

@Component({
  selector: 'app-data-table',
  templateUrl: './data-table.component.html',
  styleUrls: ['./data-table.component.scss'],
  imports: [
    MatIconModule,
    MatPaginator,
    CommonModule,
    MatTableModule
  ],
})
export class DataTableComponent<T> implements AfterViewInit {
  @Input() title: string = '';
  @Input() data: T[] = [];
  @Input() columns: ColumnDefinition[] = [];
  @Input() showEyeButton: boolean = false;
  @Input() pageSizeOptions: number[] = [5, 10, 20];

  @Output() edit = new EventEmitter<T>();
  @Output() delete = new EventEmitter<T>();

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  dataSource = new MatTableDataSource<T>();
  displayedColumns: string[] = [];

  ngAfterViewInit() {
    this.dataSource.data = this.data;
    this.displayedColumns = this.columns.map(c => c.name);
    this.dataSource.paginator = this.paginator;
  }

  ngOnChanges() {
    this.dataSource.data = this.data;
    this.displayedColumns = this.columns.map(c => c.name);
  }

}
