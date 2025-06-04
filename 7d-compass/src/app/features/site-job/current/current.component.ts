import { Component } from '@angular/core';
import { SitejobLayoutComponent } from '../../../shared/sitejob-layout/sitejob-layout.component';
import { CardWithButtonComponent } from '../../../shared/card-with-button/card-with-button.component';
import { MatTableModule } from '@angular/material/table';
import { MatDividerModule } from '@angular/material/divider';
import { CommonModule } from '@angular/common';
import { MATERIAL_MODULES } from '../../../material';

@Component({
  selector: 'app-current',
  imports: [SitejobLayoutComponent,MatTableModule, MatDividerModule,CommonModule,MATERIAL_MODULES],
  templateUrl: './current.component.html',
  styleUrl: './current.component.scss'
})
export class CurrentComponent {
  location = {
    address: '1327 W Addison',
    job: 'Corner Ramp',
    size: '12 x 13 Ft',
    material: '1 ton',
    activities: ['retrieved equipment', 'checked equipment'],
    issues: ['Missing no parking sign'],
    permits: ['Digger Permit', 'Construction Permit'],
    supervisor: {
      name: 'Renee Gonzalez',
      phone: '234–534–2394'
    }
  };

onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
    const file = input.files[0];
    const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    if (validImageTypes.includes(file.type)) {
      console.log('Archivo de imagen seleccionado:', file);
    } else {
      console.error('El archivo seleccionado no es una imagen');
      input.value = ''; // Limpia el campo de entrada
    }
  }
}
}
