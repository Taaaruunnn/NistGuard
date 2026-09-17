import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { AuthService } from '../../core/services/auth.service';
import { AuthLayoutComponent } from './auth-layout';
import { IconComponent } from '../../shared/icon';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink, AuthLayoutComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-auth-layout
      eyebrow="New account"
      heading="Let's map where you stand"
      blurb="Two minutes to set up. The first assessment can be as short or as thorough as you want."
    >
      <form (ngSubmit)="submit()" class="auth-form">
        <div>
          <label for="name" class="section-mark mb-2 block">Your name</label>
          <input id="name" name="name" type="text" autocomplete="name" required class="field" placeholder="Alex Mercer" [(ngModel)]="name" />
        </div>

        <div>
          <label for="org" class="section-mark mb-2 block">Organisation <span class="normal-case tracking-normal text-[var(--color-ink-3)]">(optional)</span></label>
          <input id="org" name="org" type="text" autocomplete="organization" class="field" placeholder="Northwind Manufacturing" [(ngModel)]="organizationName" />
        </div>

        <div>
          <label for="email" class="section-mark mb-2 block">Email</label>
          <input id="email" name="email" type="email" autocomplete="email" required class="field" placeholder="you@organisation.com" [(ngModel)]="email" />
        </div>

        <div>
          <label for="password" class="section-mark mb-2 block">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autocomplete="new-password"
            required
            class="field"
            placeholder="At least 8 characters"
            [(ngModel)]="password"
          />
          <p class="auth-hint mt-2 text-[11px] text-[var(--color-ink-3)]">Eight characters or more. Nothing else is required.</p>
        </div>

        @if (error()) {
          <p class="auth-form-wide border-l-2 border-[var(--color-accent)] py-1 pl-3 text-[12px] text-[var(--color-accent)]">
            {{ error() }}
          </p>
        }

        <div class="auth-form-wide flex items-center gap-5 pt-1">
          <button type="submit" class="btn btn-primary" [disabled]="busy()">
            {{ busy() ? 'Creating...' : 'Create account' }}
            @if (!busy()) {
              <app-icon name="arrow-right" [size]="15" />
            }
          </button>
          <a routerLink="/login" class="text-[12px] text-[var(--color-ink-2)] underline decoration-[var(--color-rule-strong)] underline-offset-4 hover:text-[var(--color-accent)]">
            I already have one
          </a>
        </div>
      </form>
    </app-auth-layout>
  `,
})
export class RegisterPage {
  private auth = inject(AuthService);
  private router = inject(Router);

  protected name = '';
  protected organizationName = '';
  protected email = '';
  protected password = '';
  protected readonly busy = signal(false);
  protected readonly error = signal('');

  protected async submit(): Promise<void> {
    if (this.busy()) return;
    this.error.set('');

    if (!this.name.trim() || !this.email.trim() || !this.password) {
      this.error.set('Name, email and password are all needed.');
      return;
    }
    if (this.password.length < 8) {
      this.error.set('Password must be at least 8 characters.');
      return;
    }

    this.busy.set(true);
    try {
      await this.auth.register({
        name: this.name.trim(),
        email: this.email.trim(),
        password: this.password,
        organizationName: this.organizationName.trim(),
      });
      this.router.navigateByUrl('/dashboard');
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
