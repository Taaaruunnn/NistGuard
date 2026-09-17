export type FunctionCode = 'GV' | 'ID' | 'PR' | 'DE' | 'RS' | 'RC';

export interface NistFunction {
  _id: string;
  code: FunctionCode;
  name: string;
  description: string;
  order: number;
}

export interface NistCategory {
  _id: string;
  code: string;
  functionCode: FunctionCode;
  name: string;
  description: string;
  order: number;
}

export interface NistSubcategory {
  _id: string;
  code: string;
  categoryCode: string;
  functionCode: FunctionCode;
  statement: string;
  implementationExamples: string[];
  order: number;
}

/** The nested shape returned by GET /nist/core. */
export interface CoreCategory extends NistCategory {
  subcategories: NistSubcategory[];
}
export interface CoreFunction extends NistFunction {
  categories: CoreCategory[];
}
export interface CsfCore {
  functions: CoreFunction[];
  counts: { functions: number; categories: number; subcategories: number };
}

export interface Tier {
  value: number;
  key: string;
  label: string;
  blurb: string;
}

export interface ImpactLevel {
  key: ImpactKey;
  label: string;
  weight: number;
}

export type ImpactKey = 'low' | 'moderate' | 'high' | 'critical';
export type Severity = 'Low' | 'Medium' | 'High' | 'Critical';

export interface CsfMeta {
  tiers: Tier[];
  impactLevels: ImpactLevel[];
  severities: Severity[];
  defaultTargetTier: number;
}
