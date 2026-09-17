import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { CSF_FUNCTIONS, FUNCTION_ORDER } from '../../core/csf';
import { CsfGlyphComponent } from '../../shared/icon';

/**
 * The sign-in / register surround.
 *
 * Two columns: an editorial left-hand statement that shows the framework
 * itself, and a ruled form column on the right. No centred hero, no card
 * floating in the middle of the viewport -- the page is laid out like the
 * cover of the report the product produces.
 */
@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [CsfGlyphComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen">
      <div class="h-[3px] bg-[var(--color-accent)]"></div>

      <div class="mx-auto grid max-w-[1180px] gap-y-12 px-6 py-10 lg:grid-cols-12 lg:gap-x-16 lg:py-16">
        <!-- ------------------------------------------------ statement -->
        <section class="lg:col-span-7">
          <div class="flex items-baseline gap-3">
            <span class="font-mono text-[15px] tracking-[0.2em]" style="font-weight: 600">NISTGUARD</span>
            <span class="h-px flex-1 bg-[var(--color-rule-strong)]"></span>
          </div>

          <h1 class="mt-10 max-w-[13ch] text-[clamp(2.6rem,6vw,4.1rem)] leading-[0.95] tracking-[-0.03em] text-balance">
            Know where you
            <em class="not-italic text-[var(--color-accent)]">actually</em>
            stand.
          </h1>

          <p class="mt-7 max-w-[54ch] text-[15px] leading-[1.75] text-[var(--color-ink-2)] text-pretty">
            NISTGuard walks your organisation through all
            <span class="figure">106</span> subcategories of the NIST Cybersecurity
            Framework 2.0, scores each one against a target you set, and turns the
            shortfall into a ranked, evidenced remediation list.
          </p>

          <!-- the six functions, as the framework's own structure -->
          <div class="mt-14">
            <div class="ruled-head mb-5">
              <span class="section-mark">The six functions</span>
            </div>

            <ul class="grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-3">
              @for (code of order; track code) {
                <li class="flex gap-3">
                  <app-csf-glyph [fn]="code" [size]="22" class="mt-0.5" />
                  <div class="min-w-0">
                    <div class="flex items-baseline gap-1.5">
                      <span class="font-mono text-[10px] tracking-[0.12em]" [style.color]="fns[code].color">{{ code }}</span>
                      <span class="text-[13px] font-500" style="font-weight: 500">{{ fns[code].name }}</span>
                    </div>
                    <p class="mt-0.5 text-[12px] leading-[1.5] text-[var(--color-ink-3)]">
                      {{ fns[code].gist }}
                    </p>
                  </div>
                </li>
              }
            </ul>
          </div>

          <p class="mt-12 border-t border-[var(--color-rule)] pt-4 text-[11px] leading-relaxed text-[var(--color-ink-3)]">
            <span class="figure">&sect;</span> Taxonomy is NIST's published CSF 2.0 Core &mdash;
            6 functions, 22 categories, 106 subcategories &mdash; not a simplified subset.
          </p>
        </section>

        <!-- ------------------------------------------------------ form -->
        <section class="lg:col-span-5 lg:border-l lg:border-[var(--color-rule)] lg:pl-16">
          <div class="lg:sticky lg:top-16">
            <div class="mb-1 section-mark">{{ eyebrow() }}</div>
            <h2 class="text-[1.9rem] leading-tight tracking-[-0.02em]">{{ heading() }}</h2>
            <p class="mt-2 mb-9 text-[13px] leading-relaxed text-[var(--color-ink-2)]">{{ blurb() }}</p>

            <ng-content />
          </div>
        </section>
      </div>
    </div>
  `,
})
export class AuthLayoutComponent {
  readonly eyebrow = input('');
  readonly heading = input('');
  readonly blurb = input('');

  protected readonly order = FUNCTION_ORDER;
  protected readonly fns = CSF_FUNCTIONS;
}
