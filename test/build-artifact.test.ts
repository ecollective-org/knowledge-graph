import { describe, expect, it } from 'vitest';

import {
  ARTIFACT_PATHS,
  buildArtifact,
  changelog,
  deriveFeed,
  diffCounts,
  feed,
  manifest,
  stableStringify,
  validateDomainFile,
  verifyChecksums,
  type BuildResult,
  type SourceEntry,
} from '../src/index.js';
import geometry from './fixtures/geometry.json' with { type: 'json' };
import geometrySource from './fixtures/geometry-source.json' with { type: 'json' };

const BUILD = {
  buildId: '8f3c1d0e5a9b4c72e6d18a03f5b9c4e77a2d6013',
  generatedAt: '2026-09-05T04:12:07Z',
  sourceRepo: 'ecollective-org/www.opendegree.org',
};
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const source = (): SourceEntry[] => clone(geometrySource) as SourceEntry[];
const decoder = new TextDecoder();

async function gunzip(bytes: Uint8Array): Promise<string> {
  const stream = new DecompressionStream('gzip');
  const writer = stream.writable.getWriter();
  void writer.write(bytes as BufferSource);
  void writer.close();
  return decoder.decode(await new Response(stream.readable).arrayBuffer());
}

function built(result: BuildResult) {
  if (!result.ok) throw new Error(result.errors.map((e) => `${e.rule} ${e.slug} ${e.path ?? ''}: ${e.message}`).join('\n'));
  return result.artifact;
}

describe('buildArtifact (SPEC §8, #3)', () => {
  it('reproduces Appendix B byte for byte where the specification is exact (EKG-SPEC-52)', async () => {
    const result = await buildArtifact(source(), BUILD);
    const artifact = built(result);
    expect(result.ok && result.warnings).toEqual([]);
    expect(artifact.domains.map((d) => d.slug)).toEqual(['geometry']);
    expect(artifact.domains[0]!.json).toBe(stableStringify(geometry));
    expect(artifact.domains[0]!.file).toEqual(JSON.parse(stableStringify(geometry)));
    expect(validateDomainFile(artifact.domains[0]!.file).ok).toBe(true);
  });

  it('emits the manifest of §8.2 and the file layout of EKG-SPEC-43, with checksums that verify (V-24)', async () => {
    const artifact = built(await buildArtifact(source(), BUILD));
    expect(manifest.safeParse(artifact.manifest).success).toBe(true);
    expect(artifact.manifest).toMatchObject({
      schemaVersion: '0.2.0', artifactVersion: '1.0.0', buildId: BUILD.buildId, generatedAt: BUILD.generatedAt, publisher: 'opendegree',
      license: { content: 'CC BY-SA 4.0', aggregates: 'CC0-1.0' },
      counts: { domains: 1, outcomes: 5, courses: 1, assessments: 1, credentials: 1, resources: 4 },
      changelogPath: 'changelog.json',
    });
    expect(artifact.manifest.previousBuildId).toBeUndefined();
    expect(artifact.manifest.domains[0]).toMatchObject({ slug: 'geometry', path: 'domains/geometry.json', counts: { outcomes: 5, courses: 1, assessments: 1, credentials: 1, resources: 4 } });
    const paths = Object.keys(artifact.files).sort();
    expect(paths).toEqual([
      'all.json.gz', `builds/${BUILD.buildId}/checksums.json`, `builds/${BUILD.buildId}/domains/geometry.json`, `builds/${BUILD.buildId}/index.json`,
      'changelog.json', 'checksums.json', 'domains/geometry.json', 'feed.json', 'index.json',
    ]);
    expect(Object.keys(artifact.checksums).sort()).toEqual(paths.filter((p) => !p.endsWith('checksums.json')));
    const { [ARTIFACT_PATHS.checksums]: _c, [`builds/${BUILD.buildId}/checksums.json`]: _s, ...published } = artifact.files;
    expect((await verifyChecksums(published, artifact.checksums)).ok).toBe(true);
    expect(artifact.manifest.domains[0]!.sha256).toBe(artifact.checksums['domains/geometry.json']!.sha256);
    expect(decoder.decode(artifact.files['index.json'])).toBe(stableStringify(artifact.manifest));
    expect(artifact.files[`builds/${BUILD.buildId}/index.json`]).toBe(artifact.files['index.json']);
  });

  it('gzips everything for a full reimport, and builds twice to identical bytes', async () => {
    const first = built(await buildArtifact(source(), BUILD));
    const second = built(await buildArtifact(source(), BUILD));
    const all = JSON.parse(await gunzip(first.files['all.json.gz']!)) as { schemaVersion: string; buildId: string; domains: unknown[] };
    expect(all.schemaVersion).toBe('0.2.0');
    expect(all.buildId).toBe(BUILD.buildId);
    expect(all.domains[0]).toEqual(first.domains[0]!.file);
    for (const path of Object.keys(first.files)) {
      if (path.endsWith('all.json.gz')) continue; // gzip bytes are the compressor's business; the content round-trips above
      expect(decoder.decode(first.files[path])).toBe(decoder.decode(second.files[path]));
    }
  });

  it('refuses a resource without an ekgId, naming the entity (EKG-SPEC-24), and returns validation errors rather than files', async () => {
    const noId = source();
    const outcome = noId.find((e) => (e.data as { slug: string }).slug === 'define-geometric-terms')!.data as { resources: { ekgId?: string }[] };
    delete outcome.resources[0]!.ekgId;
    const refused = await buildArtifact(noId, BUILD);
    expect(refused.ok).toBe(false);
    if (!refused.ok) expect(refused.errors[0]).toMatchObject({ slug: 'define-geometric-terms', path: 'resources[0].ekgId' });

    const dangling = source();
    (dangling.find((e) => (e.data as { slug: string }).slug === 'describe-rigid-motions')!.data as { prerequisites: string[] }).prerequisites = ['[[no-such-outcome]]'];
    const invalid = await buildArtifact(dangling, BUILD);
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) expect(invalid.errors.map((e) => e.rule)).toEqual(['V-02']);
  });

  it('diffs against the previous artifact: changelog counts, merges and the feed (EKG-SPEC-53, EKG-SPEC-120)', async () => {
    const first = built(await buildArtifact(source(), BUILD));
    expect(changelog.safeParse(first.changelog).success).toBe(true);
    expect(first.changelog).toHaveLength(1);
    expect(first.changelog[0]!.domains.geometry).toEqual({ added: 8, changed: 0, deprecated: 0, merged: 0 });
    expect(feed.safeParse(first.feed).success).toBe(true);
    expect(first.feed).toHaveLength(13); // the domain, eight nodes, four resources, all created
    expect(first.feed.every((e) => e.change === 'created' && e.buildId === BUILD.buildId && e.at === BUILD.generatedAt)).toBe(true);
    expect(first.feed.map((e) => e.ekgId)).toEqual([...first.feed.map((e) => e.ekgId)].sort());

    const next = source();
    const represent = next.find((e) => (e.data as { slug: string }).slug === 'represent-transformations')!.data as Record<string, unknown>;
    represent.title = 'Represent transformations as functions';
    represent.version = '0.1.1';
    const stub = next.find((e) => (e.data as { slug: string }).slug === 'triangle-congruence-criteria')!.data as Record<string, unknown>;
    stub.status = 'deprecated';
    stub.supersededBy = '[[prove-congruence-with-rigid-motions]]';
    const previous = { manifest: first.manifest, domains: { geometry: first.domains[0]!.file }, changelog: first.changelog, feed: first.feed };
    const second = built(await buildArtifact(next, { ...BUILD, buildId: 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678', generatedAt: '2026-09-06T04:12:07Z', previous }));
    expect(second.manifest.previousBuildId).toBe(BUILD.buildId);
    expect(second.changelog).toHaveLength(2);
    expect(second.changelog[0]!.domains.geometry).toEqual({ added: 0, changed: 2, deprecated: 1, merged: 1 });
    expect(second.changelog[0]!.merges).toEqual([{ deprecated: 'ekg:outcome:01JBX4TRNGCRTRA00000000000', survivor: 'ekg:outcome:01JBX3PRVCNGRNCE0000000000' }]);
    expect(second.feed.slice(0, 2).map((e) => [e.ekgId, e.change, e.version])).toEqual([
      ['ekg:outcome:01JBX1REPRESENT00000000000', 'updated', '0.1.1'],
      ['ekg:outcome:01JBX4TRNGCRTRA00000000000', 'merged', '0.1.0'],
    ]);
    expect(second.feed).toHaveLength(15);
    expect(diffCounts(first.domains[0]!.file, first.domains[0]!.file)).toEqual({ added: 0, changed: 0, deprecated: 0, merged: 0 });
    expect(deriveFeed([first.domains[0]!.file], [first.domains[0]!.file], 'x', BUILD.generatedAt)).toEqual([]);
  });

  it('emits a course whose outcomes span domains in every domain file it touches, with crossDomain (EKG-SPEC-136)', async () => {
    const entries = source();
    entries.push(
      { data: { ekgId: 'ekg:domain:01JBXDATA7TERACY0000000000', slug: 'data-literacy', type: 'domain', title: 'Data Literacy', description: 'Reading and questioning data.', order: 20 } },
      { data: { ekgId: 'ekg:outcome:01JBXC7EANADATASET00000000', slug: 'clean-a-dataset', type: 'outcome', title: 'Clean a dataset', statement: 'I can clean a dataset.', domain: '[[data-literacy]]', prerequisites: ['[[define-geometric-terms]]'] } },
    );
    const course = entries.find((e) => (e.data as { slug: string }).slug === 'congruence-through-rigid-motions')!.data as { outcomes: string[] };
    course.outcomes.push('[[clean-a-dataset]]');
    const artifact = built(await buildArtifact(entries, BUILD));
    expect(artifact.domains.map((d) => d.slug)).toEqual(['geometry', 'data-literacy']);
    const inGeometry = artifact.domains[0]!.file.nodes.find((n) => n.type === 'course');
    const inData = artifact.domains[1]!.file.nodes.find((n) => n.type === 'course');
    expect(inGeometry).toMatchObject({ crossDomain: true, domain: 'ekg:domain:01JBWX3QK7Z8Y4N2M5R6T7V8W9' });
    expect(inData).toEqual(inGeometry);
    expect(artifact.domains[1]!.file.edges).toEqual([{ type: 'prerequisite', from: 'ekg:outcome:01JBXC7EANADATASET00000000', to: 'ekg:outcome:01JBX0DEFNTERMS00000000000', targetDomain: 'geometry' }]);
    for (const d of artifact.domains) expect(validateDomainFile(d.file).ok).toBe(true);
    expect(artifact.manifest.counts).toMatchObject({ domains: 2, outcomes: 6, courses: 1 });
  });
});
