import { FunctionCode, ImpactKey, Severity } from './models/nist.model';

/**
 * Visual identity for the six CSF 2.0 Functions.
 *
 * Every place a Function appears -- nav, chart series, badges, table rules,
 * report margins -- pulls its colour and glyph from here, so the framework's
 * own structure carries the design rather than being decoration applied on top.
 *
 * Glyphs are hand-drawn on a single 24x24 grid with a uniform 1.5 stroke, no
 * fills and no rounded joins, to match the engraved feel of the rest of the UI.
 * They are deliberately not from an icon set: each one depicts what its
 * Function actually does.
 */
export interface CsfFunctionIdentity {
  code: FunctionCode;
  name: string;
  /** CSS colour, mirrored from the --color-* tokens in styles.css. */
  color: string;
  /** Faint wash of the same hue, for selected rows and chart fills. */
  wash: string;
  /** Tailwind-ready text/border/bg class fragments are avoided on purpose --
   *  the colour is applied inline so a single source stays authoritative. */
  glyph: string[];
  /** One plain sentence, ours not NIST's, for nav tooltips and empty states. */
  gist: string;
}

export const CSF_FUNCTIONS: Record<FunctionCode, CsfFunctionIdentity> = {
  GV: {
    code: 'GV',
    name: 'Govern',
    color: '#5b4b7d',
    wash: 'rgba(91, 75, 125, 0.09)',
    // A balance scale: strategy weighed against risk.
    glyph: [
      'M12 4.5v15',
      'M7.5 19.5h9',
      'M3.5 8.5h17',
      'M6.5 8.5 3.5 14.5h6z',
      'M17.5 8.5l-3 6h6z',
    ],
    gist: 'How cybersecurity risk is decided, owned and overseen.',
  },
  ID: {
    code: 'ID',
    name: 'Identify',
    color: '#2f6b5f',
    wash: 'rgba(47, 107, 95, 0.09)',
    // An inventory grid with one cell under a lens.
    glyph: [
      'M3.5 4.5h7v7h-7z',
      'M13.5 4.5h7v7h-7z',
      'M3.5 14.5h7v7h-7z',
      'M20 17.8a3.4 3.4 0 1 1-6.8 0 3.4 3.4 0 0 1 6.8 0z',
      'M19.4 20.4 21.8 22.8',
    ],
    gist: 'What you own, what it is worth, and what threatens it.',
  },
  PR: {
    code: 'PR',
    name: 'Protect',
    color: '#2a5c8a',
    wash: 'rgba(42, 92, 138, 0.09)',
    // A shield with a keyhole.
    glyph: [
      'M12 3 4.5 6v6.4c0 4.5 3.1 7.7 7.5 9.1 4.4-1.4 7.5-4.6 7.5-9.1V6z',
      'M13.4 11a1.4 1.4 0 1 0-2.8 0 1.4 1.4 0 0 0 2.8 0z',
      'M12 12.4v3.2',
    ],
    gist: 'The safeguards that keep the bad outcome from happening.',
  },
  DE: {
    code: 'DE',
    name: 'Detect',
    color: '#a9722f',
    wash: 'rgba(169, 114, 47, 0.09)',
    // A radar sweep with a contact.
    glyph: [
      'M12 3.5a8.5 8.5 0 1 0 8.5 8.5',
      'M12 7.8a4.2 4.2 0 1 0 4.2 4.2',
      'M12 12 20.3 3.7',
      'M16.6 15.6a1.3 1.3 0 1 0-2.6 0 1.3 1.3 0 0 0 2.6 0z',
    ],
    gist: 'Noticing that something has gone wrong, quickly.',
  },
  RS: {
    code: 'RS',
    name: 'Respond',
    color: '#a63d40',
    wash: 'rgba(166, 61, 64, 0.09)',
    // An incident waveform spiking off the baseline.
    glyph: [
      'M2.5 13.5h3.8l2.4-7.2 3.9 13.4 2.4-6.2h6.5',
    ],
    gist: 'Containing and communicating once an incident is real.',
  },
  RC: {
    code: 'RC',
    name: 'Recover',
    color: '#4e7a3b',
    wash: 'rgba(78, 122, 59, 0.09)',
    // A restore arc over a recovering trend line.
    glyph: [
      'M20.5 12a8.5 8.5 0 1 1-2.7-6.2',
      'M20.9 3.2v4.3h-4.3',
      'M7.8 14.2l2.6-2.6 2.1 2.1 3.2-3.6',
    ],
    gist: 'Getting back to normal, on a timeline you chose in advance.',
  },
};

export const FUNCTION_ORDER: FunctionCode[] = ['GV', 'ID', 'PR', 'DE', 'RS', 'RC'];

export const fnIdentity = (code: FunctionCode | string): CsfFunctionIdentity =>
  CSF_FUNCTIONS[code as FunctionCode] ?? CSF_FUNCTIONS.GV;

export const fnColor = (code: FunctionCode | string): string => fnIdentity(code).color;

/** Severity colours, mirrored from the --color-sev-* tokens. */
export const SEVERITY_COLOR: Record<Severity, string> = {
  Low: '#6b7f6a',
  Medium: '#b08544',
  High: '#b4622f',
  Critical: '#8c2f27',
};

export const SEVERITY_ORDER: Severity[] = ['Critical', 'High', 'Medium', 'Low'];

export const IMPACT_LABEL: Record<ImpactKey, string> = {
  low: 'Low',
  moderate: 'Moderate',
  high: 'High',
  critical: 'Critical',
};

/** Shared ink palette, so charts and SVG match the CSS tokens exactly. */
export const INK = {
  paper: '#faf8f3',
  paper2: '#f4f0e7',
  ink: '#1c1917',
  ink2: '#514a42',
  ink3: '#857c70',
  rule: '#ded6c6',
  ruleStrong: '#b9ae99',
  accent: '#8c2f27',
} as const;
