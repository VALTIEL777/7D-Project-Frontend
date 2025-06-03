import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';
import { CommonModule } from '@angular/common'; 
import { MiscGenerationComponent } from './rtr-data/misc-generation/misc-generation.component';
import { RtrProcessingComponent } from './rtr-data/rtr-processing/rtr-processing.component';

const routes: Routes = [
  { path: '', component: DashboardComponent },
  //RTR DATA
    { path: 'misc', component: MiscGenerationComponent },
    { path: 'rtr.processiong', component: RtrProcessingComponent }


];

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    DashboardComponent
  ]
})
export class DashboardModule { }
