import { Component } from '@angular/core';
import { SitejobLayoutComponent } from '../../../shared/sitejob-layout/sitejob-layout.component';
import { MatTableModule } from '@angular/material/table';
import { MatDividerModule } from '@angular/material/divider';
import { CommonModule } from '@angular/common';
import { MATERIAL_MODULES } from '../../../material';
import { SitejobSidenavbarComponent } from '../../../shared/sitejob-sidenavbar/sitejob-sidenavbar.component';

@Component({
  selector: 'app-completed',
  imports: [SitejobLayoutComponent,SitejobSidenavbarComponent,MatTableModule, MatDividerModule,CommonModule,MATERIAL_MODULES],
  templateUrl: './completed.component.html',
  styleUrl: './completed.component.scss'
})
export class CompletedComponent {
  previousLocations = [
  {
    address: '1327 W Addison St, Chicago, IL 60613',
    actions: ['retrieved equipment', 'checked equipment'],
    imageUrl: '/assets/imgs/completed2.JPG',
    comment: 'Missing stripping'
  },
  {
    address: '1327 W Addison St, Chicago, IL 60613',
    actions: ['Poured Concrete'],
  imageUrl: '/assets/imgs/completed1.JPG',
    comment: 'No comment'
  }
];

}
