import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ChartConfiguration } from 'chart.js';

import { AssessmentService } from '../../core/services/assessment.service';
import { NistService } from '../../core/services/nist.service';
import { AssessmentReport, Finding } from '../../core/models/assessment.model';
import { FunctionCode, Severity } from '../../core/models/nist.model';
import { CSF_FUNCTIONS, INK, SEVERITY_COLOR, SEVERITY_ORDER } from '../../core/csf';

import { ShellComponent } from '../../shared/shell';
import { CsfGlyphComponent, IconComponent } from '../../shared/icon';
import { TierMeterComponent } from '../../shared/tier-meter';
import { ChartComponent } from '../../shared/chart';

@Component({
  selector: 'app-report',
  standalone: true,
  imports: [
    DatePipe,
    DecimalPipe,
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
      @if (loading()) {
        <div class="py-16">
          <div class="space-y-3">
            @for (i of [0, 1, 2]; track i) {
              <div class="h-px w-full origin-left animate-sweep bg-[var(--color-rule)]" [style.animation-delay.ms]="i * 90"></div>
            }
          </div>
          <p class="pt-6 text-[12px] text-[var(--color-ink-3)]">Compiling the report&hellip;</p>
        </div>
      } @else if (!report()) {
        <p class="py-16 text-[14px] text-[var(--color-ink-2)]">That report could not be generated.</p>
        <a routerLink="/dashboard" class="btn btn-ghost">Back to the register</a>
      } @else if (report(); as r) {
        <!-- ================================================ colophon -->
        <header class="mb-12">
          <div class="flex flex-wrap items-center justify-between gap-4 no-print">
            <a [routerLink]="['/assessments', r.assessment.id]" class="btn btn-quiet -ml-2">
              <app-icon name="arrow-left" [size]="14" />
              Back to the assessment
            </a>
            <div class="flex gap-2">
              <button class="btn btn-ghost" (click)="print()">
                <app-icon name="print" [size]="14" />
                Print
              </button>
              <button class="btn btn-ghost" (click)="downloadJson()">
                <app-icon name="download" [size]="14" />
                Export JSON
              </button>
            </div>
          </div>

          <div class="mt-8 border-t-2 border-[var(--color-ink)] pt-6">
            <div class="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
              <div class="section-mark">Posture &amp; gap analysis</div>
              <div class="section-mark">
                Generated {{ r.generatedAt | date: 'd MMMM yyyy, HH:mm' }}
              </div>
            </div>

            <h1 class="mt-5 max-w-[20ch] text-[clamp(2.2rem,5vw,3.4rem)] leading-[1.02] tracking-[-0.03em] text-balance">
              {{ r.assessment.name }}
            </h1>

            <dl class="mt-8 grid grid-cols-2 gap-x-8 gap-y-4 border-t border-[var(--color-rule)] pt-5 sm:grid-cols-4">
              @for (item of colophon(); track item.label) {
                <div>
                  <dt class="section-mark">{{ item.label }}</dt>
                  <dd class="mt-1 text-[13px] text-[var(--color-ink)]">{{ item.value }}</dd>
                </div>
              }
            </dl>
          </div>
        </header>

        @if (r.overall.answered === 0) {
          <section class="border-l-2 border-[var(--color-rule-strong)] py-5 pl-6">
            <h2 class="text-[1.4rem]">Nothing to report yet</h2>
            <p class="mt-2 max-w-[54ch] text-[13.5px] leading-relaxed text-[var(--color-ink-2)]">
              No subcategories have been scored on this assessment. Record even a
              handful and this page fills in &mdash; partial coverage is reported
              honestly rather than being padded with zeros.
            </p>
            <a [routerLink]="['/assessments', r.assessment.id]" class="btn btn-primary mt-6">
              Start scoring
              <app-icon name="arrow-right" [size]="14" />
            </a>
          </section>
        } @else {
          <!-- ======================================= executive summary -->
          <section class="mb-16">
            <div class="grid gap-x-14 gap-y-8 lg:grid-cols-12">
              <div class="min-w-0 lg:col-span-8">
                <div class="section-mark mb-4">&sect;01 &middot; In summary</div>
                <p class="max-w-[62ch] text-[17px] leading-[1.6] tracking-[-0.005em] text-[var(--color-ink)] text-pretty">
                  {{ r.executiveSummary }}
                </p>

                @if (r.overall.weakestFunction && r.overall.strongestFunction) {
                  <div class="mt-9 grid gap-6 sm:grid-cols-2">
                    <div class="border-t-2 pt-4" [style.border-color]="fns[r.overall.weakestFunction.code].color">
                      <div class="section-mark mb-2">Weakest</div>
                      <div class="flex items-center gap-2.5">
                        <app-csf-glyph [fn]="r.overall.weakestFunction.code" [size]="20" />
                        <span class="text-[15px]">{{ r.overall.weakestFunction.name }}</span>
                        <span class="figure ml-auto text-[15px]">{{ r.overall.weakestFunction.mean | number: '1.1-1' }}</span>
                      </div>
                    </div>
                    <div class="border-t-2 pt-4" [style.border-color]="fns[r.overall.strongestFunction.code].color">
                      <div class="section-mark mb-2">Strongest</div>
                      <div class="flex items-center gap-2.5">
                        <app-csf-glyph [fn]="r.overall.strongestFunction.code" [size]="20" />
                        <span class="text-[15px]">{{ r.overall.strongestFunction.name }}</span>
                        <span class="figure ml-auto text-[15px]">{{ r.overall.strongestFunction.mean | number: '1.1-1' }}</span>
                      </div>
                    </div>
                  </div>
                }
              </div>

              <!-- headline figure, set as a margin note -->
              <aside class="min-w-0 lg:col-span-4 lg:border-l lg:border-[var(--color-rule)] lg:pl-10">
                <div class="section-mark mb-3">Overall maturity</div>
                <div class="flex items-end gap-2">
                  <span class="figure text-[4rem] leading-[0.8] tracking-[-0.04em]">{{ r.overall.mean | number: '1.2-2' }}</span>
                  <span class="figure mb-1.5 text-[13px] text-[var(--color-ink-3)]">/ 4</span>
                </div>
                <div class="mt-4">
                  <app-tier-meter
                    [value]="r.overall.mean"
                    [target]="r.overall.targetTier"
                    [showValue]="false"
                    [segWidth]="18"
                    color="var(--color-ink)"
                  />
                </div>
                <p class="mt-3 text-[11.5px] leading-relaxed text-[var(--color-ink-3)]">
                  The vertical rule marks the target tier of
                  {{ r.overall.targetTier }} &mdash; {{ r.overall.targetLabel }}.
                </p>

                <dl class="mt-7 space-y-0 text-[12.5px]">
                  @for (row of summaryRows(); track row.label) {
                    <div class="flex items-baseline justify-between border-b border-[var(--color-rule)] py-2">
                      <dt class="text-[var(--color-ink-2)]">{{ row.label }}</dt>
                      <dd class="figure" [style.color]="row.color">{{ row.value }}</dd>
                    </div>
                  }
                </dl>
              </aside>
            </div>
          </section>

          <!-- ============================================= scorecard -->
          <section class="mb-16 print-break">
            <div class="ruled-head mb-7">
              <span class="section-mark">&sect;02 &middot; Scorecard</span>
            </div>

            <div class="grid gap-x-14 gap-y-10 lg:grid-cols-12">
              <figure class="min-w-0 lg:col-span-5">
                <app-chart [config]="radarChart()!" [height]="330" />
                <figcaption class="mt-3 flex gap-3 text-[11.5px] leading-relaxed text-[var(--color-ink-3)]">
                  <span class="section-mark shrink-0">Fig. 2</span>
                  <span>
                    Maturity across the six functions. The dashed ring is the target
                    tier; anything inside it is a gap.
                  </span>
                </figcaption>
              </figure>

              <div class="min-w-0 lg:col-span-7">
                <div class="ledger-wrap">
                <table class="ledger">
                  <thead>
                    <tr>
                      <th class="w-[30%]">Function</th>
                      <th>Scored</th>
                      <th class="w-[24%]">Maturity</th>
                      <th class="text-right">Mean</th>
                      <th class="text-right">Gaps</th>
                      <th class="text-right">Crit/High</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (f of r.functions; track f.code) {
                      <tr>
                        <td>
                          <div class="flex items-center gap-2.5">
                            <app-csf-glyph [fn]="f.code" [size]="17" />
                            <div>
                              <span class="font-mono text-[10px] tracking-[0.1em]" [style.color]="fns[f.code].color">{{ f.code }}</span>
                              <span class="ml-1.5 text-[13px]">{{ f.name }}</span>
                            </div>
                          </div>
                        </td>
                        <td class="figure text-[12px] text-[var(--color-ink-3)]">{{ f.answered }}/{{ f.total }}</td>
                        <td>
                          <app-tier-meter
                            [value]="f.mean"
                            [target]="r.overall.targetTier"
                            [color]="fns[f.code].color"
                            [showValue]="false"
                            [segWidth]="9"
                          />
                        </td>
                        <td class="figure text-right text-[13px]">{{ f.mean === null ? '--' : (f.mean | number: '1.2-2') }}</td>
                        <td class="figure text-right text-[12px]">{{ f.openGaps }}</td>
                        <td class="figure text-right text-[12px]" [style.color]="f.gapsBySeverity.Critical + f.gapsBySeverity.High ? 'var(--color-accent)' : 'var(--color-ink-3)'">
                          {{ f.gapsBySeverity.Critical + f.gapsBySeverity.High }}
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
                </div>

                <!-- category breakdown, indented under its function -->
                <details class="mt-7 no-print">
                  <summary class="inline-flex cursor-pointer list-none items-center gap-2 text-[12px] text-[var(--color-ink-2)] hover:text-[var(--color-accent)]">
                    <app-icon name="chevron-right" [size]="12" />
                    All {{ r.categories.length }} categories
                  </summary>
                  <div class="ledger-wrap mt-5">
                  <table class="ledger">
                    <thead>
                      <tr>
                        <th class="w-[46%]">Category</th>
                        <th>Scored</th>
                        <th class="text-right">Mean</th>
                        <th class="text-right">Gaps</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (c of r.categories; track c.code) {
                        <tr>
                          <td>
                            <span class="font-mono text-[10.5px]" [style.color]="fns[c.functionCode].color">{{ c.code }}</span>
                            <span class="ml-2 text-[12.5px] text-[var(--color-ink-2)]">{{ c.name }}</span>
                          </td>
                          <td class="figure text-[11.5px] text-[var(--color-ink-3)]">{{ c.answered }}/{{ c.total }}</td>
                          <td class="figure text-right text-[12px]">{{ c.mean === null ? '--' : (c.mean | number: '1.2-2') }}</td>
                          <td class="figure text-right text-[12px]">{{ c.openGaps }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                  </div>
                </details>
              </div>
            </div>
          </section>

          <!-- ========================================= findings register -->
          @if (r.findings.length) {
            <section class="mb-16 print-break">
              <div class="ruled-head mb-2">
                <span class="section-mark">&sect;03 &middot; Findings</span>
              </div>
              <p class="mb-7 max-w-[64ch] text-[12.5px] leading-relaxed text-[var(--color-ink-3)]">
                {{ r.findings.length }} findings, ranked by priority &mdash; the tier
                shortfall multiplied by the business impact recorded against that
                subcategory. A Medium finding on a business-critical control therefore
                outranks a High one on something peripheral.
              </p>

              <!-- severity filter -->
              <div class="mb-7 flex flex-wrap items-center gap-2 no-print">
                <span class="section-mark mr-1">Filter</span>
                <button
                  class="border px-2.5 py-1 text-[11px] transition-colors"
                  [style.border-color]="severityFilter() === null ? 'var(--color-ink)' : 'var(--color-rule-strong)'"
                  [style.background-color]="severityFilter() === null ? 'var(--color-ink)' : 'transparent'"
                  [style.color]="severityFilter() === null ? 'var(--color-paper)' : 'var(--color-ink-3)'"
                  (click)="severityFilter.set(null)"
                >All {{ r.findings.length }}</button>
                @for (sev of severityOrder; track sev) {
                  @if (countBySeverity(sev)) {
                    <button
                      class="border px-2.5 py-1 text-[11px] transition-colors"
                      [style.border-color]="severityFilter() === sev ? severityColor[sev] : 'var(--color-rule-strong)'"
                      [style.background-color]="severityFilter() === sev ? severityColor[sev] : 'transparent'"
                      [style.color]="severityFilter() === sev ? 'var(--color-paper)' : 'var(--color-ink-3)'"
                      (click)="severityFilter.set(sev)"
                    >{{ sev }} {{ countBySeverity(sev) }}</button>
                  }
                }
              </div>

              <ol class="border-t-2 border-[var(--color-ink)]">
                @for (f of visibleFindings(); track f._id; let i = $index) {
                  <li class="grid gap-x-8 gap-y-3 border-b border-[var(--color-rule)] py-7 lg:grid-cols-12">
                    <!-- left: identity -->
                    <div class="lg:col-span-3">
                      <div class="flex items-baseline gap-2.5">
                        <span class="figure text-[11px] text-[var(--color-ink-3)]">{{ rank(i) }}</span>
                        <span class="font-mono text-[13px] font-500" style="font-weight: 500">{{ f.subcategoryCode }}</span>
                      </div>
                      <div class="mt-2 flex items-center gap-2">
                        <app-csf-glyph [fn]="f.functionCode" [size]="14" />
                        <span class="text-[11.5px] text-[var(--color-ink-3)]">{{ fns[f.functionCode].name }}</span>
                      </div>
                      <div class="mt-3 flex flex-wrap items-center gap-1.5">
                        <span class="stamp" [style.color]="severityColor[f.severity]">{{ f.severity.toUpperCase() }}</span>
                        @if (f.source === 'manual') {
                          <span class="stamp text-[var(--color-ink-3)]">MANUAL</span>
                        }
                      </div>
                    </div>

                    <!-- middle: what and why -->
                    <div class="lg:col-span-6">
                      <p class="text-[13.5px] leading-[1.6] text-[var(--color-ink)]">{{ f.statement }}</p>
                      @if (f.impactNote) {
                        <p class="mt-2.5 text-[12px] leading-relaxed text-[var(--color-ink-3)]">{{ f.impactNote }}</p>
                      }
                      @if (f.recommendation) {
                        <div class="mt-3.5 border-l-2 pl-4" [style.border-color]="fns[f.functionCode].color">
                          <div class="section-mark mb-1">Recommendation</div>
                          <p class="text-[12.5px] leading-[1.65] text-[var(--color-ink-2)]">{{ f.recommendation }}</p>
                        </div>
                      }
                    </div>

                    <!-- right: the numbers -->
                    <div class="lg:col-span-3 lg:text-right">
                      <div class="section-mark mb-1.5">Current &rarr; target</div>
                      <div class="figure text-[15px]">
                        {{ f.currentTier }} <span class="text-[var(--color-ink-3)]">&rarr;</span> {{ f.targetTier }}
                      </div>
                      <div class="mt-3 space-y-1 text-[11px] text-[var(--color-ink-3)]">
                        <div>Shortfall <span class="figure text-[var(--color-ink-2)]">{{ f.gap }}</span> tier{{ f.gap === 1 ? '' : 's' }}</div>
                        <div>Impact <span class="text-[var(--color-ink-2)]">{{ f.businessImpact }}</span></div>
                        <div>Priority <span class="figure text-[var(--color-ink-2)]">{{ f.priorityScore | number: '1.2-2' }}</span></div>
                      </div>
                    </div>
                  </li>
                }
              </ol>
            </section>
          }

          <!-- ============================================== appendix -->
          <section class="mb-16 print-break">
            <div class="ruled-head mb-2">
              <span class="section-mark">&sect;04 &middot; Appendix &mdash; recorded responses</span>
            </div>
            <p class="mb-6 text-[12.5px] text-[var(--color-ink-3)]">
              Every subcategory scored on this assessment, in NIST's order.
            </p>

            <div class="ledger-wrap">
            <table class="ledger">
              <thead>
                <tr>
                  <th class="w-[12%]">Code</th>
                  <th class="w-[44%]">Subcategory</th>
                  <th>Recorded</th>
                  <th>Impact</th>
                  <th class="text-right">Gap</th>
                </tr>
              </thead>
              <tbody>
                @for (row of r.responses; track row.code) {
                  <tr>
                    <td>
                      <span class="font-mono text-[11.5px]" [style.color]="fns[row.functionCode].color">{{ row.code }}</span>
                    </td>
                    <td>
                      <span class="text-[12.5px] leading-snug text-[var(--color-ink-2)]">{{ row.statement }}</span>
                      @if (row.notes) {
                        <p class="mt-1.5 border-l border-[var(--color-rule-strong)] pl-2.5 text-[11.5px] italic text-[var(--color-ink-3)]">
                          {{ row.notes }}
                        </p>
                      }
                    </td>
                    <td class="text-[12px] whitespace-nowrap" [style.color]="row.notApplicable ? 'var(--color-ink-3)' : 'var(--color-ink)'">
                      @if (!row.notApplicable) {
                        <span class="figure">{{ row.tier }}</span>
                      }
                      {{ row.tierLabel }}
                    </td>
                    <td class="text-[11.5px] text-[var(--color-ink-3)]">{{ row.notApplicable ? '--' : row.businessImpact }}</td>
                    <td class="text-right">
                      @if (row.severity) {
                        <span class="stamp" [style.color]="severityColor[row.severity]">{{ row.gap }}</span>
                      } @else {
                        <span class="figure text-[11.5px] text-[var(--color-ink-3)]">&mdash;</span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
            </div>
          </section>

          <!-- ========================================== methodology -->
          <section class="border-t border-[var(--color-rule)] pt-7">
            <div class="section-mark mb-5">&sect;05 &middot; How these numbers were produced</div>
            <div class="grid gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
              @for (m of methodologyItems(); track m.label) {
                <div>
                  <div class="mb-1.5 text-[12px] font-500" style="font-weight: 500">{{ m.label }}</div>
                  <p class="text-[11.5px] leading-[1.6] text-[var(--color-ink-3)]">{{ m.body }}</p>
                </div>
              }
            </div>
            <p class="mt-9 border-t border-[var(--color-rule)] pt-4 text-[11px] text-[var(--color-ink-3)]">
              Taxonomy: NIST Cybersecurity Framework 2.0 Core (February 2024) &mdash;
              6 functions, 22 categories, 106 subcategories. Subcategory statements and
              implementation examples are quoted from NIST's published Core.
            </p>
          </section>
        }
      }
    </app-shell>
  `,
})
export class ReportPage {
  private api = inject(AssessmentService);
  protected nist = inject(NistService);

  /** Bound from the route ':id' via withComponentInputBinding(). */
  readonly id = input.required<string>();

  protected readonly fns = CSF_FUNCTIONS;
  protected readonly severityColor = SEVERITY_COLOR;
  protected readonly severityOrder = SEVERITY_ORDER;

  protected readonly report = signal<AssessmentReport | null>(null);
  protected readonly loading = signal(true);
  protected readonly severityFilter = signal<Severity | null>(null);

  protected readonly visibleFindings = computed<Finding[]>(() => {
    const r = this.report();
    if (!r) return [];
    const sev = this.severityFilter();
    return sev ? r.findings.filter((f) => f.severity === sev) : r.findings;
  });

  protected readonly colophon = computed(() => {
    const r = this.report();
    if (!r) return [];
    const a = r.assessment;
    return [
      { label: 'Organisation', value: a.organizationName || '--' },
      { label: 'Industry', value: a.industry || '--' },
      { label: 'Scope', value: a.scope || '--' },
      { label: 'Status', value: a.status === 'completed' ? 'Completed' : 'In progress' },
    ];
  });

  protected readonly summaryRows = computed(() => {
    const r = this.report();
    if (!r) return [];
    const o = r.overall;
    return [
      { label: 'Coverage', value: `${o.answered} / ${o.totalSubcategories}`, color: 'var(--color-ink)' },
      { label: 'At or above target', value: String(o.atOrAboveTarget), color: 'var(--color-rc)' },
      { label: 'Below target', value: String(o.openGaps), color: 'var(--color-accent)' },
      { label: 'Critical findings', value: String(o.gapsBySeverity.Critical), color: SEVERITY_COLOR.Critical },
      { label: 'High findings', value: String(o.gapsBySeverity.High), color: SEVERITY_COLOR.High },
      { label: 'Not applicable', value: String(o.notApplicable), color: 'var(--color-ink-3)' },
    ];
  });

  protected readonly methodologyItems = computed(() => {
    const r = this.report();
    if (!r) return [];
    return [
      { label: 'Scale', body: r.methodology.scale },
      { label: 'Roll-up', body: r.methodology.rollUp },
      { label: 'Exclusions', body: r.methodology.exclusions },
      { label: 'Prioritisation', body: r.methodology.prioritisation },
    ];
  });

  /**
   * Fig. 2 -- maturity across the six functions, with the target drawn as a
   * dashed ring so the gap is the visible area between the two shapes.
   */
  protected readonly radarChart = computed<ChartConfiguration | null>(() => {
    const r = this.report();
    if (!r) return null;

    const rows = r.functions;
    const target = r.overall.targetTier;

    return {
      type: 'radar',
      data: {
        labels: rows.map((f) => f.code),
        datasets: [
          {
            label: 'Target',
            data: rows.map(() => target),
            borderColor: INK.ink3,
            borderWidth: 1,
            borderDash: [4, 3],
            pointRadius: 0,
            fill: false,
          },
          {
            label: 'Current',
            data: rows.map((f) => f.mean ?? 0),
            borderColor: INK.accent,
            backgroundColor: 'rgba(140, 47, 39, 0.11)',
            borderWidth: 1.5,
            pointBackgroundColor: rows.map((f) => CSF_FUNCTIONS[f.code].color),
            pointBorderColor: INK.paper,
            pointBorderWidth: 1.5,
            pointRadius: 4,
            fill: true,
          },
        ],
      },
      options: {
        scales: {
          r: {
            min: 0,
            max: 4,
            ticks: {
              stepSize: 1,
              font: { family: "'IBM Plex Mono', monospace", size: 9 },
              color: INK.ink3,
              backdropColor: 'transparent',
            },
            grid: { color: INK.rule },
            angleLines: { color: INK.rule },
            pointLabels: {
              font: { family: "'IBM Plex Mono', monospace", size: 11, weight: 500 },
              color: INK.ink2,
            },
          },
        },
        plugins: {
          tooltip: {
            callbacks: {
              title: (items) => {
                const f = rows[items[0].dataIndex];
                return `${f.code} ${f.name}`;
              },
              label: (item) =>
                item.datasetIndex === 0
                  ? `Target ${target}`
                  : `Current ${(rows[item.dataIndex].mean ?? 0).toFixed(2)}`,
            },
          },
        },
      },
    };
  });

  constructor() {
    effect(() => {
      const id = this.id();
      if (id) void this.load(id);
    });
  }

  private async load(id: string): Promise<void> {
    this.loading.set(true);
    try {
      await this.nist.load();
      this.report.set(await this.api.getReport(id));
    } catch {
      this.report.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  protected countBySeverity(sev: Severity): number {
    return this.report()?.findings.filter((f) => f.severity === sev).length ?? 0;
  }

  protected rank(i: number): string {
    return String(i + 1).padStart(2, '0');
  }

  protected print(): void {
    window.print();
  }

  /** The API's report payload, saved as-is -- useful as an evidence artefact. */
  protected downloadJson(): void {
    const r = this.report();
    if (!r) return;

    const blob = new Blob([JSON.stringify(r, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const slug = r.assessment.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const a = document.createElement('a');
    a.href = url;
    a.download = `nistguard-${slug || 'report'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
