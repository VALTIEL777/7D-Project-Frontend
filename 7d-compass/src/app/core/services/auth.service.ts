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
  } else {
    console.warn('⚠️ userId no presente en la respuesta de login.');
  }

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

  getUserRole(): string {
    // Esto depende de tu backend; si envías el rol en el payload, puedes guardarlo también
    return 'admin'; // ejemplo estático, ajusta si guardas datos reales
  }

  // ✅ Verificar si Remember me está activado
  isRememberMeActive(): boolean {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem('rememberMe') === 'true';
    }
    return false;
  }

  // ✅ Limpiar Remember me al hacer logout
  logout(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      localStorage.removeItem('rememberMe'); // ✅ Limpiar Remember me también
    }
    // Puedes redirigir o limpiar más cosas si necesitas
  }
}

