import { Component } from '@angular/core';
import { DashboardLayoutComponent } from '../../../shared/dashboard-layout/dashboard-layout.component';
import { CardWithButtonComponent } from "../../../shared/card-with-button/card-with-button.component";
import { MatTableModule } from '@angular/material/table';
import { MatDividerModule } from '@angular/material/divider';
import { CommonModule } from '@angular/common';
import { PlusButtonComponent } from '../../../shared/plus-button/plus-button.component';
import { PreviewDialogComponent,PreviewData  } from '../../../shared/preview-dialog/preview-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';


@Component({
  selector: 'app-dashboard',
  imports: [DashboardLayoutComponent, CardWithButtonComponent,MatTableModule, MatDividerModule,
    CommonModule,PlusButtonComponent,
    PreviewDialogComponent,MatButtonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
  constructor(private dialog: MatDialog) {}

  displayedColumns: string[] = ['name', 'email'];

  tableData = [
    { name: 'Alice Johnson', email: 'alice@example.com', status: 'Active' },
    { name: 'Bob Smith', email: 'bob@example.com', status: 'Inactive' },
    { name: 'Charlie Davis', email: 'charlie@example.com', status: 'Pending' },
  ];

  dividerItems = [
    { label: 'Revenue', value: '$45,000' },
    { label: 'Expenses', value: '$20,000' },
    { label: 'Net Profit', value: '$25,000' },
  ];

  myData = {
    id: 1,
    name: '',
    category: '',
    description: '',
    price: ''
  };

  handleResult(result: any) {
    console.log('Created Object:', result);
    // You can add it to a list or trigger a notification
  }
  openPreviewDialog(): void {
  const exampleData: PreviewData = {
    previewUrl: 'assets/imgs/pic.JPG',
    downloadUrl: 'https://example.com/sample.pdf',
    properties: {
      title: 'Monthly Report',
      category: 'Finance',
      createdBy: 'Admin',
      status: 'Approved'
    }
  };

  this.dialog.open(PreviewDialogComponent, {
    data: exampleData,
    width: '600px',
    height: '80vh'
  });
}


}
