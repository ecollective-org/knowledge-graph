import { describe, expect, it } from 'vitest';

import { EVIDENCE_K, evidenceReport, validateEvidenceReport, type ValidationError } from '../src/index.js';

const rules = (list: ValidationError[]) => list.map((e) => e.rule);
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/** DIY Degree's live file shape (EKG-SPEC-70), with the Appendix B ids and illustrative numbers. */
const report = {
  schemaVersion: 'evidence/v1',
  publisher: 'diydegree',
  license: 'CC0-1.0',
  k: 50,
  window: { from: '2026-08-31', to: '2026-09-06' },
  generatedAt: '2026-09-07T02:00:00Z',
  nodesConsidered: 12,
  nodesPublished: 1,
  nodes: [
    {
      ekgId: 'ekg:outcome:01JBX0DEFNTERMS00000000000',
      learners: 412, firstAttemptPassPct: 61, masteryPct: 88, medianMinutesToMastery: 47,
      resources: [{ resourceEkgId: 'ekg:resource:01JBXKHANACADEMY0000000000', learners: 210, firstAttemptPassPct: 68 }],
    },
  ],
};

describe('evidence aggregates (SPEC §10, evidence/v1)', () => {
  it('validates the §10 shape with no warnings and parses it through the schema', () => {
    const result = validateEvidenceReport(report);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.report?.nodes[0]?.resources[0]?.firstAttemptPassPct).toBe(68);
    expect(evidenceReport.safeParse(report).success).toBe(true);
    expect(EVIDENCE_K).toBe(50);
  });

  it('accepts the file DIY Degree publishes today, with warnings for the envelope fields required from 0.5.0', () => {
    const live = { schemaVersion: 'evidence/v1', generatedAt: '2026-09-20T04:00:30.361Z', licence: 'CC0-1.0', k: 50, window: { from: null, to: '2026-09-20T04:00:30.361Z' }, nodesConsidered: 0, nodesPublished: 0, nodes: [] };
    const result = validateEvidenceReport(live);
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.warnings.map((w) => [w.rule, w.path])).toEqual([['V-33', 'publisher'], ['V-33', 'licence']]);
  });

  it('V-33 holds the k floor on every node and resource row, the row count, uniqueness and the window', () => {
    const r = clone(report);
    r.nodes[0]!.learners = 49;
    r.nodes[0]!.resources[0]!.learners = 12;
    r.nodesPublished = 3;
    r.window = { from: '2026-09-07', to: '2026-09-06' };
    r.nodes.push(clone(report.nodes[0]!));
    const result = validateEvidenceReport(r);
    expect(result.errors.map((e) => [e.rule, e.path])).toEqual([
      ['V-33', 'nodesPublished'],
      ['V-33', 'window'],
      ['V-33', 'nodes[0].learners'],
      ['V-33', 'nodes[0].resources[0].learners'],
      ['V-33', 'nodes[1].ekgId'],
    ]);
    expect(result.errors[2]).toMatchObject({ slug: 'ekg:outcome:01JBX0DEFNTERMS00000000000', ekgId: 'ekg:outcome:01JBX0DEFNTERMS00000000000' });
    expect(result.errors[2]?.message).toContain('EKG-SPEC-69');
  });

  it('V-01: whole percents only, no extra field on a row (no free text ever), k at least 50, a real id', () => {
    expect(validateEvidenceReport({ ...clone(report), nodes: [{ ...report.nodes[0], firstAttemptPassPct: 0.61 }] }).ok).toBe(false);
    const withText = clone(report);
    (withText.nodes[0] as Record<string, unknown>).note = 'a learner wrote this';
    const r = validateEvidenceReport(withText);
    expect(rules(r.errors)).toEqual(['V-01']);
    expect(r.errors[0]?.path).toBe('nodes[0]');
    expect(validateEvidenceReport({ ...clone(report), k: 30 }).errors[0]?.message).toContain('EKG-SPEC-69');
    expect(validateEvidenceReport({ ...clone(report), nodes: [{ ...report.nodes[0], ekgId: 'define-geometric-terms' }] }).errors[0]?.rule).toBe('V-09');
    expect(validateEvidenceReport({ ...clone(report), schemaVersion: '0.1.0' }).ok).toBe(false);
  });
});
