import {
  ARTIFACT_PATHS,
  ARTIFACT_VERSION,
  FEED_LIMIT,
  SCHEMA_VERSION,
  type Changelog,
  type ChangelogEntry,
  type Checksums,
  type DomainFile,
  type Feed,
  type FeedChange,
  type FeedEntry,
  type Manifest,
  changelog as changelogSchema,
  domainFile as domainFileSchema,
  feed as feedSchema,
  manifest as manifestSchema,
} from './artifact.js';
import { sha256Hex } from './checksums.js';
import { frameworkByName } from './frameworks.js';
import {
  type ArtifactNode,
  type ArtifactResource,
  type Entity,
  type Resource,
  entity as sourceEntity,
} from './schema.js';
import { type ValidationError, validateDomainFile, validateGraph } from './validate.js';

/*
 * The artifact builder (SPEC §8): a validated content set in, the published file layout out.
 * Pure and runtime-agnostic: no Astro, no `node:` imports (gzip through the Web
 * CompressionStream, hashing through Web Crypto), so every publisher shares one implementation
 * and the site keeps only the glue that reads its Markdown.
 *
 * What it does, in order: validate the whole graph in source mode and refuse on any error
 * (EKG-SPEC-74); refuse a resource without an ekgId, because a build never mints (EKG-SPEC-24 as
 * resolved by EKG-OQ-3); build one file per domain with nodes, edges, deduplicated resources and
 * bodies (§8.3, §8.4), emitting an assessment, credential or course whose outcomes span domains
 * in every file it touches with `crossDomain: true` (EKG-SPEC-45, -136); sort keys and arrays so
 * a byte diff is a semantic diff (EKG-SPEC-52); validate every file (V-23); then the manifest,
 * `all.json.gz`, `changelog.json` diffed against the previous artifact (EKG-SPEC-53), `feed.json`
 * derived from it (EKG-SPEC-120), `checksums.json` over every published path (EKG-SPEC-50), and
 * the current build's immutable snapshot under `builds/<buildId>/` (EKG-SPEC-54).
 */

/** One source entity: its frontmatter (with `slug`, references as slugs or wikilinks) and its Markdown body. */
export interface SourceEntry {
  data: unknown;
  body?: string;
}

/** The previously published artifact, as fetched; each part is parsed inside and treated as absent if it does not parse. */
export interface PreviousArtifact {
  manifest?: unknown;
  /** Domain files keyed by domain slug. */
  domains?: Readonly<Record<string, unknown>>;
  changelog?: unknown;
  feed?: unknown;
}

export interface BuildOptions {
  /** The publishing repository's commit SHA (EKG-SPEC-44). */
  buildId: string;
  /** UTC, ISO 8601 with a `Z` suffix (EKG-SPEC-44). */
  generatedAt: string;
  publisher?: string;
  /** Default provenance for content that carries none: `sourceRepo` and the build's commit. */
  sourceRepo?: string;
  license?: { content: string; aggregates: string };
  previous?: PreviousArtifact | null;
  /** Override for `all.json.gz`; defaults to the Web CompressionStream. */
  gzip?: (bytes: Uint8Array) => Promise<Uint8Array>;
}

export interface BuiltDomain {
  slug: string;
  file: DomainFile;
  json: string;
}

export interface BuiltArtifact {
  buildId: string;
  generatedAt: string;
  manifest: Manifest;
  domains: BuiltDomain[];
  changelog: Changelog;
  feed: Feed;
  checksums: Checksums;
  /** Every published path to its bytes, snapshot included. */
  files: Record<string, Uint8Array>;
}

export type BuildResult =
  | { ok: true; artifact: BuiltArtifact; warnings: ValidationError[] }
  | { ok: false; errors: ValidationError[]; warnings: ValidationError[] };

const byCodePoint = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** Sort object keys lexicographically, recursively, dropping `undefined` values. */
export function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(record)
        .sort(byCodePoint)
        .filter((k) => record[k] !== undefined)
        .map((k) => [k, sortKeys(record[k])]),
    );
  }
  return value;
}

/** Stable JSON (EKG-SPEC-52): sorted keys, two-space indent, one trailing newline, UTF-8 when encoded. */
export function stableStringify(value: unknown): string {
  return `${JSON.stringify(sortKeys(value), null, 2)}\n`;
}

const encoder = new TextEncoder();

async function gzipWithStream(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new CompressionStream('gzip');
  const writer = stream.writable.getWriter();
  void writer.write(bytes as BufferSource);
  void writer.close();
  return new Uint8Array(await new Response(stream.readable).arrayBuffer());
}

/** Compare content, not the per-build provenance timestamp or commit. */
function strip(node: Record<string, unknown>): unknown {
  const { provenance, ...rest } = node;
  const p = provenance as Record<string, unknown> | undefined;
  return sortKeys({ ...rest, provenance: p ? { ...p, generatedAt: undefined, sourceCommit: undefined } : undefined });
}

const same = (a: Record<string, unknown>, b: Record<string, unknown>): boolean =>
  JSON.stringify(strip(a)) === JSON.stringify(strip(b));

/** Per-domain counts for a changelog entry (EKG-SPEC-53), against the previous build's file for that domain. */
export function diffCounts(previousFile: DomainFile | undefined, file: DomainFile): ChangelogEntry['domains'][string] {
  if (!previousFile) return { added: file.nodes.length, changed: 0, deprecated: 0, merged: 0 };
  const prev = new Map(previousFile.nodes.map((n) => [n.ekgId, n]));
  const counts = { added: 0, changed: 0, deprecated: 0, merged: 0 };
  for (const n of file.nodes) {
    const p = prev.get(n.ekgId);
    if (!p) counts.added += 1;
    else if (!same(n, p)) counts.changed += 1;
    if (n.status === 'deprecated' && p?.status !== 'deprecated') counts.deprecated += 1;
    if (n.supersededBy && !p?.supersededBy) counts.merged += 1;
  }
  return counts;
}

type Versioned = { ekgId: string; type: FeedEntry['type']; version?: string; status?: string; supersededBy?: string } & Record<string, unknown>;

function changeOf(current: Versioned, previous: Versioned | undefined): FeedChange | undefined {
  if (!previous) return 'created';
  if (current.supersededBy && !previous.supersededBy) return 'merged';
  if (current.status === 'deprecated' && previous.status !== 'deprecated') return 'deprecated';
  if (!same(current, previous)) return 'updated';
  return undefined;
}

/**
 * The feed entries a build adds (EKG-SPEC-120): one per entity that was created, updated,
 * merged or deprecated since the previous artifact, over domains, nodes and resources, sorted by
 * ekgId. With no previous artifact, every entity is `created`.
 */
export function deriveFeed(
  files: readonly DomainFile[],
  previousFiles: readonly DomainFile[],
  buildId: string,
  at: string,
): FeedEntry[] {
  const previous = new Map<string, Versioned>();
  for (const f of previousFiles) {
    previous.set(f.domain.ekgId, f.domain as Versioned);
    for (const n of f.nodes) previous.set(n.ekgId, n as Versioned);
    for (const r of f.resources) previous.set(r.ekgId, { ...r, type: 'resource' } as unknown as Versioned);
  }
  const entries = new Map<string, FeedEntry>();
  const consider = (e: Versioned) => {
    if (entries.has(e.ekgId)) return;
    const change = changeOf(e, previous.get(e.ekgId));
    if (change) entries.set(e.ekgId, { ekgId: e.ekgId, type: e.type, change, ...(e.version ? { version: e.version } : {}), buildId, at });
  };
  for (const f of files) {
    consider(f.domain as Versioned);
    for (const n of f.nodes) consider(n as Versioned);
    for (const r of f.resources) consider({ ...r, type: 'resource' } as unknown as Versioned);
  }
  return [...entries.values()].sort((a, b) => byCodePoint(a.ekgId, b.ekgId));
}

type Ref = string;
type Parsed = Entity;

/**
 * Build the artifact from source entities (SPEC §8). Returns the files to publish, or every
 * validation error, each naming the entity and the rule (EKG-SPEC-76). Never mints an id.
 */
export async function buildArtifact(entries: readonly SourceEntry[], options: BuildOptions): Promise<BuildResult> {
  const { buildId, generatedAt } = options;
  const publisher = options.publisher ?? 'opendegree';
  const license = options.license ?? { content: 'CC BY-SA 4.0', aggregates: 'CC0-1.0' };
  const provenanceDefault = {
    source: 'opendegree' as const,
    generatedAt,
    ...(options.sourceRepo ? { sourceRepo: options.sourceRepo } : {}),
    sourceCommit: buildId.slice(0, 8),
  };

  // 1. The whole graph in source mode (EKG-SPEC-74/75).
  const graph = validateGraph(
    entries.map((e) => e.data),
    { mode: 'source' },
  );
  const warnings = [...graph.warnings];
  if (!graph.ok) return { ok: false, errors: graph.errors, warnings };

  const parsed = entries.map((e) => ({ entity: sourceEntity.parse(e.data), body: e.body }));
  const bodyOf = new Map<Parsed, string | undefined>(parsed.map((p) => [p.entity, p.body]));
  const entities = parsed.map((p) => p.entity);

  // 2. A build refuses a resource without an id; minting happens in the content repository (EKG-SPEC-24).
  const errors: ValidationError[] = [];
  for (const e of entities) {
    if (e.type !== 'outcome' && e.type !== 'course') continue;
    e.resources.forEach((r, i) => {
      if (!r.ekgId) {
        errors.push({ rule: 'V-01', severity: 'error', slug: e.slug, ekgId: e.ekgId, message: `resource "${r.title}" has no ekgId; a build refuses to mint one (EKG-SPEC-24)`, path: `resources[${i}].ekgId` });
      }
    });
  }
  if (errors.length) return { ok: false, errors, warnings };

  // 3. Indexes.
  const idOf = new Map<string, string>();
  for (const e of entities) idOf.set(`${e.type}:${e.slug}`, e.ekgId);
  const resolve = (type: Entity['type'], slug: Ref): string => {
    const id = idOf.get(`${type}:${slug}`);
    if (!id) throw new Error(`no ${type} with slug ${slug}`); // V-02 already ran
    return id;
  };
  const domains = entities.filter((e): e is Extract<Entity, { type: 'domain' }> => e.type === 'domain');
  const outcomes = entities.filter((e): e is Extract<Entity, { type: 'outcome' }> => e.type === 'outcome');
  const domainSlugOfOutcome = new Map<string, string>(outcomes.map((o) => [o.slug, o.domain]));

  const commons = (e: Entity) => ({
    ekgId: e.ekgId,
    slug: e.slug,
    previousSlugs: e.previousSlugs,
    type: e.type,
    title: e.title,
    status: e.status,
    version: e.version,
    license: e.license,
    contributors: e.contributors,
    tags: e.tags,
    provenance: e.provenance ?? provenanceDefault,
  });
  const alignmentsOf = (list: readonly { framework: string; frameworkId?: string; relation: string; code: string; url?: string }[]) =>
    list.map((a) => ({ ...a, frameworkId: a.frameworkId ?? frameworkByName(a.framework)?.id }));

  /** Resources deduplicated by ekgId per domain (EKG-SPEC-48). */
  const resourcesByDomain = new Map<string, Map<string, ArtifactResource>>();
  const addResource = (domainSlug: string, r: Resource): string => {
    let m = resourcesByDomain.get(domainSlug);
    if (!m) resourcesByDomain.set(domainSlug, (m = new Map()));
    const id = r.ekgId!;
    if (!m.has(id)) m.set(id, { ...r, ekgId: id, provenance: r.provenance ?? provenanceDefault });
    return id;
  };

  const nodesByDomain = new Map<string, Record<string, unknown>[]>();
  const bodies = new Map<string, Record<string, string>>();
  const pushNode = (domainSlug: string, node: Record<string, unknown>, body: string | undefined) => {
    nodesByDomain.set(domainSlug, [...(nodesByDomain.get(domainSlug) ?? []), node]);
    if (body) {
      const b = bodies.get(domainSlug) ?? {};
      b[node.ekgId as string] = body;
      bodies.set(domainSlug, b);
    }
  };

  /** The domains an entity with a primary `domain` and `outcomes` touches (EKG-SPEC-45, -136). */
  const spanning = (primary: string | undefined, outcomeSlugs: readonly string[]): string[] => {
    const set = new Set<string>();
    if (primary) set.add(primary);
    for (const s of outcomeSlugs) set.add(domainSlugOfOutcome.get(s)!);
    return [...set];
  };

  for (const o of outcomes) {
    pushNode(
      o.domain,
      {
        ...commons(o),
        statement: o.statement,
        description: o.description,
        domain: resolve('domain', o.domain),
        level: o.level,
        prerequisites: o.prerequisites.map((s) => resolve('outcome', s)),
        evidence: o.evidence,
        alignments: alignmentsOf(o.alignments),
        aliases: o.aliases,
        resourceIds: o.resources.map((r) => addResource(o.domain, r)),
        volatility: o.volatility,
        evidenceClass: o.evidenceClass,
        supersededBy: o.supersededBy ? resolve('outcome', o.supersededBy) : undefined,
      },
      bodyOf.get(o),
    );
  }
  for (const e of entities) {
    if (e.type === 'course') {
      const spans = spanning(e.domain, e.outcomes);
      for (const domainSlug of spans) {
        pushNode(
          domainSlug,
          {
            ...commons(e),
            description: e.description,
            domain: resolve('domain', e.domain),
            outcomes: e.outcomes.map((s) => resolve('outcome', s)),
            assessments: e.assessments.map((s) => resolve('assessment', s)),
            estimatedHours: e.estimatedHours,
            formats: e.formats,
            resourceIds: e.resources.map((r) => addResource(domainSlug, r)),
            kind: e.kind,
            segments: e.segments.map((s) => ({ ...s, outcomes: s.outcomes.map((o) => resolve('outcome', o)) })),
            alignments: alignmentsOf(e.alignments),
            sources: e.sources,
            crossDomain: spans.length > 1 ? true : undefined,
            supersededBy: e.supersededBy ? resolve('course', e.supersededBy) : undefined,
          },
          bodyOf.get(e),
        );
      }
    } else if (e.type === 'assessment') {
      const spans = spanning(e.domain, e.outcomes);
      for (const domainSlug of spans) {
        pushNode(
          domainSlug,
          {
            ...commons(e),
            description: e.description,
            kind: e.kind,
            domain: resolve('domain', domainSlug),
            outcomes: e.outcomes.map((s) => resolve('outcome', s)),
            evidenceRequirements: e.evidenceRequirements,
            rubricUrl: e.rubricUrl,
            crossDomain: spans.length > 1 ? true : undefined,
            supersededBy: e.supersededBy ? resolve('assessment', e.supersededBy) : undefined,
          },
          bodyOf.get(e),
        );
      }
    } else if (e.type === 'credential') {
      const spans = spanning(e.domain, e.outcomes);
      for (const domainSlug of spans) {
        pushNode(
          domainSlug,
          {
            ...commons(e),
            description: e.description,
            domain: resolve('domain', domainSlug),
            outcomes: e.outcomes.map((s) => resolve('outcome', s)),
            assessments: e.assessments.map((s) => resolve('assessment', s)),
            format: e.format,
            issuerRequirements: e.issuerRequirements,
            crossDomain: spans.length > 1 ? true : undefined,
            supersededBy: e.supersededBy ? resolve('credential', e.supersededBy) : undefined,
          },
          bodyOf.get(e),
        );
      }
    }
  }

  // 4. Domain files, in EKG-SPEC-52 order, each validated (V-23 and the whole-graph rules).
  const sortedDomains = [...domains].sort((a, b) => a.order - b.order || byCodePoint(a.title, b.title));
  const built: BuiltDomain[] = [];
  for (const d of sortedDomains) {
    const nodes = [...(nodesByDomain.get(d.slug) ?? [])].sort((a, b) => byCodePoint(a.ekgId as string, b.ekgId as string));
    const edges = outcomes
      .filter((o) => o.domain === d.slug)
      .flatMap((o) =>
        o.prerequisites.map((p) => ({
          type: 'prerequisite' as const,
          from: o.ekgId,
          to: resolve('outcome', p),
          targetDomain: domainSlugOfOutcome.get(p)!,
        })),
      )
      .sort((a, b) => byCodePoint(a.from, b.from) || byCodePoint(a.to, b.to));
    const resources = [...(resourcesByDomain.get(d.slug)?.values() ?? [])].sort((a, b) => byCodePoint(a.ekgId, b.ekgId));
    const body = { ...(bodies.get(d.slug) ?? {}) };
    const domainBody = bodyOf.get(d);
    if (domainBody) body[d.ekgId] = domainBody;
    const file = sortKeys({
      schemaVersion: SCHEMA_VERSION,
      buildId,
      generatedAt,
      domain: {
        ...commons(d),
        description: d.description,
        icon: d.icon,
        order: d.order,
        supersededBy: d.supersededBy ? resolve('domain', d.supersededBy) : undefined,
      },
      nodes,
      edges,
      resources,
      body,
    });
    const check = validateDomainFile(file);
    warnings.push(...check.warnings);
    if (!check.ok || !check.file) return { ok: false, errors: check.errors, warnings };
    built.push({ slug: d.slug, file: check.file, json: stableStringify(check.file) });
  }

  // 5. Manifest, all.json.gz, changelog, feed, checksums, snapshot.
  const files: Record<string, Uint8Array> = {};
  const counts = {
    domains: domains.length,
    outcomes: outcomes.length,
    courses: entities.filter((e) => e.type === 'course').length,
    assessments: entities.filter((e) => e.type === 'assessment').length,
    credentials: entities.filter((e) => e.type === 'credential').length,
    resources: new Set([...resourcesByDomain.values()].flatMap((m) => [...m.keys()])).size,
  };
  const manifestDomains: Manifest['domains'] = [];
  for (const d of built) {
    const bytes = encoder.encode(d.json);
    files[ARTIFACT_PATHS.domain(d.slug)] = bytes;
    const countOf = (type: ArtifactNode['type']) => d.file.nodes.filter((n) => n.type === type).length;
    manifestDomains.push({
      ekgId: d.file.domain.ekgId,
      slug: d.slug,
      title: d.file.domain.title,
      order: d.file.domain.order,
      status: d.file.domain.status,
      counts: {
        outcomes: countOf('outcome'),
        courses: countOf('course'),
        assessments: countOf('assessment'),
        credentials: countOf('credential'),
        resources: d.file.resources.length,
      },
      path: ARTIFACT_PATHS.domain(d.slug),
      sha256: await sha256Hex(bytes),
      bytes: bytes.byteLength,
    });
  }

  const previous = parsePrevious(options.previous);
  const previousFiles = [...previous.domains.values()];
  const changelogEntry: ChangelogEntry = {
    buildId,
    generatedAt,
    schemaVersion: SCHEMA_VERSION,
    domains: Object.fromEntries(built.map((d) => [d.slug, diffCounts(previous.domains.get(d.slug), d.file)])),
    merges: built.flatMap((d) =>
      d.file.nodes
        .filter((n) => n.supersededBy && !previous.domains.get(d.slug)?.nodes.find((p) => p.ekgId === n.ekgId)?.supersededBy)
        .map((n) => ({ deprecated: n.ekgId, survivor: n.supersededBy! })),
    ),
    deprecatedFields: [],
  };
  const changelog: Changelog = [changelogEntry, ...previous.changelog.filter((e) => e.buildId !== buildId)].slice(0, 100);
  files[ARTIFACT_PATHS.changelog] = encoder.encode(stableStringify(changelog));

  const feed: Feed = [
    ...deriveFeed(
      built.map((d) => d.file),
      previousFiles,
      buildId,
      generatedAt,
    ),
    ...previous.feed.filter((e) => e.buildId !== buildId),
  ].slice(0, FEED_LIMIT);
  files[ARTIFACT_PATHS.feed] = encoder.encode(stableStringify(feed));

  const manifest: Manifest = {
    schemaVersion: SCHEMA_VERSION,
    artifactVersion: ARTIFACT_VERSION,
    buildId,
    generatedAt,
    publisher,
    license,
    counts,
    domains: manifestDomains,
    ...(previous.manifest?.buildId ? { previousBuildId: previous.manifest.buildId } : {}),
    changelogPath: ARTIFACT_PATHS.changelog,
  };
  files[ARTIFACT_PATHS.manifest] = encoder.encode(stableStringify(manifest));
  const gzip = options.gzip ?? gzipWithStream;
  files[ARTIFACT_PATHS.all] = await gzip(
    encoder.encode(stableStringify({ schemaVersion: SCHEMA_VERSION, buildId, generatedAt, domains: built.map((d) => d.file) })),
  );

  // The current build's immutable snapshot (EKG-SPEC-54): the manifest and every domain file; checksums.json is copied last.
  const snapshot = ARTIFACT_PATHS.build(buildId);
  for (const path of [ARTIFACT_PATHS.manifest, ...built.map((d) => ARTIFACT_PATHS.domain(d.slug))]) {
    files[`${snapshot}${path}`] = files[path]!;
  }

  // Every published path except checksums.json itself and its snapshot copy (EKG-SPEC-50).
  const checksums: Checksums = {};
  for (const path of Object.keys(files).sort(byCodePoint)) {
    const bytes = files[path]!;
    checksums[path] = { sha256: await sha256Hex(bytes), bytes: bytes.byteLength };
  }
  files[ARTIFACT_PATHS.checksums] = encoder.encode(stableStringify(checksums));
  files[`${snapshot}${ARTIFACT_PATHS.checksums}`] = files[ARTIFACT_PATHS.checksums]!;

  return {
    ok: true,
    warnings,
    artifact: { buildId, generatedAt, manifest, domains: built, changelog, feed, checksums, files },
  };
}

function parsePrevious(previous: PreviousArtifact | null | undefined): {
  manifest: Manifest | undefined;
  domains: Map<string, DomainFile>;
  changelog: Changelog;
  feed: Feed;
} {
  const out = { manifest: undefined as Manifest | undefined, domains: new Map<string, DomainFile>(), changelog: [] as Changelog, feed: [] as Feed };
  if (!previous) return out;
  const m = manifestSchema.safeParse(previous.manifest);
  if (m.success) out.manifest = m.data;
  for (const [slug, raw] of Object.entries(previous.domains ?? {})) {
    const d = domainFileSchema.safeParse(raw);
    if (d.success) out.domains.set(slug, d.data);
  }
  const c = changelogSchema.safeParse(previous.changelog);
  if (c.success) out.changelog = c.data;
  const f = feedSchema.safeParse(previous.feed);
  if (f.success) out.feed = f.data;
  return out;
}
