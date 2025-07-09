import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
  ],
  templateUrl: './confirm-phase-dialog.component.html'
})
export class ConfirmPhaseDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmPhaseDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { phaseName: string }
  ) {}

  confirm(): void {
    this.dialogRef.close(true);
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
