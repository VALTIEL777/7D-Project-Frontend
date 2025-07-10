import { Component } from '@angular/core';
import { MATERIAL_MODULES } from '../../material';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sitejob-tabs',
  imports: [MATERIAL_MODULES, RouterModule, CommonModule],
  templateUrl: './sitejob-tabs.component.html',
  styleUrl: './sitejob-tabs.component.scss'
})
export class SitejobTabsComponent {

}
