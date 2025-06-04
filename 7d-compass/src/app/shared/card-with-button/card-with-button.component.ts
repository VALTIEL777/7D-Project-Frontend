import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
@Component({
  selector: 'app-card-with-button',
  imports: [CommonModule, MatIconModule, MatButtonModule],
  templateUrl: './card-with-button.component.html',
  styleUrl: './card-with-button.component.scss'
})
export class CardWithButtonComponent {
  @Input() title = '';
  @Input() description = '';
  @Input() percentage = 0;
  @Input() isPositive = true;

  // Control which buttons to show:
  @Input() showEyeButton = false;
  @Input() showEditButton = false;


  @Input() showLabel = false;

}
