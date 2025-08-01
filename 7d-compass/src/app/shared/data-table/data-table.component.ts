import { Component, Input, Output, EventEmitter, ViewChild, AfterViewInit } from '@angular/core';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SafeHtml } from '@angular/platform-browser';

export interface ColumnDefinition {
  name: string;
  header: string;
  cell: (element: any) => string | SafeHtml; // ✅ Permitimos ambos tipos
  isActionColumn?: boolean;
  isHtml?: boolean;
  isCustomTemplate?: boolean; // New property for custom templates
}

@Component({
  selector: 'app-data-table',
  templateUrl: './data-table.component.html',
  styleUrls: ['./data-table.component.scss'],
  standalone: true,
  imports: [
    MatIconModule,
    MatPaginator,
    MatSortModule,
    CommonModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatTooltipModule
  ],
})
export class DataTableComponent<T> implements AfterViewInit {
  @Input() title: string = '';
  @Input() data: T[] = [];
  @Input() columns: ColumnDefinition[] = [];
  @Input() showEyeButton: boolean = false;
  @Input() showUploadButton: boolean = false;
  @Input() showEditButton: boolean = true;
  @Input() showDeleteButton: boolean = true;
  @Input() showViewButton: boolean = false;
  @Input() pageSizeOptions: number[] = [15, 20, 25];
  @Input() hasFiles: (element: T) => boolean = () => false;
  @Input() shouldShowViewButton: (element: T) => boolean = () => true;

  @Output() edit = new EventEmitter<T>();
  @Output() delete = new EventEmitter<T>();
  @Output() view = new EventEmitter<T>();
  @Output() uploadPdf = new EventEmitter<T>();
  @Output() deleteFile = new EventEmitter<T>();
  @Output() commentChange = new EventEmitter<{element: T, newComment: string}>();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  dataSource = new MatTableDataSource<T>();
  displayedColumns: string[] = [];

  ngAfterViewInit() {
    this.dataSource.data = this.data;
    this.displayedColumns = this.columns.map(c => c.name);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;

    // Set up custom sorting for action columns
    this.dataSource.sortingDataAccessor = (item: any, property: string) => {
      const column = this.columns.find(c => c.name === property);
      if (column?.isActionColumn) {
        return ''; // Don't sort action columns
      }

      // Handle computed fields by using the cell function
      if (column?.cell) {
        const cellValue = column.cell(item);
        return typeof cellValue === 'string' ? cellValue.toLowerCase() : cellValue;
      }

      return item[property];
    };
  }

  ngOnChanges() {
    this.dataSource.data = this.data;
    this.displayedColumns = this.columns.map(c => c.name);
  }

  onCommentChange(event: any, element: any): void {
    const newComment = event.value;
    element.comment7d = newComment;
    element.commentChanged = true;
  }

  saveComment(element: any): void {
    this.commentChange.emit({element, newComment: element.comment7d});
    element.commentChanged = false;
  }
}
