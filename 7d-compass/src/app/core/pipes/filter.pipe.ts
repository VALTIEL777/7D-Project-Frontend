import { Pipe, PipeTransform } from '@angular/core';
import { FilterState } from '../services/filter.service';

@Pipe({
  name: 'filterData',
  standalone: true
})
export class FilterPipe implements PipeTransform {
  transform(items: any[], filters: FilterState): any[] {
    if (!items || !filters || Object.keys(filters).length === 0) {
      return items;
    }

    return items.filter(item => {
      return Object.entries(filters).every(([filterName, filterValues]) => {
        if (filterValues.length === 0) return true;

        const itemValue = this.getNestedValue(item, filterName);
        return filterValues.some(value =>
          this.matchesFilter(itemValue, value)
        );
      });
    });
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : null;
    }, obj);
  }

  private matchesFilter(itemValue: any, filterValue: string): boolean {
    if (itemValue === null || itemValue === undefined) {
      return false;
    }

    // Convert both values to strings for comparison
    const itemStr = String(itemValue).toLowerCase();
    const filterStr = String(filterValue).toLowerCase();

    // Check for exact match or contains
    return itemStr === filterStr || itemStr.includes(filterStr);
  }
}
