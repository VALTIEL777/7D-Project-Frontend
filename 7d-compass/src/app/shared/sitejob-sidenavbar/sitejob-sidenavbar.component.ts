import { Component, Input } from '@angular/core';
import { MATERIAL_MODULES } from '../../material';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-sitejob-sidenavbar',
  imports: [MATERIAL_MODULES, RouterModule, CommonModule],
  templateUrl: './sitejob-sidenavbar.component.html',
  styleUrl: './sitejob-sidenavbar.component.scss'
})
export class SitejobSidenavbarComponent {
  @Input() teamLeader: string = '';
  @Input() teamMembers: string[] = [];

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
    }
  }

  onLogout(): void {
    console.log('🚪 Logging out...');
    
    // ✅ Llamar al método logout del AuthService
    this.authService.logout();
    
    // ✅ Redirigir al login
    this.router.navigate(['/login']);
    
    console.log('✅ Logout completed, redirected to login');
  }
}
