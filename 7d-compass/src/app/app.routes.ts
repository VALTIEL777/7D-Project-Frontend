import { Routes } from '@angular/router';
import { LoginComponent } from './features/login/log-in/login.component';
import { LogOutComponent } from './features/login/log-out/log-out.component';
import { ForgotPasswordComponent } from './features/login/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './features/login/reset-password/reset-password.component';
import { ConfirmEmailComponent } from './features/login/confirm-email/confirm-email.component';

export const routes: Routes = [
    { path: '', component: LoginComponent },
    { path: 'logout', component: LogOutComponent },
    { path: 'forgot-password', component: ForgotPasswordComponent },
    { path: 'reset-password', component: ResetPasswordComponent },
    { path: 'confirm-email', component: ConfirmEmailComponent },

];
