import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';

interface PreviewUrl {
  url: string;
  isImage: boolean;
  name: string;
  fileExt?: string;  // optional
}

@Component({
  selector: 'app-drag-drop-upload',
  standalone: true,
  templateUrl: './drag-drop-upload.component.html',
  styleUrls: ['./drag-drop-upload.component.scss'],
  imports: [CommonModule, MatIconModule, MatDividerModule, MatListModule, MatButtonModule]
})
export class DragDropUploadComponent {
  @Input() maxFiles = 5;  // default max files
  @Output() filesDropped = new EventEmitter<File[]>();

  selectedFiles: File[] = [];
  previewUrls: PreviewUrl[] = [];  // Use interface here

  onFileDropped(event: DragEvent) {
    event.preventDefault();
    const files = event.dataTransfer?.files;
    if (files) {
      this.handleFiles(files);
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
  }

  onFileSelected(event: any) {
    const files = event.target.files;
    if (files) {
      this.handleFiles(files);
      event.target.value = null;
    }
  }

  handleFiles(fileList: FileList) {
    const filesArray = Array.from(fileList);
    const allowedCount = this.maxFiles - this.selectedFiles.length;
    const filesToAdd = filesArray.slice(0, allowedCount);

    filesToAdd.forEach(file => {
      this.selectedFiles.push(file);
      this.generatePreview(file);
    });

    this.filesDropped.emit(this.selectedFiles);
  }

  generatePreview(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      this.previewUrls.push({
        url: reader.result as string,
        isImage: file.type.startsWith('image/'),
        name: file.name,
        fileExt: ext
      });
    };
    reader.readAsDataURL(file);
  }

  removeFile(index: number) {
    this.selectedFiles.splice(index, 1);
    this.previewUrls.splice(index, 1);
    this.filesDropped.emit(this.selectedFiles);
  }

  clearAll() {
    this.selectedFiles = [];
    this.previewUrls = [];
    this.filesDropped.emit(this.selectedFiles);
  }
}
