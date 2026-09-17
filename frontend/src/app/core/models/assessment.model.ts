import { FunctionCode, ImpactKey, Severity } from './nist.model';

export type AssessmentStatus = 'in-progress' | 'completed';

export interface Assessment {
  _id: string;
  user: string;
  name: string;
  organizationName: string;
  industry: string;
  scope: string;
  status: AssessmentStatus;
  targetTier: number;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Present on the list endpoint only. */
  answered?: number;
  totalSubcategories?: number;
}

export interface AssessmentResponse {
  _id?: string;
  assessment?: string;
  subcategory?: string;
  subcategoryCode: string;
  categoryCode?: string;
  functionCode?: FunctionCode;
  tier: number;
  notApplicable: boolean;
  businessImpact: ImpactKey;
  notes: string;
}

/** What the walkthrough sends when saving; the server fills in the rest. */
export interface ResponseInput {
  subcategoryCode: string;
  tier: number;
  notApplicable?: boolean;
  businessImpact?: ImpactKey;
  notes?: string;
}

export interface OverallScore {
  mean: number | null;
  score: number | null;
  targetTier: number;
  targetLabel: string;
  gapToTarget: number | null;
  totalSubcategories: number;
  answered: number;
  applicable: number;
  notApplicable: number;
  completion: number;
  openGaps: number;
  atOrAboveTarget: number;
  gapsBySeverity: Record<Severity, number>;
  strongestFunction: { code: FunctionCode; name: string; mean: number } | null;
  weakestFunction: { code: FunctionCode; name: string; mean: number } | null;
}

export interface CategoryScore {
  code: string;
  name: string;
  description: string;
  functionCode: FunctionCode;
  mean: number | null;
  score: number | null;
  gapToTarget: number | null;
  answered: number;
  applicable: number;
  total: number;
  notApplicable: number;
  openGaps: number;
  order: number;
}

export interface FunctionScore extends Omit<CategoryScore, 'functionCode'> {
  code: FunctionCode;
  gapsBySeverity: Record<Severity, number>;
  categories: CategoryScore[];
}

export interface ScoreReport {
  assessmentId: string;
  targetTier: number;
  targetLabel: string;
  overall: OverallScore;
  functions: FunctionScore[];
  categories: CategoryScore[];
}

export interface Finding {
  _id: string;
  assessment: string;
  subcategory: string;
  subcategoryCode: string;
  categoryCode: string;
  functionCode: FunctionCode;
  currentTier: number;
  targetTier: number;
  gap: number;
  severity: Severity;
  businessImpact: ImpactKey;
  priorityScore: number;
  impactNote: string;
  recommendation: string;
  source: 'auto' | 'manual';
  status: 'open' | 'accepted' | 'remediated';
  createdAt: string;
  /** Joined server-side from the CSF taxonomy. */
  statement?: string;
}

export interface ReportResponseRow {
  code: string;
  statement: string;
  functionCode: FunctionCode;
  categoryCode: string;
  tier: number;
  tierLabel: string;
  notApplicable: boolean;
  businessImpact: ImpactKey;
  gap: number | null;
  severity: Severity | null;
  notes: string;
}

export interface AssessmentReport {
  generatedAt: string;
  assessment: {
    id: string;
    name: string;
    organizationName: string;
    industry: string;
    scope: string;
    status: AssessmentStatus;
    targetTier: number;
    targetLabel: string;
    createdAt: string;
    completedAt: string | null;
  };
  methodology: {
    scale: string;
    rollUp: string;
    exclusions: string;
    prioritisation: string;
  };
  executiveSummary: string;
  overall: OverallScore;
  functions: FunctionScore[];
  categories: CategoryScore[];
  findings: Finding[];
  responses: ReportResponseRow[];
}
