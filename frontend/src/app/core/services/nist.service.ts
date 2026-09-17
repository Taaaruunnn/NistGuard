import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { apiUrl } from '../api-config';
import {
  CoreFunction,
  CsfCore,
  CsfMeta,
  NistCategory,
  NistFunction,
  NistSubcategory,
  Tier,
} from '../models/nist.model';

/**
 * The CSF taxonomy never changes between requests, so it is fetched once per
 * session and held in signals. The walkthrough needs all 106 subcategories
 * anyway, so /nist/core is pulled as a single nested payload rather than
 * paging through categories.
 */
@Injectable({ providedIn: 'root' })
export class NistService {
  private http = inject(HttpClient);

  private readonly _core = signal<CoreFunction[]>([]);
  private readonly _meta = signal<CsfMeta | null>(null);
  private readonly _loading = signal(false);
  private inflight: Promise<void> | null = null;

  readonly core = this._core.asReadonly();
  readonly meta = this._meta.asReadonly();
  readonly loading = this._loading.asReadonly();

  readonly tiers = computed<Tier[]>(() => this._meta()?.tiers ?? []);
  readonly impactLevels = computed(() => this._meta()?.impactLevels ?? []);
  readonly loaded = computed(() => this._core().length > 0 && !!this._meta());

  /** Flat list of every subcategory, in canonical NIST order. */
  readonly allSubcategories = computed<NistSubcategory[]>(() =>
    this._core().flatMap((f) => f.categories.flatMap((c) => c.subcategories))
  );

  readonly counts = computed(() => ({
    functions: this._core().length,
    categories: this._core().reduce((n, f) => n + f.categories.length, 0),
    subcategories: this.allSubcategories().length,
  }));

  tierLabel(value: number | null | undefined): string {
    if (value === null || value === undefined) return 'Not assessed';
    return this.tiers().find((t) => t.value === value)?.label ?? `Tier ${value}`;
  }

  /** Idempotent: concurrent callers share one request. */
  async load(): Promise<void> {
    if (this.loaded()) return;
    if (this.inflight) return this.inflight;

    this._loading.set(true);
    this.inflight = (async () => {
      try {
        const [core, meta] = await Promise.all([
          firstValueFrom(this.http.get<CsfCore>(apiUrl('/nist/core'))),
          firstValueFrom(this.http.get<CsfMeta>(apiUrl('/nist/meta'))),
        ]);
        this._core.set(core.functions);
        this._meta.set(meta);
      } finally {
        this._loading.set(false);
        this.inflight = null;
      }
    })();

    return this.inflight;
  }

  // Individual reference endpoints, kept because the API exposes them and they
  // are handy for narrower views than the full core.
  getFunctions() {
    return this.http.get<NistFunction[]>(apiUrl('/nist/functions'));
  }
  getCategories(functionCode?: string) {
    const q = functionCode ? `?function=${functionCode}` : '';
    return this.http.get<NistCategory[]>(apiUrl(`/nist/categories${q}`));
  }
  getSubcategories(functionCode?: string, categoryCode?: string) {
    const params = new URLSearchParams();
    if (functionCode) params.set('function', functionCode);
    if (categoryCode) params.set('category', categoryCode);
    const q = params.toString() ? `?${params}` : '';
    return this.http.get<NistSubcategory[]>(apiUrl(`/nist/subcategories${q}`));
  }
}
