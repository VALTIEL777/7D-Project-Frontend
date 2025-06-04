import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

type FieldType = 'text' | 'number' | 'email' | 'password' | 'date' | 'checkbox';

interface DialogField {
  key: string;
  label: string;
  value: any;
  disabled?: boolean;
  type?: FieldType;
  required?: boolean;
  validators?: any[];
}

@Component({
  selector: 'app-search-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    ReactiveFormsModule,
    MatInputModule,
    MatFormFieldModule
  ],
  templateUrl: './search-dialog.component.html',
  styleUrls: ['./search-dialog.component.scss']
})
export class SearchDialogComponent {
  form: FormGroup;
  isEditMode = false;
  fields: DialogField[] = [];
  originalData: any;
  columnFields: DialogField[][] = [];


constructor(
  @Inject(MAT_DIALOG_DATA) public data: any,
  private fb: FormBuilder,
  private dialogRef: MatDialogRef<SearchDialogComponent>
) {
  this.originalData = data.data;
  this.fields = this.generateFields(data.data, data.excludedFields || []);
  this.splitFieldsIntoColumns();
  this.form = this.createForm();
}

  private generateFields(data: any, excludedFields: string[]): DialogField[] {
    return Object.keys(data)
      .filter(key => !excludedFields.includes(key))
      .map(key => ({
        key,
        label: this.formatLabel(key),
        value: data[key],
        type: this.detectFieldType(data[key]),
        disabled: key.toLowerCase() === 'id',
        required: true
      }));
  }

  private formatLabel(key: string): string {
    return key.replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase());
  }

  private detectFieldType(value: any): FieldType {
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'checkbox';
    if (value instanceof Date) return 'date';
    if (this.isEmail(value)) return 'email';
    return 'text'; // default type
  }

  private isEmail(value: string): boolean {
    return typeof value === 'string' && value.includes('@');
  }

  private createForm(): FormGroup {
    const group: any = {};
    this.fields.forEach(field => {
      group[field.key] = new FormControl(
        { value: field.value, disabled: field.disabled },
        field.required ? [Validators.required, ...(field.validators || [])] : []
      );
    });
    return this.fb.group(group);
  }

  enableEdit() {
    this.isEditMode = true;
  }

  cancelEdit() {
    this.isEditMode = false;
    this.form.reset(this.originalData);
  }

  onSave() {
    if (this.form.valid) {
      const updatedData = {
        ...this.originalData,
        ...this.form.getRawValue()
      };
      this.dialogRef.close(updatedData);
    }
  }

  onClose() {
    this.dialogRef.close(null);
  }

  get dialogTitle(): string {
    return this.isEditMode
      ? `Edit ${this.data.title || 'Item'}`
      : this.data.title || 'Details';
  }
  private splitFieldsIntoColumns(): void {
  const midPoint = Math.ceil(this.fields.length / 2);
  this.columnFields = [
    this.fields.slice(0, midPoint),
    this.fields.slice(midPoint)
  ];
}

}
