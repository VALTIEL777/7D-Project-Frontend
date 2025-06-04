import { Component } from '@angular/core';
import { MATERIAL_MODULES } from '../../../material';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-log-out',
  imports: [MATERIAL_MODULES, RouterModule],
  templateUrl: './log-out.component.html',
  styleUrl: './log-out.component.scss'
})
export class LogOutComponent {

}
