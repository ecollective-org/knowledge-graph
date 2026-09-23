import { z } from 'zod';

import { type EkgType, anyEkgId, ekgId, isEkgId, parseEkgId } from './ekg-id.js';
import { type Framework, frameworkById, frameworkByName, frameworkByNameLoosely } from './frameworks.js';
import {
  frameworkFields,
  institutionFields,
  offeringFields,
  platformFields,
  programFields,
  standardFields,
} from './reference.js';
import {
  COURSE_KINDS,
  EVIDENCE_CLASSES,
  LEVELS,
  SEGMENT_KINDS,
  VOLATILITIES,
  alignment,
  audience,
  provenance,
  resourceFields,
  semver,
  slug,
  sourceCitation,
  withSubKindRule,
} from './schema.js';
import { type ValidationError, pathToString, ruleOf } from './validate.js';

/*
 * Import bundles (SPEC §9.7): the one format every AI research session, script or tool emits.
 * The package validates a bundle; the commons imports it as proposals, never as canonical
 * content, and answers with a per-item report (EKG-SPEC-127). Nothing in a bundle mints an
 * `ekgId` (EKG-SPEC-122): new things carry bundle-local `tmp:` ids, existing things are named by
 * the `ekgId` the producer found in the current artifact.
 *
 * `validateImportBundle` parses the envelope, then every proposal on its own, so one bad item
 * is reported by its `tmp:` id and the rest still get a decision; then it runs the bundle rules
 * V-25 to V-28 over what parsed. Every error names the item and the rule (EKG-SPEC-76), with the
 * `slug` field carrying the bundle-local id.
 */

export const IMPORT_BUNDLE_VERSION = '1.0.0';
const BUNDLE_MAJOR = IMPORT_BUNDLE_VERSION.split('.')[0];

/** A bundle-local identifier: `tmp:` plus a kebab-case name, unique within the bundle (V-26). */
export const LOCAL_ID_PATTERN = /^tmp:[a-z0-9]+(-[a-z0-9]+)*$/;
export const localId = z
  .string()
  .regex(LOCAL_ID_PATTERN, 'Expected a bundle-local id of the form tmp:<kebab-case> (V-26)');
export const isLocalId = (value: unknown): value is string =>
  typeof value === 'string' && LOCAL_ID_PATTERN.test(value);

/** A reference from inside a bundle: an existing `ekgId`, or a `tmp:` id proposed in the same bundle. */
export const bundleRef = z.union([anyEkgId, localId], {
  error: 'Expected an existing ekgId (ekg:<type>:<ULID>) or a bundle-local tmp:<id> (V-26)',
});

/** The registered product identities of §9.3 (EKG-SPEC-62). */
export const REGISTERED_IDENTITIES = ['diy-degree-curation', 'instructos-mapping', 'opendegree-commons'] as const;
export type RegisteredIdentity = (typeof REGISTERED_IDENTITIES)[number];
/** A human producer: `contributor:<handle>`, a handle and never an email or a legal name. */
export const CONTRIBUTOR_IDENTITY_PATTERN = /^contributor:[a-z0-9][a-z0-9-]*$/;

export function isRegisteredIdentity(value: unknown): value is RegisteredIdentity {
  return typeof value === 'string' && (REGISTERED_IDENTITIES as readonly string[]).includes(value);
}

export const producerIdentity = z
  .string()
  .refine((v) => isRegisteredIdentity(v) || CONTRIBUTOR_IDENTITY_PATTERN.test(v), {
    message: 'Expected a registered product identity (§9.3) or contributor:<handle> (V-01)',
  });

/** Who produced the bundle, with what, and when (EKG-SPEC-123: AI-authored items name the model and prompt). */
export const importProducer = z.object({
  tool: z.string().min(1),
  toolVersion: z.string().optional(),
  modelId: z.string().optional(),
  promptVersion: z.string().optional(),
  /** A string that names a session, never a person. */
  sessionId: z.string().min(1),
  producedAt: z.iso.datetime(),
  identity: producerIdentity,
});
export type ImportProducer = z.infer<typeof importProducer>;

/** A human review of a platform as a whole, for the case the six-dimension rubric does not fit (EKG-SPEC-160). */
export const platformRating = z.object({
  overall: z.number().min(1).max(5),
  strengths: z.array(z.string()).default([]),
  limitations: z.array(z.string()).default([]),
});
export type PlatformRating = z.infer<typeof platformRating>;

export const DEDUPE_DECISIONS = ['new', 'alias_of', 'duplicate_of'] as const;
/** The search a producer ran before proposing an outcome, and what it decided (EKG-SPEC-122, V-27). */
export const dedupeEvidence = z.object({
  queries: z.array(z.string().min(1)).min(1, 'Dedupe evidence needs the queries that were run (V-27)'),
  topMatches: z
    .array(z.object({ ekgId: ekgId('outcome'), title: z.string(), score: z.number() }))
    .default([]),
  decision: z.enum(DEDUPE_DECISIONS),
  /** The existing outcome an `alias_of` or `duplicate_of` decision names. */
  of: ekgId('outcome').optional(),
});
export type DedupeEvidence = z.infer<typeof dedupeEvidence>;

const rubricScore = z.number().min(1).max(5);
/** The six-dimension quality rubric a producer proposes for a resource, with reasons. */
export const qualityProposal = z.object({
  correctness: rubricScore,
  coverage: rubricScore,
  clarity: rubricScore,
  efficiency: rubricScore,
  accessibility: rubricScore,
  trust: rubricScore,
  reasons: z.string().min(1),
});
export type QualityProposal = z.infer<typeof qualityProposal>;

/** Every proposal carries a local id, the producer's confidence in it, and its own provenance (EKG-SPEC-123). */
const proposed = <T extends z.ZodRawShape>(shape: T) =>
  z.object({ ...shape, localId, confidence: z.number().min(0).max(1), provenance });

const retrievedAt = z.iso.datetime().optional();

/** The proposal collections of a bundle, in the order the commons imports them. */
export const PROPOSAL_COLLECTIONS = [
  'domains',
  'outcomes',
  'edges',
  'aliases',
  'alignments',
  'courses',
  'resources',
  'frameworks',
  'standards',
  'institutions',
  'programs',
  'offerings',
  'platforms',
] as const;
export type ProposalCollection = (typeof PROPOSAL_COLLECTIONS)[number];

export const proposals = {
  domains: proposed({ title: z.string().min(1), description: z.string().min(1) }),
  outcomes: proposed({
    title: z.string().min(1),
    statement: z.string().min(1),
    evidence: z.array(z.string().min(1)).min(1, 'An outcome proposal needs at least one evidence statement (V-01)'),
    domain: bundleRef,
    level: z.enum(LEVELS).default('foundation'),
    prerequisites: z.array(bundleRef).default([]),
    aliases: z.array(z.string()).default([]),
    alignments: z.array(alignment).default([]),
    volatility: z.enum(VOLATILITIES).optional(),
    evidenceClass: z.enum(EVIDENCE_CLASSES).optional(),
    /** Required by V-27; optional here so its absence is reported under that rule, not V-01. */
    dedupe: dedupeEvidence.optional(),
    /** The id a registered product minted for a node its learners already reference (EKG-SPEC-144); V-26 rejects it from anyone else. */
    ekgId: ekgId('outcome').optional(),
  }),
  edges: proposed({ from: bundleRef, to: bundleRef, kind: z.literal('prerequisite') }),
  aliases: proposed({ outcome: ekgId('outcome'), aliases: z.array(z.string().min(1)).min(1) }),
  alignments: proposed({ outcome: ekgId('outcome'), alignments: z.array(alignment).min(1) }),
  courses: proposed({
    title: z.string().min(1),
    description: z.string().min(1),
    domain: bundleRef,
    outcomes: z.array(bundleRef).min(1, 'Must list at least one outcome (V-05)'),
    kind: z.enum(COURSE_KINDS).default('curated_path'),
    segments: z
      .array(
        z.object({
          title: z.string().min(1),
          kind: z.enum(SEGMENT_KINDS).default('core'),
          outcomes: z.array(bundleRef).min(1, 'A segment lists at least one outcome (V-01)'),
        }),
      )
      .default([]),
    alignments: z.array(alignment).default([]),
    sources: z.array(sourceCitation).default([]),
  }),
  resources: withSubKindRule(
    proposed({
      ...resourceFields,
      /** May name a `tmp:` platform proposed in the same bundle (EKG-SPEC-160). */
      platformId: bundleRef.optional(),
      outcomes: z.array(bundleRef).min(1, 'A resource proposal names at least one outcome (V-01)'),
      qualityProposal: qualityProposal.optional(),
    }),
  ),
  frameworks: proposed({ id: slug, ...frameworkFields, retrievedAt }),
  standards: proposed({ ...standardFields, retrievedAt }),
  institutions: proposed({ ...institutionFields, retrievedAt }),
  programs: proposed({
    ...programFields,
    institution: bundleRef,
    requiredOfferings: z.array(bundleRef).default([]),
    retrievedAt,
  }),
  offerings: proposed({
    ...offeringFields,
    institution: bundleRef,
    outcomeMappings: z
      .array(
        z.object({
          outcome: bundleRef,
          coverage: z.number().min(0).max(1),
          confidence: z.number().min(0).max(1),
          provenance,
        }),
      )
      .default([]),
    retrievedAt,
  }),
  platforms: proposed({
    ...platformFields,
    retrievedAt,
    /** The platform's audience as a whole, from its admitted age; never a resource's own (EKG-SPEC-155). */
    audience: audience.optional(),
    rating: platformRating.optional(),
  }),
} as const;

const proposalsObject = z
  .object({
    domains: z.array(proposals.domains).default([]),
    outcomes: z.array(proposals.outcomes).default([]),
    edges: z.array(proposals.edges).default([]),
    aliases: z.array(proposals.aliases).default([]),
    alignments: z.array(proposals.alignments).default([]),
    courses: z.array(proposals.courses).default([]),
    resources: z.array(proposals.resources).default([]),
    frameworks: z.array(proposals.frameworks).default([]),
    standards: z.array(proposals.standards).default([]),
    institutions: z.array(proposals.institutions).default([]),
    programs: z.array(proposals.programs).default([]),
    offerings: z.array(proposals.offerings).default([]),
    platforms: z.array(proposals.platforms).default([]),
  })
  .prefault({});

const scope = z
  .object({
    subject: z.string().optional(),
    gradeBand: z.string().optional(),
    frameworkIds: z.array(z.string()).default([]),
    sources: z.array(sourceCitation).default([]),
  })
  .prefault({});

const envelopeFields = {
  bundleVersion: semver.refine((v) => v.split('.')[0] === BUNDLE_MAJOR, {
    message: `bundleVersion must be ${BUNDLE_MAJOR}.x, the version of §9.7 this package implements (V-01)`,
  }),
  producer: importProducer,
  scope,
  /** The licence the producer grants: CC BY-SA 4.0 on graph content (EKG-SPEC-105), and the commons' terms on reference data. */
  licenseAcceptance: z.object({ graphContent: z.literal('CC BY-SA 4.0'), referenceContent: z.string().min(1) }),
  /** Existing entities the bundle relies on, found in the current artifact (EKG-SPEC-122). */
  references: z.array(anyEkgId).default([]),
};

/** A whole bundle (SPEC §9.7). */
export const importBundle = z.object({ ...envelopeFields, proposals: proposalsObject });
export type ImportBundle = z.infer<typeof importBundle>;

/** The envelope with untyped proposal arrays, so items can be parsed and reported one by one. */
const importEnvelope = z.object({
  ...envelopeFields,
  proposals: z
    .object(Object.fromEntries(PROPOSAL_COLLECTIONS.map((c) => [c, z.array(z.unknown()).default([])])))
    .prefault({}),
});

// ---------------------------------------------------------------------------
// The report (EKG-SPEC-127): one decision per item.
// ---------------------------------------------------------------------------

export const IMPORT_DECISIONS = ['accepted', 'queued', 'merged_into', 'rejected'] as const;
export type ImportDecision = (typeof IMPORT_DECISIONS)[number];

/** The rejection reasons of §9.6 (EKG-SPEC-67). */
export const REJECTION_REASONS = [
  'duplicate',
  'not-an-outcome',
  'too-broad',
  'unverifiable-evidence',
  'licence-unclear',
  'resource-quality',
  'provenance-incomplete',
  'out-of-scope',
  'withdrawn',
] as const;
export type RejectionReason = (typeof REJECTION_REASONS)[number];

const reportedError = z.object({
  rule: z.string(),
  severity: z.enum(['error', 'warning']),
  slug: z.string(),
  ekgId: z.string().optional(),
  message: z.string(),
  path: z.string().optional(),
});

export const importReportItem = z.object({
  /** The item's `tmp:` id, or the `ekgId` it modifies. */
  ref: z.string().min(1),
  collection: z.enum(PROPOSAL_COLLECTIONS),
  decision: z.enum(IMPORT_DECISIONS),
  /** For `merged_into`, or a `duplicate` rejection: the surviving entity. */
  of: anyEkgId.optional(),
  reason: z.enum(REJECTION_REASONS).optional(),
  errors: z.array(reportedError).default([]),
});
export type ImportReportItem = z.infer<typeof importReportItem>;

/** What the commons answers a producer with, synchronously after validation and again after review. */
export const importReport = z.object({
  bundleVersion: semver,
  producer: importProducer,
  receivedAt: z.iso.datetime(),
  decidedAt: z.iso.datetime().optional(),
  items: z.array(importReportItem),
});
export type ImportReport = z.infer<typeof importReport>;

// ---------------------------------------------------------------------------
// validateImportBundle
// ---------------------------------------------------------------------------

export interface ImportBundleValidation {
  ok: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  /** The parsed bundle, when every item parsed. */
  bundle?: ImportBundle;
  /** One entry per proposal, `accepted`, `merged_into` (an alias or duplicate) or `rejected`. */
  items: ImportReportItem[];
}

type Parsed<C extends ProposalCollection> = z.infer<(typeof proposals)[C]>;
interface Slot<C extends ProposalCollection = ProposalCollection> {
  collection: C;
  index: number;
  ref: string;
  item: Parsed<C>;
  errors: ValidationError[];
  of?: string;
}

/** Which collection a `tmp:` reference in each field must point at, and which ekgId type. */
const REF_TARGETS: Record<string, { collection: ProposalCollection; type: EkgType }> = {
  domain: { collection: 'domains', type: 'domain' },
  prerequisites: { collection: 'outcomes', type: 'outcome' },
  from: { collection: 'outcomes', type: 'outcome' },
  to: { collection: 'outcomes', type: 'outcome' },
  outcomes: { collection: 'outcomes', type: 'outcome' },
  outcome: { collection: 'outcomes', type: 'outcome' },
  institution: { collection: 'institutions', type: 'institution' },
  requiredOfferings: { collection: 'offerings', type: 'offering' },
  platformId: { collection: 'platforms', type: 'platform' },
};

const REFERENCE_COLLECTIONS: readonly ProposalCollection[] = ['frameworks', 'standards', 'institutions', 'programs', 'offerings', 'platforms'];

const normalizeStatement = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();

function reasonFor(errors: readonly ValidationError[]): RejectionReason | undefined {
  const rules = new Set(errors.map((e) => e.rule));
  if (rules.has('V-25')) return 'not-an-outcome';
  if (rules.has('V-28') && errors.some((e) => e.rule === 'V-28' && (e.path === 'license' || e.path === 'embedPolicy'))) return 'licence-unclear';
  if (rules.has('V-28') || rules.has('V-27') || rules.has('V-19') || rules.has('V-20')) return 'provenance-incomplete';
  if (rules.has('V-26')) return 'out-of-scope';
  return undefined;
}

/**
 * Validate an import bundle: the envelope, every proposal on its own, then V-25 (a standard is
 * never an outcome), V-26 (`tmp:` ids unique and every reference resolving to the expected
 * collection or a well-typed `ekgId`), V-27 (dedupe evidence on every new outcome) and V-28 (the
 * licence and embed policy on every resource; a retrieval date and a URL on every reference
 * item). The result lists one report item per proposal.
 */
export function validateImportBundle(input: unknown): ImportBundleValidation {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const items: ImportReportItem[] = [];

  const envelope = importEnvelope.safeParse(input);
  if (!envelope.success) {
    for (const issue of envelope.error.issues) {
      errors.push({ rule: ruleOf(issue.message), severity: 'error', slug: '(bundle)', message: issue.message, path: pathToString(issue.path) });
    }
    return { ok: false, errors, warnings, items };
  }

  // A collection this version does not know is reported, never silently dropped (EKG-SPEC-161).
  const rawProposals = (input as { proposals?: unknown } | null)?.proposals;
  if (rawProposals && typeof rawProposals === 'object') {
    for (const key of Object.keys(rawProposals)) {
      if (!(PROPOSAL_COLLECTIONS as readonly string[]).includes(key)) {
        warnings.push({ rule: 'V-01', severity: 'warning', slug: '(bundle)', message: `proposals.${key} is not a collection this version knows (${PROPOSAL_COLLECTIONS.join(', ')}); it was ignored`, path: `proposals.${key}` });
      }
    }
  }

  // 1. Each proposal on its own, reported by its local id.
  const slots: Slot[] = [];
  const byLocalId = new Map<string, Slot>();
  for (const collection of PROPOSAL_COLLECTIONS) {
    const raw = envelope.data.proposals[collection] as unknown[];
    raw.forEach((value, index) => {
      const candidate = (value ?? {}) as { localId?: unknown; outcome?: unknown };
      const ref = isLocalId(candidate.localId)
        ? candidate.localId
        : typeof candidate.outcome === 'string' && isEkgId(candidate.outcome)
          ? candidate.outcome
          : `${collection}[${index}]`;
      const result = proposals[collection].safeParse(value);
      if (!result.success) {
        const itemErrors = result.error.issues.map((issue): ValidationError => ({
          rule: ruleOf(issue.message),
          severity: 'error',
          slug: ref,
          message: issue.message,
          path: pathToString(issue.path),
        }));
        errors.push(...itemErrors);
        items.push({ ref, collection, decision: 'rejected', reason: reasonFor(itemErrors), errors: itemErrors });
        return;
      }
      const slot: Slot = { collection, index, ref, item: result.data as Parsed<typeof collection>, errors: [] };
      const first = byLocalId.get(slot.item.localId);
      if (first) {
        slot.errors.push({ rule: 'V-26', severity: 'error', slug: slot.item.localId, message: `localId ${slot.item.localId} is also used by ${first.collection}[${first.index}]`, path: 'localId' });
      } else byLocalId.set(slot.item.localId, slot);
      slots.push(slot);
    });
  }

  const fail = (slot: Slot, rule: string, message: string, path?: string) => {
    const err: ValidationError = { rule, severity: 'error', slug: slot.ref, message };
    if (path) err.path = path;
    slot.errors.push(err);
  };

  // 2. V-26: every reference resolves, to the expected collection for a tmp: id, to the expected type for an ekgId.
  const checkRef = (slot: Slot, field: string, value: string, path: string) => {
    const target = REF_TARGETS[field];
    if (!target) return;
    if (isLocalId(value)) {
      const found = byLocalId.get(value);
      if (!found) fail(slot, 'V-26', `${field} references ${value}, which is not proposed in this bundle`, path);
      else if (found.collection !== target.collection) fail(slot, 'V-26', `${field} references ${value}, which is a ${found.collection} proposal, not ${target.collection}`, path);
      return;
    }
    if (isEkgId(value) && parseEkgId(value).type !== target.type) {
      fail(slot, 'V-26', `${field} references ${value}, which is a ${parseEkgId(value).type}, not ${target.type}`, path);
    }
  };
  for (const slot of slots) {
    const item = slot.item as Record<string, unknown>;
    for (const [field, value] of Object.entries(item)) {
      if (!(field in REF_TARGETS)) continue;
      if (typeof value === 'string') checkRef(slot, field, value, field);
      else if (Array.isArray(value)) value.forEach((v, i) => typeof v === 'string' && checkRef(slot, field, v, `${field}[${i}]`));
    }
    if (slot.collection === 'offerings') {
      (slot.item as Parsed<'offerings'>).outcomeMappings.forEach((m, i) => checkRef(slot, 'outcome', m.outcome, `outcomeMappings[${i}].outcome`));
    }
    if (slot.collection === 'courses') {
      const course = slot.item as Parsed<'courses'>;
      const listed = new Set(course.outcomes);
      course.segments.forEach((segment, si) => {
        segment.outcomes.forEach((ref, oi) => {
          checkRef(slot, 'outcomes', ref, `segments[${si}].outcomes[${oi}]`);
          // V-29 every segment outcome is in the course's outcomes.
          if (!listed.has(ref)) fail(slot, 'V-29', `segment "${segment.title}" lists outcome ${ref}, which is not in the course's outcomes`, `segments[${si}].outcomes[${oi}]`);
        });
      });
    }
  }

  // V-26: a producer-minted ekgId on a proposal is accepted from a registered product identity only (EKG-SPEC-144/146).
  const registered = isRegisteredIdentity(envelope.data.producer.identity);
  for (const slot of slots) {
    const minted = (slot.item as { ekgId?: string }).ekgId;
    if (minted && !registered) {
      fail(slot, 'V-26', `${minted} was minted by ${envelope.data.producer.identity}, which is not a registered product identity; a producer never mints an ekgId (EKG-SPEC-122)`, 'ekgId');
    }
  }

  // 3. V-25: a proposed outcome's statement is never a proposed standard's statement.
  const standardStatements = new Map<string, string>();
  for (const slot of slots) {
    if (slot.collection === 'standards') standardStatements.set(normalizeStatement((slot.item as Parsed<'standards'>).statement), slot.ref);
  }
  for (const slot of slots) {
    if (slot.collection !== 'outcomes') continue;
    const outcome = slot.item as Parsed<'outcomes'>;
    const standard = standardStatements.get(normalizeStatement(outcome.statement));
    if (standard) fail(slot, 'V-25', `statement is the statement of standard ${standard}; a standard is an alignment target, never an outcome (EKG-SPEC-117)`, 'statement');

    // 4. V-27: dedupe evidence, and what its decision means for the item.
    if (!outcome.dedupe) fail(slot, 'V-27', 'a new outcome carries dedupe evidence: the queries run, the top matches, and the decision', 'dedupe');
    else if (outcome.dedupe.decision !== 'new') {
      if (!outcome.dedupe.of) fail(slot, 'V-27', `dedupe decision ${outcome.dedupe.decision} names no existing outcome in "of"`, 'dedupe.of');
      else slot.of = outcome.dedupe.of;
    }

  }

  // V-22 on proposed alignments (outcomes and courses) and V-30 on outcomes', as validateGraph applies them.
  for (const slot of slots) {
    if (slot.collection !== 'outcomes' && slot.collection !== 'courses') continue;
    const item = slot.item as Parsed<'outcomes'> | Parsed<'courses'>;
    item.alignments.forEach((a, i) => {
      const exact = frameworkByName(a.framework);
      if (!exact) {
        const loose = frameworkByNameLoosely(a.framework);
        if (loose) fail(slot, 'V-22', `alignment framework "${a.framework}" must be written exactly as "${loose.name}"`, `alignments[${i}].framework`);
        else warnings.push({ rule: 'V-22', severity: 'warning', slug: slot.ref, message: `alignment framework "${a.framework}" is not in the framework registry`, path: `alignments[${i}].framework` });
      }
      if (slot.collection !== 'outcomes') return;
      const registered: Framework | undefined = exact ?? (a.frameworkId ? frameworkById(a.frameworkId) : undefined);
      if (!registered) return;
      if (registered.kind === 'program_classification') fail(slot, 'V-30', `an outcome never aligns to the program classification "${registered.name}" (EKG-SPEC-141)`, `alignments[${i}]`);
      else if (registered.kind === 'exam_outline' && a.relation !== 'narrower' && a.relation !== 'related') fail(slot, 'V-30', `an outcome's alignment to the exam outline "${registered.name}" carries relation narrower or related (EKG-SPEC-142)`, `alignments[${i}].relation`);
    });
  }

  // 5. V-28: the serving floor on resources; a retrieval date and a URL on reference items.
  for (const slot of slots) {
    if (slot.collection === 'resources') {
      const r = slot.item as Parsed<'resources'>;
      if (!r.license) fail(slot, 'V-28', 'a proposed resource carries its license (EKG-SPEC-38)', 'license');
      if (r.embedPolicy === 'unknown') fail(slot, 'V-28', 'a proposed resource carries an embedPolicy other than unknown (EKG-SPEC-38)', 'embedPolicy');
    } else if (REFERENCE_COLLECTIONS.includes(slot.collection)) {
      const r = slot.item as { retrievedAt?: string; url?: string };
      if (!r.retrievedAt) fail(slot, 'V-28', 'a reference item carries retrievedAt (EKG-SPEC-116)', 'retrievedAt');
      if (!r.url) fail(slot, 'V-28', 'a reference item carries the URL it was retrieved from (EKG-SPEC-116)', 'url');
    }
  }

  // 6. Decisions.
  let allParsed = items.length === 0;
  for (const slot of slots) {
    errors.push(...slot.errors);
    if (slot.errors.length) {
      allParsed = false;
      items.push({ ref: slot.ref, collection: slot.collection, decision: 'rejected', reason: reasonFor(slot.errors), errors: slot.errors });
    } else if (slot.of) {
      items.push({ ref: slot.ref, collection: slot.collection, decision: 'merged_into', of: slot.of, errors: [] });
    } else {
      items.push({ ref: slot.ref, collection: slot.collection, decision: 'accepted', errors: [] });
    }
  }

  const ok = errors.length === 0;
  const result: ImportBundleValidation = { ok, errors, warnings, items };
  if (ok && allParsed) {
    const bundle = importBundle.safeParse(input);
    if (bundle.success) result.bundle = bundle.data;
  }
  return result;
}
