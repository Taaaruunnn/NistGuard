import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

/** Blocks the app shell until a stored token has been validated once. */
export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.ready()) await auth.restore();

  if (auth.isAuthenticated()) return true;

  return router.createUrlTree(['/login'], { queryParams: { next: state.url } });
};

/** Keeps a signed-in user off the login/register pages. */
export const guestGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.ready()) await auth.restore();

  return auth.isAuthenticated() ? router.createUrlTree(['/dashboard']) : true;
};
