import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { FilterService, FilterOption, FilterState } from '../core/services/filter.service';

@Component({
  template: ''
})
export abstract class BaseDashboardComponent implements OnInit, OnDestroy {
  protected destroy$ = new Subject<void>();

  // Data arrays that will be filtered
  protected allData: any[] = [];
  protected filteredData: any[] = [];

  // Filter state
  protected currentFilters: FilterState = {};
  protected currentTextSearch: string = '';
  protected currentDateRange: string = '';

  constructor(protected filterService: FilterService) {}

  ngOnInit() {
    this.setupFilterSubscriptions();
    this.loadData();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected setupFilterSubscriptions() {
    // Subscribe to filter state changes
    this.filterService.filterState$
      .pipe(takeUntil(this.destroy$))
      .subscribe(filters => {
        this.currentFilters = filters;
        this.applyFilters();
      });

    // Subscribe to text search changes
    this.filterService.textSearch$
      .pipe(takeUntil(this.destroy$))
      .subscribe(search => {
        this.currentTextSearch = search;
        this.applyFilters();
      });

    // Subscribe to date range changes
    this.filterService.dateRange$
      .pipe(takeUntil(this.destroy$))
      .subscribe(range => {
        this.currentDateRange = range;
        this.applyFilters();
      });
  }

  // Abstract method that child components must implement
  protected abstract loadData(): void;

  // Apply filters to data
  protected applyFilters() {
    let filtered = [...this.allData];

    // Apply text search filter
    if (this.currentTextSearch.trim()) {
      const searchTerm = this.currentTextSearch.toLowerCase().trim();
      filtered = filtered.filter(item => {
        return this.matchesTextSearch(item, searchTerm);
      });
    }

    // Apply date range filter
    if (this.currentDateRange) {
      const cutoffDate = this.filterService.getDateFromRange(this.currentDateRange);
      if (cutoffDate) {
        filtered = filtered.filter(item => {
          return this.matchesDateRange(item, cutoffDate);
        });
      }
    }

    // Apply other filters (if any)
    if (Object.keys(this.currentFilters).length > 0) {
      filtered = filtered.filter(item => {
        return Object.entries(this.currentFilters).every(([filterName, filterValues]) => {
          if (filterValues.length === 0) return true;

          const itemValue = this.getNestedValue(item, filterName);
          return filterValues.some(value =>
            this.matchesFilter(itemValue, value)
          );
        });
      });
    }

    this.filteredData = filtered;
  }

  // Text search matching
  protected matchesTextSearch(item: any, searchTerm: string): boolean {
    // Search in common fields like name, title, description, etc.
    const searchableFields = ['name', 'title', 'description', 'content', 'filename'];

    return searchableFields.some(field => {
      const value = this.getNestedValue(item, field);
      if (value) {
        return String(value).toLowerCase().includes(searchTerm);
      }
      return false;
    });
  }

  // Date range matching
  protected matchesDateRange(item: any, cutoffDate: Date): boolean {
    // Look for common date fields
    const dateFields = ['createdat', 'created_at', 'createdDate', 'date', 'timestamp'];

    for (const field of dateFields) {
      const dateValue = this.getNestedValue(item, field);
      if (dateValue) {
        const itemDate = new Date(dateValue);
        if (!isNaN(itemDate.getTime()) && itemDate >= cutoffDate) {
          return true;
        }
      }
    }

    return false;
  }

  protected getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : null;
    }, obj);
  }

  private matchesFilter(itemValue: any, filterValue: string): boolean {
    if (itemValue === null || itemValue === undefined) {
      return false;
    }

    const itemStr = String(itemValue).toLowerCase();
    const filterStr = String(filterValue).toLowerCase();

    return itemStr === filterStr || itemStr.includes(filterStr);
  }

  // Method to manually set filter options (for custom filtering)
  protected setCustomFilterOptions(options: FilterOption[]) {
    this.filterService.updateFilterOptions(options);
  }

  // Method to clear all filters
  protected clearFilters() {
    this.filterService.clearAllFilters();
  }

  // Get active filter count
  protected getActiveFilterCount(): number {
    return this.filterService.getActiveFilterCount();
  }

  // Check if any filters are active
  protected hasActiveFilters(): boolean {
    return this.filterService.hasActiveFilters();
  }
}
