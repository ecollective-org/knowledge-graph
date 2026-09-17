import { z } from 'zod';

import { anyEkgId, ekgId } from './ekg-id.js';
import { FRAMEWORK_KINDS } from './frameworks.js';
import { EMBED_POLICIES, provenance, semver, slug } from './schema.js';

/*
 * Reference entities of the commons (SPEC §3.9): facts about the world that the graph points at,
 * never curriculum. A framework and its standards are alignment targets; an institution, a
 * program and an offering are the catalog; a platform is a source of resources. They carry
 * `ekgId`s of their own types, an explicit licence, provenance and a retrieval date, and are
 * published by the commons service under its own prefix. They never appear in a graph domain
 * file (EKG-SPEC-115), and a standard is never imported as an outcome (EKG-SPEC-117, V-25).
 *
 * Every entity exports its plain field record (`standardFields`, …) beside its schema, so an
 * import bundle can propose the same fields without the commons and without `.omit()`, which
 * zod 4 refuses on a refined schema.
 */

export const STANDARD_KINDS = ['level', 'domain', 'cluster', 'objective'] as const;
export const DEGREE_LEVELS = ['certificate', 'associate', 'bachelor', 'master', 'doctoral', 'other'] as const;
export type StandardKind = (typeof STANDARD_KINDS)[number];
export type DegreeLevel = (typeof DEGREE_LEVELS)[number];

/**
 * The commons of every reference entity (EKG-SPEC-116): identity, version, an explicit licence
 * (catalog data has its own terms, EKG-SPEC-119), provenance, and when the record was retrieved
 * from its source. There is no lifecycle `status`; `supersededBy` alone marks a merged or retired
 * record, and any state the commons service keeps is its own.
 */
export const referenceCommons = {
  ekgId: anyEkgId,
  slug,
  previousSlugs: z.array(slug).default([]),
  version: semver.default('0.1.0'),
  license: z.string().min(1),
  provenance,
  retrievedAt: z.iso.datetime(),
};

/** A framework as reference data: the registry row of §6.2, published with its tree. `slug` is the registry id. */
export const frameworkFields = {
  name: z.string().min(1),
  authority: z.string().min(1),
  kind: z.enum(FRAMEWORK_KINDS),
  jurisdiction: z.string().optional(),
  subject: z.string().optional(),
  url: z.string().url().optional(),
};

/** One node of a framework's own tree, exactly as the publisher structures it (never paraphrased). */
export const standardFields = {
  frameworkId: slug,
  code: z.string().min(1),
  statement: z.string().min(1),
  kind: z.enum(STANDARD_KINDS),
  level: z.string().optional(),
  parentCode: z.string().optional(),
  url: z.string().url().optional(),
};

export const institutionFields = {
  name: z.string().min(1),
  ipedsUnitId: z.string().optional(),
  sector: z.string().optional(),
  region: z.string().optional(),
  url: z.string().url().optional(),
  accreditor: z.string().optional(),
  tuition: z
    .object({
      inState: z.number().nonnegative().optional(),
      outOfState: z.number().nonnegative().optional(),
      year: z.number().int().optional(),
    })
    .optional(),
};

export const programFields = {
  institution: ekgId('institution'),
  title: z.string().min(1),
  degreeLevel: z.enum(DEGREE_LEVELS),
  cipCode: z.string().optional(),
  credits: z.number().nonnegative().optional(),
  url: z.string().url().optional(),
  requiredOfferings: z.array(ekgId('offering')).default([]),
};

/** An offering's claimed coverage of an outcome, with the confidence and provenance of the claim. */
export const outcomeMapping = z.object({
  outcome: ekgId('outcome'),
  coverage: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  provenance,
});

export const offeringFields = {
  institution: ekgId('institution'),
  code: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  credits: z.number().nonnegative().optional(),
  level: z.string().optional(),
  prerequisites: z.array(z.string()).default([]),
  syllabusUrl: z.string().url().optional(),
  syllabusLicense: z.string().optional(),
  deliveryModes: z.array(z.string()).default([]),
  termsOffered: z.array(z.string()).default([]),
  costEstimate: z.number().nonnegative().optional(),
  url: z.string().url().optional(),
  outcomeMappings: z.array(outcomeMapping).default([]),
};

export const platformFields = {
  name: z.string().min(1),
  url: z.string().url(),
  kind: z.string().min(1),
  pricing: z.string().optional(),
  accessibility: z.string().optional(),
  ageRequirement: z.number().int().nonnegative().optional(),
  harvestAllowed: z.boolean().default(false),
  embedPolicy: z.enum(EMBED_POLICIES).default('unknown'),
  safetyNotes: z.string().optional(),
};

const referenceFramework = z.object({
  type: z.literal('framework'),
  ...frameworkFields,
  ...referenceCommons,
  ekgId: ekgId('framework'),
  supersededBy: ekgId('framework').optional(),
});
const referenceStandard = z.object({
  type: z.literal('standard'),
  ...standardFields,
  ...referenceCommons,
  ekgId: ekgId('standard'),
  supersededBy: ekgId('standard').optional(),
});
const referenceInstitution = z.object({
  type: z.literal('institution'),
  ...institutionFields,
  ...referenceCommons,
  ekgId: ekgId('institution'),
  supersededBy: ekgId('institution').optional(),
});
const referenceProgram = z.object({
  type: z.literal('program'),
  ...programFields,
  ...referenceCommons,
  ekgId: ekgId('program'),
  supersededBy: ekgId('program').optional(),
});
const referenceOffering = z.object({
  type: z.literal('offering'),
  ...offeringFields,
  ...referenceCommons,
  ekgId: ekgId('offering'),
  supersededBy: ekgId('offering').optional(),
});
const referencePlatform = z.object({
  type: z.literal('platform'),
  ...platformFields,
  ...referenceCommons,
  ekgId: ekgId('platform'),
  supersededBy: ekgId('platform').optional(),
});

/** Any reference entity, discriminated on `type`. */
const referenceEntity = z.discriminatedUnion('type', [
  referenceFramework,
  referenceStandard,
  referenceInstitution,
  referenceProgram,
  referenceOffering,
  referencePlatform,
]);

export const reference = {
  framework: referenceFramework,
  standard: referenceStandard,
  institution: referenceInstitution,
  program: referenceProgram,
  offering: referenceOffering,
  platform: referencePlatform,
  entity: referenceEntity,
} as const;

export type ReferenceFramework = z.infer<typeof referenceFramework>;
export type ReferenceStandard = z.infer<typeof referenceStandard>;
export type ReferenceInstitution = z.infer<typeof referenceInstitution>;
export type ReferenceProgram = z.infer<typeof referenceProgram>;
export type ReferenceOffering = z.infer<typeof referenceOffering>;
export type ReferencePlatform = z.infer<typeof referencePlatform>;
export type ReferenceEntity = z.infer<typeof referenceEntity>;
export type OutcomeMapping = z.infer<typeof outcomeMapping>;
