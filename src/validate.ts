import type { z } from 'zod';

import { domainFile as domainFileSchema, type DomainFile } from './artifact.js';
import { type EkgType, isEkgId, parseEkgId } from './ekg-id.js';
import { frameworkByName, frameworkByNameLoosely } from './frameworks.js';
import {
  artifact,
  entity as sourceEntity,
  type ArtifactEntity,
  type ArtifactResource,
  type Entity,
  type Resource,
} from './schema.js';
import { normalizeResourceUrl } from './url.js';

/*
 * The whole-graph validation rules of SPEC §11 that no per-entity schema can express:
 * V-02 reference resolution, V-03 prerequisite cycles at whole-graph scope (EKG-SPEC-75),
 * V-10/V-11 ekgId uniqueness and type segment, V-12/V-13/V-14 slug and slug history,
 * V-15/V-16 supersession chains, V-17 coverage strings, V-18 resource URL identity,
 * V-21 no stub in a credential, V-22 framework names, and V-23 for a domain file.
 *
 * Every error names the entity by slug and ekgId and states the rule (EKG-SPEC-76).
 */

export type Severity = 'error' | 'warning';

export interface ValidationError {
  rule: string;
  severity: Severity;
  slug: string;
  ekgId?: string;
  message: string;
  /** JSON path inside the entity, when the problem is a specific field. */
  path?: string;
}

export type RefMode = 'source' | 'artifact';

export interface ValidateOptions {
  /** `source` for frontmatter with slug/wikilink references (default); `artifact` for ekgId references. */
  mode?: RefMode;
  /** The deduplicated resources of a domain file, needed for V-17 and V-18 in artifact mode. */
  resources?: ArtifactResource[];
}

export interface ValidationResult {
  ok: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

type AnyEntity = Entity | ArtifactEntity;

const RULE_TAG = /\((V-\d\d)\)\s*$/;
const MAX_SUPERSESSION_DEPTH = 8;

function ruleOf(message: string, fallback = 'V-01'): string {
  return RULE_TAG.exec(message)?.[1] ?? fallback;
}

function describe(e: { slug?: unknown; ekgId?: unknown }): { slug: string; ekgId?: string } {
  const out: { slug: string; ekgId?: string } = {
    slug: typeof e.slug === 'string' ? e.slug : '(unknown)',
  };
  if (typeof e.ekgId === 'string') out.ekgId = e.ekgId;
  return out;
}

function pathToString(path: readonly PropertyKey[]): string {
  return path.map((p) => (typeof p === 'number' ? `[${p}]` : String(p))).join('.');
}

/** Parse every input against its schema (V-01, V-04, V-06, V-07, V-09, V-12, V-19, V-20). */
function parseEntities(
  inputs: readonly unknown[],
  mode: RefMode,
): { entities: AnyEntity[]; errors: ValidationError[] } {
  const schema = mode === 'artifact' ? artifact.entity : sourceEntity;
  const entities: AnyEntity[] = [];
  const errors: ValidationError[] = [];
  inputs.forEach((input, index) => {
    const result = schema.safeParse(input);
    if (result.success) {
      entities.push(result.data);
      return;
    }
    const raw = (input ?? {}) as { slug?: unknown; ekgId?: unknown };
    const who = describe(raw);
    const slug = who.slug === '(unknown)' ? `(entity #${index})` : who.slug;
    for (const issue of result.error.issues) {
      const err: ValidationError = {
        rule: ruleOf(issue.message),
        severity: 'error',
        slug,
        message: issue.message,
        path: pathToString(issue.path),
      };
      if (who.ekgId) err.ekgId = who.ekgId;
      errors.push(err);
    }
  });
  return { entities, errors };
}

class Index {
  readonly byEkgId = new Map<string, AnyEntity>();
  readonly bySlug = new Map<EkgType, Map<string, AnyEntity>>();

  constructor(readonly entities: readonly AnyEntity[]) {
    for (const e of entities) {
      if (!this.byEkgId.has(e.ekgId)) this.byEkgId.set(e.ekgId, e);
      let m = this.bySlug.get(e.type);
      if (!m) this.bySlug.set(e.type, (m = new Map()));
      if (!m.has(e.slug)) m.set(e.slug, e);
    }
  }

  /** Resolve a reference by ekgId (any mode) or by slug within the expected type (source mode). */
  resolve(ref: string, type: EkgType): AnyEntity | undefined {
    if (isEkgId(ref)) {
      const found = this.byEkgId.get(ref);
      return found && found.type === type ? found : undefined;
    }
    return this.bySlug.get(type)?.get(ref);
  }
}

interface RefField {
  field: string;
  type: EkgType;
  refs: readonly string[];
}

function refFields(e: AnyEntity): RefField[] {
  const out: RefField[] = [];
  const push = (field: string, type: EkgType, value: string | readonly string[] | undefined) => {
    if (value === undefined) return;
    out.push({ field, type, refs: typeof value === 'string' ? [value] : value });
  };
  switch (e.type) {
    case 'domain':
      push('supersededBy', 'domain', e.supersededBy);
      break;
    case 'outcome':
      push('domain', 'domain', e.domain);
      push('prerequisites', 'outcome', e.prerequisites);
      push('supersededBy', 'outcome', e.supersededBy);
      break;
    case 'course':
      push('domain', 'domain', e.domain);
      push('outcomes', 'outcome', e.outcomes);
      push('assessments', 'assessment', e.assessments);
      push('supersededBy', 'course', e.supersededBy);
      break;
    case 'assessment':
      push('domain', 'domain', e.domain);
      push('outcomes', 'outcome', e.outcomes);
      push('supersededBy', 'assessment', e.supersededBy);
      break;
    case 'credential':
      push('domain', 'domain', e.domain);
      push('outcomes', 'outcome', e.outcomes);
      push('assessments', 'assessment', e.assessments);
      push('supersededBy', 'credential', e.supersededBy);
      break;
  }
  return out;
}

/** Inline resources of a source entity, or the artifact resources a node references. */
function resourcesOf(e: AnyEntity, mode: RefMode, pool: Map<string, ArtifactResource>): (Resource | ArtifactResource)[] {
  if (mode === 'source') {
    if (e.type === 'outcome' || e.type === 'course') return (e as Entity & { resources: Resource[] }).resources;
    return [];
  }
  const ids = (e as { resourceIds?: string[] }).resourceIds ?? [];
  return ids.map((id) => pool.get(id)).filter((r): r is ArtifactResource => r !== undefined);
}

/**
 * Validate a set of entities as one graph. Pass every entity of the graph, across every
 * domain: V-03's cycle check is whole-graph by rule (EKG-SPEC-75), and a reference into a
 * domain you did not pass is reported as unresolved.
 */
export function validateGraph(inputs: readonly unknown[], options: ValidateOptions = {}): ValidationResult {
  const mode = options.mode ?? 'source';
  const { entities, errors } = parseEntities(inputs, mode);
  const warnings: ValidationError[] = [];
  const index = new Index(entities);
  const pool = new Map<string, ArtifactResource>((options.resources ?? []).map((r) => [r.ekgId, r]));

  const fail = (e: AnyEntity, rule: string, message: string, path?: string) => {
    const err: ValidationError = { rule, severity: 'error', ...describe(e), message };
    if (path) err.path = path;
    errors.push(err);
  };
  const warn = (e: AnyEntity, rule: string, message: string, path?: string) => {
    const w: ValidationError = { rule, severity: 'warning', ...describe(e), message };
    if (path) w.path = path;
    warnings.push(w);
  };

  // V-10 ekgId unique across the whole graph; V-11 type segment matches the entity type.
  const seenIds = new Map<string, AnyEntity>();
  for (const e of entities) {
    const first = seenIds.get(e.ekgId);
    if (first) fail(e, 'V-10', `ekgId ${e.ekgId} is also used by ${first.type} "${first.slug}"`, 'ekgId');
    else seenIds.set(e.ekgId, e);
    if (isEkgId(e.ekgId) && parseEkgId(e.ekgId).type !== e.type) {
      fail(e, 'V-11', `ekgId ${e.ekgId} names type "${parseEkgId(e.ekgId).type}" but the entity is a ${e.type}`, 'ekgId');
    }
  }

  // V-12 slug unique within type; V-13/V-14 slug history is globally consistent within type.
  const byType = new Map<EkgType, AnyEntity[]>();
  for (const e of entities) byType.set(e.type, [...(byType.get(e.type) ?? []), e]);
  for (const group of byType.values()) {
    const slugOwner = new Map<string, AnyEntity>();
    const previousOwner = new Map<string, AnyEntity>();
    for (const e of group) {
      const other = slugOwner.get(e.slug);
      if (other) fail(e, 'V-12', `slug "${e.slug}" is also used by ${other.type} "${other.ekgId}"`, 'slug');
      else slugOwner.set(e.slug, e);
    }
    for (const e of group) {
      for (const prev of e.previousSlugs) {
        if (prev === e.slug) fail(e, 'V-14', `slug "${prev}" appears in its own previousSlugs`, 'previousSlugs');
        const current = slugOwner.get(prev);
        if (current && current !== e) {
          fail(e, 'V-13', `previous slug "${prev}" is the current slug of ${current.type} "${current.slug}" (${current.ekgId})`, 'previousSlugs');
        }
        const claimed = previousOwner.get(prev);
        if (claimed && claimed !== e) {
          fail(e, 'V-13', `previous slug "${prev}" also appears in the previousSlugs of "${claimed.slug}" (${claimed.ekgId})`, 'previousSlugs');
        } else previousOwner.set(prev, e);
      }
    }
  }

  // V-02 every reference resolves to an existing entity of the expected type.
  for (const e of entities) {
    for (const { field, type, refs } of refFields(e)) {
      refs.forEach((ref, i) => {
        if (!index.resolve(ref, type)) {
          const path = refs.length === 1 && field !== 'prerequisites' && field !== 'outcomes' && field !== 'assessments' ? field : `${field}[${i}]`;
          fail(e, 'V-02', `${field} references ${type} "${ref}", which does not exist`, path);
        }
      });
    }
  }

  // V-03 prerequisite edges contain no cycle, whole-graph scope. The error names the path.
  const outcomes = entities.filter((e): e is Extract<AnyEntity, { type: 'outcome' }> => e.type === 'outcome');
  const prereqsOf = new Map<AnyEntity, AnyEntity[]>();
  for (const o of outcomes) {
    prereqsOf.set(
      o,
      o.prerequisites.map((ref) => index.resolve(ref, 'outcome')).filter((x): x is AnyEntity => x !== undefined),
    );
  }
  const state = new Map<AnyEntity, 'visiting' | 'done'>();
  const reported = new Set<string>();
  const visit = (node: AnyEntity, stack: AnyEntity[]) => {
    const s = state.get(node);
    if (s === 'done') return;
    if (s === 'visiting') {
      const start = stack.indexOf(node);
      const cycle = [...stack.slice(start), node];
      const key = cycle.map((c) => c.ekgId).sort().join('|');
      if (!reported.has(key)) {
        reported.add(key);
        fail(node, 'V-03', `prerequisite cycle: ${cycle.map((c) => c.slug).join(' -> ')}`, 'prerequisites');
      }
      return;
    }
    state.set(node, 'visiting');
    stack.push(node);
    for (const p of prereqsOf.get(node) ?? []) visit(p, stack);
    stack.pop();
    state.set(node, 'done');
  };
  for (const o of outcomes) visit(o, []);

  // V-15 supersededBy chains are acyclic and no longer than 8 hops; V-16 same type.
  for (const e of entities) {
    if (!e.supersededBy) continue;
    if (isEkgId(e.supersededBy) && parseEkgId(e.supersededBy).type !== e.type) {
      fail(e, 'V-16', `supersededBy ${e.supersededBy} is a ${parseEkgId(e.supersededBy).type}, not a ${e.type}`, 'supersededBy');
      continue;
    }
    const seen = new Set<AnyEntity>([e]);
    let current: AnyEntity | undefined = e;
    let hops = 0;
    while (current?.supersededBy) {
      const next: AnyEntity | undefined = index.resolve(current.supersededBy, e.type);
      if (!next) break; // reported by V-02
      hops += 1;
      if (seen.has(next)) {
        fail(e, 'V-15', `supersededBy chain is cyclic: ${[...seen, next].map((x) => x.slug).join(' -> ')}`, 'supersededBy');
        break;
      }
      if (hops > MAX_SUPERSESSION_DEPTH) {
        fail(e, 'V-15', `supersededBy chain is longer than ${MAX_SUPERSESSION_DEPTH} hops`, 'supersededBy');
        break;
      }
      seen.add(next);
      current = next;
    }
  }

  // V-17 every coverage string is an exact evidence statement of an outcome the resource is attached to.
  if (mode === 'source') {
    for (const e of outcomes) {
      const evidence = new Set(e.evidence);
      resourcesOf(e, mode, pool).forEach((r, i) => {
        for (const c of r.coverage) {
          if (!evidence.has(c)) fail(e, 'V-17', `resource "${r.title}" claims coverage "${c}", which is not an evidence statement of this outcome`, `resources[${i}].coverage`);
        }
      });
    }
  } else {
    const evidenceByResource = new Map<string, Set<string>>();
    for (const e of outcomes) {
      for (const id of (e as { resourceIds?: string[] }).resourceIds ?? []) {
        let set = evidenceByResource.get(id);
        if (!set) evidenceByResource.set(id, (set = new Set()));
        for (const ev of e.evidence) set.add(ev);
      }
    }
    for (const r of pool.values()) {
      const evidence = evidenceByResource.get(r.ekgId) ?? new Set<string>();
      for (const c of r.coverage) {
        if (!evidence.has(c)) {
          errors.push({ rule: 'V-17', severity: 'error', slug: `(resource) ${r.title}`, ekgId: r.ekgId, message: `coverage "${c}" is not an evidence statement of any outcome that references this resource`, path: 'coverage' });
        }
      }
    }
  }

  // V-18 two resources with the same normalized URL share one ekgId.
  const byUrl = new Map<string, { ekgId: string; where: string }>();
  const checkUrl = (r: Resource | ArtifactResource, where: string, owner?: AnyEntity, path?: string) => {
    let key: string;
    try {
      key = normalizeResourceUrl(r.url);
    } catch {
      return; // schema already rejected a non-URL
    }
    const prior = byUrl.get(key);
    if (!prior) {
      if (r.ekgId) byUrl.set(key, { ekgId: r.ekgId, where });
      return;
    }
    if (r.ekgId && r.ekgId !== prior.ekgId) {
      const message = `resource URL ${r.url} has ekgId ${r.ekgId} here but ${prior.ekgId} in ${prior.where}`;
      if (owner) fail(owner, 'V-18', message, path);
      else errors.push({ rule: 'V-18', severity: 'error', slug: `(resource) ${r.title}`, ekgId: r.ekgId, message, path: 'url' });
    }
  };
  if (mode === 'source') {
    for (const e of entities) {
      resourcesOf(e, mode, pool).forEach((r, i) => checkUrl(r, `${e.type} "${e.slug}"`, e, `resources[${i}].url`));
    }
  } else {
    for (const r of pool.values()) checkUrl(r, `resource ${r.ekgId}`);
  }

  // V-21 a credential references no outcome whose status is stub.
  for (const e of entities) {
    if (e.type !== 'credential') continue;
    e.outcomes.forEach((ref, i) => {
      const target = index.resolve(ref, 'outcome');
      if (target && target.status === 'stub') fail(e, 'V-21', `credential bundles stub outcome "${target.slug}" (${target.ekgId})`, `outcomes[${i}]`);
    });
  }

  // V-22 registered framework names match exactly; an unregistered framework is a warning.
  for (const e of entities) {
    if (e.type !== 'outcome') continue;
    e.alignments.forEach((a, i) => {
      if (frameworkByName(a.framework)) return;
      const loose = frameworkByNameLoosely(a.framework);
      if (loose) fail(e, 'V-22', `alignment framework "${a.framework}" must be written exactly as "${loose.name}"`, `alignments[${i}].framework`);
      else warn(e, 'V-22', `alignment framework "${a.framework}" is not in the framework registry`, `alignments[${i}].framework`);
    });
  }

  return { ok: errors.length === 0, errors, warnings };
}

export interface DomainFileValidation extends ValidationResult {
  file?: DomainFile;
}

/**
 * Validate one published domain file: its shape, the artifact-only rules of V-23, and every
 * whole-graph rule over the entities it contains.
 */
export function validateDomainFile(input: unknown): DomainFileValidation {
  const parsed = domainFileSchema.safeParse(input);
  if (!parsed.success) {
    const errors: ValidationError[] = parsed.error.issues.map((issue: z.core.$ZodIssue) => ({
      rule: ruleOf(issue.message),
      severity: 'error' as const,
      slug: '(domain file)',
      message: issue.message,
      path: pathToString(issue.path),
    }));
    return { ok: false, errors, warnings: [] };
  }
  const file = parsed.data;
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const nodeIds = new Set(file.nodes.map((n) => n.ekgId));
  const resourceIds = new Set(file.resources.map((r) => r.ekgId));

  // V-23 resourceIds resolve within the file; edge sources are in the file; outbound edges name their domain.
  file.nodes.forEach((n, ni) => {
    const ids = (n as { resourceIds?: string[] }).resourceIds ?? [];
    ids.forEach((id, i) => {
      if (!resourceIds.has(id)) errors.push({ rule: 'V-23', severity: 'error', slug: n.slug, ekgId: n.ekgId, message: `resourceIds references ${id}, which is not in this domain file`, path: `nodes[${ni}].resourceIds[${i}]` });
    });
  });
  file.edges.forEach((edge, i) => {
    if (!nodeIds.has(edge.from)) errors.push({ rule: 'V-23', severity: 'error', slug: `(edge #${i})`, ekgId: edge.from, message: `edge from ${edge.from} is not a node of this domain file`, path: `edges[${i}].from` });
    if (!nodeIds.has(edge.to) && !edge.targetDomain) errors.push({ rule: 'V-23', severity: 'error', slug: `(edge #${i})`, ekgId: edge.from, message: `edge to ${edge.to} leaves this domain file but carries no targetDomain`, path: `edges[${i}].to` });
  });
  for (const key of Object.keys(file.body)) {
    if (!nodeIds.has(key) && key !== file.domain.ekgId) warnings.push({ rule: 'V-23', severity: 'warning', slug: '(domain file)', ekgId: key, message: `body has an entry for ${key}, which is not a node of this domain file`, path: 'body' });
  }

  const graph = validateGraph([file.domain, ...file.nodes], { mode: 'artifact', resources: file.resources });
  errors.push(...graph.errors);
  warnings.push(...graph.warnings);
  return { ok: errors.length === 0, errors, warnings, file };
}
