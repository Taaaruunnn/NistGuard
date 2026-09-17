import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';

/**
 * The maturity meter used everywhere a 0-4 tier is shown.
 *
 * Drawn as discrete ticks rather than a continuous progress bar, because the
 * tier scale is ordinal: "2.4 out of 4" is four graded steps, not a
 * percentage. The target tier is marked with a vertical rule so the gap is
 * visible without reading any numbers.
 */
@Component({
  selector: 'app-tier-meter',
  standalone: true,
  imports: [DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-center gap-2" [attr.aria-label]="label()">
      <div class="relative flex items-center gap-[3px]">
        @for (seg of segments(); track $index) {
          <span
            class="block h-[9px] transition-[background-color] duration-300"
            [style.width.px]="segWidth()"
            [style.background-color]="seg.fill"
          ></span>
        }

        @if (showTarget() && target() !== null) {
          <!-- target marker: a hairline dropped between the target ticks -->
          <span
            class="pointer-events-none absolute -top-[3px] block w-px bg-[var(--color-ink)]"
            style="height: 15px"
            [style.left.px]="targetOffset()"
            [title]="'Target: tier ' + target()"
          ></span>
        }
      </div>

      @if (showValue()) {
        <span class="figure text-[11px] text-[var(--color-ink-2)] tabular-nums">
          {{ value() === null ? '--' : (value() | number: '1.1-1') }}<span class="text-[var(--color-ink-3)]">/{{ max() }}</span>
        </span>
      }
    </div>
  `,
})
export class TierMeterComponent {
  readonly value = input.required<number | null>();
  readonly max = input(4);
  readonly target = input<number | null>(null);
  readonly color = input('#1c1917');
  readonly showValue = input(true);
  readonly showTarget = input(true);
  readonly segWidth = input(14);
  readonly ticks = input(8);

  protected readonly label = computed(() =>
    this.value() === null ? 'Not assessed' : `Maturity ${this.value()} of ${this.max()}`
  );

  /**
   * Each tick is either fully inked, partially inked (the one straddling the
   * value) or empty. Partial fill is expressed as opacity so a 2.4 reads
   * distinctly from a 2.0 without inventing a fractional tick width.
   */
  protected readonly segments = computed(() => {
    const v = this.value();
    const n = this.ticks();
    const perTick = this.max() / n;
    const empty = 'var(--color-paper-3)';

    return Array.from({ length: n }, (_, i) => {
      if (v === null) return { fill: empty };
      const filled = (v - i * perTick) / perTick;
      if (filled >= 1) return { fill: this.color() };
      if (filled <= 0) return { fill: empty };
      return { fill: this.mix(this.color(), filled) };
    });
  });

  protected readonly targetOffset = computed(() => {
    const t = this.target();
    if (t === null) return 0;
    const n = this.ticks();
    const ticksIntoTarget = (t / this.max()) * n;
    // width of a tick + the 3px gap between ticks
    return ticksIntoTarget * (this.segWidth() + 3) - 1.5;
  });

  /** Fade toward the paper colour rather than to transparent, to keep the
   *  tick legible on the textured background. */
  private mix(color: string, amount: number): string {
    return `color-mix(in srgb, ${color} ${Math.round(amount * 100)}%, var(--color-paper-3))`;
  }
}
