import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface FilterOption {
  name: string;
  options: string[];
}

export interface FilterState {
  [filterName: string]: string[];
}

export interface DateRangeFilter {
  label: string;
  days: number;
}

@Injectable({
  providedIn: 'root'
})
export class FilterService {
  private filterStateSubject = new BehaviorSubject<FilterState>({});
  private filterOptionsSubject = new BehaviorSubject<FilterOption[]>([]);
  private textSearchSubject = new BehaviorSubject<string>('');
  private dateRangeSubject = new BehaviorSubject<string>('');

  // Observable for filter state changes
  public filterState$ = this.filterStateSubject.asObservable();
  public filterOptions$ = this.filterOptionsSubject.asObservable();
  public textSearch$ = this.textSearchSubject.asObservable();
  public dateRange$ = this.dateRangeSubject.asObservable();

  // Get current filter state
  get currentFilters(): FilterState {
    return this.filterStateSubject.value;
  }

  // Get current filter options
  get currentFilterOptions(): FilterOption[] {
    return this.filterOptionsSubject.value;
  }

  // Get current text search
  get currentTextSearch(): string {
    return this.textSearchSubject.value;
  }

  // Get current date range
  get currentDateRange(): string {
    return this.dateRangeSubject.value;
  }

  // Update filter options
  updateFilterOptions(options: FilterOption[]) {
    this.filterOptionsSubject.next(options);
  }

  // Add or update a filter
  setFilter(filterName: string, values: string[]) {
    const currentState = this.filterStateSubject.value;
    const newState = { ...currentState };

    if (values.length === 0) {
      delete newState[filterName];
    } else {
      newState[filterName] = values;
    }

    this.filterStateSubject.next(newState);
  }

  // Toggle a single filter value
  toggleFilter(filterName: string, value: string) {
    const currentState = this.filterStateSubject.value;
    const currentValues = currentState[filterName] || [];

    const index = currentValues.indexOf(value);
    if (index > -1) {
      currentValues.splice(index, 1);
    } else {
      currentValues.push(value);
    }

    this.setFilter(filterName, currentValues);
  }

  // Set text search
  setTextSearch(searchText: string) {
    this.textSearchSubject.next(searchText);
  }

  // Set date range filter
  setDateRange(dateRange: string) {
    this.dateRangeSubject.next(dateRange);
  }

  // Clear all filters
  clearAllFilters() {
    this.filterStateSubject.next({});
    this.textSearchSubject.next('');
    this.dateRangeSubject.next('');
  }

  // Clear specific filter
  clearFilter(filterName: string) {
    this.setFilter(filterName, []);
  }

  // Check if any filters are active
  hasActiveFilters(): boolean {
    const hasStateFilters = Object.keys(this.filterStateSubject.value).length > 0;
    const hasTextSearch = this.textSearchSubject.value.trim().length > 0;
    const hasDateRange = this.dateRangeSubject.value.length > 0;

    return hasStateFilters || hasTextSearch || hasDateRange;
  }

  // Get active filter count
  getActiveFilterCount(): number {
    const stateFilterCount = Object.values(this.filterStateSubject.value)
      .reduce((total, values) => total + values.length, 0);
    const textSearchCount = this.textSearchSubject.value.trim().length > 0 ? 1 : 0;
    const dateRangeCount = this.dateRangeSubject.value.length > 0 ? 1 : 0;

    return stateFilterCount + textSearchCount + dateRangeCount;
  }

  // Get date range options
  getDateRangeOptions(): DateRangeFilter[] {
    return [
      { label: 'Last Week', days: 7 },
      { label: 'Last Month', days: 30 },
      { label: 'Last 6 Months', days: 180 }
    ];
  }

  // Calculate date from range
  getDateFromRange(rangeLabel: string): Date | null {
    const options = this.getDateRangeOptions();
    const option = options.find(opt => opt.label === rangeLabel);

    if (option) {
      const date = new Date();
      date.setDate(date.getDate() - option.days);
      return date;
    }

    return null;
  }
}
