import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { SearchDialogComponent } from '../search-dialog/search-dialog.component';

@Component({
  selector: 'app-fab-button',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './fab-button.component.html',
  styleUrl: './fab-button.component.scss'
})
export class FabButtonComponent {
  @Input() title: string = 'Add New';
  @Input() icon: string = 'add';
  @Input() tooltip: string = 'Create new item';
  @Input() fields: any[] = [];
  @Input() excludedFields: string[] = [];
  @Input() dialogTitle: string = 'Create New Item';

  @Output() itemCreated = new EventEmitter<any>();

  constructor(private dialog: MatDialog) {}

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(SearchDialogComponent, {
      width: '500px',
      data: {
        title: this.dialogTitle,
        data: {},
        excludedFields: this.excludedFields,
        fields: this.fields
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.itemCreated.emit(result);
      }
    });
  }
}
