import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { apiUrl } from '../api-config';
import { AuthResult, Credentials, Registration, User } from '../models/user.model';

const TOKEN_KEY = 'nistguard.token';
const USER_KEY = 'nistguard.user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  /**
   * The bearer token is the real session carrier. The API also sets an
   * httpOnly cookie, but frontend and backend sit on different Vercel domains
   * where third-party cookies are unreliable, so the token in localStorage is
   * what we depend on.
   */
  private readonly _token = signal<string | null>(this.read(TOKEN_KEY));
  private readonly _user = signal<User | null>(this.readJson<User>(USER_KEY));
  private readonly _ready = signal(false);

  readonly user = this._user.asReadonly();
  readonly token = this._token.asReadonly();
  readonly ready = this._ready.asReadonly();
  readonly isAuthenticated = computed(() => !!this._token() && !!this._user());

  /** First name only, for the greeting in the masthead. */
  readonly firstName = computed(() => (this._user()?.name ?? '').split(' ')[0] || '');

  private read(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private readJson<T>(key: string): T | null {
    const raw = this.read(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  private persist(result: AuthResult): void {
    this._token.set(result.token);
    this._user.set(result.user);
    try {
      localStorage.setItem(TOKEN_KEY, result.token);
      localStorage.setItem(USER_KEY, JSON.stringify(result.user));
    } catch {
      /* private browsing -- the session still works for this tab */
    }
  }

  private clear(): void {
    this._token.set(null);
    this._user.set(null);
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch {
      /* nothing to clear */
    }
  }

  async register(payload: Registration): Promise<void> {
    const result = await firstValueFrom(
      this.http.post<AuthResult>(apiUrl('/auth/register'), payload, { withCredentials: true })
    );
    this.persist(result);
  }

  async login(payload: Credentials): Promise<void> {
    const result = await firstValueFrom(
      this.http.post<AuthResult>(apiUrl('/auth/login'), payload, { withCredentials: true })
    );
    this.persist(result);
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(this.http.post(apiUrl('/auth/logout'), {}, { withCredentials: true }));
    } catch {
      /* the local session is cleared regardless of what the server says */
    }
    this.clear();
    this.router.navigate(['/login']);
  }

  /**
   * Revalidate a stored token against the API once at startup, so a token that
   * expired while the tab was closed does not present a logged-in shell that
   * then 401s on every request.
   */
  async restore(): Promise<void> {
    if (!this._token()) {
      this._ready.set(true);
      return;
    }
    try {
      const res = await firstValueFrom(
        this.http.get<{ user: User }>(apiUrl('/auth/me'), { withCredentials: true })
      );
      this._user.set(res.user);
      try {
        localStorage.setItem(USER_KEY, JSON.stringify(res.user));
      } catch {
        /* ignore */
      }
    } catch {
      this.clear();
    } finally {
      this._ready.set(true);
    }
  }

  /** Session expired mid-flight -- drop it and send the user back to sign in. */
  handleUnauthorized(): void {
    if (!this._token()) return;
    this.clear();
    this.router.navigate(['/login'], { queryParams: { expired: 1 } });
  }
}
