import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ToastrService } from 'ngx-toastr';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastr: ToastrService
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    const isLoggedIn = this.authService.isLoggedIn();
    const userRole = this.authService.getUserRole();
    const requiredRole = route.data?.['role'];

    if (!isLoggedIn) {
      this.toastr.error('Acceso denegado: usuario no autenticado', 'Error');
      this.router.navigate(['/']);
      return false;
    }

    if (!requiredRole || userRole === 'admin' || userRole === requiredRole) {
      return true;
    }

    this.toastr.warning('Acceso denegado: rol insuficiente', 'Aviso');
    this.router.navigate(['/']);
    return false;
  }
}
