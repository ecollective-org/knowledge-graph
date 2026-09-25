import { z } from 'zod';

import { ekgId, parseEkgId } from './ekg-id.js';
import { provenance, resourceFields, withSubKindRule } from './schema.js';
import { normalizeResourceUrl } from './url.js';
import { type ValidationError, type ValidationResult, pathToString, ruleOf } from './validate.js';

/*
 * The commons' resource records (SPEC §3.10, EKG-SPEC-162 to EKG-SPEC-167): the enriched rows the
 * Open Degree commons publishes per concept under its own prefix. A record is the §3.6 artifact
 * resource plus the concepts it teaches, a quality summary, effectiveness aggregates and the
 * record's own state; the registered layer (the per-dimension quality means) never appears in the
 * open artifact. `validateCommonsResourceList` is what a consumer runs on every file before it
 * renders a record, and what the commons runs before it publishes one.
 */

/** The commons' own prefix (EKG-SPEC-115). */
export const COMMONS_PREFIX = '/api/commons/v1';

/** A commons record's own lifecycle; none of these is a shared lifecycle token (EKG-SPEC-29, -163). */
export const COMMONS_STATES = ['pending', 'provisional', 'published', 'retired'] as const;
export type CommonsState = (typeof COMMONS_STATES)[number];
/** The states a record may have in the open artifact (V-31). */
export const OPEN_COMMONS_STATES = ['provisional', 'published'] as const;
/** The weekly link check's verdict as published; a hidden resource is not published at all (EKG-SPEC-40). */
export const LINK_STATUSES = ['ok', 'failing'] as const;
export type LinkStatus = (typeof LINK_STATUSES)[number];

/** The six dimensions of the quality rubric, each 1 to 5. */
export const QUALITY_DIMENSIONS = ['correctness', 'coverage', 'clarity', 'efficiency', 'accessibility', 'trust'] as const;
export type QualityDimension = (typeof QUALITY_DIMENSIONS)[number];

/** The open half of a resource's quality (EKG-SPEC-164): a mean, a count, and the automated floor's verdict. */
export const qualitySummary = z.object({
  mean: z.number().min(1).max(5).optional(),
  n: z.number().int().nonnegative(),
  humanN: z.number().int().nonnegative().optional(),
  /** The automated floor of the producer's proposal was met: a judgement, never a rating. */
  floorCleared: z.boolean().optional(),
});
export type QualitySummary = z.infer<typeof qualitySummary>;

/** The registered half: the per-dimension means. Never in the open artifact (V-31). */
export const qualityBreakdown = z.object({
  correctness: z.number().min(1).max(5).optional(),
  coverage: z.number().min(1).max(5).optional(),
  clarity: z.number().min(1).max(5).optional(),
  efficiency: z.number().min(1).max(5).optional(),
  accessibility: z.number().min(1).max(5).optional(),
  trust: z.number().min(1).max(5).optional(),
});
export type QualityBreakdown = z.infer<typeof qualityBreakdown>;

/**
 * One product's evidence aggregate for the resource as the commons imported it (EKG-SPEC-165): at
 * least k = 50 learners (EKG-SPEC-69), whole percents, a dated window, CC0.
 */
export const effectiveness = z.object({
  publisher: z.string().min(1),
  learners: z.number().int().min(50, 'An effectiveness aggregate describes at least k = 50 distinct learners (EKG-SPEC-69) (V-01)'),
  firstAttemptPassPct: z.number().int().min(0).max(100).optional(),
  /** A date or a datetime, as the publisher's window states it (§10). */
  window: z.object({ from: z.union([z.iso.date(), z.iso.datetime()]).optional(), to: z.union([z.iso.date(), z.iso.datetime()]) }),
  importedAt: z.iso.datetime(),
});
export type Effectiveness = z.infer<typeof effectiveness>;

/** A concept the resource teaches, with the evidence statements it covers (EKG-SPEC-12) and the commons' rank hint. */
export const resourceOutcomeLink = z.object({
  outcome: ekgId('outcome'),
  coverage: z.array(z.string()).default([]),
  rankHint: z.number().int().optional(),
});
export type ResourceOutcomeLink = z.infer<typeof resourceOutcomeLink>;

/** A commons resource record (SPEC §3.10): the §3.6 artifact resource, enriched. */
export const commonsResource = withSubKindRule(
  z.object({
    ekgId: ekgId('resource'),
    ...resourceFields,
    description: z.string().optional(),
    /** URLs this resource was known by; its identity survives a move (EKG-SPEC-25). */
    previousUrls: z.array(z.string().url()).default([]),
    /** A sentence for people, never a price as a fact. */
    priceNote: z.string().optional(),
    provenance,
    outcomes: z.array(resourceOutcomeLink).min(1, 'A commons resource record names at least one outcome (V-01)'),
    state: z.enum(COMMONS_STATES),
    linkStatus: z.enum(LINK_STATUSES).optional(),
    quality: qualitySummary.optional(),
    effectiveness: z.array(effectiveness).default([]),
    /** Registered layer only (EKG-SPEC-164, V-31). */
    qualityBreakdown: qualityBreakdown.optional(),
  }),
);
export type CommonsResource = z.infer<typeof commonsResource>;

/** `resources/<ULID>.json`: the records for one concept (EKG-SPEC-162). */
export const commonsResourceList = z.object({
  schemaVersion: z.string().min(1),
  buildId: z.string().min(1),
  generatedAt: z.iso.datetime(),
  outcome: ekgId('outcome'),
  records: z.array(commonsResource),
});
export type CommonsResourceList = z.infer<typeof commonsResourceList>;

/** File layout under the commons prefix, as far as the specification pins it. */
export const COMMONS_PATHS = {
  index: 'index.json',
  checksums: 'checksums.json',
  feed: 'feed.json',
  /** The resource records of one concept, keyed by the outcome's ULID so a rename never moves the file. */
  resources: (outcomeEkgId: string) => `resources/${parseEkgId(outcomeEkgId).ulid}.json`,
} as const;

export type CommonsLayer = 'open' | 'registered';

export interface CommonsResourceListValidation extends ValidationResult {
  file?: CommonsResourceList;
}

const byCodePoint = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/**
 * Validate one per-concept resource file: its shape (V-01, including the k = 50 floor on every
 * aggregate and the subKind rule), the open layer's limits (V-31: `provisional` or `published`
 * only, no registered field) unless `layer: 'registered'`, the file's coherence (V-32: every
 * record names the file's outcome; records sorted by ekgId and unique), and V-18 across the
 * file's records. Every error names the record by title and ekgId and states the rule.
 */
export function validateCommonsResourceList(
  input: unknown,
  options: { layer?: CommonsLayer } = {},
): CommonsResourceListValidation {
  const layer = options.layer ?? 'open';
  const parsed = commonsResourceList.safeParse(input);
  if (!parsed.success) {
    const errors: ValidationError[] = parsed.error.issues.map((issue) => ({
      rule: ruleOf(issue.message),
      severity: 'error' as const,
      slug: '(resource list)',
      message: issue.message,
      path: pathToString(issue.path),
    }));
    return { ok: false, errors, warnings: [] };
  }
  const file = parsed.data;
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const fail = (r: CommonsResource, rule: string, message: string, path: string) =>
    errors.push({ rule, severity: 'error', slug: `(resource) ${r.title}`, ekgId: r.ekgId, message, path });

  const seenIds = new Map<string, number>();
  const byUrl = new Map<string, string>();
  file.records.forEach((r, i) => {
    // V-31 the open layer: state and fields.
    if (layer === 'open') {
      if (!(OPEN_COMMONS_STATES as readonly string[]).includes(r.state)) {
        fail(r, 'V-31', `state ${r.state} is not published in the open artifact; only provisional and published records are (EKG-SPEC-163)`, `records[${i}].state`);
      }
      if (r.qualityBreakdown !== undefined) {
        fail(r, 'V-31', 'qualityBreakdown is the registered layer and never appears in the open artifact (EKG-SPEC-164)', `records[${i}].qualityBreakdown`);
      }
    }
    // V-32 every record names the file's outcome; records sorted by ekgId and unique.
    if (!r.outcomes.some((o) => o.outcome === file.outcome)) {
      fail(r, 'V-32', `the record does not name this file's outcome ${file.outcome} in its outcomes (EKG-SPEC-162)`, `records[${i}].outcomes`);
    }
    const first = seenIds.get(r.ekgId);
    if (first !== undefined) fail(r, 'V-32', `ekgId ${r.ekgId} appears twice in the file (records[${first}] and records[${i}])`, `records[${i}].ekgId`);
    else seenIds.set(r.ekgId, i);
    const previous = file.records[i - 1];
    if (previous && byCodePoint(previous.ekgId, r.ekgId) > 0) {
      fail(r, 'V-32', `records are not sorted by ekgId: ${previous.ekgId} precedes ${r.ekgId} (EKG-SPEC-52)`, `records[${i}]`);
    }
    // V-18 one normalized URL is one ekgId, across the file.
    try {
      const key = normalizeResourceUrl(r.url);
      const owner = byUrl.get(key);
      if (owner && owner !== r.ekgId) fail(r, 'V-18', `resource URL ${r.url} has ekgId ${r.ekgId} here but ${owner} in another record of the file`, `records[${i}].url`);
      else if (!owner) byUrl.set(key, r.ekgId);
    } catch {
      // the schema already rejected a non-URL
    }
  });

  return { ok: errors.length === 0, errors, warnings, file };
}
