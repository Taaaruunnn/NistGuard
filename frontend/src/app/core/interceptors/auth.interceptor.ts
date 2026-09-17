import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { AuthService } from '../services/auth.service';
import { API_BASE } from '../api-config';

/**
 * Attaches the bearer token to our own API calls and, on a 401, tears down a
 * session the server no longer recognises.
 *
 * The /auth/me probe is exempt from the teardown because AuthService.restore()
 * already handles that failure itself -- letting the interceptor also fire
 * would redirect during app bootstrap.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.token();
  const isOurApi = req.url.startsWith(API_BASE);

  const request =
    token && isOurApi
      ? req.clone({
          setHeaders: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        })
      : req;

  return next(request).pipe(
    catchError((err: unknown) => {
      const isProbe = req.url.endsWith('/auth/me');
      if (err instanceof HttpErrorResponse && err.status === 401 && isOurApi && !isProbe) {
        auth.handleUnauthorized();
      }
      return throwError(() => err);
    })
  );
};
