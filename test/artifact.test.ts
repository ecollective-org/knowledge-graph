import { describe, expect, it } from 'vitest';

import {
  ARTIFACT_PATHS,
  changelog,
  checksums,
  manifest,
  normalizeResourceUrl,
  sameResourceUrl,
  sha256Hex,
  verifyChecksums,
} from '../src/index.js';

const SHA_OF_ABC = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';

describe('manifest (SPEC §8.2)', () => {
  it('parses the manifest shape of §8.2', () => {
    const r = manifest.safeParse({
      schemaVersion: '0.1.0',
      artifactVersion: '1.0.0',
      buildId: '8f3c1d0e5a9b4c72e6d18a03f5b9c4e77a2d6013',
      generatedAt: '2026-09-05T04:12:07Z',
      publisher: 'opendegree',
      license: { content: 'CC BY-SA 4.0', aggregates: 'CC0-1.0' },
      counts: { domains: 2, outcomes: 8, courses: 2, assessments: 2, credentials: 2, resources: 9 },
      domains: [
        {
          ekgId: 'ekg:domain:01JBWX3QK7Z8Y4N2M5R6T7V8W9', slug: 'geometry', title: 'Geometry', order: 10, status: 'draft',
          counts: { outcomes: 5 }, path: 'domains/geometry.json', sha256: SHA_OF_ABC, bytes: 24117,
        },
      ],
      previousBuildId: '1c8a',
      changelogPath: 'changelog.json',
    });
    expect(r.success).toBe(true);
  });

  it('lays out the paths of EKG-SPEC-43', () => {
    expect(ARTIFACT_PATHS.manifest).toBe('index.json');
    expect(ARTIFACT_PATHS.domain('geometry')).toBe('domains/geometry.json');
    expect(ARTIFACT_PATHS.build('8f3c')).toBe('builds/8f3c/');
  });
});

describe('checksums and changelog (SPEC §8.5, §8.6)', () => {
  it('computes SHA-256 in hex', async () => {
    expect(await sha256Hex('abc')).toBe(SHA_OF_ABC);
    expect(await sha256Hex(new TextEncoder().encode('abc'))).toBe(SHA_OF_ABC);
  });

  it('verifies every fetched file and reports a mismatch or a missing entry (V-24)', async () => {
    const expected = checksums.parse({ 'domains/geometry.json': { sha256: SHA_OF_ABC, bytes: 3 } });
    const ok = await verifyChecksums({ 'domains/geometry.json': 'abc' }, expected);
    expect(ok.ok).toBe(true);
    const tampered = await verifyChecksums({ 'domains/geometry.json': 'abd', 'index.json': '{}' }, expected);
    expect(tampered.ok).toBe(false);
    expect(tampered.mismatches.map((m) => m.path).sort()).toEqual(['domains/geometry.json', 'index.json']);
  });

  it('accepts a changelog of at most 100 builds with per-domain counts and merges', () => {
    const entry = {
      buildId: '8f3c', generatedAt: '2026-09-05T04:12:07Z', schemaVersion: '0.1.0',
      domains: { geometry: { added: 1, changed: 2 } },
      merges: [{ deprecated: 'ekg:outcome:01JBX4TRNGCRTRA00000000000', survivor: 'ekg:outcome:01JBX3PRVCNGRNCE0000000000' }],
    };
    const parsed = changelog.parse([entry]);
    expect(parsed[0]?.domains.geometry?.deprecated).toBe(0);
    expect(changelog.safeParse(Array.from({ length: 101 }, () => entry)).success).toBe(false);
  });
});

describe('resource URL identity (EKG-SPEC-25)', () => {
  it('normalizes scheme, host, port, tracking parameters, trailing slash and fragment', () => {
    expect(normalizeResourceUrl('HTTPS://WWW.KhanAcademy.org:443/math/geometry/?utm_source=x&b=2&ref=y#top')).toBe(
      'https://www.khanacademy.org/math/geometry?b=2',
    );
    expect(normalizeResourceUrl('https://sheets.google.com/')).toBe('https://sheets.google.com');
    expect(normalizeResourceUrl('http://example.org:8080/a/')).toBe('http://example.org:8080/a');
  });

  it('keeps meaningful query parameters', () => {
    expect(normalizeResourceUrl('https://www.youtube.com/watch?v=7Bxw4kkeHJ8&fbclid=abc')).toBe('https://www.youtube.com/watch?v=7Bxw4kkeHJ8');
  });

  it('compares two mentions', () => {
    expect(sameResourceUrl('https://www.geogebra.org/geometry', 'https://www.geogebra.org/geometry/')).toBe(true);
    expect(sameResourceUrl('https://www.geogebra.org/geometry', 'https://www.geogebra.org/calculator')).toBe(false);
    expect(sameResourceUrl('not a url', 'https://www.geogebra.org/geometry')).toBe(false);
  });
});
