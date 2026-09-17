import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  input,
  OnDestroy,
  viewChild,
} from '@angular/core';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

import { INK } from '../core/csf';

/**
 * Thin standalone wrapper over Chart.js.
 *
 * ng2-charts is not used: its v10 release pins @angular/cdk >= 22, which
 * conflicts with this project's Angular 21. Driving Chart.js directly is a few
 * lines, removes the peer-dependency conflict, and lets the house style below
 * be applied globally rather than per chart.
 */
Chart.register(...registerables);

// House style: serif-free axis labels, hairline grids, no shadows, no legend
// boxes. Applied once so every chart in the app matches the printed look.
Chart.defaults.font.family = "'IBM Plex Sans', system-ui, sans-serif";
Chart.defaults.font.size = 11;
Chart.defaults.color = INK.ink3;
Chart.defaults.borderColor = INK.rule;
Chart.defaults.plugins.legend.display = false;
Chart.defaults.plugins.tooltip.backgroundColor = INK.ink;
Chart.defaults.plugins.tooltip.titleFont = { family: "'IBM Plex Mono', monospace", size: 11, weight: 500 };
Chart.defaults.plugins.tooltip.bodyFont = { family: "'IBM Plex Sans', sans-serif", size: 12 };
Chart.defaults.plugins.tooltip.cornerRadius = 0;
Chart.defaults.plugins.tooltip.padding = 10;
Chart.defaults.plugins.tooltip.displayColors = false;
Chart.defaults.maintainAspectRatio = false;

@Component({
  selector: 'app-chart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<canvas #canvas [style.height.px]="height()"></canvas>`,
  styles: [':host { display: block; width: 100%; }'],
})
export class ChartComponent implements OnDestroy {
  readonly config = input.required<ChartConfiguration>();
  readonly height = input(240);

  private canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private chart: Chart | null = null;

  constructor() {
    effect(() => {
      const cfg = this.config();
      const el = this.canvasRef().nativeElement;

      // Rebuild rather than patch: the configs here are small and swapping
      // datasets in place is a well-known source of stale-scale bugs. The
      // config is passed as-is (not cloned) because it legitimately carries
      // tooltip/tick callbacks, which are not structured-cloneable.
      this.chart?.destroy();
      this.chart = new Chart(el, cfg);
    });
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
    this.chart = null;
  }
}
