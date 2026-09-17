import { z } from 'zod';

import { ekgId, graphEkgId } from './ekg-id.js';

/*
 * Entity and value-object schemas for the eCollective Knowledge Graph, SPEC §3.
 *
 * Every field is adopted verbatim from Open Degree's `src/content.config.ts` unless the
 * specification marks it as added. Two families are exported:
 *
 *  - the SOURCE schemas (`domain`, `outcome`, `course`, `assessment`, `credential`,
 *    `entity`) — what a Markdown file's frontmatter looks like in a content repository.
 *    References are slugs or Obsidian wikilinks (EKG-SPEC-06) and `provenance` is optional.
 *  - the ARTIFACT schemas (`artifact.*`) — what the same entities look like in the
 *    published JSON artifact (SPEC §8). References are `ekgId`s, resources are referenced
 *    by `resourceIds`, and `provenance` is required (EKG-SPEC-41).
 */

export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
/** Kebab-case, lowercase, unique within a type (EKG-SPEC-19, V-12). */
export const slug = z
  .string()
  .regex(SLUG_PATTERN, 'Expected a kebab-case slug matching ^[a-z0-9]+(-[a-z0-9]+)*$ (V-12)');

/** The shared lifecycle, exactly Open Degree's five values (EKG-SPEC-26). */
export const STATUSES = ['stub', 'draft', 'proposed', 'adopted', 'deprecated'] as const;
export const status = z.enum(STATUSES);
export type Status = z.infer<typeof status>;

/**
 * Accepts a bare id or an Obsidian wikilink ("[[slug]]", "[[slug|Alias]]") and yields the
 * bare id, exactly as Open Degree does today (EKG-SPEC-06, V-06).
 */
export const wikilink = z
  .string()
  .transform((value) =>
    value.trim().replace(/^\[\[/, '').replace(/\]\]$/, '').split('|')[0]!.trim(),
  )
  .pipe(
    z
      .string()
      .min(1, 'A reference must not be empty once its brackets and alias are stripped (V-06)'),
  );

export const SEMVER_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
export const semver = z
  .string()
  .regex(SEMVER_PATTERN, 'Expected a semantic version such as 0.1.0 (V-01)');

export const LEVELS = ['foundation', 'intermediate', 'advanced'] as const;
export const ASSESSMENT_KINDS = [
  'project',
  'performance-task',
  'exam',
  'portfolio',
  'observation',
  'interview',
] as const;
export const RESOURCE_KINDS = [
  'video',
  'reading',
  'interactive',
  'book',
  'dataset',
  'tool',
  'practice',
  'reference',
] as const;
export const COSTS = ['free', 'freemium', 'paid'] as const;
export const MODALITIES = ['watch', 'read', 'listen', 'do'] as const;
export const EMBED_POLICIES = ['embed-allowed', 'link-only', 'official-player-only', 'unknown'] as const;
export const RELATIONS = ['exact', 'broader', 'narrower', 'related'] as const;
export const PROVENANCE_SOURCES = [
  'opendegree',
  'diydegree',
  'instructos',
  'ai',
  'curator',
  'learner_request',
  'import',
] as const;

/** The audience rating scale and descriptors (SPEC §7.4). Plain words, never a rating board's marks; fixed by the specification (EKG-SPEC-113). */
export const AUDIENCE_RATINGS = ['all', 'teen', 'older_teen', 'adult', 'unrated'] as const;
export const AUDIENCE_DESCRIPTORS = [
  'strong_language',
  'violence',
  'sexual_content',
  'substance_use',
  'mature_themes',
  'frightening_content',
  'discriminatory_content',
  'self_harm_references',
  'gambling',
  'commercial_pressure',
  'unmoderated_comments',
  'external_links_or_chat',
  'account_required',
  'data_collection',
  'perspective_content',
] as const;

export type Level = (typeof LEVELS)[number];
export type AssessmentKind = (typeof ASSESSMENT_KINDS)[number];
export type ResourceKind = (typeof RESOURCE_KINDS)[number];
export type Cost = (typeof COSTS)[number];
export type Modality = (typeof MODALITIES)[number];
export type EmbedPolicy = (typeof EMBED_POLICIES)[number];
export type Relation = (typeof RELATIONS)[number];
export type ProvenanceSource = (typeof PROVENANCE_SOURCES)[number];
export type AudienceRating = (typeof AUDIENCE_RATINGS)[number];
export type AudienceDescriptor = (typeof AUDIENCE_DESCRIPTORS)[number];

const EMAIL_PATTERN = /[^\s@]+@[^\s@]+\.[^\s@]+/;

/** Who or what authored a thing and who reviewed it (SPEC §3.8, §7.3). Immutable (EKG-SPEC-13). */
export const provenance = z
  .object({
    source: z.enum(PROVENANCE_SOURCES),
    generatedAt: z.string().datetime(),
    modelId: z.string().optional(),
    promptVersion: z.string().optional(),
    reviewedBy: z.string().optional(),
    reviewedAt: z.string().datetime().optional(),
    sourceRepo: z.string().optional(),
    sourceCommit: z.string().optional(),
  })
  .superRefine((p, ctx) => {
    if (p.source === 'ai' && !(p.modelId && p.promptVersion)) {
      ctx.addIssue({
        code: 'custom',
        path: ['modelId'],
        message: 'AI-sourced provenance requires modelId and promptVersion (V-19)',
      });
    }
    if (p.reviewedBy && !p.reviewedAt) {
      ctx.addIssue({
        code: 'custom',
        path: ['reviewedAt'],
        message: 'reviewedBy requires reviewedAt (V-19)',
      });
    }
    for (const [key, value] of Object.entries(p)) {
      if (typeof value === 'string' && EMAIL_PATTERN.test(value)) {
        ctx.addIssue({
          code: 'custom',
          path: [key],
          message: 'Provenance must not contain an email address (V-20)',
        });
      }
    }
  });
export type Provenance = z.infer<typeof provenance>;

/** A pointer from a node into an external standard (SPEC §3.7, §6). */
export const alignment = z.object({
  framework: z.string().min(1),
  code: z.string().min(1),
  url: z.string().url().optional(),
  frameworkId: z.string().optional(),
  relation: z.enum(RELATIONS).default('exact'),
});
export type Alignment = z.infer<typeof alignment>;

/** A cited source: where something was taken from, under what licence, and when (SPEC §9.7 `scope.sources`). */
export const sourceCitation = z.object({
  title: z.string().min(1),
  url: z.string().url(),
  license: z.string().optional(),
  retrievedAt: z.iso.datetime(),
});
export type SourceCitation = z.infer<typeof sourceCitation>;

/** What a path definition mirrors (SPEC §3.3, EKG-SPEC-137). */
export const COURSE_KINDS = ['curated_path', 'curriculum', 'exam_outline', 'program_template'] as const;
/** A segment's place in a path: the core, an elective, or beyond the mirrored definition (EKG-SPEC-135). */
export const SEGMENT_KINDS = ['core', 'elective', 'beyond'] as const;
export type CourseKind = (typeof COURSE_KINDS)[number];
export type SegmentKind = (typeof SEGMENT_KINDS)[number];

const segmentFields = {
  title: z.string().min(1),
  kind: z.enum(SEGMENT_KINDS).default('core'),
};
/** One ordered, titled part of a course's outcomes, in source (slug or wikilink references). */
export const segment = z.object({
  ...segmentFields,
  outcomes: z.array(wikilink).min(1, 'A segment lists at least one outcome (V-01)'),
});
/** The same segment in the artifact, with ekgId references. */
export const artifactSegment = z.object({
  ...segmentFields,
  outcomes: z.array(ekgId('outcome')).min(1, 'A segment lists at least one outcome (V-01)'),
});
export type Segment = z.infer<typeof segment>;
export type ArtifactSegment = z.infer<typeof artifactSegment>;

/**
 * The audience rating on a resource (SPEC §7.4, EKG-SPEC-110 to EKG-SPEC-113): a band, the
 * descriptors that explain it, and the basis it rests on. Optional on a resource, with no default,
 * so an absent block means `unrated` and a 0.1 artifact is unchanged by 0.2.0.
 */
export const audience = z.object({
  rating: z.enum(AUDIENCE_RATINGS).default('unrated'),
  descriptors: z.array(z.enum(AUDIENCE_DESCRIPTORS)).default([]),
  basis: z
    .object({
      automated: z
        .object({
          modelId: z.string().min(1),
          promptVersion: z.string().min(1),
          at: z.iso.datetime(),
          signals: z.array(z.string()).default([]),
        })
        .optional(),
      human: z.object({ count: z.number().int().nonnegative(), lastAt: z.iso.datetime() }).optional(),
    })
    .default({}),
  confidence: z.number().min(0).max(1).optional(),
  disputes: z.number().int().nonnegative().default(0),
  version: z.number().int().positive().default(1),
});
export type Audience = z.infer<typeof audience>;

/** The resource fields shared by source, artifact and import-bundle resources; a module export, not part of the public surface. */
export const resourceFields = {
  title: z.string().min(1),
  url: z.string().url(),
  kind: z.enum(RESOURCE_KINDS),
  cost: z.enum(COSTS).default('free'),
  provider: z.string().optional(),
  modality: z.enum(MODALITIES).optional(),
  durationSeconds: z.number().int().positive().optional(),
  difficulty: z.number().int().min(1).max(5).optional(),
  language: z.string().default('en'),
  hasCaptions: z.boolean().optional(),
  license: z.string().optional(),
  attributionText: z.string().optional(),
  sourceUrl: z.string().url().optional(),
  embedPolicy: z.enum(EMBED_POLICIES).default('unknown'),
  coverage: z.array(z.string()).default([]),
  lastVerifiedAt: z.string().datetime().optional(),
  /** Absent means `unrated` (EKG-SPEC-110). */
  audience: audience.optional(),
};

/**
 * A resource as authored inline on an outcome or a course (SPEC §3.6). Every added field is
 * optional here so existing Open Degree content stays valid; §7.2 is the bar for serving.
 */
export const resource = z.object({
  ekgId: ekgId('resource').optional(),
  ...resourceFields,
  provenance: provenance.optional(),
});
export type Resource = z.infer<typeof resource>;

/** A resource as it appears in the artifact: identity and provenance required (EKG-SPEC-24, -41). */
export const artifactResource = z.object({
  ekgId: ekgId('resource'),
  ...resourceFields,
  provenance,
});
export type ArtifactResource = z.infer<typeof artifactResource>;

/** Commons plus identity, on every entity (EKG-SPEC-04). Provenance optional in source. */
export const commons = {
  /** A graph entity type only: a reference id never names a graph entity (EKG-SPEC-115). */
  ekgId: graphEkgId,
  slug,
  previousSlugs: z.array(slug).default([]),
  status: status.default('draft'),
  version: semver.default('0.1.0'),
  license: z.string().default('CC BY-SA 4.0'),
  contributors: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  provenance: provenance.optional(),
};

/** The same commons in the artifact, where provenance is required (EKG-SPEC-41). */
const artifactCommons = { ...commons, provenance };

/** `supersededBy` is valid only on a deprecated entity (V-04, EKG-SPEC-05). */
export function superseded<T extends z.ZodObject<z.ZodRawShape>>(schema: T): T {
  return schema.superRefine((value, ctx) => {
    const v = value as { supersededBy?: unknown; status?: unknown };
    if (v.supersededBy !== undefined && v.status !== 'deprecated') {
      ctx.addIssue({
        code: 'custom',
        path: ['supersededBy'],
        message: 'supersededBy requires status: deprecated (V-04)',
      });
    }
  }) as T;
}

const minOneOutcome = 'Must list at least one outcome (V-05)';

// ---------------------------------------------------------------------------
// Source schemas: frontmatter in a content repository. References are slugs or wikilinks.
// ---------------------------------------------------------------------------

export const domain = superseded(
  z.object({
    type: z.literal('domain'),
    title: z.string().min(1),
    description: z.string().min(1),
    icon: z.string().optional(),
    order: z.number().default(100),
    supersededBy: wikilink.optional(),
    ...commons,
  }),
);

export const outcome = superseded(
  z.object({
    type: z.literal('outcome'),
    title: z.string().min(1),
    /** The measurable, first-person "I can…" statement: the concept's one definition. */
    statement: z.string().min(1),
    description: z.string().optional(),
    domain: wikilink,
    level: z.enum(LEVELS).default('foundation'),
    /** Immediate prerequisites only; "what comes after" is derived (EKG-SPEC-07). */
    prerequisites: z.array(wikilink).default([]),
    evidence: z.array(z.string()).default([]),
    alignments: z.array(alignment).default([]),
    aliases: z.array(z.string()).default([]),
    resources: z.array(resource).default([]),
    supersededBy: wikilink.optional(),
    ...commons,
  }),
);

export const course = superseded(
  z.object({
    type: z.literal('course'),
    title: z.string().min(1),
    description: z.string().min(1),
    domain: wikilink,
    outcomes: z.array(wikilink).min(1, minOneOutcome),
    assessments: z.array(wikilink).default([]),
    estimatedHours: z.number().positive().optional(),
    formats: z.array(z.string()).default([]),
    resources: z.array(resource).default([]),
    /** What the path mirrors (EKG-SPEC-137). */
    kind: z.enum(COURSE_KINDS).default('curated_path'),
    /** Ordered parts of `outcomes`; every segment outcome is in `outcomes` (EKG-SPEC-135, V-29). */
    segments: z.array(segment).default([]),
    /** The framework the path mirrors, never an outcome's alignment (EKG-SPEC-137). */
    alignments: z.array(alignment).default([]),
    /** What the definition was drawn from (EKG-SPEC-139 for a program template). */
    sources: z.array(sourceCitation).default([]),
    supersededBy: wikilink.optional(),
    ...commons,
  }),
);

export const assessment = superseded(
  z.object({
    type: z.literal('assessment'),
    title: z.string().min(1),
    description: z.string().min(1),
    kind: z.enum(ASSESSMENT_KINDS),
    outcomes: z.array(wikilink).min(1, minOneOutcome),
    evidenceRequirements: z.array(z.string()).default([]),
    rubricUrl: z.string().url().optional(),
    domain: wikilink.optional(),
    supersededBy: wikilink.optional(),
    ...commons,
  }),
);

export const credential = superseded(
  z.object({
    type: z.literal('credential'),
    title: z.string().min(1),
    description: z.string().min(1),
    outcomes: z.array(wikilink).min(1, minOneOutcome),
    assessments: z.array(wikilink).default([]),
    format: z.string().default('Open Badges 3.0 (W3C Verifiable Credential)'),
    issuerRequirements: z.array(z.string()).default([]),
    domain: wikilink.optional(),
    supersededBy: wikilink.optional(),
    ...commons,
  }),
);

/** Any source entity, discriminated on `type` (V-07). */
export const entity = z.discriminatedUnion('type', [domain, outcome, course, assessment, credential]);

export type Domain = z.infer<typeof domain>;
export type Outcome = z.infer<typeof outcome>;
export type Course = z.infer<typeof course>;
export type Assessment = z.infer<typeof assessment>;
export type Credential = z.infer<typeof credential>;
export type Entity = z.infer<typeof entity>;

// ---------------------------------------------------------------------------
// Artifact schemas: the published JSON (SPEC §8). References are ekgIds, resources are
// referenced by `resourceIds`, provenance is required.
// ---------------------------------------------------------------------------

const artifactDomain = superseded(
  z.object({
    type: z.literal('domain'),
    title: z.string().min(1),
    description: z.string().min(1),
    icon: z.string().optional(),
    order: z.number().default(100),
    supersededBy: ekgId('domain').optional(),
    ...artifactCommons,
  }),
);

const artifactOutcome = superseded(
  z.object({
    type: z.literal('outcome'),
    title: z.string().min(1),
    statement: z.string().min(1),
    description: z.string().optional(),
    domain: ekgId('domain'),
    level: z.enum(LEVELS).default('foundation'),
    prerequisites: z.array(ekgId('outcome')).default([]),
    evidence: z.array(z.string()).default([]),
    alignments: z.array(alignment).default([]),
    aliases: z.array(z.string()).default([]),
    /** Resources are emitted once per domain file and referenced by id (EKG-SPEC-48). */
    resourceIds: z.array(ekgId('resource')).default([]),
    supersededBy: ekgId('outcome').optional(),
    ...artifactCommons,
  }),
);

const artifactCourse = superseded(
  z.object({
    type: z.literal('course'),
    title: z.string().min(1),
    description: z.string().min(1),
    domain: ekgId('domain'),
    outcomes: z.array(ekgId('outcome')).min(1, minOneOutcome),
    assessments: z.array(ekgId('assessment')).default([]),
    estimatedHours: z.number().positive().optional(),
    formats: z.array(z.string()).default([]),
    resourceIds: z.array(ekgId('resource')).default([]),
    kind: z.enum(COURSE_KINDS).default('curated_path'),
    segments: z.array(artifactSegment).default([]),
    alignments: z.array(alignment).default([]),
    sources: z.array(sourceCitation).default([]),
    /** Set when the course's outcomes span domains and it appears in each file (EKG-SPEC-136). */
    crossDomain: z.boolean().optional(),
    supersededBy: ekgId('course').optional(),
    ...artifactCommons,
  }),
);

const artifactAssessment = superseded(
  z.object({
    type: z.literal('assessment'),
    title: z.string().min(1),
    description: z.string().min(1),
    kind: z.enum(ASSESSMENT_KINDS),
    outcomes: z.array(ekgId('outcome')).min(1, minOneOutcome),
    evidenceRequirements: z.array(z.string()).default([]),
    rubricUrl: z.string().url().optional(),
    domain: ekgId('domain').optional(),
    /** Set when the entity's outcomes span domains and it appears in each file (EKG-SPEC-45). */
    crossDomain: z.boolean().optional(),
    supersededBy: ekgId('assessment').optional(),
    ...artifactCommons,
  }),
);

const artifactCredential = superseded(
  z.object({
    type: z.literal('credential'),
    title: z.string().min(1),
    description: z.string().min(1),
    outcomes: z.array(ekgId('outcome')).min(1, minOneOutcome),
    assessments: z.array(ekgId('assessment')).default([]),
    format: z.string().default('Open Badges 3.0 (W3C Verifiable Credential)'),
    issuerRequirements: z.array(z.string()).default([]),
    domain: ekgId('domain').optional(),
    crossDomain: z.boolean().optional(),
    supersededBy: ekgId('credential').optional(),
    ...artifactCommons,
  }),
);

/** A node of a domain file: outcomes, courses, assessments, credentials (SPEC §8.3). */
const artifactNode = z.discriminatedUnion('type', [
  artifactOutcome,
  artifactCourse,
  artifactAssessment,
  artifactCredential,
]);

/** Any artifact entity, including the domain itself. */
const artifactEntity = z.discriminatedUnion('type', [
  artifactDomain,
  artifactOutcome,
  artifactCourse,
  artifactAssessment,
  artifactCredential,
]);

export const artifact = {
  domain: artifactDomain,
  outcome: artifactOutcome,
  course: artifactCourse,
  assessment: artifactAssessment,
  credential: artifactCredential,
  resource: artifactResource,
  node: artifactNode,
  entity: artifactEntity,
} as const;

export type ArtifactDomain = z.infer<typeof artifactDomain>;
export type ArtifactOutcome = z.infer<typeof artifactOutcome>;
export type ArtifactCourse = z.infer<typeof artifactCourse>;
export type ArtifactAssessment = z.infer<typeof artifactAssessment>;
export type ArtifactCredential = z.infer<typeof artifactCredential>;
export type ArtifactNode = z.infer<typeof artifactNode>;
export type ArtifactEntity = z.infer<typeof artifactEntity>;
