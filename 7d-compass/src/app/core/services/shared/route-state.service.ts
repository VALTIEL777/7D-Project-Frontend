import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class RouteStateService {
  private _routeCode: string = '';

  setRouteCode(code: string): void {
    this._routeCode = code;
  }

  getRouteCode(): string {
    return this._routeCode;
  }
}
