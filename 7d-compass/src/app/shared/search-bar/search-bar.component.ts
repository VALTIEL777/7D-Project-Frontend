import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatOptionModule } from '@angular/material/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { debounceTime, map, startWith } from 'rxjs/operators';
import { SearchDialogComponent } from '../search-dialog/search-dialog.component';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatOptionModule,
    MatDialogModule,
    MatIcon
  ],
  templateUrl: './search-bar.component.html',
  styleUrls: ['./search-bar.component.scss']
})
export class SearchBarComponent {
  private dialog = inject(MatDialog);

  searchControl = new FormControl('');
  filteredOptions: any[] = [];

records = [
  { type: 'user', name: 'Alice Johnson', role: 'Admin', city: 'New York', createdAt: new Date('2024-04-01') },
  { type: 'invoice', id: 1023, customer: 'Bob Smith', total: 250.75, createdAt: new Date('2024-05-15') },
  { type: 'route', id: 'R23', origin: 'Chicago', destination: 'Houston', createdAt: new Date('2024-02-20') },
  { type: 'user', name: 'Charlie Lee', role: 'User', city: 'Boston', createdAt: new Date('2024-06-10') },
  { type: 'invoice', id: 2021, customer: 'Diana Prince', total: 980.5, createdAt: new Date('2024-01-05') }
];

  constructor() {
    this.searchControl.valueChanges
      .pipe(
        startWith(''),
        debounceTime(200),
        map(value => typeof value === 'string' ? value : this.openDialog(value)),
        map(query => this._filter(query || ''))
      )
      .subscribe(results => this.filteredOptions = results);
  }

displayFn(item: any): string {
  if (!item) return '';

  const formattedDate = item.createdAt
    ? new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(item.createdAt)
    : '';

  let baseText = item.type === 'user'
    ? item.name
    : item.type === 'invoice'
    ? `Invoice #${item.id}`
    : item.type === 'route'
    ? `Route ${item.id}`
    : 'Unknown';

  return `${baseText} — ${formattedDate}`;
}

  private _filter(query: string): any[] {
    const q = query.toLowerCase();
    return this.records.filter(obj =>
      Object.values(obj).some(value =>
        String(value).toLowerCase().includes(q)
      )
    );
  }

  openDialog(selected: any): void {
    if (!selected || !selected.type) return;
    this.dialog.open(SearchDialogComponent, {
      width: '400px',
      data: selected
    });
  }
}
