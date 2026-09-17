import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ChartConfiguration } from 'chart.js';

import { AssessmentService } from '../../core/services/assessment.service';
import { AuthService } from '../../core/services/auth.service';
import { NistService } from '../../core/services/nist.service';
import { Assessment, Finding, ScoreReport } from '../../core/models/assessment.model';
import { CSF_FUNCTIONS, INK, SEVERITY_COLOR, SEVERITY_ORDER } from '../../core/csf';
import { Severity } from '../../core/models/nist.model';

import { ShellComponent } from '../../shared/shell';
import { CsfGlyphComponent, IconComponent } from '../../shared/icon';
import { TierMeterComponent } from '../../shared/tier-meter';
import { ChartComponent } from '../../shared/chart';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    DatePipe,
    DecimalPipe,
    NgTemplateOutlet,
    FormsModule,
    RouterLink,
    ShellComponent,
    CsfGlyphComponent,
    IconComponent,
    TierMeterComponent,
    ChartComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-shell>
      <!-- ================================================== masthead -->
      <header class="mb-14 grid gap-6 lg:grid-cols-12">
        <div class="lg:col-span-8">
          <div class="section-mark mb-3">&sect;01 &middot; Portfolio</div>
          <h1 class="text-[clamp(2.1rem,4.5vw,3rem)] leading-[1.05] tracking-[-0.025em]">
            @if (auth.firstName()) {
              Good to see you, {{ auth.firstName() }}.
            } @else {
              Where you stand
            }
          </h1>
          <p class="mt-3 max-w-[56ch] text-[14px] leading-relaxed text-[var(--color-ink-2)]">
            @if (assessments().length) {
              {{ assessments().length }} assessment{{ assessments().length === 1 ? '' : 's' }} on file,
              measured against the NIST CSF 2.0 Core.
            } @else {
              Nothing assessed yet. That is the normal starting point.
            }
          </p>
        </div>

        <div class="lg:col-span-4 lg:justify-self-end lg:text-right">
          <div class="section-mark mb-2">Reference</div>
          <p class="figure text-[13px] text-[var(--color-ink-2)]">
            {{ nist.counts().functions }} functions &middot;
            {{ nist.counts().categories }} categories &middot;
            {{ nist.counts().subcategories }} subcategories
          </p>
          <p class="mt-1 text-[11px] text-[var(--color-ink-3)]">NIST CSF 2.0, February 2024</p>
        </div>
      </header>

      @if (loading()) {
        <!-- ================================================ loading -->
        <div class="space-y-3 py-10">
          @for (i of [0, 1, 2, 3]; track i) {
            <div
              class="h-px w-full origin-left animate-sweep bg-[var(--color-rule)]"
              [style.animation-delay.ms]="i * 90"
            ></div>
          }
          <p class="pt-6 text-[12px] text-[var(--color-ink-3)]">Reading the register&hellip;</p>
        </div>
      } @else if (error()) {
        <div class="border-l-2 border-[var(--color-accent)] py-3 pl-4">
          <p class="text-[13px] text-[var(--color-accent)]">{{ error() }}</p>
          <button class="btn btn-ghost mt-4" (click)="reload()">Try again</button>
        </div>
      } @else if (!assessments().length) {
        <!-- ============================================ empty state -->
        <section class="grid gap-12 lg:grid-cols-12">
          <div class="lg:col-span-7">
            <div class="border-t-2 border-[var(--color-ink)] pt-8">
              <h2 class="text-[1.75rem] leading-tight tracking-[-0.02em]">Start with an honest baseline</h2>
              <p class="mt-4 max-w-[52ch] text-[14px] leading-[1.75] text-[var(--color-ink-2)]">
                You do not have to answer all 106 subcategories today. Score what you
                know, mark what does not apply, and leave the rest &mdash; unanswered
                items are excluded from your score rather than counted as zero, so a
                partial assessment is still an honest one.
              </p>

              <ol class="mt-9 space-y-5">
                @for (step of emptySteps; track step.n) {
                  <li class="flex gap-4">
                    <span class="figure mt-0.5 text-[11px] text-[var(--color-ink-3)]">{{ step.n }}</span>
                    <div>
                      <p class="text-[13px] font-500" style="font-weight: 500">{{ step.title }}</p>
                      <p class="mt-0.5 text-[12.5px] leading-relaxed text-[var(--color-ink-3)]">{{ step.body }}</p>
                    </div>
                  </li>
                }
              </ol>
            </div>
          </div>

          <div class="lg:col-span-5">
            <ng-container [ngTemplateOutlet]="newForm" />
          </div>
        </section>
      } @else {
        <!-- ============================================== the register -->
        <section class="mb-16">
          <div class="ruled-head mb-5">
            <span class="section-mark">Assessments</span>
          </div>

          <div class="ledger-wrap">
          <table class="ledger">
            <thead>
              <tr>
                <th class="w-[38%]">Assessment</th>
                <th>Status</th>
                <th>Progress</th>
                <th>Target</th>
                <th>Updated</th>
                <th class="text-right">&nbsp;</th>
              </tr>
            </thead>
            <tbody>
              @for (a of assessments(); track a._id) {
                <tr
                  class="cursor-pointer"
                  [style.background-color]="a._id === selectedId() ? 'var(--color-paper-2)' : ''"
                  (click)="select(a._id)"
                >
                  <td>
                    <div class="flex items-baseline gap-2">
                      @if (a._id === selectedId()) {
                        <span class="-ml-3 w-1.5 text-[var(--color-accent)]">&bull;</span>
                      }
                      <div>
                        <div class="text-[14px] font-500" style="font-weight: 500">{{ a.name }}</div>
                        @if (a.organizationName || a.scope) {
                          <div class="mt-0.5 text-[11.5px] text-[var(--color-ink-3)]">
                            {{ a.organizationName }}{{ a.organizationName && a.scope ? ' · ' : '' }}{{ a.scope }}
                          </div>
                        }
                      </div>
                    </div>
                  </td>
                  <td>
                    <span
                      class="stamp"
                      [style.color]="a.status === 'completed' ? 'var(--color-rc)' : 'var(--color-ink-3)'"
                    >{{ a.status === 'completed' ? 'COMPLETE' : 'OPEN' }}</span>
                  </td>
                  <td class="figure text-[12px] text-[var(--color-ink-2)]">
                    {{ a.answered || 0 }}<span class="text-[var(--color-ink-3)]">/{{ a.totalSubcategories || 106 }}</span>
                  </td>
                  <td class="figure text-[12px] text-[var(--color-ink-2)]">{{ nist.tierLabel(a.targetTier) }}</td>
                  <td class="text-[12px] text-[var(--color-ink-3)]">{{ a.updatedAt | date: 'd MMM yyyy' }}</td>
                  <td class="text-right whitespace-nowrap">
                    <a [routerLink]="['/assessments', a._id]" class="btn btn-quiet" (click)="$event.stopPropagation()">Continue</a>
                    <a [routerLink]="['/assessments', a._id, 'report']" class="btn btn-quiet" (click)="$event.stopPropagation()">Report</a>
                    <button class="btn btn-quiet" (click)="remove(a, $event)" [attr.aria-label]="'Delete ' + a.name">
                      <app-icon name="trash" [size]="14" />
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
          </div>

          <div class="mt-6">
            <button class="btn btn-ghost" (click)="showNew.set(!showNew())">
              <app-icon [name]="showNew() ? 'minus' : 'plus'" [size]="14" />
              {{ showNew() ? 'Cancel' : 'New assessment' }}
            </button>
          </div>

          @if (showNew()) {
            <div class="mt-8 max-w-[560px] animate-rise">
              <ng-container [ngTemplateOutlet]="newForm" />
            </div>
          }
        </section>

        <!-- ================================================== posture -->
        @if (scores(); as s) {
          <section class="mb-16 print-break">
            <div class="ruled-head mb-6">
              <span class="section-mark">&sect;02 &middot; Posture</span>
              <span class="text-[11px] text-[var(--color-ink-3)]">{{ selectedName() }}</span>
            </div>

            @if (s.overall.answered === 0) {
              <div class="border-l-2 border-[var(--color-rule-strong)] py-4 pl-5">
                <p class="text-[14px] text-[var(--color-ink-2)]">
                  This assessment has no responses yet, so there is nothing to score.
                </p>
                <a [routerLink]="['/assessments', s.assessmentId]" class="btn btn-primary mt-5">
                  Begin the walkthrough
                  <app-icon name="arrow-right" [size]="15" />
                </a>
              </div>
            } @else {
              <div class="grid gap-x-14 gap-y-10 lg:grid-cols-12">
                <!-- headline numbers -->
                <div class="min-w-0 lg:col-span-4">
                  <div class="flex items-end gap-3">
                    <span class="figure text-[4.5rem] leading-[0.85] tracking-[-0.04em] text-[var(--color-ink)]">{{
                      s.overall.mean | number: '1.1-1'
                    }}</span>
                    <span class="figure mb-2 text-[14px] text-[var(--color-ink-3)]">/ 4.0</span>
                  </div>
                  <p class="mt-2 text-[12px] text-[var(--color-ink-2)]">
                    Mean maturity across {{ s.overall.answered - s.overall.notApplicable }} scored subcategories.
                  </p>

                  <dl class="mt-8 space-y-0">
                    @for (row of headlineRows(); track row.label) {
                      <div class="flex items-baseline justify-between border-b border-[var(--color-rule)] py-2.5">
                        <dt class="text-[12.5px] text-[var(--color-ink-2)]">{{ row.label }}</dt>
                        <dd class="figure text-[13px]" [style.color]="row.color || 'var(--color-ink)'">{{ row.value }}</dd>
                      </div>
                    }
                  </dl>

                  <!-- severity mix, as ink blocks rather than another chart -->
                  <div class="mt-8">
                    <div class="section-mark mb-3">Gaps by severity</div>
                    <div class="flex h-2 w-full overflow-hidden">
                      @for (sev of severityOrder; track sev) {
                        @if (s.overall.gapsBySeverity[sev]) {
                          <span
                            [style.background-color]="severityColor[sev]"
                            [style.width.%]="(s.overall.gapsBySeverity[sev] / s.overall.openGaps) * 100"
                            [title]="sev + ': ' + s.overall.gapsBySeverity[sev]"
                          ></span>
                        }
                      }
                      @if (!s.overall.openGaps) {
                        <span class="w-full bg-[var(--color-paper-3)]"></span>
                      }
                    </div>
                    <ul class="mt-3 flex flex-wrap gap-x-5 gap-y-1">
                      @for (sev of severityOrder; track sev) {
                        <li class="flex items-center gap-1.5 text-[11px]">
                          <span class="inline-block h-2 w-2" [style.background-color]="severityColor[sev]"></span>
                          <span class="text-[var(--color-ink-2)]">{{ sev }}</span>
                          <span class="figure text-[var(--color-ink-3)]">{{ s.overall.gapsBySeverity[sev] }}</span>
                        </li>
                      }
                    </ul>
                  </div>
                </div>

                <!-- per-function ledger -->
                <div class="min-w-0 lg:col-span-8">
                  <div class="ledger-wrap">
                  <table class="ledger">
                    <thead>
                      <tr>
                        <th class="w-[34%]">Function</th>
                        <th class="w-[30%]">Maturity vs target {{ s.targetTier }}</th>
                        <th>Scored</th>
                        <th>Gaps</th>
                        <th class="text-right">Mean</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (f of s.functions; track f.code) {
                        <tr>
                          <td>
                            <div class="flex items-center gap-2.5">
                              <app-csf-glyph [fn]="f.code" [size]="18" />
                              <span class="font-mono text-[10px] tracking-[0.1em]" [style.color]="fns[f.code].color">{{ f.code }}</span>
                              <span class="text-[13.5px]">{{ f.name }}</span>
                            </div>
                          </td>
                          <td>
                            <app-tier-meter
                              [value]="f.mean"
                              [target]="s.targetTier"
                              [color]="fns[f.code].color"
                              [showValue]="false"
                              [segWidth]="11"
                            />
                          </td>
                          <td class="figure text-[12px] text-[var(--color-ink-3)]">{{ f.answered }}/{{ f.total }}</td>
                          <td class="figure text-[12px]" [style.color]="f.openGaps ? 'var(--color-ink)' : 'var(--color-ink-3)'">
                            {{ f.openGaps }}
                          </td>
                          <td class="figure text-right text-[13px]">
                            {{ f.mean === null ? '--' : (f.mean | number: '1.1-1') }}
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                  </div>

                  <!-- Figure 1 -->
                  <figure class="mt-10">
                    <figcaption class="mb-4 flex items-baseline gap-3">
                      <span class="section-mark">Fig. 1</span>
                      <span class="text-[12px] text-[var(--color-ink-2)]">
                        Mean maturity by function, against a target of {{ s.targetTier }}.
                      </span>
                    </figcaption>
                    <app-chart [config]="functionChart()!" [height]="230" />
                  </figure>
                </div>
              </div>
            }
          </section>

          <!-- ============================================ top gaps -->
          @if (findings().length) {
            <section>
              <div class="ruled-head mb-5">
                <span class="section-mark">&sect;03 &middot; Priority gaps</span>
                <span class="text-[11px] text-[var(--color-ink-3)]">ranked by gap &times; business impact</span>
              </div>

              <ol class="border-t border-[var(--color-rule-strong)]">
                @for (f of findings(); track f._id; let i = $index) {
                  <li class="grid gap-x-6 gap-y-2 border-b border-[var(--color-rule)] py-5 sm:grid-cols-12">
                    <div class="flex items-start gap-3 sm:col-span-4">
                      <span class="figure pt-0.5 text-[11px] text-[var(--color-ink-3)]">{{ rank(i) }}</span>
                      <div>
                        <div class="flex flex-wrap items-center gap-2">
                          <span class="font-mono text-[12px] font-500" style="font-weight: 500">{{ f.subcategoryCode }}</span>
                          <span class="stamp" [style.color]="severityColor[f.severity]">{{ f.severity.toUpperCase() }}</span>
                        </div>
                        <div class="mt-1 flex items-center gap-1.5">
                          <app-csf-glyph [fn]="f.functionCode" [size]="13" />
                          <span class="text-[11px] text-[var(--color-ink-3)]">{{ fns[f.functionCode].name }}</span>
                        </div>
                      </div>
                    </div>

                    <p class="text-[13px] leading-relaxed text-[var(--color-ink-2)] sm:col-span-6">
                      {{ f.statement }}
                    </p>

                    <div class="text-[11px] sm:col-span-2 sm:text-right">
                      <div class="figure text-[var(--color-ink)]">
                        tier {{ f.currentTier }} &rarr; {{ f.targetTier }}
                      </div>
                      <div class="mt-0.5 text-[var(--color-ink-3)]">{{ f.businessImpact }} impact</div>
                    </div>
                  </li>
                }
              </ol>

              <a [routerLink]="['/assessments', selectedId(), 'report']" class="btn btn-ghost mt-7">
                Full report
                <app-icon name="arrow-right" [size]="15" />
              </a>
            </section>
          }
        }
      }

      <!-- ====================================== new assessment form -->
      <ng-template #newForm>
        <div class="border-t-2 border-[var(--color-ink)] pt-7">
          <h2 class="text-[1.4rem] tracking-[-0.015em]">New assessment</h2>
          <p class="mt-1.5 mb-7 text-[12.5px] leading-relaxed text-[var(--color-ink-3)]">
            Name it after the scope you are measuring, not the date &mdash; you will
            compare these later.
          </p>

          <form (ngSubmit)="create()" class="space-y-6">
            <div>
              <label for="na" class="section-mark mb-2 block">Name</label>
              <input id="na" name="na" class="field" placeholder="FY26 corporate baseline" [(ngModel)]="form.name" required />
            </div>

            <div class="grid gap-6 sm:grid-cols-2">
              <div>
                <label for="ni" class="section-mark mb-2 block">Industry</label>
                <input id="ni" name="ni" class="field" placeholder="Manufacturing" [(ngModel)]="form.industry" />
              </div>
              <div>
                <label for="ns" class="section-mark mb-2 block">Scope</label>
                <input id="ns" name="ns" class="field" placeholder="Corporate IT" [(ngModel)]="form.scope" />
              </div>
            </div>

            <div>
              <label for="nt" class="section-mark mb-2 block">Target tier</label>
              <select id="nt" name="nt" class="field" [(ngModel)]="form.targetTier">
                @for (t of nist.tiers(); track t.value) {
                  <option [value]="t.value">{{ t.value }} &mdash; {{ t.label }}</option>
                }
              </select>
              <p class="mt-2 text-[11px] leading-relaxed text-[var(--color-ink-3)]">
                {{ targetBlurb() }}
              </p>
            </div>

            @if (createError()) {
              <p class="border-l-2 border-[var(--color-accent)] py-1 pl-3 text-[12px] text-[var(--color-accent)]">{{ createError() }}</p>
            }

            <button type="submit" class="btn btn-primary" [disabled]="creating()">
              {{ creating() ? 'Creating...' : 'Create and begin' }}
              @if (!creating()) {
                <app-icon name="arrow-right" [size]="15" />
              }
            </button>
          </form>
        </div>
      </ng-template>
    </app-shell>
  `,
})
export class DashboardPage {
  protected auth = inject(AuthService);
  protected nist = inject(NistService);
  private api = inject(AssessmentService);
  private router = inject(Router);

  protected readonly fns = CSF_FUNCTIONS;
  protected readonly severityColor = SEVERITY_COLOR;
  protected readonly severityOrder = SEVERITY_ORDER;

  protected readonly assessments = signal<Assessment[]>([]);
  protected readonly selectedId = signal<string | null>(null);
  protected readonly scores = signal<ScoreReport | null>(null);
  protected readonly findings = signal<Finding[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly showNew = signal(false);
  protected readonly creating = signal(false);
  protected readonly createError = signal('');

  protected form = { name: '', industry: '', scope: '', targetTier: 3 };

  protected readonly emptySteps = [
    { n: '01', title: 'Create an assessment', body: 'One per scope you care about — corporate IT, a subsidiary, an OT estate.' },
    { n: '02', title: 'Walk the six functions', body: 'Govern through Recover, one category at a time. Save as you go; come back whenever.' },
    { n: '03', title: 'Read the gap analysis', body: 'Every shortfall ranked by how far below target it sits and how much it would hurt.' },
  ];

  protected readonly selectedName = computed(
    () => this.assessments().find((a) => a._id === this.selectedId())?.name ?? ''
  );

  protected readonly targetBlurb = computed(() => {
    const t = this.nist.tiers().find((x) => Number(x.value) === Number(this.form.targetTier));
    return t ? t.blurb : '';
  });

  protected readonly headlineRows = computed(() => {
    const s = this.scores();
    if (!s) return [];
    const o = s.overall;
    return [
      { label: 'Coverage', value: `${o.answered} of ${o.totalSubcategories}`, color: '' },
      { label: 'At or above target', value: String(o.atOrAboveTarget), color: 'var(--color-rc)' },
      { label: 'Below target', value: String(o.openGaps), color: o.openGaps ? 'var(--color-accent)' : '' },
      { label: 'Not applicable', value: String(o.notApplicable), color: '' },
      {
        label: 'Weakest function',
        value: o.weakestFunction ? `${o.weakestFunction.code} ${o.weakestFunction.mean.toFixed(1)}` : '--',
        color: '',
      },
    ];
  });

  /** Fig. 1 -- horizontal bars in each function's own colour, with a target rule. */
  protected readonly functionChart = computed<ChartConfiguration | null>(() => {
    const s = this.scores();
    if (!s) return null;

    const rows = s.functions;
    return {
      type: 'bar',
      data: {
        labels: rows.map((f) => f.code),
        datasets: [
          {
            data: rows.map((f) => f.mean ?? 0),
            backgroundColor: rows.map((f) => CSF_FUNCTIONS[f.code].color),
            borderWidth: 0,
            barThickness: 16,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        layout: { padding: { right: 12 } },
        scales: {
          x: {
            min: 0,
            max: 4,
            ticks: { stepSize: 1, font: { family: "'IBM Plex Mono', monospace", size: 10 } },
            grid: { color: INK.rule, drawTicks: false },
            border: { color: INK.ruleStrong },
          },
          y: {
            ticks: { font: { family: "'IBM Plex Mono', monospace", size: 11 }, color: INK.ink2 },
            grid: { display: false },
            border: { color: INK.ruleStrong },
          },
        },
        plugins: {
          tooltip: {
            callbacks: {
              title: (items) => {
                const f = rows[items[0].dataIndex];
                return `${f.code} ${f.name}`;
              },
              label: (item) => {
                const f = rows[item.dataIndex];
                if (f.mean === null) return 'Not assessed';
                return `Mean ${f.mean.toFixed(2)} of 4 · ${f.openGaps} gap${f.openGaps === 1 ? '' : 's'}`;
              },
            },
          },
        },
      },
    };
  });

  /** Zero-padded rank for the priority list. */
  protected rank(i: number): string {
    return String(i + 1).padStart(2, '0');
  }

  constructor() {
    void this.reload();
  }

  protected async reload(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      await this.nist.load();
      const list = await this.api.list();
      this.assessments.set(list);
      if (list.length) {
        await this.select(this.selectedId() ?? list[0]._id);
      }
    } catch {
      this.error.set('Could not load your assessments. Is the API running?');
    } finally {
      this.loading.set(false);
    }
  }

  protected async select(id: string): Promise<void> {
    this.selectedId.set(id);
    this.scores.set(null);
    this.findings.set([]);
    try {
      const [scores, findings] = await Promise.all([
        this.api.getScores(id),
        this.api.getFindings(id, { limit: 6 }),
      ]);
      this.scores.set(scores);
      this.findings.set(findings);
    } catch {
      /* a scoring failure should not blank the whole register */
    }
  }

  protected async create(): Promise<void> {
    if (this.creating()) return;
    this.createError.set('');
    if (!this.form.name.trim()) {
      this.createError.set('Give the assessment a name.');
      return;
    }

    this.creating.set(true);
    try {
      const created = await this.api.create({
        name: this.form.name.trim(),
        industry: this.form.industry.trim(),
        scope: this.form.scope.trim(),
        targetTier: Number(this.form.targetTier),
      });
      this.router.navigate(['/assessments', created._id]);
    } catch {
      this.createError.set('Could not create the assessment.');
    } finally {
      this.creating.set(false);
    }
  }

  protected async remove(a: Assessment, event: Event): Promise<void> {
    event.stopPropagation();
    if (!confirm(`Delete "${a.name}"? Its responses and findings go with it.`)) return;
    await this.api.remove(a._id);
    if (this.selectedId() === a._id) this.selectedId.set(null);
    await this.reload();
  }
}
