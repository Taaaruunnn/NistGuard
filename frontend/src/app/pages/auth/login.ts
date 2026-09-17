import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { AuthService } from '../../core/services/auth.service';
import { AuthLayoutComponent } from './auth-layout';
import { IconComponent } from '../../shared/icon';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink, AuthLayoutComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-auth-layout
      eyebrow="Sign in"
      heading="Pick up where you left off"
      blurb="Your assessments, scores and findings are waiting exactly as you left them."
    >
      @if (expired()) {
        <p class="mb-6 border-l-2 border-[var(--color-sev-medium)] bg-[var(--color-paper-2)] px-4 py-3 text-[12px] leading-relaxed text-[var(--color-ink-2)]">
          That session had been open a while, so we signed you out. Nothing was lost.
        </p>
      }

      <form (ngSubmit)="submit()" class="auth-form">
        <div>
          <label for="email" class="section-mark mb-2 block">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autocomplete="email"
            required
            class="field"
            placeholder="you@organisation.com"
            [(ngModel)]="email"
          />
        </div>

        <div>
          <label for="password" class="section-mark mb-2 block">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autocomplete="current-password"
            required
            class="field"
            placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
            [(ngModel)]="password"
          />
        </div>

        @if (error()) {
          <p class="auth-form-wide border-l-2 border-[var(--color-accent)] py-1 pl-3 text-[12px] text-[var(--color-accent)]">
            {{ error() }}
          </p>
        }

        <div class="auth-form-wide flex items-center gap-5 pt-1">
          <button type="submit" class="btn btn-primary" [disabled]="busy()">
            {{ busy() ? 'Signing in...' : 'Sign in' }}
            @if (!busy()) {
              <app-icon name="arrow-right" [size]="15" />
            }
          </button>
          <a routerLink="/register" class="text-[12px] text-[var(--color-ink-2)] underline decoration-[var(--color-rule-strong)] underline-offset-4 hover:text-[var(--color-accent)]">
            Create an account
          </a>
        </div>
      </form>
    </app-auth-layout>
  `,
})
export class LoginPage {
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  protected email = '';
  protected password = '';
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly expired = signal(this.route.snapshot.queryParamMap.has('expired'));

  protected async submit(): Promise<void> {
    if (this.busy()) return;
    this.error.set('');

    if (!this.email.trim() || !this.password) {
      this.error.set('Enter your email and password.');
      return;
    }

    this.busy.set(true);
    try {
      await this.auth.login({ email: this.email.trim(), password: this.password });
      const next = this.route.snapshot.queryParamMap.get('next');
      this.router.navigateByUrl(next || '/dashboard');
    } catch (err) {
      this.error.set(
        err instanceof HttpErrorResponse && err.error?.message
          ? err.error.message
          : 'Could not reach the server. Check that the API is running.'
      );
    } finally {
      this.busy.set(false);
    }
  }
}
