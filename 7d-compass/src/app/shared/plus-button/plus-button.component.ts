import { Component, Input, Output, EventEmitter, TemplateRef, ViewChild } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';

@Component({
  selector: 'app-plus-button',
  standalone: true,
  templateUrl: './plus-button.component.html',
  styleUrls: ['./plus-button.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatRadioModule,
    MatCheckboxModule
  ]
})
export class PlusButtonComponent {
  @Input() title: string = 'Add';
  @Input() data: Record<string, any> = {};
  @Input() excludedFields: string[] = [];
  @Output() objectCreated = new EventEmitter<any>();
  @Input() mode: 'form' | 'select' = 'form'; // externally set


  formData: Record<string, any> = {};
  selectedFieldsMap: Record<string, boolean> = {};


  @ViewChild('dialogTemplate') dialogTemplate!: TemplateRef<any>;

  private dialogRef: any;

  constructor(private dialog: MatDialog) {}

openSearchDialog() {
  // Init selectedFieldsMap with all true (selected)
  this.selectedFieldsMap = {};
  this.objectKeys(this.data).forEach(key => {
    if (!this.excludedFields.includes(key)) {
      this.selectedFieldsMap[key] = true;
    }
  });

  this.dialogRef = this.dialog.open(this.dialogTemplate, {
    width: '500px',
  });
}

  submitForm() {
    let result: Record<string, any> = {};

    if (this.mode === 'form') {
      // send full formData
      result = { ...this.formData };
    } else {
      // send only selected fields with their original data values
      for (const key of Object.keys(this.selectedFieldsMap)) {
        if (this.selectedFieldsMap[key]) {
          result[key] = this.data[key];
        }
      }
    }

    this.dialogRef.close();
    this.objectCreated.emit(result);
  }

  closeDialog() {
    this.dialogRef.close();
  }

  objectKeys(obj: Record<string, any>): string[] {
    return Object.keys(obj);
  }
}
