import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '../../core/guards/auth.guard';
import { CurrentComponent } from './current/current.component';
import { UpcomingComponent } from './upcoming/upcoming.component';
import { CompletedComponent } from './completed/completed.component';

const routes: Routes = [
  { path: 'current', component: CurrentComponent },
  { path: 'upcoming', component: UpcomingComponent },
  { path: 'completed', component: CompletedComponent },
];

@NgModule({
  imports: [
    RouterModule.forChild(routes),
    CurrentComponent,
    UpcomingComponent,
    CompletedComponent
  ]
})
export class SiteModule { }
