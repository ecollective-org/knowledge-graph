import { describe, expect, it } from 'vitest';

import {
  IMPORT_BUNDLE_VERSION,
  PROPOSAL_COLLECTIONS,
  REGISTERED_IDENTITIES,
  importBundle,
  importReport,
  validateImportBundle,
  type ImportReportItem,
} from '../src/index.js';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const at = '2026-09-16T02:00:00Z';
const ai = { source: 'ai', generatedAt: at, modelId: 'claude-sonnet-5', promptVersion: 'seed-outcomes-v1' };

/**
 * A bundle a research session would emit for Open Degree's Geometry seed: the standard the
 * credential body names as unwritten (NYS GEO-G.CO.10), the outcome it implies, a resource and an
 * edge to the existing stub. Ids of existing entities are Appendix B's.
 */
function bundle() {
  return {
    bundleVersion: IMPORT_BUNDLE_VERSION,
    producer: { tool: 'corthovore-research', toolVersion: '0.4.0', modelId: 'claude-sonnet-5', promptVersion: 'seed-outcomes-v1', sessionId: 'geometry-2026-09-16-a', producedAt: at, identity: 'diy-degree-curation' },
    scope: {
      subject: 'geometry', gradeBand: '9-12', frameworkIds: ['nys-nextgen-math'],
      sources: [{ title: 'NYS Next Generation Mathematics Learning Standards (P-12)', url: 'https://www.nysed.gov/sites/default/files/programs/standards-instruction/nys-next-generation-mathematics-p-12-standards.pdf', retrievedAt: at }],
    },
    licenseAcceptance: { graphContent: 'CC BY-SA 4.0', referenceContent: 'commons catalog terms v1' },
    references: ['ekg:domain:01JBWX3QK7Z8Y4N2M5R6T7V8W9', 'ekg:outcome:01JBX4TRNGCRTRA00000000000'],
    proposals: {
      outcomes: [
        {
          localId: 'tmp:prove-theorems-about-triangles', confidence: 0.8, provenance: ai,
          title: 'Prove theorems about triangles',
          statement: 'I can prove theorems about triangles, including that the base angles of an isosceles triangle are congruent and that the angles of a triangle sum to 180 degrees.',
          evidence: ['Writes a two-column or paragraph proof that the base angles of an isosceles triangle are congruent, citing the congruence criterion used.'],
          domain: 'ekg:domain:01JBWX3QK7Z8Y4N2M5R6T7V8W9',
          level: 'advanced',
          prerequisites: ['ekg:outcome:01JBX4TRNGCRTRA00000000000'],
          aliases: ['Triangle theorems'],
          alignments: [{ framework: 'NYS Next Generation Mathematics Learning Standards', code: 'GEO-G.CO.10' }],
          dedupe: { queries: ['prove theorems about triangles', 'isosceles base angles', 'triangle angle sum'], topMatches: [{ ekgId: 'ekg:outcome:01JBX4TRNGCRTRA00000000000', title: 'Prove triangles congruent with SSS, SAS, and ASA', score: 0.41 }], decision: 'new' },
        },
      ],
      edges: [{ localId: 'tmp:edge-triangles-criteria', confidence: 0.9, provenance: ai, from: 'tmp:prove-theorems-about-triangles', to: 'ekg:outcome:01JBX4TRNGCRTRA00000000000', kind: 'prerequisite' }],
      resources: [
        {
          localId: 'tmp:khan-triangle-proofs', confidence: 0.7, provenance: ai,
          title: 'Khan Academy, High School Geometry', url: 'https://www.khanacademy.org/math/geometry', kind: 'video', cost: 'free', provider: 'Khan Academy',
          license: 'CC BY-NC-SA 3.0 US', embedPolicy: 'link-only', outcomes: ['tmp:prove-theorems-about-triangles'],
          qualityProposal: { correctness: 5, coverage: 3, clarity: 4, efficiency: 4, accessibility: 4, trust: 5, reasons: 'Captioned, free, but covers the whole course rather than the theorem.' },
        },
      ],
      standards: [
        {
          localId: 'tmp:nys-geo-g-co-10', confidence: 1, provenance: { source: 'import', generatedAt: at },
          frameworkId: 'nys-nextgen-math', code: 'GEO-G.CO.10', kind: 'objective', parentCode: 'GEO-G.CO',
          statement: 'Prove theorems about triangles.', url: 'https://www.nysed.gov/standards-instruction/mathematics', retrievedAt: at,
        },
      ],
    },
  };
}

const rulesOf = (items: ImportReportItem[], ref: string) => items.find((i) => i.ref === ref)?.errors.map((e) => e.rule) ?? [];

describe('import bundles (SPEC §9.7)', () => {
  it('validates a bundle from real Geometry content: every item accepted, the bundle parsed', () => {
    const result = validateImportBundle(bundle());
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.items.map((i) => [i.ref, i.decision])).toEqual([
      ['tmp:prove-theorems-about-triangles', 'accepted'],
      ['tmp:edge-triangles-criteria', 'accepted'],
      ['tmp:khan-triangle-proofs', 'accepted'],
      ['tmp:nys-geo-g-co-10', 'accepted'],
    ]);
    expect(result.bundle?.proposals.outcomes[0]?.level).toBe('advanced');
    expect(result.bundle?.proposals.domains).toEqual([]);
    expect(importBundle.safeParse(bundle()).success).toBe(true);
    expect(PROPOSAL_COLLECTIONS).toHaveLength(12);
  });

  it('rejects the envelope, not an item, when the version or the licence grant is wrong', () => {
    const b = bundle();
    b.bundleVersion = '2.0.0';
    (b.licenseAcceptance as { graphContent: string }).graphContent = 'CC BY 4.0';
    const result = validateImportBundle(b);
    expect(result.ok).toBe(false);
    expect(result.items).toEqual([]);
    expect(result.errors.map((e) => [e.slug, e.rule, e.path])).toEqual([
      ['(bundle)', 'V-01', 'bundleVersion'],
      ['(bundle)', 'V-01', 'licenseAcceptance.graphContent'],
    ]);
    expect(validateImportBundle({ ...bundle(), producer: { ...bundle().producer, identity: 'someone@example.org' } }).ok).toBe(false);
  });

  it('never accepts a minted ekgId in a proposal and reports a bad item by its tmp: id (EKG-SPEC-122)', () => {
    const b = bundle();
    (b.proposals.outcomes[0] as Record<string, unknown>).localId = 'ekg:outcome:01JBX9M1NTEDBYPR0DVCER0000';
    const result = validateImportBundle(b);
    expect(result.ok).toBe(false);
    const bad = result.items.find((i) => i.collection === 'outcomes')!;
    expect(bad.decision).toBe('rejected');
    expect(bad.errors[0]).toMatchObject({ rule: 'V-26', path: 'localId' });
  });

  it('V-26: tmp ids are unique and every reference resolves to the expected collection or type', () => {
    const b = bundle();
    b.proposals.edges[0]!.from = 'tmp:no-such-outcome';
    b.proposals.resources[0]!.outcomes = ['tmp:nys-geo-g-co-10'];
    b.proposals.outcomes[0]!.domain = 'ekg:outcome:01JBX0DEFNTERMS00000000000';
    b.proposals.standards.push({ ...clone(b.proposals.standards[0]!), code: 'GEO-G.CO.11' });
    const result = validateImportBundle(b);
    expect(rulesOf(result.items, 'tmp:edge-triangles-criteria')).toEqual(['V-26']);
    expect(result.items.find((i) => i.ref === 'tmp:edge-triangles-criteria')?.reason).toBe('out-of-scope');
    expect(result.items.find((i) => i.ref === 'tmp:khan-triangle-proofs')?.errors[0]?.message).toContain('standards proposal, not outcomes');
    expect(result.items.find((i) => i.ref === 'tmp:prove-theorems-about-triangles')?.errors[0]?.path).toBe('domain');
    expect(result.items.filter((i) => i.ref === 'tmp:nys-geo-g-co-10').map((i) => i.decision)).toEqual(['accepted', 'rejected']);
  });

  it('V-27: every new outcome carries dedupe evidence; an alias_of or duplicate_of is merged into its target', () => {
    const b = bundle();
    delete (b.proposals.outcomes[0] as { dedupe?: unknown }).dedupe;
    const missing = validateImportBundle(b);
    expect(missing.items[0]).toMatchObject({ decision: 'rejected', reason: 'provenance-incomplete' });
    expect(rulesOf(missing.items, 'tmp:prove-theorems-about-triangles')).toEqual(['V-27']);

    const alias = bundle();
    alias.proposals.outcomes[0]!.dedupe.decision = 'alias_of';
    expect(validateImportBundle(alias).items[0]?.errors[0]?.path).toBe('dedupe.of');
    (alias.proposals.outcomes[0]!.dedupe as { of?: string }).of = 'ekg:outcome:01JBX4TRNGCRTRA00000000000';
    const merged = validateImportBundle(alias);
    expect(merged.ok).toBe(true);
    expect(merged.items[0]).toMatchObject({ decision: 'merged_into', of: 'ekg:outcome:01JBX4TRNGCRTRA00000000000' });
  });

  it('V-25: a proposed outcome whose statement is a proposed standard\'s statement is not an outcome', () => {
    const b = bundle();
    b.proposals.outcomes[0]!.statement = '  prove  theorems about Triangles. ';
    const result = validateImportBundle(b);
    expect(result.items[0]).toMatchObject({ decision: 'rejected', reason: 'not-an-outcome' });
    expect(rulesOf(result.items, 'tmp:prove-theorems-about-triangles')).toEqual(['V-25']);
  });

  it('V-28: a resource carries its licence and an embed policy; a reference item carries retrievedAt and a URL', () => {
    const b = bundle();
    delete (b.proposals.resources[0] as { license?: string }).license;
    b.proposals.resources[0]!.embedPolicy = 'unknown';
    delete (b.proposals.standards[0] as { retrievedAt?: string }).retrievedAt;
    delete (b.proposals.standards[0] as { url?: string }).url;
    const result = validateImportBundle(b);
    expect(result.items.find((i) => i.ref === 'tmp:khan-triangle-proofs')).toMatchObject({ decision: 'rejected', reason: 'licence-unclear' });
    expect(result.items.find((i) => i.ref === 'tmp:khan-triangle-proofs')?.errors.map((e) => e.path)).toEqual(['license', 'embedPolicy']);
    expect(result.items.find((i) => i.ref === 'tmp:nys-geo-g-co-10')).toMatchObject({ decision: 'rejected', reason: 'provenance-incomplete' });
    expect(rulesOf(result.items, 'tmp:nys-geo-g-co-10')).toEqual(['V-28', 'V-28']);
  });

  it('carries V-19 and V-20 through every item\'s provenance, and V-22 through proposed alignments', () => {
    const b = bundle();
    b.proposals.resources[0]!.provenance = { source: 'ai', generatedAt: at } as typeof ai;
    b.proposals.outcomes[0]!.alignments = [{ framework: 'nys next generation mathematics learning standards', code: 'GEO-G.CO.10' }, { framework: 'Texas Essential Knowledge and Skills', code: 'G.6' }];
    const result = validateImportBundle(b);
    expect(rulesOf(result.items, 'tmp:khan-triangle-proofs')).toEqual(['V-19']);
    expect(result.items.find((i) => i.ref === 'tmp:khan-triangle-proofs')?.reason).toBe('provenance-incomplete');
    expect(rulesOf(result.items, 'tmp:prove-theorems-about-triangles')).toEqual(['V-22']);
    expect(result.warnings.map((w) => [w.rule, w.slug])).toEqual([['V-22', 'tmp:prove-theorems-about-triangles']]);
  });

  it('proposes a path definition with segments over bundle-local and existing outcomes (Change D)', () => {
    const b = bundle();
    (b.proposals as Record<string, unknown>).courses = [{
      localId: 'tmp:nys-regents-geometry', confidence: 0.6, provenance: ai,
      title: 'NYS Regents Geometry', description: 'The congruence strand and beyond.', kind: 'curriculum',
      domain: 'ekg:domain:01JBWX3QK7Z8Y4N2M5R6T7V8W9',
      outcomes: ['ekg:outcome:01JBX4TRNGCRTRA00000000000', 'tmp:prove-theorems-about-triangles'],
      segments: [{ title: 'Congruence', outcomes: ['ekg:outcome:01JBX4TRNGCRTRA00000000000'] }, { title: 'Beyond', kind: 'beyond', outcomes: ['tmp:prove-theorems-about-triangles'] }],
      alignments: [{ framework: 'NYS Next Generation Mathematics Learning Standards', code: 'GEO', relation: 'related' }],
      sources: [{ title: 'NYS Next Generation Mathematics Learning Standards (P-12)', url: 'https://www.nysed.gov/standards-instruction/mathematics', retrievedAt: at }],
    }];
    const ok = validateImportBundle(b);
    expect(ok.errors).toEqual([]);
    expect(ok.items.find((i) => i.ref === 'tmp:nys-regents-geometry')?.decision).toBe('accepted');
    expect(ok.bundle?.proposals.courses[0]?.segments[1]?.kind).toBe('beyond');

    (b.proposals as unknown as { courses: { segments: { outcomes: string[] }[] }[] }).courses[0]!.segments[1]!.outcomes = ['ekg:outcome:01JBX0DEFNTERMS00000000000'];
    b.proposals.outcomes[0]!.alignments = [{ framework: 'Classification of Instructional Programs, 2020', code: '27.0101' }];
    const bad = validateImportBundle(b);
    expect(rulesOf(bad.items, 'tmp:nys-regents-geometry')).toEqual(['V-29']);
    expect(rulesOf(bad.items, 'tmp:prove-theorems-about-triangles')).toEqual(['V-30']);
  });

  it('names the report shape the commons answers with (EKG-SPEC-127)', () => {
    const result = validateImportBundle(bundle());
    const report = importReport.safeParse({ bundleVersion: IMPORT_BUNDLE_VERSION, producer: bundle().producer, receivedAt: at, items: result.items });
    expect(report.success).toBe(true);
    expect(importReport.safeParse({ bundleVersion: IMPORT_BUNDLE_VERSION, producer: bundle().producer, receivedAt: at, items: [{ ref: 'tmp:x', collection: 'outcomes', decision: 'approved' }] }).success).toBe(false);
    expect(REGISTERED_IDENTITIES).toContain('opendegree-commons');
  });
});
