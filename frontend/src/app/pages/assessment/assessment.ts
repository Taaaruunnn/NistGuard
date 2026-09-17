import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AssessmentService } from '../../core/services/assessment.service';
import { NistService } from '../../core/services/nist.service';
import { Assessment, AssessmentResponse, OverallScore, ResponseInput } from '../../core/models/assessment.model';
import { CoreCategory, CoreFunction, FunctionCode, ImpactKey } from '../../core/models/nist.model';
import { CSF_FUNCTIONS, FUNCTION_ORDER, IMPACT_LABEL } from '../../core/csf';

import { ShellComponent } from '../../shared/shell';
import { CsfGlyphComponent, IconComponent } from '../../shared/icon';

interface Draft {
  tier: number | null;
  notApplicable: boolean;
  businessImpact: ImpactKey;
  notes: string;
}

@Component({
  selector: 'app-assessment',
  standalone: true,
  imports: [FormsModule, RouterLink, ShellComponent, CsfGlyphComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-shell>
      @if (loading()) {
        <div class="py-16">
          <div class="space-y-3">
            @for (i of [0, 1, 2]; track i) {
              <div class="h-px w-full origin-left animate-sweep bg-[var(--color-rule)]" [style.animation-delay.ms]="i * 90"></div>
            }
          </div>
          <p class="pt-6 text-[12px] text-[var(--color-ink-3)]">Laying out the framework&hellip;</p>
        </div>
      } @else if (!assessment()) {
        <p class="py-16 text-[14px] text-[var(--color-ink-2)]">That assessment could not be found.</p>
        <a routerLink="/dashboard" class="btn btn-ghost">Back to the register</a>
      } @else {
        <!-- ============================================== title block -->
        <header class="mb-10">
          <a routerLink="/dashboard" class="btn btn-quiet -ml-2 mb-4">
            <app-icon name="arrow-left" [size]="14" />
            Register
          </a>

          <div class="flex flex-wrap items-end justify-between gap-6">
            <div>
              <div class="section-mark mb-2">Assessment</div>
              <h1 class="text-[clamp(1.8rem,3.6vw,2.5rem)] leading-[1.1] tracking-[-0.025em]">
                {{ assessment()!.name }}
              </h1>
              <p class="mt-2 text-[12.5px] text-[var(--color-ink-3)]">
                Target &mdash; {{ nist.tierLabel(assessment()!.targetTier) }} (tier {{ assessment()!.targetTier }}).
                Everything is measured against that bar.
              </p>
            </div>

            <div class="text-right">
              <div class="figure text-[2rem] leading-none">{{ answeredCount() }}<span class="text-[14px] text-[var(--color-ink-3)]">/{{ total() }}</span></div>
              <div class="mt-1 text-[11px] text-[var(--color-ink-3)]">subcategories recorded</div>
              <div class="mt-2 flex items-center justify-end gap-2 text-[11px]">
                <span
                  class="inline-block h-1.5 w-1.5 rounded-full transition-colors"
                  [style.background-color]="saveState() === 'saving' ? 'var(--color-sev-medium)' : saveState() === 'error' ? 'var(--color-accent)' : 'var(--color-rc)'"
                ></span>
                <span class="text-[var(--color-ink-3)]">{{ saveLabel() }}</span>
              </div>
            </div>
          </div>

          <!-- progress: one hairline per function, filled proportionally -->
          <div class="mt-8 flex gap-1.5">
            @for (f of core(); track f.code) {
              <div class="flex-1" [title]="f.name + ': ' + progressFor(f.code).done + ' of ' + progressFor(f.code).total">
                <div class="h-[3px] w-full bg-[var(--color-paper-3)]">
                  <div
                    class="h-full transition-[width] duration-500"
                    [style.width.%]="progressFor(f.code).pct"
                    [style.background-color]="fns[f.code].color"
                  ></div>
                </div>
              </div>
            }
          </div>
        </header>

        <div class="grid gap-x-12 gap-y-10 lg:grid-cols-12">
          <!-- ============================================ function rail -->
          <nav class="lg:col-span-3">
            <div class="lg:sticky lg:top-[calc(var(--nav-h)+1.5rem)]">
              <div class="section-mark mb-4">Functions</div>
              <ul class="border-t border-[var(--color-rule)]">
                @for (f of core(); track f.code) {
                  <li>
                    <button
                      type="button"
                      class="group flex w-full items-center gap-3 border-b border-[var(--color-rule)] py-3 text-left transition-colors"
                      [style.background-color]="f.code === activeFn() ? fns[f.code].wash : ''"
                      (click)="setFunction(f.code)"
                    >
                      <span class="w-[3px] self-stretch" [style.background-color]="f.code === activeFn() ? fns[f.code].color : 'transparent'"></span>
                      <app-csf-glyph [fn]="f.code" [size]="18" />
                      <span class="min-w-0 flex-1">
                        <span class="block text-[13px] leading-tight" [style.color]="f.code === activeFn() ? 'var(--color-ink)' : 'var(--color-ink-2)'">
                          {{ f.name }}
                        </span>
                        <span class="figure block text-[10.5px] text-[var(--color-ink-3)]">
                          {{ progressFor(f.code).done }}/{{ progressFor(f.code).total }}
                        </span>
                      </span>
                      @if (progressFor(f.code).pct === 100) {
                        <app-icon name="check" [size]="13" [color]="fns[f.code].color" />
                      }
                    </button>
                  </li>
                }
              </ul>

              <div class="mt-8 border-t-2 border-[var(--color-ink)] pt-4">
                <a [routerLink]="['/assessments', assessment()!._id, 'report']" class="btn btn-ghost w-full">
                  <app-icon name="file" [size]="14" />
                  View report
                </a>
                @if (assessment()!.status !== 'completed') {
                  <button class="btn btn-primary mt-2 w-full" (click)="markComplete()" [disabled]="answeredCount() === 0">
                    <app-icon name="check" [size]="14" />
                    Mark complete
                  </button>
                }
              </div>
            </div>
          </nav>

          <!-- ============================================= the questions -->
          <section class="lg:col-span-9">
            @if (activeFunctionData(); as fn) {
              <div class="animate-rise" [attr.key]="fn.code">
                <!-- function preamble -->
                <div class="mb-10 border-t-2 pt-6" [style.border-color]="fns[fn.code].color">
                  <div class="flex items-start gap-4">
                    <app-csf-glyph [fn]="fn.code" [size]="30" [weight]="1.4" />
                    <div class="min-w-0">
                      <div class="flex items-baseline gap-2.5">
                        <span class="font-mono text-[11px] tracking-[0.14em]" [style.color]="fns[fn.code].color">{{ fn.code }}</span>
                        <h2 class="text-[1.7rem] leading-tight tracking-[-0.02em]">{{ fn.name }}</h2>
                      </div>
                      <p class="mt-2 max-w-[62ch] text-[13.5px] leading-[1.7] text-[var(--color-ink-2)]">
                        {{ fn.description }}
                      </p>
                    </div>
                  </div>
                </div>

                <!-- categories -->
                @for (cat of fn.categories; track cat.code) {
                  <article class="mb-12">
                    <div class="ruled-head mb-1">
                      <span class="font-mono text-[11px] tracking-[0.1em]" [style.color]="fns[fn.code].color">{{ cat.code }}</span>
                      <h3 class="text-[1.1rem] tracking-[-0.01em]">{{ cat.name }}</h3>
                      <span class="figure shrink-0 text-[10.5px] text-[var(--color-ink-3)]">
                        {{ categoryDone(cat) }}/{{ cat.subcategories.length }}
                      </span>
                    </div>
                    <p class="mb-7 max-w-[70ch] text-[12.5px] leading-relaxed text-[var(--color-ink-3)]">
                      {{ cat.description }}
                    </p>

                    <!-- subcategories -->
                    <div class="space-y-0">
                      @for (sub of cat.subcategories; track sub.code) {
                        @let d = draftFor(sub.code);
                        <div
                          class="border-t border-[var(--color-rule)] py-6 transition-colors"
                          [style.background-color]="d.tier !== null || d.notApplicable ? fns[fn.code].wash : ''"
                        >
                          <div class="grid gap-x-8 gap-y-5 lg:grid-cols-12">
                            <!-- statement -->
                            <div class="lg:col-span-6">
                              <div class="flex items-baseline gap-2">
                                <span class="font-mono text-[11.5px] font-500" style="font-weight: 500">{{ sub.code }}</span>
                                @if (d.notApplicable) {
                                  <span class="stamp text-[var(--color-ink-3)]">N/A</span>
                                } @else if (d.tier !== null && d.tier < assessment()!.targetTier) {
                                  <span class="stamp" [style.color]="'var(--color-accent)'">
                                    GAP {{ assessment()!.targetTier - d.tier }}
                                  </span>
                                }
                              </div>
                              <p class="mt-1.5 text-[13.5px] leading-[1.65] text-[var(--color-ink)]">{{ sub.statement }}</p>

                              @if (sub.implementationExamples.length) {
                                <details class="group mt-2.5">
                                  <summary class="inline-flex cursor-pointer list-none items-center gap-1.5 text-[11px] text-[var(--color-ink-3)] hover:text-[var(--color-accent)]">
                                    <app-icon name="chevron-right" [size]="11" class="transition-transform group-open:rotate-90" />
                                    What NIST means by this
                                  </summary>
                                  <ul class="mt-2.5 space-y-1.5 border-l border-[var(--color-rule-strong)] pl-4">
                                    @for (ex of sub.implementationExamples; track ex) {
                                      <li class="text-[12px] leading-relaxed text-[var(--color-ink-2)]">{{ ex }}</li>
                                    }
                                  </ul>
                                </details>
                              }
                            </div>

                            <!-- controls -->
                            <div class="lg:col-span-6">
                              <!-- tier picker -->
                              <div class="flex flex-wrap gap-px" role="radiogroup" [attr.aria-label]="'Maturity for ' + sub.code">
                                @for (t of nist.tiers(); track t.value) {
                                  <button
                                    type="button"
                                    role="radio"
                                    [attr.aria-checked]="d.tier === t.value && !d.notApplicable"
                                    class="flex-1 border px-2 py-2 text-center transition-colors"
                                    [style.border-color]="d.tier === t.value && !d.notApplicable ? fns[fn.code].color : 'var(--color-rule-strong)'"
                                    [style.background-color]="d.tier === t.value && !d.notApplicable ? fns[fn.code].color : 'transparent'"
                                    [style.color]="d.tier === t.value && !d.notApplicable ? 'var(--color-paper)' : 'var(--color-ink-2)'"
                                    [style.opacity]="d.notApplicable ? 0.4 : 1"
                                    [title]="t.blurb"
                                    (click)="setTier(sub.code, t.value)"
                                  >
                                    <span class="figure block text-[13px] leading-none">{{ t.value }}</span>
                                    <span class="mt-1 block text-[9.5px] leading-tight tracking-wide uppercase">{{ t.label }}</span>
                                  </button>
                                }
                              </div>

                              <div class="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
                                <!-- business impact -->
                                <div class="flex items-center gap-2">
                                  <span class="section-mark">Impact</span>
                                  <div class="flex gap-px">
                                    @for (imp of impactKeys; track imp) {
                                      <button
                                        type="button"
                                        class="border px-1.5 py-0.5 text-[10px] transition-colors"
                                        [style.border-color]="d.businessImpact === imp ? 'var(--color-ink)' : 'var(--color-rule-strong)'"
                                        [style.background-color]="d.businessImpact === imp ? 'var(--color-ink)' : 'transparent'"
                                        [style.color]="d.businessImpact === imp ? 'var(--color-paper)' : 'var(--color-ink-3)'"
                                        [title]="'Business impact: ' + impactLabel[imp]"
                                        (click)="setImpact(sub.code, imp)"
                                      >{{ impactLabel[imp] }}</button>
                                    }
                                  </div>
                                </div>

                                <!-- not applicable -->
                                <label class="flex cursor-pointer items-center gap-1.5 text-[11px] text-[var(--color-ink-3)] hover:text-[var(--color-ink-2)]">
                                  <input
                                    type="checkbox"
                                    class="h-3 w-3 accent-[var(--color-ink)]"
                                    [checked]="d.notApplicable"
                                    (change)="toggleNa(sub.code, $event)"
                                  />
                                  Not applicable
                                </label>

                                <button type="button" class="btn btn-quiet ml-auto" (click)="toggleNote(sub.code)">
                                  <app-icon name="note" [size]="12" />
                                  {{ d.notes ? 'Note' : 'Add note' }}
                                </button>
                              </div>

                              @if (openNotes().has(sub.code) || d.notes) {
                                <textarea
                                  rows="2"
                                  class="field mt-3 resize-y"
                                  placeholder="Evidence, owner, caveats -- whatever the next reader needs."
                                  [value]="d.notes"
                                  (change)="setNotes(sub.code, $event)"
                                ></textarea>
                              }
                            </div>
                          </div>
                        </div>
                      }
                    </div>
                  </article>
                }

                <!-- function pager -->
                <div class="flex items-center justify-between border-t-2 border-[var(--color-ink)] pt-6">
                  @if (prevFn(); as p) {
                    <button class="btn btn-ghost" (click)="setFunction(p)">
                      <app-icon name="arrow-left" [size]="14" />
                      {{ fns[p].name }}
                    </button>
                  } @else {
                    <span></span>
                  }

                  @if (nextFn(); as n) {
                    <button class="btn btn-primary" (click)="setFunction(n)">
                      Continue to {{ fns[n].name }}
                      <app-icon name="arrow-right" [size]="14" />
                    </button>
                  } @else {
                    <a [routerLink]="['/assessments', assessment()!._id, 'report']" class="btn btn-primary">
                      Read the report
                      <app-icon name="arrow-right" [size]="14" />
                    </a>
                  }
                </div>
              </div>
            }
          </section>
        </div>
      }
    </app-shell>
  `,
})
export class AssessmentPage {
  protected nist = inject(NistService);
  private api = inject(AssessmentService);
  private router = inject(Router);

  protected readonly fns = CSF_FUNCTIONS;
  protected readonly impactKeys: ImpactKey[] = ['low', 'moderate', 'high', 'critical'];
  protected readonly impactLabel = IMPACT_LABEL;

  /** Bound from the route ':id' via withComponentInputBinding(). */
  readonly id = input.required<string>();

  protected readonly assessment = signal<Assessment | null>(null);
  protected readonly overall = signal<OverallScore | null>(null);
  protected readonly drafts = signal<Record<string, Draft>>({});
  protected readonly activeFn = signal<FunctionCode>('GV');
  protected readonly openNotes = signal<Set<string>>(new Set());
  protected readonly loading = signal(true);
  protected readonly saveState = signal<'idle' | 'saving' | 'saved' | 'error'>('idle');

  protected readonly core = computed<CoreFunction[]>(() => this.nist.core());
  protected readonly total = computed(() => this.nist.counts().subcategories);

  protected readonly activeFunctionData = computed(
    () => this.core().find((f) => f.code === this.activeFn()) ?? null
  );

  protected readonly answeredCount = computed(
    () => Object.values(this.drafts()).filter((d) => d.tier !== null || d.notApplicable).length
  );

  protected readonly saveLabel = computed(() => {
    switch (this.saveState()) {
      case 'saving':
        return 'Saving';
      case 'error':
        return 'Not saved';
      case 'saved':
        return 'All saved';
      default:
        return 'Up to date';
    }
  });

  private readonly fnIndex = computed(() => FUNCTION_ORDER.indexOf(this.activeFn()));
  protected readonly prevFn = computed<FunctionCode | null>(() => {
    const i = this.fnIndex();
    return i > 0 ? FUNCTION_ORDER[i - 1] : null;
  });
  protected readonly nextFn = computed<FunctionCode | null>(() => {
    const i = this.fnIndex();
    return i >= 0 && i < FUNCTION_ORDER.length - 1 ? FUNCTION_ORDER[i + 1] : null;
  });

  /** Pending edits, flushed on a short debounce so rapid clicking is one request. */
  private pending = new Map<string, ResponseInput>();
  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Route param arrives via component input binding; load when it lands.
    effect(() => {
      const id = this.id();
      if (id) void this.load(id);
    });
  }

  private async load(id: string): Promise<void> {
    this.loading.set(true);
    try {
      await this.nist.load();
      const [{ assessment, overall }, responses] = await Promise.all([
        this.api.get(id),
        this.api.getResponses(id),
      ]);
      this.assessment.set(assessment);
      this.overall.set(overall);
      this.drafts.set(this.toDrafts(responses));

      // Resume where there is still work rather than always at Govern.
      const firstIncomplete = this.core().find((f) => this.progressFor(f.code).pct < 100);
      this.activeFn.set(firstIncomplete?.code ?? 'GV');
    } catch {
      this.assessment.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  private toDrafts(responses: AssessmentResponse[]): Record<string, Draft> {
    const out: Record<string, Draft> = {};
    for (const sub of this.nist.allSubcategories()) {
      out[sub.code] = { tier: null, notApplicable: false, businessImpact: 'moderate', notes: '' };
    }
    for (const r of responses) {
      out[r.subcategoryCode] = {
        tier: r.notApplicable ? null : r.tier,
        notApplicable: r.notApplicable,
        businessImpact: r.businessImpact,
        notes: r.notes ?? '',
      };
    }
    return out;
  }

  protected draftFor(code: string): Draft {
    return this.drafts()[code] ?? { tier: null, notApplicable: false, businessImpact: 'moderate', notes: '' };
  }

  protected progressFor(code: FunctionCode): { done: number; total: number; pct: number } {
    const fn = this.core().find((f) => f.code === code);
    if (!fn) return { done: 0, total: 0, pct: 0 };
    const subs = fn.categories.flatMap((c) => c.subcategories);
    const drafts = this.drafts();
    const done = subs.filter((s) => {
      const d = drafts[s.code];
      return d && (d.tier !== null || d.notApplicable);
    }).length;
    return { done, total: subs.length, pct: subs.length ? (done / subs.length) * 100 : 0 };
  }

  protected categoryDone(cat: CoreCategory): number {
    const drafts = this.drafts();
    return cat.subcategories.filter((s) => {
      const d = drafts[s.code];
      return d && (d.tier !== null || d.notApplicable);
    }).length;
  }

  protected setFunction(code: FunctionCode): void {
    this.activeFn.set(code);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ------------------------------------------------------------ mutations

  private patch(code: string, change: Partial<Draft>): void {
    const next = { ...this.drafts() };
    next[code] = { ...this.draftFor(code), ...change };
    this.drafts.set(next);
    this.queue(code, next[code]);
  }

  protected setTier(code: string, tier: number): void {
    // Selecting a tier always clears Not Applicable -- the two are mutually
    // exclusive, and picking a tier is the clearer signal of intent. There is
    // deliberately no toggle-off: tier 0 ("Not Performed") is a real answer,
    // so a second click on the same tier would be ambiguous.
    this.patch(code, { tier, notApplicable: false });
  }

  protected setImpact(code: string, businessImpact: ImpactKey): void {
    this.patch(code, { businessImpact });
  }

  protected toggleNa(code: string, event: Event): void {
    const notApplicable = (event.target as HTMLInputElement).checked;
    this.patch(code, { notApplicable, tier: notApplicable ? null : (this.draftFor(code).tier ?? 0) });
  }

  protected setNotes(code: string, event: Event): void {
    this.patch(code, { notes: (event.target as HTMLTextAreaElement).value });
  }

  protected toggleNote(code: string): void {
    const next = new Set(this.openNotes());
    next.has(code) ? next.delete(code) : next.add(code);
    this.openNotes.set(next);
  }

  // --------------------------------------------------------------- saving

  private queue(code: string, d: Draft): void {
    // An untouched row (no tier, not N/A) has nothing to persist.
    if (d.tier === null && !d.notApplicable) return;

    this.pending.set(code, {
      subcategoryCode: code,
      tier: d.tier ?? 0,
      notApplicable: d.notApplicable,
      businessImpact: d.businessImpact,
      notes: d.notes,
    });

    this.saveState.set('saving');
    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.flushTimer = setTimeout(() => void this.flush(), 600);
  }

  private async flush(): Promise<void> {
    const id = this.assessment()?._id;
    if (!id || !this.pending.size) {
      this.saveState.set('saved');
      return;
    }

    const batch = [...this.pending.values()];
    this.pending.clear();

    try {
      const res = await this.api.saveResponses(id, batch);
      this.overall.set(res.overall);
      this.saveState.set('saved');
    } catch {
      // Put the batch back so the next edit retries it rather than losing it.
      for (const item of batch) this.pending.set(item.subcategoryCode, item);
      this.saveState.set('error');
    }
  }

  protected async markComplete(): Promise<void> {
    const id = this.assessment()?._id;
    if (!id) return;
    if (this.flushTimer) clearTimeout(this.flushTimer);
    await this.flush();
    const updated = await this.api.update(id, { status: 'completed' });
    this.assessment.set(updated);
    this.router.navigate(['/assessments', id, 'report']);
  }
}
