import { z } from 'zod';

import { anyEkgId, ekgId } from './ekg-id.js';
import { artifact, artifactResource, slug, status } from './schema.js';

/*
 * The published artifact (SPEC §8): the manifest, per-domain files, checksums and changelog.
 * The artifact is the contract; reading a content repository directly is not conformant.
 */

/** The version of the specification these schemas implement. */
export const SCHEMA_VERSION = '0.1.0';
/** The artifact format's own version (EKG-SPEC-44). */
export const ARTIFACT_VERSION = '1.0.0';

/** File layout under the versioned prefix (EKG-SPEC-43). */
export const ARTIFACT_PREFIX = '/api/graph/v1';
export const ARTIFACT_PATHS = {
  manifest: 'index.json',
  domain: (domainSlug: string) => `domains/${domainSlug}.json`,
  all: 'all.json.gz',
  checksums: 'checksums.json',
  changelog: 'changelog.json',
  build: (buildId: string) => `builds/${buildId}/`,
} as const;

export const sha256Hex = z.string().regex(/^[0-9a-f]{64}$/, 'Expected a lowercase hex SHA-256');

/** One row of the manifest's `domains` list (SPEC §8.2). */
export const manifestDomain = z.object({
  ekgId: ekgId('domain'),
  slug,
  title: z.string().min(1),
  order: z.number(),
  status,
  counts: z.record(z.string(), z.number().int().nonnegative()),
  path: z.string().min(1),
  sha256: sha256Hex,
  bytes: z.number().int().nonnegative(),
});

/** `index.json` (SPEC §8.2, EKG-SPEC-44). */
export const manifest = z.object({
  schemaVersion: z.string().min(1),
  artifactVersion: z.string().min(1),
  /** The publishing repository's commit SHA. */
  buildId: z.string().min(1),
  generatedAt: z.string().datetime(),
  publisher: z.string().min(1),
  license: z.object({ content: z.string().min(1), aggregates: z.string().min(1) }),
  counts: z.record(z.string(), z.number().int().nonnegative()),
  domains: z.array(manifestDomain),
  previousBuildId: z.string().optional(),
  changelogPath: z.string().min(1),
});
export type Manifest = z.infer<typeof manifest>;

/**
 * A prerequisite edge, directed from the dependent node to its prerequisite, matching the
 * direction the field is authored in. The only edge type in v0.1 (EKG-SPEC-47).
 */
export const edge = z.object({
  type: z.literal('prerequisite'),
  from: ekgId('outcome'),
  to: ekgId('outcome'),
  /** Names the other domain when the target lives outside this file (EKG-SPEC-46). */
  targetDomain: slug.optional(),
});
export type Edge = z.infer<typeof edge>;

/** `domains/<slug>.json` (SPEC §8.3, §8.4). */
export const domainFile = z.object({
  schemaVersion: z.string().min(1),
  buildId: z.string().min(1),
  generatedAt: z.string().datetime(),
  domain: artifact.domain,
  nodes: z.array(artifact.node),
  edges: z.array(edge),
  resources: z.array(artifactResource),
  /** Entity bodies as raw CommonMark, keyed by ekgId; never rendered HTML (EKG-SPEC-49). */
  body: z.record(anyEkgId, z.string()),
});
export type DomainFile = z.infer<typeof domainFile>;

/** `checksums.json`: every published path to its sha256 and byte length (EKG-SPEC-50). */
export const checksums = z.record(
  z.string(),
  z.object({ sha256: sha256Hex, bytes: z.number().int().nonnegative() }),
);
export type Checksums = z.infer<typeof checksums>;

/** Per-domain counts in a changelog entry (EKG-SPEC-53). */
export const changelogDomainCounts = z.object({
  added: z.number().int().nonnegative().default(0),
  changed: z.number().int().nonnegative().default(0),
  deprecated: z.number().int().nonnegative().default(0),
  merged: z.number().int().nonnegative().default(0),
});

/**
 * One build in `changelog.json`. The specification fixes the fields a build carries
 * (EKG-SPEC-53, EKG-SPEC-80); this is the package's concrete shape for them.
 */
export const changelogEntry = z.object({
  buildId: z.string().min(1),
  generatedAt: z.string().datetime(),
  schemaVersion: z.string().min(1),
  domains: z.record(slug, changelogDomainCounts),
  /** The ekgIds involved in any merge: the deprecated node and its survivor. */
  merges: z
    .array(z.object({ deprecated: anyEkgId, survivor: anyEkgId }))
    .default([]),
  /** Fields inside a deprecation window, named in every build (EKG-SPEC-80). */
  deprecatedFields: z.array(z.string()).default([]),
});
export type ChangelogEntry = z.infer<typeof changelogEntry>;

/** `changelog.json`: the last 100 builds, newest first (EKG-SPEC-53). */
export const changelog = z.array(changelogEntry).max(100);
export type Changelog = z.infer<typeof changelog>;

/** Cache-Control values a publisher serves per path (EKG-SPEC-51). */
export const CACHE_CONTROL = {
  manifest: 'public, max-age=300, stale-while-revalidate=3600',
  domain: 'public, max-age=3600, stale-while-revalidate=86400',
  all: 'public, max-age=3600',
  checksums: 'public, max-age=300',
  changelog: 'public, max-age=300',
  build: 'public, max-age=31536000, immutable',
} as const;
