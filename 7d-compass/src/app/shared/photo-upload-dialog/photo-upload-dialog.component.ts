import { Component, Inject, NgModule } from '@angular/core';
import { MATERIAL_MODULES } from '../../material';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-photo-upload-dialog',
  imports: [MATERIAL_MODULES,  CommonModule,
    FormsModule, ],
  templateUrl: './photo-upload-dialog.component.html',
  styleUrl: './photo-upload-dialog.component.scss'
})
export class PhotoUploadDialogComponent {
  selectedFiles: File[] = [];
  previews: string[] = [];
  name: string = '';
  comment: string = '';

  constructor(
    public dialogRef: MatDialogRef<PhotoUploadDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  triggerFileInput(): void {
    const fileInput = document.getElementById('photoUploadFileInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    } else {
      console.warn('File input not found');
    }
  }

  onFileSelected(event: any): void {
    const files: FileList = event.target.files;
    this.selectedFiles = Array.from(files);

    // previews
    this.previews = [];
    this.selectedFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e: any) => this.previews.push(e.target.result);
      reader.readAsDataURL(file);
    });
  }

  removeImage(index: number): void {
    this.selectedFiles.splice(index, 1);
    this.previews.splice(index, 1);
  }

  save(): void {
    this.dialogRef.close({
      ticketId: this.data.ticketId,
      files: this.selectedFiles,
      name: this.name,
      comment: this.comment
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }

}
