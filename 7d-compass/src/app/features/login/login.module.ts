import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './log-in/login.component';
import { LogOutComponent } from './log-out/log-out.component';
import { ForgotPasswordComponent } from './forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './reset-password/reset-password.component';
import { ConfirmEmailComponent } from './confirm-email/confirm-email.component';

const routes: Routes = [
  { path: '', component: LoginComponent },
  { path: 'logout', component: LogOutComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  { path: 'confirm-email', component: ConfirmEmailComponent },
];

@NgModule({
  imports: [
    RouterModule.forChild(routes),
    LoginComponent,
    LogOutComponent,
    ForgotPasswordComponent,
    ResetPasswordComponent,
    ConfirmEmailComponent
  ]
})
export class LoginModule { }
