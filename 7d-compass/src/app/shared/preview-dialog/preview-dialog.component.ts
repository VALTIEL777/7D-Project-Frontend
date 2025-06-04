import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { SafeUrlPipe } from '../../core/pipes/safe-url.pipe';
import { MatButtonModule } from '@angular/material/button';

export interface PreviewData {
  previewUrl: string;
  downloadUrl: string;
  properties: {
    title?: string;
    [key: string]: any;
  };
}


@Component({
  selector: 'app-preview-dialog',
  templateUrl: './preview-dialog.component.html',
  styleUrls: ['./preview-dialog.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatTableModule,
    SafeUrlPipe,
    MatButtonModule
  ]
})
export class PreviewDialogComponent {
  displayedColumns: string[] = ['property', 'value'];

  constructor(@Inject(MAT_DIALOG_DATA) public data: PreviewData) {}

  objectEntries() {
    if (!this.data?.properties) return [];
    return Object.entries(this.data.properties).map(([key, value]) => ({ key, value }));
  }

  get isImage(): boolean {
    return /\.(jpeg|jpg|gif|png)$/i.test(this.data?.previewUrl || '');
  }

  get isPdf(): boolean {
    return /\.pdf$/i.test(this.data?.previewUrl || '');
  }
}
