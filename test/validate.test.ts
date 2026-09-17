import { describe, expect, it } from 'vitest';

import { validateDomainFile, validateGraph, type ValidationError } from '../src/index.js';
import geometry from './fixtures/geometry.json' with { type: 'json' };

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const rules = (errors: ValidationError[]) => errors.map((e) => e.rule);

/** A minimal, valid source graph: one domain, three outcomes in a chain. */
function sourceGraph() {
  const provenance = { source: 'opendegree', generatedAt: '2026-09-05T04:12:07Z' };
  return [
    { ekgId: 'ekg:domain:01JBWX3QK7Z8Y4N2M5R6T7V8W9', slug: 'geometry', type: 'domain', title: 'Geometry', description: 'Shapes.', provenance },
    {
      ekgId: 'ekg:outcome:01JBX0DEFNTERMS00000000000', slug: 'define-geometric-terms', type: 'outcome',
      title: 'Define terms', statement: 'I can define terms.', domain: '[[geometry]]',
      evidence: ['Writes a definition of each term.'],
      resources: [{ ekgId: 'ekg:resource:01JBXKHANACADEMY0000000000', title: 'Khan Academy', url: 'https://www.khanacademy.org/math/geometry', kind: 'video', coverage: ['Writes a definition of each term.'] }],
      provenance,
    },
    {
      ekgId: 'ekg:outcome:01JBX1REPRESENT00000000000', slug: 'represent-transformations', type: 'outcome',
      title: 'Represent transformations', statement: 'I can represent transformations.', domain: 'geometry',
      prerequisites: ['[[define-geometric-terms|Definitions]]'],
      alignments: [{ framework: 'NYS Next Generation Mathematics Learning Standards', code: 'GEO-G.CO.2' }],
      provenance,
    },
    {
      ekgId: 'ekg:outcome:01JBX2RGDMTNS0000000000000', slug: 'describe-rigid-motions', type: 'outcome',
      title: 'Rigid motions', statement: 'I can describe rigid motions.', domain: 'geometry',
      prerequisites: ['represent-transformations'], provenance,
    },
  ];
}

describe('validateGraph, source mode (SPEC §11)', () => {
  it('accepts a valid graph with slug and wikilink references', () => {
    const result = validateGraph(sourceGraph());
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it('names the entity by slug and ekgId and states the rule on every error (EKG-SPEC-76)', () => {
    const graph = sourceGraph();
    (graph[2] as { prerequisites: string[] }).prerequisites = ['no-such-outcome'];
    const { errors } = validateGraph(graph);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ rule: 'V-02', slug: 'represent-transformations', ekgId: 'ekg:outcome:01JBX1REPRESENT00000000000' });
    expect(errors[0]?.message).toContain('no-such-outcome');
  });

  it('V-02 reports a reference of the wrong type', () => {
    const graph = sourceGraph();
    (graph[1] as { domain: string }).domain = 'define-geometric-terms'; // an outcome, not a domain
    expect(rules(validateGraph(graph).errors)).toContain('V-02');
  });

  it('V-03 names the full prerequisite cycle, across the whole graph', () => {
    const graph = sourceGraph();
    (graph[1] as { prerequisites?: string[] }).prerequisites = ['describe-rigid-motions'];
    const { errors } = validateGraph(graph);
    const cycle = errors.find((e) => e.rule === 'V-03');
    expect(cycle).toBeDefined();
    expect(cycle?.message).toMatch(/define-geometric-terms -> describe-rigid-motions -> represent-transformations -> define-geometric-terms|prerequisite cycle/);
    expect(cycle?.message).toContain('->');
    expect(errors.filter((e) => e.rule === 'V-03')).toHaveLength(1);
  });

  it('V-10 rejects a duplicate ekgId across types', () => {
    const graph = sourceGraph();
    (graph[0] as { ekgId: string }).ekgId = 'ekg:outcome:01JBX0DEFNTERMS00000000000';
    const { errors } = validateGraph(graph);
    expect(rules(errors)).toContain('V-10');
  });

  it('V-11 rejects an ekgId whose type segment disagrees with the entity type', () => {
    const graph = sourceGraph();
    (graph[0] as { ekgId: string }).ekgId = 'ekg:outcome:01JBWX3QK7Z8Y4N2M5R6T7V8W0';
    expect(rules(validateGraph(graph).errors)).toContain('V-11');
  });

  it('V-12 rejects a duplicate slug within a type, and a malformed slug', () => {
    const graph = sourceGraph();
    (graph[3] as { slug: string }).slug = 'represent-transformations';
    expect(rules(validateGraph(graph).errors)).toContain('V-12');
    const bad = sourceGraph();
    (bad[3] as { slug: string }).slug = 'Describe_Rigid_Motions';
    expect(rules(validateGraph(bad).errors)).toContain('V-12');
  });

  it('V-13 and V-14 keep slug history globally consistent within a type', () => {
    const graph = sourceGraph();
    (graph[3] as { previousSlugs?: string[] }).previousSlugs = ['represent-transformations', 'describe-rigid-motions'];
    const found = rules(validateGraph(graph).errors);
    expect(found).toContain('V-13');
    expect(found).toContain('V-14');
  });

  it('V-15 and V-16 police supersededBy chains', () => {
    const graph = sourceGraph();
    (graph[1] as Record<string, unknown>).status = 'deprecated';
    (graph[1] as Record<string, unknown>).supersededBy = 'represent-transformations';
    (graph[2] as Record<string, unknown>).status = 'deprecated';
    (graph[2] as Record<string, unknown>).supersededBy = 'define-geometric-terms';
    expect(rules(validateGraph(graph).errors)).toContain('V-15');

    const wrongType = sourceGraph();
    (wrongType[1] as Record<string, unknown>).status = 'deprecated';
    (wrongType[1] as Record<string, unknown>).supersededBy = 'ekg:domain:01JBWX3QK7Z8Y4N2M5R6T7V8W9';
    expect(rules(validateGraph(wrongType).errors)).toContain('V-16');
  });

  it('V-15 rejects a chain longer than 8 hops', () => {
    const provenance = { source: 'opendegree', generatedAt: '2026-09-05T04:12:07Z' };
    const graph: Record<string, unknown>[] = [
      { ekgId: 'ekg:domain:01JBWX3QK7Z8Y4N2M5R6T7V8W9', slug: 'geometry', type: 'domain', title: 'Geometry', description: 'Shapes.', provenance },
    ];
    for (let i = 0; i <= 9; i += 1) {
      graph.push({
        ekgId: `ekg:outcome:01JBX0CHAN0000000000000${String(i).padStart(3, '0')}`,
        slug: `chain-${i}`, type: 'outcome', title: `Chain ${i}`, statement: 'I can.', domain: 'geometry',
        ...(i < 9 ? { status: 'deprecated', supersededBy: `chain-${i + 1}` } : {}),
        provenance,
      });
    }
    const { errors } = validateGraph(graph);
    expect(errors.some((e) => e.rule === 'V-15' && e.slug === 'chain-0')).toBe(true);
  });

  it('V-17 requires coverage strings to be exact evidence statements', () => {
    const graph = sourceGraph();
    (graph[1] as { resources: { coverage: string[] }[] }).resources[0]!.coverage = ['writes a definition of each term.'];
    const { errors } = validateGraph(graph);
    expect(errors[0]).toMatchObject({ rule: 'V-17', slug: 'define-geometric-terms', path: 'resources[0].coverage' });
  });

  it('V-18 requires the same normalized URL to share one ekgId', () => {
    const graph = sourceGraph();
    (graph[2] as { resources?: unknown[] }).resources = [
      { ekgId: 'ekg:resource:01JBXKHANACADEMY0000000001', title: 'Khan, again', url: 'https://www.KhanAcademy.org/math/geometry/?utm_source=x', kind: 'video' },
    ];
    const { errors } = validateGraph(graph);
    expect(errors[0]).toMatchObject({ rule: 'V-18', slug: 'represent-transformations' });
  });

  it('V-21 rejects a credential that bundles a stub outcome', () => {
    const graph = sourceGraph();
    (graph[3] as Record<string, unknown>).status = 'stub';
    graph.push({
      ekgId: 'ekg:credential:01JBX7BADGECNGRNC000000000', slug: 'geometry-badge', type: 'credential',
      title: 'Badge', description: 'A badge.', outcomes: ['describe-rigid-motions'],
      provenance: { source: 'opendegree', generatedAt: '2026-09-05T04:12:07Z' },
    } as never);
    const { errors } = validateGraph(graph);
    expect(errors[0]).toMatchObject({ rule: 'V-21', slug: 'geometry-badge', path: 'outcomes[0]' });
  });

  it('V-22 errors on a registered framework written with the wrong case and warns on an unknown one', () => {
    const graph = sourceGraph();
    (graph[2] as { alignments: { framework: string; code: string }[] }).alignments = [
      { framework: 'nys next generation mathematics learning standards', code: 'GEO-G.CO.2' },
      { framework: 'Texas Essential Knowledge and Skills', code: 'G.3' },
    ];
    const result = validateGraph(graph);
    expect(rules(result.errors)).toEqual(['V-22']);
    expect(result.warnings.map((w) => w.rule)).toEqual(['V-22']);
    expect(result.ok).toBe(false);
  });

  it('V-29 requires every segment outcome to be one of the course\'s outcomes', () => {
    const graph = sourceGraph();
    graph.push({
      ekgId: 'ekg:course:01JBX5CRSCNGRNCE0000000000', slug: 'rigid-motions-path', type: 'course', title: 'Rigid motions', description: 'A path.',
      domain: 'geometry', outcomes: ['define-geometric-terms', '[[represent-transformations]]'],
      segments: [{ title: 'Definitions', outcomes: ['[[define-geometric-terms|Definitions]]'] }, { title: 'Motions', kind: 'beyond', outcomes: ['represent-transformations', 'describe-rigid-motions'] }],
      provenance: { source: 'opendegree', generatedAt: '2026-09-05T04:12:07Z' },
    } as never);
    const { errors } = validateGraph(graph);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ rule: 'V-29', slug: 'rigid-motions-path', path: 'segments[1].outcomes[1]' });
  });

  it('V-30 keeps a program classification off outcomes and makes exam-outline alignments narrower or related', () => {
    const graph = sourceGraph();
    (graph[2] as { alignments: unknown[] }).alignments = [
      { framework: 'Classification of Instructional Programs, 2020', code: '27.0101', relation: 'broader' },
      { framework: 'College-Level Examination Program', code: 'College Mathematics' },
      { framework: 'College-Level Examination Program', code: 'College Mathematics', relation: 'narrower' },
      { framework: 'Advanced Placement Course and Exam Descriptions', code: 'AP Precalculus', relation: 'related' },
    ];
    const { errors } = validateGraph(graph);
    expect(errors.map((e) => [e.rule, e.path])).toEqual([['V-30', 'alignments[0]'], ['V-30', 'alignments[1].relation']]);
    // A course aligns to the classification it mirrors; an unregistered framework on a course is a V-22 warning.
    graph.push({
      ekgId: 'ekg:course:01JBX5CRSCNGRNCE0000000000', slug: 'mathematics-template', type: 'course', title: 'Mathematics', description: 'A template.',
      domain: 'geometry', outcomes: ['define-geometric-terms'], kind: 'program_template',
      alignments: [{ framework: 'Classification of Instructional Programs, 2020', code: '27.0101', relation: 'broader' }, { framework: 'Texas Essential Knowledge and Skills', code: 'G.3' }],
      sources: [{ title: 'IPEDS completions, CIP 27.0101', url: 'https://nces.ed.gov/ipeds/', retrievedAt: '2026-09-16T02:00:00Z' }],
      provenance: { source: 'opendegree', generatedAt: '2026-09-05T04:12:07Z' },
    } as never);
    (graph[2] as { alignments: unknown[] }).alignments = [];
    const result = validateGraph(graph);
    expect(result.errors).toEqual([]);
    expect(result.warnings.map((w) => [w.rule, w.slug])).toEqual([['V-22', 'mathematics-template']]);
  });

  it('V-01, V-04, V-19, V-20 surface schema failures with their rule numbers', () => {
    const graph = sourceGraph();
    (graph[1] as Record<string, unknown>).supersededBy = 'represent-transformations';
    (graph[2] as Record<string, unknown>).provenance = { source: 'ai', generatedAt: '2026-09-05T04:12:07Z', reviewedBy: 'x@y.org' };
    delete (graph[3] as Record<string, unknown>).statement;
    const found = rules(validateGraph(graph).errors);
    expect(found).toContain('V-04');
    expect(found).toContain('V-19');
    expect(found).toContain('V-20');
    expect(found).toContain('V-01');
  });
});

describe('validateGraph over the commons\' reference entities (SPEC §3.9)', () => {
  const provenance = { source: 'opendegree', generatedAt: '2026-09-16T02:00:00Z' };
  const retrievedAt = '2026-09-16T02:00:00Z';
  const license = 'New York State Education Department, public materials';
  function referenceSet() {
    return [
      ...sourceGraph(),
      { ekgId: 'ekg:framework:01JBXFRAMEW0RKNYSMATH00000', slug: 'nys-nextgen-math', type: 'framework', name: 'NYS Next Generation Mathematics Learning Standards', authority: 'New York State Education Department', kind: 'standards', jurisdiction: 'US-NY', subject: 'mathematics', url: 'https://www.nysed.gov/standards-instruction/mathematics', license, provenance, retrievedAt },
      { ekgId: 'ekg:standard:01JBXSTDGE0GC0100000000000', slug: 'nys-nextgen-math-geo-g-co-1', type: 'standard', frameworkId: 'nys-nextgen-math', code: 'GEO-G.CO.1', statement: 'Know precise definitions of angle, circle, perpendicular line, parallel line, and line segment, based on the undefined notions of point, line, distance along a line, and distance around a circular arc.', kind: 'objective', parentCode: 'GEO-G.CO', url: 'https://www.nysed.gov/standards-instruction/mathematics', license, provenance, retrievedAt },
      { ekgId: 'ekg:institution:01JBX1NSTHVCC0000000000000', slug: 'hudson-valley-community-college', type: 'institution', name: 'Hudson Valley Community College', url: 'https://www.hvcc.edu', license: 'IPEDS, public data', provenance, retrievedAt },
      { ekgId: 'ekg:offering:01JBX0FFER1NGGE0M000000000', slug: 'hvcc-math-geometry', type: 'offering', institution: 'ekg:institution:01JBX1NSTHVCC0000000000000', code: 'MATH 101', title: 'Geometry', outcomeMappings: [{ outcome: 'ekg:outcome:01JBX0DEFNTERMS00000000000', coverage: 0.8, confidence: 0.6, provenance }], license: 'catalog terms', provenance, retrievedAt },
      { ekgId: 'ekg:program:01JBXPR0GRAMMATH0000000000', slug: 'hvcc-mathematics-as', type: 'program', institution: 'ekg:institution:01JBX1NSTHVCC0000000000000', title: 'Mathematics', degreeLevel: 'associate', cipCode: '27.0101', requiredOfferings: ['ekg:offering:01JBX0FFER1NGGE0M000000000'], license: 'catalog terms', provenance, retrievedAt },
    ];
  }

  it('accepts reference entities beside graph entities in source mode, resolving their references', () => {
    const result = validateGraph(referenceSet());
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it('runs V-02 and V-10 over reference entities and names them; supersession is typed at schema level (V-09)', () => {
    const set = referenceSet();
    (set[7] as { institution: string }).institution = 'ekg:institution:01JBXN0SVCH1NST00000000000';
    (set[8] as { requiredOfferings: string[] }).requiredOfferings = ['ekg:offering:01JBXN0SVCH0FFER1NG0000000'];
    const { errors } = validateGraph(set);
    expect(errors.find((e) => e.rule === 'V-02' && e.slug === 'hvcc-math-geometry')?.path).toBe('institution');
    expect(errors.find((e) => e.rule === 'V-02' && e.slug === 'hvcc-mathematics-as')?.path).toBe('requiredOfferings[0]');
    const wrongType = referenceSet();
    (wrongType[8] as Record<string, unknown>).supersededBy = 'ekg:institution:01JBX1NSTHVCC0000000000000';
    expect(validateGraph(wrongType).errors.find((e) => e.slug === 'hvcc-mathematics-as')).toMatchObject({ rule: 'V-09', path: 'supersededBy' });
    const dup = referenceSet();
    dup.push({ ...(dup[5] as Record<string, unknown>), slug: 'nys-nextgen-math-geo-g-co-1-again' } as never);
    expect(rules(validateGraph(dup).errors)).toContain('V-10');
  });

  it('requires an explicit licence and a retrieval date on every reference entity (EKG-SPEC-116)', () => {
    const set = referenceSet();
    delete (set[6] as Record<string, unknown>).license;
    delete (set[6] as Record<string, unknown>).retrievedAt;
    const { errors } = validateGraph(set);
    expect(errors.filter((e) => e.slug === 'hudson-valley-community-college').map((e) => e.path).sort()).toEqual(['license', 'retrievedAt']);
  });
});

describe('validateDomainFile, artifact mode (SPEC §8, V-23)', () => {
  it('rejects a reference entity among the nodes: a domain file never carries one (EKG-SPEC-115)', () => {
    const file = clone(geometry);
    (file.nodes as unknown[]).push({ ekgId: 'ekg:standard:01JBXSTDGE0GC0100000000000', slug: 'geo-g-co-1', type: 'standard', frameworkId: 'nys-nextgen-math', code: 'GEO-G.CO.1', statement: 'Know precise definitions of angle, circle, perpendicular line, parallel line, and line segment.', kind: 'objective', license: 'x', provenance: geometry.domain.provenance, retrievedAt: '2026-09-16T02:00:00Z' });
    const result = validateDomainFile(file);
    expect(result.ok).toBe(false);
    expect(result.errors[0]?.slug).toBe('(domain file)');
    expect(result.errors[0]?.path).toContain('nodes[8]');
  });

  it('accepts the Appendix B example with no errors and no warnings', () => {
    const result = validateDomainFile(geometry);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.file?.nodes).toHaveLength(8);
  });

  it('accepts a resource carrying an audience block, with no warnings (EKG-SPEC-110)', () => {
    const file = clone(geometry);
    (file.resources[0] as { audience?: unknown }).audience = { rating: 'all', basis: { human: { count: 1, lastAt: '2026-09-16T15:20:00Z' } } };
    const result = validateDomainFile(file);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.file?.resources[0]?.audience?.rating).toBe('all');
    (file.resources[0] as { audience?: unknown }).audience = { rating: 'mature' };
    expect(validateDomainFile(file).errors[0]?.rule).toBe('V-01');
  });

  it('V-29 runs in artifact mode over the Appendix B course', () => {
    const file = clone(geometry);
    const course = file.nodes.find((n) => n.type === 'course') as { segments: unknown[] };
    course.segments = [{ title: 'Beyond', kind: 'beyond', outcomes: ['ekg:outcome:01JBX4TRNGCRTRA00000000000'] }];
    const { errors } = validateDomainFile(file);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ rule: 'V-29', slug: 'congruence-through-rigid-motions', path: 'segments[0].outcomes[0]' });
  });

  it('accepts the frontier overlays in a domain file with no warnings, and names a subKind contradiction (0.2.0)', () => {
    const file = clone(geometry);
    Object.assign(file.nodes[0]!, { volatility: 'evolving', evidenceClass: 'mixed' });
    Object.assign(file.resources[0]!, { subKind: 'talk', publishedAt: '2024-01-15', externalIds: { youtube: 'dQw4w9WgXcQ' }, transcript: { available: true, retrievableUnderTerms: true }, platformId: 'ekg:platform:01JBXP7ATF0RMKHAN000000000' });
    const result = validateDomainFile(file);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
    Object.assign(file.resources[0]!, { subKind: 'repo' });
    const bad = validateDomainFile(file);
    expect(bad.errors[0]).toMatchObject({ rule: 'V-01', slug: '(domain file)' });
    expect(bad.errors[0]?.path).toBe('resources[0].subKind');
  });

  it('V-23 rejects a resourceIds entry that is not in the file', () => {
    const file = clone(geometry);
    (file.nodes[0] as { resourceIds: string[] }).resourceIds.push('ekg:resource:01JBXMSSNGRSRC000000000000');
    const { errors } = validateDomainFile(file);
    expect(errors[0]).toMatchObject({ rule: 'V-23', slug: 'define-geometric-terms' });
  });

  it('V-23 rejects an edge whose source is not in the file and an outbound edge without targetDomain', () => {
    const file = clone(geometry);
    file.edges.push({ type: 'prerequisite', from: 'ekg:outcome:01JBXESEWHERE0000000000000', to: 'ekg:outcome:01JBX0DEFNTERMS00000000000' } as never);
    file.edges.push({ type: 'prerequisite', from: 'ekg:outcome:01JBX0DEFNTERMS00000000000', to: 'ekg:outcome:01JBXTHERDMN00000000000000' } as never);
    const found = rules(validateDomainFile(file).errors);
    expect(found.filter((r) => r === 'V-23')).toHaveLength(2);
  });

  it('runs the whole-graph rules over the file: a cycle through the artifact is V-03', () => {
    const file = clone(geometry);
    (file.nodes[0] as { prerequisites: string[] }).prerequisites = ['ekg:outcome:01JBX4TRNGCRTRA00000000000'];
    expect(rules(validateDomainFile(file).errors)).toContain('V-03');
  });

  it('V-17 in artifact mode checks coverage against every outcome referencing the resource', () => {
    const file = clone(geometry);
    (file.resources[1] as { coverage: string[] }).coverage = ['States a definition of each rigid motion using the terms from the definitions outcome.'];
    expect(validateDomainFile(file).ok).toBe(true);
    (file.resources[1] as { coverage: string[] }).coverage = ['Not an evidence statement.'];
    const { errors } = validateDomainFile(file);
    expect(errors[0]).toMatchObject({ rule: 'V-17', ekgId: 'ekg:resource:01JBXGEGEBRA00000000000000' });
  });

  it('V-18 in artifact mode rejects two resources with one normalized URL', () => {
    const file = clone(geometry);
    file.resources.push({ ...clone(file.resources[0]!), ekgId: 'ekg:resource:01JBXKHANACADEMY0000000001', url: 'https://www.khanacademy.org/math/geometry/#top' });
    expect(rules(validateDomainFile(file).errors)).toContain('V-18');
  });

  it('rejects a file that is not a domain file at all', () => {
    const result = validateDomainFile({ nodes: 'nope' });
    expect(result.ok).toBe(false);
    expect(result.errors[0]?.slug).toBe('(domain file)');
  });
});
