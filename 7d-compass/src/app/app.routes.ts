import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';


export const routes: Routes = [
  {
    path: '',
    loadChildren: () =>
      import('./features/login/login.module').then((m) => m.LoginModule),
  },
  {
    path: 'dashboard',
    loadChildren: () =>
      import('./features/dashboard/dashboard.module').then(
        (m) => m.DashboardModule
      ),
    canActivate: [AuthGuard],
     data: { role: 'admin' }
  },
  {
    path: 'overview',
    loadComponent: () =>
      import('./features/dashboard/general/overview/overview.component').then(
        (m) => m.OverviewComponent
      ),
  },
  {
    path: 'rtr-processing',
    loadComponent: () =>
      import(
        './features/dashboard/rtr-data/rtr-processing/rtr-processing.component'
      ).then((m) => m.RtrProcessingComponent),
  },
  {
    path: 'misc-generation',
    loadComponent: () =>
      import(
        './features/dashboard/rtr-data/misc-generation/misc-generation.component'
      ).then((m) => m.MiscGenerationComponent),
  },
  {
    path: 'report-center',
    loadComponent: () =>
      import(
        './features/dashboard/files-reports/report-center/report-center.component'
      ).then((m) => m.ReportCenterComponent),
  },
  {
    path: 'files-permits',
    loadComponent: () =>
      import(
        './features/dashboard/files-reports/files-permits/files-permits.component'
      ).then((m) => m.FilesPermitsComponent),
  },
  {
    path: 'route-generator',
    loadComponent: () =>
      import(
        './features/dashboard/routes/route-generator/route-generator.component'
      ).then((m) => m.RouteGeneratorComponent),
  },
  {
    path: 'route-history',
    loadComponent: () =>
      import(
        './features/dashboard/routes/route-history/route-history.component'
      ).then((m) => m.RouteHistoryComponent),
  },
  {
    path: 'route-tracker',
    loadComponent: () =>
      import(
        './features/dashboard/routes/route-tracker/route-tracker.component'
      ).then((m) => m.RouteTrackerComponent),
  },
  {
    path: 'income',
    loadComponent: () =>
      import('./features/dashboard/revenue/income/income.component').then(
        (m) => m.IncomeComponent
      ),
  },
  {
    path: 'fines-penalties',
    loadComponent: () =>
      import(
        './features/dashboard/revenue/fines-penalties/fines-penalties.component'
      ).then((m) => m.FinesPenaltiesComponent),
  },
  {
    path: 'users',
    loadComponent: () =>
      import('./features/dashboard/manage/users/users.component').then(
        (m) => m.UsersComponent
      ),
  },
  {
    path: 'contract-units',
    loadComponent: () =>
      import(
        './features/dashboard/manage/contract-units/contract-units.component'
      ).then((m) => m.ContractUnitsComponent),
  },
  {
    path: 'payments',
    loadComponent: () =>
      import('./features/dashboard/manage/payments/payments.component').then(
        (m) => m.PaymentsComponent
      ),
  },
  {
    path: 'invoices',
    loadComponent: () =>
      import('./features/dashboard/manage/invoices/invoices.component').then(
        (m) => m.InvoicesComponent
      ),
  },
  {
    path: 'fines',
    loadComponent: () =>
      import('./features/dashboard/manage/fines/fines.component').then(
        (m) => m.FinesComponent
      ),
  },
  {
    path: 'supervisors',
    loadComponent: () =>
      import(
        './features/dashboard/manage/supervisors/supervisors.component'
      ).then((m) => m.SupervisorsComponent),
  },
  {
    path: 'inventory',
    loadComponent: () =>
      import('./features/dashboard/manage/inventory/inventory.component').then(
        (m) => m.InventoryComponent
      ),
  },
  {
    path: 'suppliers',
    loadComponent: () =>
      import('./features/dashboard/manage/suppliers/suppliers.component').then(
        (m) => m.SuppliersComponent
      ),
  },
  {
    path: 'equipment',
    loadComponent: () =>
      import('./features/dashboard/manage/equipment/equipment.component').then(
        (m) => m.EquipmentComponent
      ),
  },
  {
    path: 'crews',
    loadComponent: () =>
      import('./features/dashboard/manage/crews/crews.component').then(
        (m) => m.CrewsComponent
      ),
  },
  {
    path: 'ticket',
    loadComponent: () =>
      import('./features/dashboard/manage/ticket/ticket.component').then(
        (m) => m.TicketComponent
      ),
  },
];
