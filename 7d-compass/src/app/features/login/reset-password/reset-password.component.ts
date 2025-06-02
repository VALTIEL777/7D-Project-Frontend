import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MATERIAL_MODULES } from '../../../material';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, MATERIAL_MODULES, CommonModule],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss'
})
export class ResetPasswordComponent implements OnInit {
  resetForm!: FormGroup;
  error = '';

  constructor(private fb: FormBuilder, private router: Router) {}

  ngOnInit(): void {
    this.resetForm = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    });
  }

  onSubmit(): void {
    const { newPassword, confirmPassword } = this.resetForm.value;

    if (this.resetForm.invalid) return;

    if (newPassword !== confirmPassword) {
      this.error = 'Las contraseñas no coinciden';
      return;
    }

    alert('Contraseña cambiada exitosamente');
    this.router.navigate(['/login']);
  }
}
