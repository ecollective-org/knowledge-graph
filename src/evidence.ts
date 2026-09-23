import { z } from 'zod';

import { ekgId } from './ekg-id.js';
import { type ValidationError, type ValidationResult, pathToString, ruleOf } from './validate.js';

/*
 * Evidence aggregates (SPEC §10, EKG-SPEC-68 to -73, -169, -170): what a learning engine publishes
 * about its learners as k-anonymous numbers, and nothing else. One shape, `evidence/v1`: the one
 * DIY Degree publishes live and the commons reads. Every object is strict, so a free-text field or
 * an identifier can never ride along (EKG-SPEC-68), and `validateEvidenceReport` holds the k floor
 * on every row (EKG-SPEC-69, -72).
 */

export const EVIDENCE_SCHEMA_VERSION = 'evidence/v1';
/** The k-anonymity floor (EKG-SPEC-69). */
export const EVIDENCE_K = 50;
export const EVIDENCE_LICENSE = 'CC0-1.0';

const wholePercent = z.number().int().min(0).max(100);
const dateOrDatetime = z.union([z.iso.date(), z.iso.datetime()]);

/** A resource used by learners of the node: the first resource of each learner's first session. */
export const evidenceResource = z
  .object({
    resourceEkgId: ekgId('resource'),
    learners: z.number().int().nonnegative(),
    firstAttemptPassPct: wholePercent.nullable(),
  })
  .strict();
export type EvidenceResource = z.infer<typeof evidenceResource>;

export const evidenceNode = z
  .object({
    ekgId: ekgId('outcome'),
    learners: z.number().int().nonnegative(),
    firstAttemptPassPct: wholePercent.nullable(),
    masteryPct: wholePercent.nullable(),
    medianMinutesToMastery: z.number().int().nonnegative().nullable(),
    resources: z.array(evidenceResource).default([]),
  })
  .strict();
export type EvidenceNode = z.infer<typeof evidenceNode>;

/** A window: a whole week, or the all-time rollup when `from` is null (EKG-SPEC-71). */
export const evidenceWindow = z
  .object({
    from: dateOrDatetime.nullable(),
    to: dateOrDatetime,
  })
  .strict();

/**
 * `evidence/v1`, the file a product publishes at its per-product URL (EKG-SPEC-70). `publisher`
 * and `license` are required by EKG-SPEC-169; a 0.4 validator reports their absence, and the
 * older `licence` spelling, as warnings so the file DIY Degree already publishes keeps reading,
 * and treats them as errors from 0.5.0.
 */
export const evidenceReport = z
  .object({
    schemaVersion: z.literal(EVIDENCE_SCHEMA_VERSION),
    publisher: z.string().min(1).optional(),
    license: z.literal(EVIDENCE_LICENSE).optional(),
    /** Deprecated spelling, accepted through 0.4.x. */
    licence: z.literal(EVIDENCE_LICENSE).optional(),
    k: z.number().int().min(EVIDENCE_K, `k is at least ${EVIDENCE_K} (EKG-SPEC-69) (V-01)`),
    window: evidenceWindow,
    generatedAt: z.iso.datetime(),
    /** Nodes with any activity at all, published or not; never a count that lets a suppressed value be inferred. */
    nodesConsidered: z.number().int().nonnegative().optional(),
    nodesPublished: z.number().int().nonnegative().optional(),
    nodes: z.array(evidenceNode),
  })
  .strict();
export type EvidenceReport = z.infer<typeof evidenceReport>;

export interface EvidenceReportValidation extends ValidationResult {
  report?: EvidenceReport;
}

/**
 * Validate an `evidence/v1` file: its shape (V-01, strict objects, whole percents), and V-33: every
 * node and every resource row describes at least `k` learners, `nodesPublished` matches the rows,
 * no node or resource appears twice, and the window is ordered. Errors name the node by ekgId.
 */
export function validateEvidenceReport(input: unknown): EvidenceReportValidation {
  const parsed = evidenceReport.safeParse(input);
  if (!parsed.success) {
    const errors: ValidationError[] = parsed.error.issues.map((issue) => ({
      rule: ruleOf(issue.message),
      severity: 'error' as const,
      slug: '(evidence report)',
      message: issue.message,
      path: pathToString(issue.path),
    }));
    return { ok: false, errors, warnings: [] };
  }
  const report = parsed.data;
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const at = (slug: string, ekgIdOf?: string) => (rule: string, message: string, path: string, severity: 'error' | 'warning' = 'error') => {
    const e: ValidationError = { rule, severity, slug, message, path };
    if (ekgIdOf) e.ekgId = ekgIdOf;
    (severity === 'error' ? errors : warnings).push(e);
  };
  const file = at('(evidence report)');

  if (!report.publisher) file('V-33', 'publisher names the product that published this file (EKG-SPEC-169); required from 0.5.0', 'publisher', 'warning');
  if (!report.license) {
    if (report.licence) file('V-33', 'licence is the deprecated spelling; write license (EKG-SPEC-169), required from 0.5.0', 'licence', 'warning');
    else file('V-33', `license states the CC0 grant (${EVIDENCE_LICENSE}, EKG-SPEC-106); required from 0.5.0`, 'license', 'warning');
  }
  if (report.nodesPublished !== undefined && report.nodesPublished !== report.nodes.length) {
    file('V-33', `nodesPublished is ${report.nodesPublished} but the file has ${report.nodes.length} node rows`, 'nodesPublished');
  }
  if (report.window.from && report.window.from > report.window.to) file('V-33', 'the window ends before it starts', 'window');

  const seen = new Set<string>();
  report.nodes.forEach((node, i) => {
    const row = at(node.ekgId, node.ekgId);
    if (node.learners < report.k) row('V-33', `${node.learners} learners is below k = ${report.k}; a row below k is omitted, never published (EKG-SPEC-69)`, `nodes[${i}].learners`);
    if (seen.has(node.ekgId)) row('V-33', `${node.ekgId} appears twice in the file`, `nodes[${i}].ekgId`);
    seen.add(node.ekgId);
    const seenResources = new Set<string>();
    node.resources.forEach((r, j) => {
      if (r.learners < report.k) row('V-33', `resource ${r.resourceEkgId} has ${r.learners} learners, below k = ${report.k}; it is omitted, never zeroed (EKG-SPEC-72)`, `nodes[${i}].resources[${j}].learners`);
      if (seenResources.has(r.resourceEkgId)) row('V-33', `resource ${r.resourceEkgId} appears twice under ${node.ekgId}`, `nodes[${i}].resources[${j}].resourceEkgId`);
      seenResources.add(r.resourceEkgId);
    });
  });

  return { ok: errors.length === 0, errors, warnings, report };
}
