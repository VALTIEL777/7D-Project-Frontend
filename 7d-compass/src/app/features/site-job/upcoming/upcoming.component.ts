import { Component } from '@angular/core';
import { SitejobLayoutComponent } from '../../../shared/sitejob-layout/sitejob-layout.component';
import { CardWithButtonComponent } from '../../../shared/card-with-button/card-with-button.component';
import { MatTableModule } from '@angular/material/table';
import { MatDividerModule } from '@angular/material/divider';
import { CommonModule } from '@angular/common';
import { MATERIAL_MODULES } from '../../../material';

@Component({
  selector: 'app-upcoming',
  imports: [SitejobLayoutComponent,MatTableModule, MatDividerModule,CommonModule,MATERIAL_MODULES],
  templateUrl: './upcoming.component.html',
  styleUrl: './upcoming.component.scss'
})
export class UpcomingComponent {
remainingLocations = [
  {
    address: '1327 W Addison St, Chicago, IL 60613',
    job: 'Corner Ramp',
    size: '12 x 13 Ft',
    material: '1 ton'
  },
  {
    address: '9475 W Addison St, Chicago, IL 60613',
    job: 'Corner Ramp',
    size: '12 x 3 Ft',
    material: '0.5 ton'
  },
  {
    address: '7356 W Addison St, Chicago, IL 60613',
    job: 'Corner Ramp',
    size: '2 x 8 Ft',
    material: '0.1 ton'
  },
  {
    address: '603 W Addison St, Chicago, IL 60613',
    job: 'Corner Ramp',
    size: '12 x 13 Ft',
    material: '0.3 ton'
  },
  {
    address: '403 W Addison St, Chicago, IL 60613',
    job: 'Corner Ramp',
    size: '12 x 13 Ft',
    material: '1 ton'
  }
];

}
