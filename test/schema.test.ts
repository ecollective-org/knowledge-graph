import { describe, expect, it } from 'vitest';

import { AUDIENCE_DESCRIPTORS, artifact, audience, entity, outcome, provenance, resource, wikilink } from '../src/index.js';
import geometry from './fixtures/geometry.json' with { type: 'json' };

const ISSUE_MESSAGES = (r: { success: boolean; error?: { issues: { message: string }[] } }) =>
  r.success ? [] : (r.error?.issues ?? []).map((i) => i.message);

describe('source schemas (SPEC §3, Open Degree frontmatter)', () => {
  it('parses an Open Degree outcome with wikilink references and defaults', () => {
    const parsed = outcome.parse({
      ekgId: 'ekg:outcome:01JBX0DEFNTERMS00000000000',
      slug: 'define-geometric-terms',
      type: 'outcome',
      title: 'Define the basic objects of plane geometry',
      statement: 'I can give precise definitions of angle, circle, perpendicular lines, parallel lines, and line segment.',
      domain: '"[[geometry]]"'.replace(/"/g, ''),
      prerequisites: ['[[some-prereq|Prereq]]'],
      resources: [
        { title: 'Khan Academy, High School Geometry', url: 'https://www.khanacademy.org/math/geometry', kind: 'video', provider: 'Khan Academy' },
      ],
    });
    expect(parsed.domain).toBe('geometry');
    expect(parsed.prerequisites).toEqual(['some-prereq']);
    expect(parsed.level).toBe('foundation');
    expect(parsed.status).toBe('draft');
    expect(parsed.version).toBe('0.1.0');
    expect(parsed.license).toBe('CC BY-SA 4.0');
    expect(parsed.resources[0]?.cost).toBe('free');
    expect(parsed.resources[0]?.embedPolicy).toBe('unknown');
    expect(parsed.resources[0]?.language).toBe('en');
  });

  it('strips wikilink brackets and aliases and rejects an empty reference (V-06)', () => {
    expect(wikilink.parse('[[define-geometric-terms|Definitions]]')).toBe('define-geometric-terms');
    expect(wikilink.parse('  define-geometric-terms ')).toBe('define-geometric-terms');
    const empty = wikilink.safeParse('[[|Alias]]');
    expect(empty.success).toBe(false);
    expect(ISSUE_MESSAGES(empty)[0]).toContain('V-06');
  });

  it('requires status: deprecated whenever supersededBy is present (V-04, EKG-SPEC-05)', () => {
    const base = {
      ekgId: 'ekg:domain:01JBWX3QK7Z8Y4N2M5R6T7V8W9',
      slug: 'geometry',
      type: 'domain',
      title: 'Geometry',
      description: 'Shapes.',
      supersededBy: 'plane-geometry',
    };
    const bad = entity.safeParse(base);
    expect(bad.success).toBe(false);
    expect(ISSUE_MESSAGES(bad).some((m) => m.includes('V-04'))).toBe(true);
    expect(entity.safeParse({ ...base, status: 'deprecated' }).success).toBe(true);
  });

  it('discriminates on type and rejects an unknown type (V-07)', () => {
    const r = entity.safeParse({ type: 'topic', title: 'x' });
    expect(r.success).toBe(false);
  });

  it('enforces at least one outcome on courses, assessments and credentials (V-05)', () => {
    const r = entity.safeParse({
      ekgId: 'ekg:course:01JBX5CRSCNGRNCE0000000000',
      slug: 'empty-course',
      type: 'course',
      title: 'Empty',
      description: 'Nothing in it.',
      domain: 'geometry',
      outcomes: [],
    });
    expect(r.success).toBe(false);
    expect(ISSUE_MESSAGES(r)[0]).toContain('V-05');
  });

  it('rejects a resource without an absolute URL (V-01)', () => {
    expect(resource.safeParse({ title: 'x', url: '/relative', kind: 'video' }).success).toBe(false);
    expect(resource.safeParse({ title: 'x', url: 'https://example.org/a', kind: 'video' }).success).toBe(true);
  });
});

describe('provenance (SPEC §3.8)', () => {
  const now = '2026-09-05T04:12:07Z';

  it('requires modelId and promptVersion when the source is ai (V-19)', () => {
    const r = provenance.safeParse({ source: 'ai', generatedAt: now });
    expect(r.success).toBe(false);
    expect(ISSUE_MESSAGES(r)[0]).toContain('V-19');
    expect(
      provenance.safeParse({ source: 'ai', generatedAt: now, modelId: 'claude-sonnet-5', promptVersion: 'map-v03' }).success,
    ).toBe(true);
  });

  it('requires reviewedAt when reviewedBy is present (V-19)', () => {
    const r = provenance.safeParse({ source: 'curator', generatedAt: now, reviewedBy: 'ravi' });
    expect(r.success).toBe(false);
    expect(ISSUE_MESSAGES(r)[0]).toContain('V-19');
  });

  it('refuses an email address anywhere in provenance (V-20, EKG-SPEC-14)', () => {
    const r = provenance.safeParse({ source: 'curator', generatedAt: now, reviewedBy: 'ravi@example.org', reviewedAt: now });
    expect(r.success).toBe(false);
    expect(ISSUE_MESSAGES(r).some((m) => m.includes('V-20'))).toBe(true);
  });
});

describe('audience (SPEC §7.4)', () => {
  const khan = geometry.resources.find((r) => r.ekgId === 'ekg:resource:01JBXKHANACADEMY0000000000')!;
  const rated = {
    rating: 'all',
    descriptors: ['account_required'],
    basis: {
      automated: { modelId: 'claude-sonnet-5', promptVersion: 'audience-v1', at: '2026-09-16T02:00:00Z', signals: ['title', 'captions'] },
      human: { count: 2, lastAt: '2026-09-16T15:20:00Z' },
    },
    confidence: 0.9,
    disputes: 0,
    version: 2,
  };

  it('is optional on a resource and defaults to unrated with an empty basis (EKG-SPEC-110)', () => {
    const parsed = resource.parse({ title: 'x', url: 'https://example.org/a', kind: 'video' });
    expect(parsed.audience).toBeUndefined();
    expect(audience.parse({})).toEqual({ rating: 'unrated', descriptors: [], basis: {}, disputes: 0, version: 1 });
  });

  it('parses a full block on a source resource and on an artifact resource', () => {
    expect(resource.safeParse({ title: khan.title, url: khan.url, kind: khan.kind, audience: rated }).success).toBe(true);
    const r = artifact.resource.safeParse({ ...khan, audience: rated });
    expect(r.success, ISSUE_MESSAGES(r).join('; ')).toBe(true);
    if (r.success) expect(r.data.audience?.basis.human?.count).toBe(2);
  });

  it('fixes the scale and the descriptor list; anything else is V-01 (EKG-SPEC-113)', () => {
    expect(AUDIENCE_DESCRIPTORS).toHaveLength(15);
    expect(audience.safeParse({ rating: 'PG-13' }).success).toBe(false);
    expect(audience.safeParse({ descriptors: ['scary'] }).success).toBe(false);
    expect(audience.safeParse({ basis: { automated: { modelId: 'm', promptVersion: 'p', at: 'yesterday' } } }).success).toBe(false);
    expect(audience.safeParse({ confidence: 1.5 }).success).toBe(false);
    expect(audience.safeParse({ version: 0 }).success).toBe(false);
  });
});

describe('artifact schemas (SPEC §8.3)', () => {
  it('parses every node, the domain and every resource of the Appendix B example', () => {
    expect(artifact.domain.safeParse(geometry.domain).success).toBe(true);
    for (const node of geometry.nodes) {
      const r = artifact.node.safeParse(node);
      expect(r.success, `${node.slug}: ${ISSUE_MESSAGES(r).join('; ')}`).toBe(true);
    }
    for (const res of geometry.resources) {
      const r = artifact.resource.safeParse(res);
      expect(r.success, `${res.title}: ${ISSUE_MESSAGES(r).join('; ')}`).toBe(true);
    }
  });

  it('requires provenance and ekgId references in the artifact', () => {
    const { provenance: _omit, ...withoutProvenance } = geometry.nodes[0]!;
    expect(artifact.node.safeParse(withoutProvenance).success).toBe(false);
    expect(artifact.node.safeParse({ ...geometry.nodes[1], prerequisites: ['define-geometric-terms'] }).success).toBe(false);
  });
});
