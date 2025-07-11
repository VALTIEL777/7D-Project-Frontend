import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { MATERIAL_MODULES } from '../../../material';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [MATERIAL_MODULES, ReactiveFormsModule, CommonModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'] // corregido de styleUrl a styleUrls
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  errorMessage = '';
  isLoading = false;

  constructor(
    private formB: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loginForm = this.formB.group({
      identifier: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(3)]],
    });
  }

login(): void {
  if (this.loginForm.invalid) {
    this.errorMessage = 'Todos los campos son requeridos';
    return;
  }

  this.isLoading = true;
  this.errorMessage = '';

  const { identifier, password } = this.loginForm.value;

  const credentials = identifier.includes('@')
    ? { email: identifier, password }
    : { username: identifier, password };

  this.authService.login(credentials).subscribe({
    next: (response) => {
      this.authService.handleLoginResponse(response);

      const role = response.user?.role?.toLowerCase();

      if (role === 'operator') {
        this.router.navigate(['/upcoming']);
      } else {
        this.router.navigate(['/overview']);
      }
    },
    error: (error) => {
      this.errorMessage = error.error?.message || 'Credenciales inválidas';
      this.isLoading = false; // ✅ Detener el spinner al fallar
    },
    complete: () => {
      // No pongas isLoading = false aquí, ya que solo se ejecuta si no hubo error
    }
  });
}


  redirectToForgotPassword(): void {
    this.router.navigate(['/forgot-password']);
  }
}
