import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';
import { CommonModule } from '@angular/common';
import { CrewGenerationComponent } from './rtr-data/crew-generation/crew-generation.component';
import { RtrProcessingComponent } from './rtr-data/rtr-processing/rtr-processing.component';
import { PhotoEvidenceComponent } from './photo-evidence/photo-evidence.component';

const routes: Routes = [
  { path: '', component: DashboardComponent },
  //RTR DATA
    { path: 'crew-generation', component: CrewGenerationComponent },
    { path: 'rtr-processing', component: RtrProcessingComponent },
    { path: 'photo-evidence', component: PhotoEvidenceComponent }
];

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    DashboardComponent,
    PhotoEvidenceComponent
  ]
})
export class DashboardModule { }
