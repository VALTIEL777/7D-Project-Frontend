import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadChildren: () =>
      import('./features/login/login.module').then((m) => m.LoginModule),
  },
  // Dashboard pages (all require authentication)
  {
    path: 'dashboard',
    loadChildren: () =>
      import('./features/dashboard/dashboard.module').then(
        (m) => m.DashboardModule
      ),
    // No canActivate/data here; children are guarded individually
  },
  {
    path: 'overview',
    loadComponent: () =>
      import('./features/dashboard/general/overview/overview.component').then(
        (m) => m.OverviewComponent
      ),
    canActivate: [AuthGuard],
  },
  {
    path: 'rtr-processing',
    loadComponent: () =>
      import(
        './features/dashboard/rtr-data/rtr-processing/rtr-processing.component'
      ).then((m) => m.RtrProcessingComponent),
    canActivate: [AuthGuard],
  },
  {
    path: 'crew-generation',
    loadComponent: () =>
      import(
        './features/dashboard/rtr-data/crew-generation/crew-generation.component'
      ).then((m) => m.CrewGenerationComponent),
    canActivate: [AuthGuard],
  },
  {
    path: 'report-center',
    loadComponent: () =>
      import(
        './features/dashboard/files-reports/report-center/report-center.component'
      ).then((m) => m.ReportCenterComponent),
    canActivate: [AuthGuard],
  },
  {
    path: 'files-permits',
    loadComponent: () =>
      import(
        './features/dashboard/files-reports/files-permits/files-permits.component'
      ).then((m) => m.FilesPermitsComponent),
    canActivate: [AuthGuard],
  },
  {
    path: 'photo-evidence',
    loadComponent: () =>
      import(
        './features/dashboard/photo-evidence/photo-evidence.component'
      ).then((m) => m.PhotoEvidenceComponent),
    canActivate: [AuthGuard],
  },
  {
    path: 'route-generator',
    loadComponent: () =>
      import(
        './features/dashboard/routes/route-generator/route-generator.component'
      ).then((m) => m.RouteGeneratorComponent),
    canActivate: [AuthGuard],
  },
  {
    path: 'route-history',
    loadComponent: () =>
      import(
        './features/dashboard/routes/route-history/route-history.component'
      ).then((m) => m.RouteHistoryComponent),
    canActivate: [AuthGuard],
  },
  {
    path: 'route-tracker',
    loadComponent: () =>
      import(
        './features/dashboard/routes/route-tracker/route-tracker.component'
      ).then((m) => m.RouteTrackerComponent),
    canActivate: [AuthGuard],
  },
  {
    path: 'income',
    loadComponent: () =>
      import('./features/dashboard/revenue/income/income.component').then(
        (m) => m.IncomeComponent
      ),
    canActivate: [AuthGuard],
  },
  {
    path: 'fines-penalties',
    loadComponent: () =>
      import(
        './features/dashboard/revenue/fines-penalties/fines-penalties.component'
      ).then((m) => m.FinesPenaltiesComponent),
    canActivate: [AuthGuard],
  },
  // Admin-only dashboard pages
  {
    path: 'users',
    loadComponent: () =>
      import('./features/dashboard/manage/users/users.component').then(
        (m) => m.UsersComponent
      ),
    canActivate: [AuthGuard],
    data: { role: 'admin' },
  },
  {
    path: 'contract-units',
    loadComponent: () =>
      import(
        './features/dashboard/manage/contract-units/contract-units.component'
      ).then((m) => m.ContractUnitsComponent),
    canActivate: [AuthGuard],
    data: { role: 'admin' },
  },
  {
    path: 'payments',
    loadComponent: () =>
      import('./features/dashboard/manage/payments/payments.component').then(
        (m) => m.PaymentsComponent
      ),
    canActivate: [AuthGuard],
    data: { role: 'admin' },
  },
  {
    path: 'invoices',
    loadComponent: () =>
      import('./features/dashboard/manage/invoices/invoices.component').then(
        (m) => m.InvoicesComponent
      ),
    canActivate: [AuthGuard],
    data: { role: 'admin' },
  },
  {
    path: 'fines',
    loadComponent: () =>
      import('./features/dashboard/manage/fines/fines.component').then(
        (m) => m.FinesComponent
      ),
    canActivate: [AuthGuard],
    data: { role: 'admin' },
  },
  {
    path: 'supervisors',
    loadComponent: () =>
      import(
        './features/dashboard/manage/supervisors/supervisors.component'
      ).then((m) => m.SupervisorsComponent),
    canActivate: [AuthGuard],
    data: { role: 'admin' },
  },
  {
    path: 'suppliers',
    loadComponent: () =>
      import('./features/dashboard/manage/suppliers/suppliers.component').then(
        (m) => m.SuppliersComponent
      ),
    canActivate: [AuthGuard],
    data: { role: 'admin' },
  },
  {
    path: 'equipment',
    loadComponent: () =>
      import('./features/dashboard/manage/equipment/equipment.component').then(
        (m) => m.EquipmentComponent
      ),
    canActivate: [AuthGuard],
    data: { role: 'admin' },
  },
  {
    path: 'crews',
    loadComponent: () =>
      import('./features/dashboard/manage/crews/crews.component').then(
        (m) => m.CrewsComponent
      ),
    canActivate: [AuthGuard],
    data: { role: 'admin' },
  },
  {
    path: 'ticket',
    loadComponent: () =>
      import('./features/dashboard/manage/ticket/ticket.component').then(
        (m) => m.TicketComponent
      ),
    canActivate: [AuthGuard],
    data: { role: 'admin' },
  },
  {
    path: 'permits',
    loadComponent: () =>
      import('./features/dashboard/manage/permits/permits/permits.component').then(
        (m) => m.PermitsComponent
      ),
    canActivate: [AuthGuard],
    data: { role: 'admin' },
  },
  // Site-job and other routes (leave as is)
  {
    path: 'current',
    loadComponent: () =>
      import('./features/site-job/current/current.component').then(
        (m) => m.CurrentComponent
      ),
  },
  {
    path: 'upcoming',
    loadComponent: () =>
      import('./features/site-job/upcoming/upcoming.component').then(
        (m) => m.UpcomingComponent
      ),
  },
  {
    path: 'completed',
    loadComponent: () =>
      import('./features/site-job/completed/completed.component').then(
        (m) => m.CompletedComponent
      ),
  },
];
