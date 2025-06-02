import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLinkActive, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { MATERIAL_MODULES } from '../../../material';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [MATERIAL_MODULES, ReactiveFormsModule, CommonModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  errorMessage = '';

  constructor(
    private formB: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loginForm = this.formB.group({
      identifier: ['', [Validators.required, Validators.minLength(4)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  login(): void {
    if (this.loginForm.invalid) {
      this.errorMessage = 'Todos los campos son requeridos';
      return;
    }

    const { identifier, password } = this.loginForm.value;

    const credentials = identifier.includes('@')
      ? { email: identifier, password }
      : { username: identifier, password };

    this.authService.login(credentials).subscribe({
      next: (response) => {
        this.authService.handleLoginResponse(response);
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Credenciales inválidas';
      },
    });
  }

  redirectToForgotPassword(): void {
    this.router.navigate(['/forgot-password']);
  }
}
