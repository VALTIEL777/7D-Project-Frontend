import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-right-card',
  imports: [CommonModule, MatIconModule, MatButtonModule],
  templateUrl: './right-card.component.html',
  styleUrl: './right-card.component.scss'
})
export class RightCardComponent {
 @Input() title = '';
  @Input() description = '';
  @Input() percentage = 0;
  @Input() isPositive = true;

  // Control which buttons to show:
  @Input() showEyeButton = false;
  @Input() showEditButton = false;


  @Input() showLabel = false;

}
