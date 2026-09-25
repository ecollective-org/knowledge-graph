import { describe, expect, it } from 'vitest';

import {
  COMMONS_PATHS,
  COMMONS_STATES,
  QUALITY_DIMENSIONS,
  commonsResource,
  commonsResourceList,
  validateCommonsResourceList,
  type ValidationError,
} from '../src/index.js';
import list from './fixtures/commons-resources-geometry.json' with { type: 'json' };

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const rules = (errors: ValidationError[]) => errors.map((e) => e.rule);

describe('commons resource records (SPEC §3.10)', () => {
  it('validates the specification example, a real Appendix B resource as a commons record, with no warnings', () => {
    const result = validateCommonsResourceList(list);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.file?.records[0]?.quality?.mean).toBe(4.2);
    expect(result.file?.records[0]?.effectiveness[0]?.learners).toBe(210);
    expect(commonsResourceList.safeParse(list).success).toBe(true);
    expect(COMMONS_STATES).toEqual(['pending', 'provisional', 'published', 'retired']);
    expect(QUALITY_DIMENSIONS).toHaveLength(6);
  });

  it('keys the per-concept file by the outcome ULID (EKG-SPEC-162)', () => {
    expect(COMMONS_PATHS.resources('ekg:outcome:01JBX0DEFNTERMS00000000000')).toBe('resources/01JBX0DEFNTERMS00000000000.json');
    expect(() => COMMONS_PATHS.resources('define-geometric-terms')).toThrow(/Not an ekgId/);
  });

  it('V-31 keeps pending and retired records and the registered layer out of the open artifact (EKG-SPEC-163/164)', () => {
    const file = clone(list);
    file.records[0]!.state = 'pending';
    (file.records[0] as { qualityBreakdown?: unknown }).qualityBreakdown = { correctness: 4.5, trust: 3.8 };
    const open = validateCommonsResourceList(file);
    expect(open.errors.map((e) => [e.rule, e.path])).toEqual([['V-31', 'records[0].state'], ['V-31', 'records[0].qualityBreakdown']]);
    expect(open.errors[0]).toMatchObject({ slug: '(resource) Khan Academy, High School Geometry', ekgId: 'ekg:resource:01JBXKHANACADEMY0000000000' });
    const registered = validateCommonsResourceList(file, { layer: 'registered' });
    expect(registered.errors).toEqual([]);
    file.records[0]!.state = 'provisional';
    delete (file.records[0] as { qualityBreakdown?: unknown }).qualityBreakdown;
    expect(validateCommonsResourceList(file).ok).toBe(true);
  });

  it('V-32 requires every record to name the file\'s outcome, sorted by ekgId and unique; V-18 holds across records', () => {
    const file = clone(list);
    const second = clone(file.records[0]!);
    second.ekgId = 'ekg:resource:01JBXGEGEBRA00000000000000';
    second.title = 'GeoGebra Geometry';
    second.url = 'https://www.geogebra.org/geometry';
    second.outcomes = [{ outcome: 'ekg:outcome:01JBX1REPRESENT00000000000', coverage: [], rankHint: 1 }];
    file.records.push(second);
    const result = validateCommonsResourceList(file);
    expect(result.errors.map((e) => [e.rule, e.path])).toEqual([
      ['V-32', 'records[1].outcomes'],
      ['V-32', 'records[1]'],
    ]);
    const dup = clone(list);
    dup.records.push({ ...clone(dup.records[0]!), ekgId: 'ekg:resource:01JBXKHANACADEMY0000000001', url: 'https://www.khanacademy.org/math/geometry/#top' });
    expect(rules(validateCommonsResourceList(dup).errors)).toEqual(['V-18']);
    const twice = clone(list);
    twice.records.push(clone(twice.records[0]!));
    expect(rules(validateCommonsResourceList(twice).errors)).toEqual(['V-32']);
  });

  it('V-01: an aggregate below k = 50, a subKind contradiction, a record with no outcome, a bad file', () => {
    const file = clone(list);
    file.records[0]!.effectiveness[0]!.learners = 49;
    const small = validateCommonsResourceList(file);
    expect(small.errors[0]).toMatchObject({ rule: 'V-01', slug: '(resource list)', path: 'records[0].effectiveness[0].learners' });
    expect(small.errors[0]?.message).toContain('EKG-SPEC-69');
    const r = commonsResource.safeParse({ ...list.records[0], subKind: 'paper' });
    expect(r.success).toBe(false);
    expect(commonsResource.safeParse({ ...list.records[0], outcomes: [] }).success).toBe(false);
    expect(validateCommonsResourceList({ records: 'nope' }).errors[0]?.slug).toBe('(resource list)');
  });
});
