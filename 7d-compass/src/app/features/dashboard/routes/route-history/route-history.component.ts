import { Component } from '@angular/core';
import { DashboardLayoutComponent } from "../../../../shared/dashboard-layout/dashboard-layout.component";
import { CardWithButtonComponent } from '../../../../shared/card-with-button/card-with-button.component';
import { DataTableComponent } from '../../../../shared/data-table/data-table.component';
import { ConfirmationDialogComponent } from '../../../../shared/confirmation-dialog/confirmation-dialog.component';
import { SearchDialogComponent } from '../../../../shared/search-dialog/search-dialog.component';
import { MatDialog } from '@angular/material/dialog';

interface ColumnDefinition {
  name: string;
  header: string;
  cell: (element: any) => string;
  isActionColumn?: boolean;
  isHtml?: boolean; 
}

@Component({
  selector: 'app-route-history',
  imports: [DashboardLayoutComponent,
    CardWithButtonComponent,
    DataTableComponent
  ],
  templateUrl: './route-history.component.html',
  styleUrl: './route-history.component.scss'
})
export class RouteHistoryComponent {
    constructor(private dialog: MatDialog) {}
  

   routeColumns: ColumnDefinition[] = [
  {
    name: 'route',
    header: 'Route',
    cell: (route: any) => route.route
  },
   {
    name: 'start',
    header: 'Start Date',
    cell: (route: any) => route.start
  },
   {
    name: 'end',
    header: 'End Date',
    cell: (route: any) => route.end
  },
  {
  name: 'show',
  header: 'Actions',
    cell: () => '',
  isActionColumn: true
}
];

routeData = [
  {
    route: 'Aph-57',
    start: '05/03/2025',
    end:'05/20/2025',
  },
   { route: 'Aph-01', start: '05/03/2025', end: '05/20/2025' },
  { route: 'Cmt-02', start: '06/01/2025', end: '06/15/2025' },
  { route: 'Aph-03', start: '07/10/2025', end: '07/25/2025' },
  { route: 'Cmt-04', start: '08/05/2025', end: '08/22/2025' },
  { route: 'Aph-05', start: '09/01/2025', end: '09/18/2025' },
  { route: 'Cmt-06', start: '10/12/2025', end: '10/30/2025' },
  { route: 'Aph-07', start: '11/03/2025', end: '11/20/2025' },
  { route: 'Cmt-08', start: '12/01/2025', end: '12/17/2025' },
  { route: 'Aph-09', start: '01/05/2026', end: '01/20/2026' },
  { route: 'Cmt-10', start: '02/10/2026', end: '02/28/2026' }
];

onEditRoute(route: any) {
  const dialogRef = this.dialog.open(SearchDialogComponent, {
    width: '500px',
    data: {
      title: `Edit Route: ${route.route}`,
      data: { ...route },
      excludedFields: []  // Puedes excluir campos si hay alguno que no quieras editar
    }
  });

  dialogRef.afterClosed().subscribe(result => {
    if (result) {
      const index = this.routeData.findIndex(r =>
        r.route === route.route &&
        r.start === route.start &&
        r.end === route.end
      );

      if (index !== -1) {
        this.routeData[index] = {
          ...route,
          ...result
        };

        // console.log('Route updated:', this.routeData[index]);
      }
    }
  });
}


onDeleteRoute(route: any) {
  const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
    width: '450px',
    disableClose: true,
    panelClass: 'confirmation-dialog',
    data: {
      title: 'Delete Route',
      message: `You're about to permanently delete route ${route.route} (${route.start} → ${route.end}). This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel'
    }
  });

  dialogRef.afterClosed().subscribe(confirmed => {
    if (confirmed) {
      this.routeData = this.routeData.filter(r =>
        !(r.route === route.route && r.start === route.start && r.end === route.end)
      );

      console.log('Route deleted:', route);
    }
  });
}


//Spotter
spotterColumns: ColumnDefinition[] = [
  {
    name: 'route',
    header: 'Route',
    cell: (spotter: any) => spotter.route
  },
   {
    name: 'start',
    header: 'Start Date',
    cell: (spotter: any) => spotter.start
  },
   {
    name: 'end',
    header: 'End Date',
    cell: (spotter: any) => spotter.end
  },
   {
      name: 'fullName',
      header: 'Spotter',
      cell: (spotter: any) => `${spotter.firstname} ${spotter.lastname}`
    },
  {
  name: 'show',
  header: 'Actions',
    cell: () => '',
  isActionColumn: true
}
];

spotterData = [
  {
    route: 'Aph-57',
    start: '05/03/2025',
    end:'05/20/2025',
    firstname: 'David',
    lastname:'Rueda'
  },
   { route: 'Aph-11', start: '05/03/2025', end: '05/20/2025', firstname: 'David', lastname: 'Rueda' },
  { route: 'Cmt-12', start: '06/01/2025', end: '06/15/2025', firstname: 'Ana', lastname: 'García' },
  { route: 'Aph-13', start: '07/10/2025', end: '07/25/2025', firstname: 'Carlos', lastname: 'Martínez' },
  { route: 'Cmt-14', start: '08/05/2025', end: '08/22/2025', firstname: 'Luisa', lastname: 'Fernández' },
  { route: 'Aph-15', start: '09/01/2025', end: '09/18/2025', firstname: 'Miguel', lastname: 'Hernández' },
  { route: 'Cmt-16', start: '10/12/2025', end: '10/30/2025', firstname: 'Sofía', lastname: 'López' },
  { route: 'Aph-17', start: '11/03/2025', end: '11/20/2025', firstname: 'Jorge', lastname: 'Gómez' },
  { route: 'Cmt-18', start: '12/01/2025', end: '12/17/2025', firstname: 'María', lastname: 'Vargas' },
  { route: 'Aph-19', start: '01/05/2026', end: '01/20/2026', firstname: 'Pedro', lastname: 'Sánchez' },
  { route: 'Cmt-20', start: '02/10/2026', end: '02/28/2026', firstname: 'Elena', lastname: 'Ruiz' }
];

onEditSpotter(spotter: any) {
  const dialogRef = this.dialog.open(SearchDialogComponent, {
    width: '500px',
    data: {
      title: `Spotter: ${spotter.firstname} ${spotter.lastname}`,
      data: {
        ...spotter,
        name: `${spotter.firstname} ${spotter.lastname}`
      },
      excludedFields: ['firstname', 'lastname']
    }
  });

  dialogRef.afterClosed().subscribe(result => {
    if (result) {
      const [firstname, ...lastnameParts] = result.name.split(' ');
      const lastname = lastnameParts.join(' ');

      const index = this.spotterData.findIndex(s => 
        s.route === spotter.route && 
        s.start === spotter.start && 
        s.end === spotter.end
      );

      if (index !== -1) {
        this.spotterData[index] = {
          ...spotter,
          firstname,
          lastname,
          ...result
        };
      }
    }
  });
}

onDeleteSpotter(spotter: any) {
  const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
    width: '450px',
    disableClose: true,
    panelClass: 'confirmation-dialog',
    data: {
      title: 'Delete Spotter',
      message: `You're about to permanently delete spotter ${spotter.firstname} ${spotter.lastname} from route ${spotter.route}. This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel'
    }
  });

  dialogRef.afterClosed().subscribe(confirmed => {
    if (confirmed) {
      this.spotterData = this.spotterData.filter(s =>
        !(s.route === spotter.route && s.start === spotter.start && s.end === spotter.end)
      );

      console.log('Spotter deleted:', spotter);
    }
  });
}

}

  