// core/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private authUrl = `${environment.apiUrl}/auth/login`;

  constructor(private http: HttpClient) {}

  login(credentials: { email?: string; username?: string; password: string }): Observable<any> {
  const usernameOrEmail = credentials.email || credentials.username;

  return this.http.post<any>(this.authUrl, {
    usernameOrEmail,
    password: credentials.password
  }).pipe(
    tap((response) => {
      this.handleLoginResponse(response);
    })
  );
}


  handleLoginResponse(response: any): void {
    localStorage.setItem('token', response.token);
    // Puedes guardar más datos si tu backend los envía (ej. usuario, rol, etc.)
    console.log('Token guardado:', response.token);
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  logout(): void {
    localStorage.removeItem('token');
    // Puedes redirigir o limpiar más cosas si necesitas
  }

  getUserRole(): string {
    // Esto depende de tu backend; si envías el rol en el payload, puedes guardarlo también
    return 'admin'; // ejemplo estático, ajusta si guardas datos reales
  }
}
