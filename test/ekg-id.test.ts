import { describe, expect, it } from 'vitest';

import {
  EKG_ID_PATTERN,
  EKG_TYPES,
  GRAPH_TYPES,
  REFERENCE_TYPES,
  anyEkgId,
  ekgId,
  graphEkgId,
  isEkgId,
  isEkgIdOf,
  isGraphType,
  isReferenceType,
  mintEkgId,
  parseEkgId,
} from '../src/index.js';

describe('ekgId (SPEC §4.1)', () => {
  it('mints ekg:<type>:<ULID> in the Crockford alphabet', () => {
    const id = mintEkgId('outcome');
    expect(id).toMatch(EKG_ID_PATTERN);
    expect(id.startsWith('ekg:outcome:')).toBe(true);
    // I, L, O and U are excluded from the alphabet (EKG-SPEC-15).
    expect(id.slice('ekg:outcome:'.length)).not.toMatch(/[ILOU]/);
  });

  it('mints identifiers that sort by creation time', () => {
    const earlier = mintEkgId('resource', Date.UTC(2026, 0, 1));
    const later = mintEkgId('resource', Date.UTC(2026, 0, 2));
    expect(earlier < later).toBe(true);
  });

  it('parses the type and ULID back out', () => {
    expect(parseEkgId('ekg:outcome:01JBWX3QK7Z8Y4N2M5R6T7V8W9')).toEqual({
      type: 'outcome',
      ulid: '01JBWX3QK7Z8Y4N2M5R6T7V8W9',
    });
    expect(() => parseEkgId('outcome:01JBWX3QK7Z8Y4N2M5R6T7V8W9')).toThrow(/Not an ekgId/);
  });

  it('rejects the wrong type, lowercase, the excluded letters, and the wrong length', () => {
    expect(isEkgId('ekg:outcome:01JBWX3QK7Z8Y4N2M5R6T7V8W9')).toBe(true);
    expect(isEkgIdOf('domain', 'ekg:outcome:01JBWX3QK7Z8Y4N2M5R6T7V8W9')).toBe(false);
    expect(isEkgId('ekg:topic:01JBWX3QK7Z8Y4N2M5R6T7V8W9')).toBe(false);
    expect(isEkgId('ekg:outcome:01jbwx3qk7z8y4n2m5r6t7v8w9')).toBe(false);
    expect(isEkgId('ekg:outcome:01JBWX3QK7Z8Y4N2M5R6T7V8WI')).toBe(false);
    expect(isEkgId('ekg:outcome:01JBWX3QK7Z8Y4N2M5R6T7V8W')).toBe(false);
  });

  it('exposes typed and untyped zod schemas that name V-09', () => {
    expect(ekgId('domain').safeParse('ekg:domain:01JBWX3QK7Z8Y4N2M5R6T7V8W9').success).toBe(true);
    const wrongType = ekgId('domain').safeParse('ekg:outcome:01JBWX3QK7Z8Y4N2M5R6T7V8W9');
    expect(wrongType.success).toBe(false);
    if (!wrongType.success) expect(wrongType.error.issues[0]?.message).toContain('V-09');
    expect(anyEkgId.safeParse('ekg:credential:01JBX7BADGECNGRNC000000000').success).toBe(true);
  });

  it('names the six reference types of the commons beside the six graph types (EKG-SPEC-15, 0.2.0)', () => {
    expect(EKG_TYPES).toHaveLength(12);
    expect(GRAPH_TYPES).toHaveLength(6);
    expect(REFERENCE_TYPES).toEqual(['framework', 'standard', 'institution', 'program', 'offering', 'platform']);
    expect(mintEkgId('standard')).toMatch(EKG_ID_PATTERN);
    expect(parseEkgId('ekg:institution:01JBWX3QK7Z8Y4N2M5R6T7V8W9').type).toBe('institution');
    expect(isReferenceType('platform')).toBe(true);
    expect(isGraphType('platform')).toBe(false);
    expect(anyEkgId.safeParse('ekg:offering:01JBWX3QK7Z8Y4N2M5R6T7V8W9').success).toBe(true);
  });

  it('never lets a reference id into a graph field (EKG-SPEC-115)', () => {
    expect(graphEkgId.safeParse('ekg:standard:01JBWX3QK7Z8Y4N2M5R6T7V8W9').success).toBe(false);
    expect(graphEkgId.safeParse('ekg:outcome:01JBWX3QK7Z8Y4N2M5R6T7V8W9').success).toBe(true);
    const r = graphEkgId.safeParse('ekg:standard:01JBWX3QK7Z8Y4N2M5R6T7V8W9');
    if (!r.success) expect(r.error.issues[0]?.message).toContain('V-09');
  });

  it('refuses to mint an unknown type', () => {
    expect(() => mintEkgId('topic' as never)).toThrow(/Unknown EKG type/);
  });
});
