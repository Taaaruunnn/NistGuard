import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { CSF_FUNCTIONS } from '../core/csf';
import { FunctionCode } from '../core/models/nist.model';

/**
 * The entire icon set, hand-drawn on one 24x24 grid with a uniform 1.5 stroke,
 * butt caps and mitre joins. No icon library is used anywhere in the app, so
 * there is nothing to drift out of style. Keep additions to this one file and
 * to the same grid and stroke.
 */
const UI_GLYPHS: Record<string, string[]> = {
  'arrow-right': ['M4 12h15', 'M13 6l6 6-6 6'],
  'arrow-left': ['M20 12H5', 'M11 18l-6-6 6-6'],
  'chevron-down': ['M5 9l7 7 7-7'],
  'chevron-right': ['M9 5l7 7-7 7'],
  check: ['M4 12.5l5.5 5.5L20 6.5'],
  plus: ['M12 4v16', 'M4 12h16'],
  minus: ['M4 12h16'],
  close: ['M5 5l14 14', 'M19 5L5 19'],
  print: ['M7 9V3.5h10V9', 'M5 9h14v8h-3', 'M8 17H5', 'M7.5 14h9v6.5h-9z'],
  download: ['M12 3.5v12', 'M7 11l5 5 5-5', 'M4 20.5h16'],
  file: ['M6 3h8l4 4v14H6z', 'M14 3v4h4', 'M9 12h6', 'M9 16h6'],
  target: [
    'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17z',
    'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
    'M12 11.2a.8.8 0 1 0 0 1.6.8.8 0 0 0 0-1.6z',
  ],
  gap: ['M3 12h6', 'M15 12h6', 'M9 7v10', 'M15 7v10'],
  flag: ['M6 21V4', 'M6 4.5h12l-2.5 4 2.5 4H6'],
  clock: ['M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17z', 'M12 7v5.4l3.6 2.1'],
  user: ['M12 4a3.8 3.8 0 1 0 0 7.6A3.8 3.8 0 0 0 12 4z', 'M4.5 20.5c0-3.9 3.4-6.3 7.5-6.3s7.5 2.4 7.5 6.3'],
  logout: ['M14 4.5H5v15h9', 'M18.5 12H10', 'M15 8l4 4-4 4'],
  layers: ['M12 3.5 3 8l9 4.5L21 8z', 'M3 12.5 12 17l9-4.5', 'M3 17 12 21.5 21 17'],
  note: ['M4.5 4.5h15v15h-15z', 'M8 9h8', 'M8 12.5h8', 'M8 16h5'],
  sparkline: ['M3 17.5l4.5-5 3.5 3 4-7 6 9'],
  trash: ['M4.5 6.5h15', 'M9.5 6.5V4h5v2.5', 'M6.5 6.5l1 14h9l1-14', 'M10 10v7', 'M14 10v7'],
  book: ['M4 4.5h7a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H4z', 'M20 4.5h-7a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h7z'],
};

@Component({
  selector: 'app-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 24 24"
      fill="none"
      [attr.stroke]="color()"
      [attr.stroke-width]="weight()"
      stroke-linecap="butt"
      stroke-linejoin="miter"
      aria-hidden="true"
      focusable="false"
      class="shrink-0"
    >
      @for (d of paths(); track d) {
        <path [attr.d]="d" />
      }
    </svg>
  `,
})
export class IconComponent {
  readonly name = input.required<string>();
  readonly size = input(18);
  readonly color = input('currentColor');
  readonly weight = input(1.5);

  protected readonly paths = computed(() => UI_GLYPHS[this.name()] ?? []);
}

/**
 * The glyph belonging to a CSF Function. Separate from IconComponent because
 * these are identity marks, not UI affordances -- they always carry their
 * Function's colour unless told otherwise.
 */
@Component({
  selector: 'app-csf-glyph',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 24 24"
      fill="none"
      [attr.stroke]="resolvedColor()"
      [attr.stroke-width]="weight()"
      stroke-linecap="butt"
      stroke-linejoin="miter"
      aria-hidden="true"
      focusable="false"
      class="shrink-0"
    >
      @for (d of paths(); track d) {
        <path [attr.d]="d" />
      }
    </svg>
  `,
})
export class CsfGlyphComponent {
  readonly fn = input.required<FunctionCode>();
  readonly size = input(20);
  readonly weight = input(1.5);
  /** Pass 'currentColor' to let the glyph inherit the surrounding text colour. */
  readonly color = input<string | null>(null);

  protected readonly paths = computed(() => CSF_FUNCTIONS[this.fn()]?.glyph ?? []);
  protected readonly resolvedColor = computed(
    () => this.color() ?? CSF_FUNCTIONS[this.fn()]?.color ?? 'currentColor'
  );
}
