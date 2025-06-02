import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MATERIAL_MODULES } from '../../../material';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirm-email',
  standalone: true,
  imports: [CommonModule, MATERIAL_MODULES, ],
  templateUrl: './confirm-email.component.html',
  styleUrl: './confirm-email.component.scss'
})
export class ConfirmEmailComponent implements OnInit {
  email = 'elianmedina@gmail.com';

  constructor( private router: Router){}

  ngOnInit(): void {
    this.email = localStorage.getItem('resetEmail') || this.email;
  }

  goBack():void {
    this.router.navigate(['/reset-password'])
  }
}
