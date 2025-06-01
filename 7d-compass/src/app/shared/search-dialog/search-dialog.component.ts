import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
@Component({
  selector: 'app-search-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, ReactiveFormsModule,MatInputModule, MatFormFieldModule],
  templateUrl: './search-dialog.component.html',
  styleUrls: ['./search-dialog.component.scss']
})
export class SearchDialogComponent {
  form: FormGroup;
  type: string;
  isEditMode = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<SearchDialogComponent>
  ) {
    this.type = data.type;
    this.form = this.createForm(data);
  }

  createForm(data: any): FormGroup {
    switch (data.type) {
      case 'user':
        return this.fb.group({
          name: [data.name, Validators.required],
          role: [data.role, Validators.required],
          city: [data.city, Validators.required]
        });
      case 'invoice':
        return this.fb.group({
          id: [{ value: data.id, disabled: true }],
          customer: [data.customer, Validators.required],
          total: [data.total, [Validators.required, Validators.min(0)]]
        });
      case 'route':
        return this.fb.group({
          id: [{ value: data.id, disabled: true }],
          origin: [data.origin, Validators.required],
          destination: [data.destination, Validators.required]
        });
      default:
        return this.fb.group({});
    }
  }

  enableEdit() {
    this.isEditMode = true;
  }

  cancelEdit() {
    this.isEditMode = false;
    this.form.reset(this.data); // reset form to original data
  }

  onSave() {
    if (this.form.valid) {
      const updatedData = { ...this.data, ...this.form.getRawValue() };
      this.dialogRef.close(updatedData);
    }
  }

  onClose() {
    this.dialogRef.close(null);
  }
  get dialogTitle(): string {
  if (this.type === 'user') {
    return this.isEditMode ? `Edit User: ${this.data.name}` : this.data.name;
  }
  if (this.type === 'invoice') {
    return this.isEditMode ? `Edit Invoice #${this.data.id}` : `Invoice #${this.data.id}`;
  }
  if (this.type === 'route') {
    return this.isEditMode ? `Edit Route ${this.data.id}` : `Route ${this.data.id}`;
  }
  return 'Detail';
}
}
