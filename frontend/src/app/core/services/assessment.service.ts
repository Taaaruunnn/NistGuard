import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { apiUrl } from '../api-config';
import {
  Assessment,
  AssessmentReport,
  AssessmentResponse,
  Finding,
  OverallScore,
  ResponseInput,
  ScoreReport,
} from '../models/assessment.model';

export interface NewAssessment {
  name: string;
  organizationName?: string;
  industry?: string;
  scope?: string;
  targetTier?: number;
}

@Injectable({ providedIn: 'root' })
export class AssessmentService {
  private http = inject(HttpClient);

  list(): Promise<Assessment[]> {
    return firstValueFrom(this.http.get<Assessment[]>(apiUrl('/assessments')));
  }

  create(payload: NewAssessment): Promise<Assessment> {
    return firstValueFrom(this.http.post<Assessment>(apiUrl('/assessments'), payload));
  }

  get(id: string): Promise<{ assessment: Assessment; overall: OverallScore }> {
    return firstValueFrom(
      this.http.get<{ assessment: Assessment; overall: OverallScore }>(apiUrl(`/assessments/${id}`))
    );
  }

  update(id: string, payload: Partial<NewAssessment & { status: string }>): Promise<Assessment> {
    return firstValueFrom(this.http.patch<Assessment>(apiUrl(`/assessments/${id}`), payload));
  }

  remove(id: string): Promise<{ ok: boolean }> {
    return firstValueFrom(this.http.delete<{ ok: boolean }>(apiUrl(`/assessments/${id}`)));
  }

  getResponses(id: string): Promise<AssessmentResponse[]> {
    return firstValueFrom(this.http.get<AssessmentResponse[]>(apiUrl(`/assessments/${id}/responses`)));
  }

  /** Accepts one or many; the API upserts by subcategory. */
  saveResponses(
    id: string,
    responses: ResponseInput[]
  ): Promise<{ saved: number; responses: AssessmentResponse[]; overall: OverallScore }> {
    return firstValueFrom(
      this.http.put<{ saved: number; responses: AssessmentResponse[]; overall: OverallScore }>(
        apiUrl(`/assessments/${id}/responses`),
        { responses }
      )
    );
  }

  getScores(id: string): Promise<ScoreReport> {
    return firstValueFrom(this.http.get<ScoreReport>(apiUrl(`/assessments/${id}/scores`)));
  }

  getFindings(id: string, opts: { severity?: string; function?: string; limit?: number } = {}): Promise<Finding[]> {
    const params = new URLSearchParams();
    if (opts.severity) params.set('severity', opts.severity);
    if (opts.function) params.set('function', opts.function);
    if (opts.limit) params.set('limit', String(opts.limit));
    const q = params.toString() ? `?${params}` : '';
    return firstValueFrom(this.http.get<Finding[]>(apiUrl(`/assessments/${id}/findings${q}`)));
  }

  updateFinding(id: string, findingId: string, payload: { status?: string }): Promise<Finding> {
    return firstValueFrom(
      this.http.patch<Finding>(apiUrl(`/assessments/${id}/findings/${findingId}`), payload)
    );
  }

  getReport(id: string): Promise<AssessmentReport> {
    return firstValueFrom(this.http.get<AssessmentReport>(apiUrl(`/assessments/${id}/report`)));
  }
}
