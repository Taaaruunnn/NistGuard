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
 *
 * The page is locked to exactly one viewport (see `.auth-shell` in styles.css)
 * and never scrolls. Because content therefore has to fit, the editorial
 * column is progressively shed as the viewport gets shorter, and is dropped
 * entirely below `lg` and on landscape phones -- the form is what matters and
 * it is what survives.
 */
@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [CsfGlyphComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="auth-shell">
      <div class="h-[3px] shrink-0 bg-[var(--color-accent)]"></div>

      <div class="auth-stage">
        <div class="auth-grid">
          <!-- ------------------------------------------------ statement -->
          <section class="auth-editorial hidden min-w-0 lg:block">
            <div class="flex items-baseline gap-3">
              <span class="font-mono text-[15px] tracking-[0.2em]" style="font-weight: 600">NISTGUARD</span>
              <span class="h-px flex-1 bg-[var(--color-rule-strong)]"></span>
            </div>

            <h1 class="auth-headline mt-8 max-w-[13ch] text-[clamp(2.4rem,5vw,3.9rem)] leading-[0.95] tracking-[-0.03em] text-balance">
              Know where you
              <em class="not-italic text-[var(--color-accent)]">actually</em>
              stand.
            </h1>

            <p class="auth-lede mt-6 max-w-[54ch] text-[15px] leading-[1.7] text-[var(--color-ink-2)] text-pretty">
              NISTGuard walks your organisation through all
              <span class="figure">106</span> subcategories of the NIST Cybersecurity
              Framework 2.0, scores each one against a target you set, and turns the
              shortfall into a ranked, evidenced remediation list.
            </p>

            <!-- the six functions, as the framework's own structure -->
            <div class="auth-compact-md mt-10">
              <div class="ruled-head mb-4">
                <span class="section-mark">The six functions</span>
              </div>

              <ul class="grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-3">
                @for (code of order; track code) {
                  <li class="flex gap-3">
                    <app-csf-glyph [fn]="code" [size]="22" class="mt-0.5" />
                    <div class="min-w-0">
                      <div class="flex items-baseline gap-1.5">
                        <span class="font-mono text-[10px] tracking-[0.12em]" [style.color]="fns[code].color">{{ code }}</span>
                        <span class="text-[13px]" style="font-weight: 500">{{ fns[code].name }}</span>
                      </div>
                      <p class="mt-0.5 text-[12px] leading-[1.5] text-[var(--color-ink-3)]">
                        {{ fns[code].gist }}
                      </p>
                    </div>
                  </li>
                }
              </ul>
            </div>

            <p class="auth-compact-lg mt-10 border-t border-[var(--color-rule)] pt-4 text-[11px] leading-relaxed text-[var(--color-ink-3)]">
              <span class="figure">&sect;</span> Taxonomy is NIST's published CSF 2.0 Core &mdash;
              6 functions, 22 categories, 106 subcategories &mdash; not a simplified subset.
            </p>
          </section>

          <!-- ------------------------------------------------------ form -->
          <section class="auth-panel min-w-0 lg:border-l lg:border-[var(--color-rule)] lg:pl-14">
            <!-- compact masthead, standing in for the editorial column when
                 there is not room for it -->
            <div class="auth-brand mb-7 flex items-baseline gap-3 lg:hidden">
              <span class="font-mono text-[14px] tracking-[0.2em]" style="font-weight: 600">NISTGUARD</span>
              <span class="h-px flex-1 bg-[var(--color-rule-strong)]"></span>
            </div>

            <div class="auth-panel-head">
              <div class="mb-1 section-mark">{{ eyebrow() }}</div>
              <h2 class="auth-panel-heading text-[1.75rem] leading-tight tracking-[-0.02em]">{{ heading() }}</h2>
              <p class="auth-blurb mt-2 text-[13px] leading-relaxed text-[var(--color-ink-2)]">{{ blurb() }}</p>
            </div>

            <ng-content />
          </section>
        </div>
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
