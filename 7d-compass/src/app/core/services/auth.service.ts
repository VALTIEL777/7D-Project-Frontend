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
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.setItem('token', response.token);

    if (response.user?.userid) {
      localStorage.setItem('userId', response.user.userid.toString());
      console.log('🧑‍💻 userId guardado:', response.user.userid);
    } else {
      console.warn('⚠️ userId no presente en la respuesta de login.');
    }

    console.log('📦 Verificación localStorage userId:', localStorage.getItem('userId'));
  }
}



  isLoggedIn(): boolean {
    if (typeof window !== 'undefined' && window.localStorage) {
      return !!localStorage.getItem('token');
    }
    return false;
  }

  getToken(): string | null {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem('token');
    }
    return null;
  }

  logout(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('token');
    }
    // Puedes redirigir o limpiar más cosas si necesitas
  }

  getUserRole(): string {
    // Esto depende de tu backend; si envías el rol en el payload, puedes guardarlo también
    return 'admin'; // ejemplo estático, ajusta si guardas datos reales
  }
}
