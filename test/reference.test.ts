import { describe, expect, it } from 'vitest';

import { DEGREE_LEVELS, STANDARD_KINDS, reference } from '../src/index.js';

const ISSUES = (r: { success: boolean; error?: { issues: { message: string; path: PropertyKey[] }[] } }) =>
  r.success ? [] : (r.error?.issues ?? []).map((i) => `${i.path.join('.')}: ${i.message}`);

const provenance = { source: 'opendegree', generatedAt: '2026-09-16T02:00:00Z' };
const retrievedAt = '2026-09-16T02:00:00Z';
const license = 'New York State Education Department, public materials';

/** The framework of Open Degree's Geometry seed, as the commons publishes it. */
const framework = {
  ekgId: 'ekg:framework:01JBXFRAMEW0RKNYSMATH00000', slug: 'nys-nextgen-math', type: 'framework',
  name: 'NYS Next Generation Mathematics Learning Standards', authority: 'New York State Education Department',
  kind: 'standards', jurisdiction: 'US-NY', subject: 'mathematics', url: 'https://www.nysed.gov/standards-instruction/mathematics',
  license, provenance, retrievedAt,
};
/** The standard the Appendix B outcome `define-geometric-terms` aligns to, exactly as published. */
const standard = {
  ekgId: 'ekg:standard:01JBXSTDGE0GC0100000000000', slug: 'nys-nextgen-math-geo-g-co-1', type: 'standard',
  frameworkId: 'nys-nextgen-math', code: 'GEO-G.CO.1', kind: 'objective', parentCode: 'GEO-G.CO',
  statement: 'Know precise definitions of angle, circle, perpendicular line, parallel line, and line segment, based on the undefined notions of point, line, distance along a line, and distance around a circular arc.',
  url: 'https://www.nysed.gov/standards-instruction/mathematics', license, provenance, retrievedAt,
};
const institution = {
  ekgId: 'ekg:institution:01JBX1NSTHVCC0000000000000', slug: 'hudson-valley-community-college', type: 'institution',
  name: 'Hudson Valley Community College', url: 'https://www.hvcc.edu', license: 'IPEDS, public data', provenance, retrievedAt,
};
const offering = {
  ekgId: 'ekg:offering:01JBX0FFER1NGGE0M000000000', slug: 'hvcc-math-geometry', type: 'offering',
  institution: institution.ekgId, code: 'MATH 101', title: 'Geometry',
  outcomeMappings: [{ outcome: 'ekg:outcome:01JBX0DEFNTERMS00000000000', coverage: 0.8, confidence: 0.6, provenance }],
  license: 'catalog terms', provenance, retrievedAt,
};
const program = {
  ekgId: 'ekg:program:01JBXPR0GRAMMATH0000000000', slug: 'hvcc-mathematics-as', type: 'program',
  institution: institution.ekgId, title: 'Mathematics', degreeLevel: 'associate', cipCode: '27.0101',
  requiredOfferings: [offering.ekgId], license: 'catalog terms', provenance, retrievedAt,
};
const platform = {
  ekgId: 'ekg:platform:01JBXP7ATF0RMKHAN000000000', slug: 'khan-academy', type: 'platform',
  name: 'Khan Academy', url: 'https://www.khanacademy.org', kind: 'courseware', pricing: 'free',
  ageRequirement: 13, harvestAllowed: true, embedPolicy: 'link-only', license: 'CC BY-SA 4.0', provenance, retrievedAt,
};

describe('reference entities (SPEC §3.9)', () => {
  it('parses every reference type through its schema and through the union', () => {
    for (const e of [framework, standard, institution, offering, program, platform]) {
      const r = reference.entity.safeParse(e);
      expect(r.success, `${e.slug}: ${ISSUES(r).join('; ')}`).toBe(true);
    }
    expect(reference.platform.parse(platform).harvestAllowed).toBe(true);
    expect(reference.offering.parse(offering).prerequisites).toEqual([]);
    expect(STANDARD_KINDS).toEqual(['level', 'domain', 'cluster', 'objective']);
    expect(DEGREE_LEVELS).toContain('associate');
  });

  it('requires an explicit licence, provenance and a retrieval date on every record (EKG-SPEC-116)', () => {
    const { license: _l, ...noLicence } = standard;
    expect(ISSUES(reference.standard.safeParse(noLicence))).toEqual(['license: Invalid input: expected string, received undefined']);
    const { retrievedAt: _r, ...noDate } = institution;
    expect(reference.institution.safeParse(noDate).success).toBe(false);
    const { provenance: _p, ...noProvenance } = platform;
    expect(reference.platform.safeParse(noProvenance).success).toBe(false);
  });

  it('types its ids and its supersession by its own type (V-09, V-16 at schema level)', () => {
    expect(reference.standard.safeParse({ ...standard, ekgId: 'ekg:outcome:01JBXSTDGE0GC0100000000000' }).success).toBe(false);
    expect(reference.standard.safeParse({ ...standard, supersededBy: 'ekg:outcome:01JBX0DEFNTERMS00000000000' }).success).toBe(false);
    expect(reference.standard.safeParse({ ...standard, supersededBy: 'ekg:standard:01JBXSTDGE0GC0200000000000' }).success).toBe(true);
    expect(reference.program.safeParse({ ...program, institution: 'ekg:platform:01JBXP7ATF0RMKHAN000000000' }).success).toBe(false);
  });

  it('keeps a mapping honest: coverage and confidence in 0 to 1 with provenance, on a real outcome id', () => {
    expect(reference.offering.safeParse({ ...offering, outcomeMappings: [{ ...offering.outcomeMappings[0], coverage: 1.2 }] }).success).toBe(false);
    expect(reference.offering.safeParse({ ...offering, outcomeMappings: [{ outcome: 'ekg:outcome:01JBX0DEFNTERMS00000000000', coverage: 1, confidence: 1 }] }).success).toBe(false);
    expect(reference.offering.safeParse({ ...offering, outcomeMappings: [{ ...offering.outcomeMappings[0], outcome: 'ekg:standard:01JBXSTDGE0GC0100000000000' }] }).success).toBe(false);
  });

  it('refuses an email address in provenance (V-20) like any other entity', () => {
    const r = reference.institution.safeParse({ ...institution, provenance: { ...provenance, reviewedBy: 'someone@example.org', reviewedAt: retrievedAt } });
    expect(ISSUES(r).some((m) => m.includes('V-20'))).toBe(true);
  });
});
