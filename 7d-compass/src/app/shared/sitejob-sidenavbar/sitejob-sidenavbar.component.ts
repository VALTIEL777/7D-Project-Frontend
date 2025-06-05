import { Component, Input } from '@angular/core';
import { MATERIAL_MODULES } from '../../material';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sitejob-sidenavbar',
  imports: [MATERIAL_MODULES, RouterModule, CommonModule],
  templateUrl: './sitejob-sidenavbar.component.html',
  styleUrl: './sitejob-sidenavbar.component.scss'
})
export class SitejobSidenavbarComponent {
    @Input() teamLeader: string = '';
  @Input() teamMembers: string[] = [];
}
