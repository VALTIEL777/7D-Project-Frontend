import { Component } from '@angular/core';
import { MATERIAL_MODULES } from '../../material';
import { CommonModule, NgClass } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-sitejob-layout',
  imports: [MATERIAL_MODULES, RouterModule, CommonModule],
  templateUrl: './sitejob-layout.component.html',
  styleUrl: './sitejob-layout.component.scss'
})
export class SitejobLayoutComponent {
 teamLeader = 'Juan Pérez';

  teamMembers = ['Dwayne Rock Johnson', 'Elon Musk', 'Robert Plant', 'Michael Smith']; 

}
