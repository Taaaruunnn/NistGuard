import { Routes } from '@angular/router';

import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },

  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/auth/login').then((m) => m.LoginPage),
    title: 'Sign in - NISTGuard',
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/auth/register').then((m) => m.RegisterPage),
    title: 'Create an account - NISTGuard',
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/dashboard/dashboard').then((m) => m.DashboardPage),
    title: 'Dashboard - NISTGuard',
  },
  {
    path: 'assessments/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/assessment/assessment').then((m) => m.AssessmentPage),
    title: 'Assessment - NISTGuard',
  },
  {
    path: 'assessments/:id/report',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/report/report').then((m) => m.ReportPage),
    title: 'Report - NISTGuard',
  },

  { path: '**', redirectTo: 'dashboard' },
];
