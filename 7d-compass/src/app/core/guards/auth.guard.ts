import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    const isLoggedIn = this.authService.isLoggedIn();
    const userRole = this.authService.getUserRole();
    const requiredRole = route.data?.['role'];

    if (!isLoggedIn) {
      this.router.navigate(['/']);
      return false;
    }

    if (!requiredRole || userRole === 'admin' || userRole === requiredRole) {
      return true;
    }

    this.router.navigate(['/']);
    return false;
  }
}
