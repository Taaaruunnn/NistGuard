import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../core/services/auth.service';
import { IconComponent } from './icon';

/**
 * The masthead every signed-in page sits under.
 *
 * Deliberately a masthead and a hairline rule rather than a sidebar or a
 * navbar with pills -- it should read as the letterhead of a report, and it
 * gives the pages below the full width of the page to structure themselves.
 */
@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen">
      <!--
        The masthead is pinned for every signed-in route. It is sticky rather
        than fixed because the body is the scrolling element here, so the
        content below needs no padding compensation.
      -->
      <div class="masthead no-print">
      <!-- a claret hairline at the very top edge, like a printed trim mark -->
      <div class="h-[3px] bg-[var(--color-accent)]"></div>

      <header class="mx-auto max-w-[1180px] px-6 pt-5 pb-3">
        <div class="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <div class="flex items-baseline gap-4">
            <a routerLink="/dashboard" class="group flex items-baseline gap-2.5">
              <span
                class="font-mono text-[15px] font-600 tracking-[0.2em] text-[var(--color-ink)] transition-colors group-hover:text-[var(--color-accent)]"
                style="font-weight: 600"
              >NISTGUARD</span>
            </a>
            <span class="hidden text-[11px] tracking-wide text-[var(--color-ink-3)] sm:inline">
              Cybersecurity Framework 2.0 &middot; posture &amp; gap analysis
            </span>
          </div>

          <div class="flex items-center gap-4 text-[12px]">
            @if (auth.user(); as user) {
              <span class="hidden text-[var(--color-ink-2)] sm:inline">
                {{ user.organizationName || user.name }}
              </span>
              <button type="button" class="btn btn-quiet" (click)="auth.logout()">
                <app-icon name="logout" [size]="15" />
                Sign out
              </button>
            }
          </div>
        </div>
      </header>

      <div class="mx-auto max-w-[1180px] px-6">
        <div class="h-px bg-[var(--color-rule-strong)]"></div>
      </div>
      </div>

      <main class="mx-auto max-w-[1180px] px-6 pb-24" [class.pt-8]="padded()">
        <ng-content />
      </main>
    </div>
  `,
})
export class ShellComponent {
  protected auth = inject(AuthService);
  readonly padded = input(true);
}
