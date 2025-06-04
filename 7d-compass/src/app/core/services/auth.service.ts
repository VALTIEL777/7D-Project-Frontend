// core/services/auth.service.ts
import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  // Datos dummy
  private dummyUser = {
    username: 'admin',
    email: 'elianmedina@gmail.com',
    password: '123456',
    token: 'dummy-token-abc123'
  };

  login(credentials: { email?: string; username?: string; password: string }): Observable<any> {
    const { email, username, password } = credentials;

    const valid =
      (email === this.dummyUser.email || username === this.dummyUser.username) &&
      password === this.dummyUser.password;

    if (valid) {
      return of({ token: this.dummyUser.token, user: this.dummyUser }).pipe(delay(1000));
    } else {
      return throwError(() => ({ error: { message: 'Credenciales incorrectas' } }));
    }
  }

  handleLoginResponse(response: any): void {
    localStorage.setItem('token', response.token);
    console.log('Token guardado:', response.token);
  }

  isLoggedIn(): boolean {
  return !!localStorage.getItem('token');
}

getUserRole(): string {
  // Devuelve un rol dummy por ahora
  return 'admin'; // o 'user', dependiendo de tu lógica
}


}
