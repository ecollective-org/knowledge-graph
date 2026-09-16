# Proposal for v0.2: the commons layer, audience ratings, path definitions and import bundles

**Filed:** 2026-09-16, by DIY Degree's product maintainer, on the owner's decisions of the same day.
**Status:** proposal. Each change below is classified per `SPEC.md` §12.1 and follows the sign-off
and comment window `GOVERNANCE.md` sets for that kind. The specification editor assigns permanent
`EKG-SPEC-nn` identifiers; the labels used here (`A1`, `B2`, …) are placeholders.
**Context:** `app.diydegree.org/docs/decisions/0004` to `0008` and the Open Degree commons
requirements (`app.opendegree.org/docs/requirements.md`).

## 0. Summary

| Change | What | Kind (§12.1) | Who it serves first |
| --- | --- | --- | --- |
| A | An `audience` block on Resource | additive | every product; parents |
| B | `subKind`, `publishedAt`, `externalIds`, `evidenceSignals` on Resource | additive | frontier nodes; the catalog |
| C | `volatility` and `evidenceClass` on Outcome | additive | frontier nodes |
| D | Course becomes a path definition: `kind`, `segments`, `alignments`, `sources`, `crossDomain` | additive | curricula, AP and CLEP outlines, program templates |
| E | Framework registry rows and fields | additive | AP, CLEP, DSST, ACE, CIP, state standards |
| F | A `reference.*` schema family and `ekgId` types for the commons: framework, standard, institution, program, offering, platform | additive | the commons service |
| G | Producer-minted `ekgId` accepted in proposals from registered product identities | process change to §9.4 and EKG-SPEC-86 | DIY Degree's fast lane |
| H | Import bundles (new §9.7): the format an AI research session emits | additive | the seeding programme |
| I | A change feed and an optional webhook beside the changelog | additive | consumers' latency |
| J | Deferred to the next major: `kind` and `PROVENANCE_SOURCES` enum growth | breaking | noted, not proposed now |

Everything additive is optional in source and in the artifact; a v0.1 consumer that ignores unknown
fields (EKG-SPEC-78) keeps validating. Nothing here changes the meaning of an existing field
(EKG-SPEC-02), touches the lifecycle (EKG-SPEC-26/27) or moves learner data (EKG-SPEC-59/90).

## 1. Why now

Three owner decisions on 2026-09-16 make the shared model the binding constraint:

1. **Open Degree becomes the crowd-sourced commons** for resources with quality and audience
   ratings, a standards library, an institutional catalog and predefined path definitions, with a
   contributor app and a data service beside the git-canonical standard. That layer needs shapes
   this specification does not have.
2. **DIY Degree is the tutor over the commons, never its own graph.** It creates provisional nodes
   in real time under ids it mints and graduates them upstream on evidence; the current proposal
   rule (no `ekgId` on a new entity) would force a second id and a mastery rewrite for each one.
3. **The graph will be seeded largely by AI**, subject by subject, standard by standard, catalog
   by catalog. Every research session needs one normative output format that the commons can
   validate and import as proposals, or each session invents its own.

A fourth reason is a parent's: every resource must carry an audience rating before a child sees
it, and three products must read the same rating.

## 2. Change A: `audience` on Resource

```ts
export const AUDIENCE_RATINGS = ['all', 'teen', 'older_teen', 'adult', 'unrated'] as const;
export const AUDIENCE_DESCRIPTORS = [
  'strong_language', 'violence', 'sexual_content', 'substance_use', 'mature_themes',
  'frightening_content', 'discriminatory_content', 'self_harm_references', 'gambling',
  'commercial_pressure', 'unmoderated_comments', 'external_links_or_chat',
  'account_required', 'data_collection', 'perspective_content',
] as const;

export const audience = z.object({
  rating: z.enum(AUDIENCE_RATINGS).default('unrated'),
  descriptors: z.array(z.enum(AUDIENCE_DESCRIPTORS)).default([]),
  basis: z.object({
    automated: z.object({
      modelId: z.string(), promptVersion: z.string(), at: z.string().datetime(),
      signals: z.array(z.string()).default([]),   // 'captions', 'title', 'provider_flag', 'text'
    }).optional(),
    human: z.object({ count: z.number().int().nonnegative(), lastAt: z.string().datetime() }).optional(),
  }).default({}),
  confidence: z.number().min(0).max(1).optional(),
  disputes: z.number().int().nonnegative().default(0),
  version: z.number().int().positive().default(1),
});
// resourceFields gains:  audience: audience.optional()
```

Rules proposed:

- **A1.** `audience` is optional in source and in the artifact. A resource with no block is `unrated`.
- **A2.** A consumer that serves resources to a person under 18 MUST enforce a ceiling by age band
  (`teen` at 13 to 15, `older_teen` at 16 and 17) as a hard filter ahead of ranking, and MUST NOT
  serve an `unrated` resource as a minor's primary recommendation.
- **A3.** A report from a consumer MAY lower a resource's effective rating in that consumer
  immediately; only a human review in the commons raises it. `disputes` counts open reports.
- **A4.** `basis` is provenance in the sense of EKG-SPEC-13: a re-rating appends (bumps `version`),
  never edits history. Rating names are plain words and are not those of any film or game board.

Rationale: a single letter cannot carry what a parent decides on ("strong language is fine,
commercial pressure is not"); the descriptor list is the smallest set that covers the failure
modes of open video platforms. The scale is the hardest thing here to change later (DIY Degree
OQ-22), which is why it is proposed as a fixed enum rather than free text.

## 3. Change B: resource metadata for frontier and catalog material

```ts
export const RESOURCE_SUBKINDS = ['course', 'lesson_plan', 'syllabus', 'worksheet', 'paper',
  'preprint', 'docs', 'changelog', 'podcast', 'talk', 'repo'] as const;
// resourceFields gains:
//   subKind: z.enum(RESOURCE_SUBKINDS).optional(),
//   publishedAt: z.string().datetime().optional(),
//   externalIds: z.object({ doi: z.string().optional(), arxiv: z.string().optional(),
//                           openalex: z.string().optional(), isbn: z.string().optional() }).optional(),
//   evidenceSignals: z.object({ citationCount: z.number().int().nonnegative().optional(),
//                               citationSource: z.string().optional(), venue: z.string().optional(),
//                               peerReviewed: z.boolean().optional(), retracted: z.boolean().optional(),
//                               retractedAt: z.string().datetime().optional() }).optional(),
```

- **B1.** `subKind` refines `kind` and never contradicts it: `paper`, `preprint`, `docs`,
  `changelog`, `syllabus`, `lesson_plan` and `worksheet` sit under `reading`; `talk` under `video`;
  `repo` under `tool`; `course` under `interactive` or `reading` as the material dictates;
  `podcast` under `reading` until an `audio` kind exists (§11).
- **B2.** A retracted resource (`evidenceSignals.retracted`) MUST NOT be served as a primary by any
  consumer, and a publisher SHOULD move it to `deprecated` on its next build.
- **B3.** Citation counts are advisory ranking input, never a serving gate (new work has none).

The `kind` enum itself is not expanded, because a v0.1 validator rejects an unknown enum value
(EKG-SPEC-78 covers fields, not values); see §11.

## 4. Change C: `volatility` and `evidenceClass` on Outcome

```ts
export const VOLATILITIES = ['stable', 'evolving', 'frontier'] as const;
export const EVIDENCE_CLASSES = ['peer_reviewed', 'preprint', 'vendor_docs', 'single_source', 'mixed'] as const;
// outcome gains:  volatility: z.enum(VOLATILITIES).optional(),
//                 evidenceClass: z.enum(EVIDENCE_CLASSES).optional(),
```

- **C1.** `volatility` describes how settled the claim is, never how hard it is; `level` is
  unchanged and a `frontier` level value is explicitly rejected.
- **C2.** A consumer that presents a `frontier` or `evolving` outcome MUST label it as such beside
  the EKG-SPEC-30 label, and SHOULD re-verify a learner's mastery when the outcome's `version`
  changes (a minor bump invites re-verification, a major bump lapses it; product policy).
- **C3.** An overturned claim is a statement revision with a major `version` bump (EKG-SPEC-83) or
  a deprecation with the reason in the commit, never `supersededBy` (EKG-SPEC-05/31).

## 5. Change D: Course as a path definition

```ts
export const COURSE_KINDS = ['curated_path', 'curriculum', 'exam_outline', 'program_template'] as const;
export const SEGMENT_KINDS = ['core', 'elective', 'beyond'] as const;
export const segment = z.object({
  title: z.string().min(1),
  kind: z.enum(SEGMENT_KINDS).default('core'),
  outcomes: z.array(wikilink).min(1),          // ekgIds in the artifact
});
export const source = z.object({ title: z.string(), url: z.string().url(),
  license: z.string().optional(), retrievedAt: z.string().datetime() });
// course gains:  kind: z.enum(COURSE_KINDS).default('curated_path'),
//                segments: z.array(segment).default([]),
//                alignments: z.array(alignment).default([]),
//                sources: z.array(source).default([]),
// artifactCourse gains crossDomain: z.boolean().optional()   (the assessment/credential pattern)
```

- **D1.** `outcomes` stays the flat, complete list (EKG-SPEC-09 unchanged: a course is never the
  unit of the curriculum). `segments` partitions it; every segment outcome MUST appear in
  `outcomes` (a new validation rule) and the union of segments MAY be smaller than `outcomes`.
- **D2.** A course whose outcomes span domains keeps its primary `domain` and is emitted in every
  domain file its outcomes touch with `crossDomain: true`, exactly as assessments and credentials
  are today (EKG-SPEC-45/46).
- **D3.** `kind` says what the path mirrors: a `curriculum` (a state syllabus such as the NYS
  Regents Earth Science course), an `exam_outline` (AP, CLEP, DSST), a `program_template` (what
  programs classified under a CIP code typically require, derived from the catalog and adopted by a
  maintainer), or a `curated_path` (anything authored). `alignments` on a course name the
  framework it mirrors (`ap`, `clep`, `cip-2020`, a state framework), never an outcome's alignment.
- **D4.** The commons service publishes, beside the artifact, per-pair overlap tables for path
  definitions (shared outcomes, only in the first, only in the second) so consumers render a
  comparison without recomputing it; the format is the service's, not this specification's.
- **D5.** A program template MUST state the sample it was derived from (number of programs, CIP
  code, retrieval window) in `sources`, and a consumer MUST render the phrase "assembled to mirror
  the outcomes typically covered by programs classified under …", never a claim of equivalence,
  credit or a degree.

## 6. Change E: framework registry rows and fields

```ts
export interface Framework {
  id: string; name: string; authority: string;
  kind?: 'standards' | 'program_classification' | 'exam_outline' | 'credit_recommendation' | 'credential_format';
  jurisdiction?: string;   // 'US-NY', 'US', 'international'
  subject?: string;        // 'mathematics', 'science', 'all'
  url?: string;
}
```

New rows: `cip-2020` (Classification of Instructional Programs, 2020, NCES; `program_classification`);
`ap` (Advanced Placement course and exam descriptions, College Board; `exam_outline`); `clep`
(College-Level Examination Program, College Board; `exam_outline`); `dsst` (DSST exams, Prometric;
`exam_outline`); `ace-credit` (ACE CREDIT recommendations, American Council on Education;
`credit_recommendation`). State standards follow the id convention `<iso-region>-<subject>-<year>`
(`nys-nextgen-math` is grandfathered). A new row is added by the same process as any specification
change (§6.2); the commons service MAY stage a framework as `proposed` before it is registered, but
alignments to an unregistered framework do not validate (V-22 unchanged).

- **E1.** A `program_classification` framework MAY be aligned from a Course (Change D) and from a
  reference `program` (Change F), and MUST NOT be aligned from an Outcome: a program code says
  nothing about one "I can" statement.
- **E2.** An `exam_outline` framework is aligned from Outcomes with `relation: narrower | related`,
  with `provenance.source: ai` plus human review where machine-derived (EKG-SPEC-35 unchanged).

## 7. Change F: the commons reference family

These are reference data about the world, not curriculum, so they are a separate schema family
(`reference.*`) with their own `ekgId` types, published by the commons service under its own prefix
(`https://app.opendegree.org/api/commons/v1/`), never inside `/api/graph/v1` domain files.

```ts
// ekgId types added: 'framework' | 'standard' | 'institution' | 'program' | 'offering' | 'platform'
export const referenceCommons = { ekgId: anyEkgId, slug, previousSlugs: z.array(slug).default([]),
  version: semver.default('0.1.0'), license: z.string(), provenance, supersededBy: anyEkgId.optional() };

export const standard = z.object({ type: z.literal('standard'), frameworkId: z.string(),
  code: z.string(), statement: z.string(), level: z.string().optional(), parentCode: z.string().optional(),
  kind: z.enum(['level', 'domain', 'cluster', 'objective']), url: z.string().url().optional(), ...referenceCommons });

export const institution = z.object({ type: z.literal('institution'), ipedsUnitId: z.string().optional(),
  name: z.string(), sector: z.string().optional(), region: z.string().optional(), url: z.string().url().optional(),
  accreditor: z.string().optional(), tuition: z.object({ inState: z.number().optional(), outOfState: z.number().optional(),
  year: z.number().int().optional() }).optional(), retrievedAt: z.string().datetime(), ...referenceCommons });

export const program = z.object({ type: z.literal('program'), institution: ekgId('institution'),
  title: z.string(), degreeLevel: z.enum(['certificate', 'associate', 'bachelor', 'master', 'doctoral', 'other']),
  cipCode: z.string().optional(), credits: z.number().optional(), url: z.string().url().optional(),
  requiredOfferings: z.array(ekgId('offering')).default([]), retrievedAt: z.string().datetime(), ...referenceCommons });

export const offering = z.object({ type: z.literal('offering'), institution: ekgId('institution'),
  code: z.string(), title: z.string(), description: z.string().optional(), credits: z.number().optional(),
  level: z.string().optional(), prerequisites: z.array(z.string()).default([]), syllabusUrl: z.string().url().optional(),
  syllabusLicense: z.string().optional(), deliveryModes: z.array(z.string()).default([]), termsOffered: z.array(z.string()).default([]),
  costEstimate: z.number().optional(), url: z.string().url().optional(), retrievedAt: z.string().datetime(),
  outcomeMappings: z.array(z.object({ outcome: ekgId('outcome'), coverage: z.number().min(0).max(1),
    confidence: z.number().min(0).max(1), provenance })).default([]), ...referenceCommons });

export const platform = z.object({ type: z.literal('platform'), name: z.string(), url: z.string().url(),
  kind: z.string(), pricing: z.string().optional(), accessibility: z.string().optional(),
  ageRequirement: z.number().int().optional(), harvestAllowed: z.boolean().default(false),
  embedPolicy: z.enum(EMBED_POLICIES).default('unknown'), safetyNotes: z.string().optional(), ...referenceCommons });
```

- **F1.** Reference entities carry provenance and `retrievedAt` and never carry personal data;
  an institution is an organisation, an offering is a catalog entry, and no instructor name is
  stored unless it is the published author of a licensed syllabus.
- **F2.** A `standard` is an alignment target and MUST NOT be imported as an Outcome
  (EKG-SPEC-34 restated for the new type). The reverse index from a standard to outcomes is derived
  by the commons from outcome alignments, never authored.
- **F3.** Equivalences between offerings, or between an offering and a Course, are derived from
  outcome overlap above a published threshold or imported from a public articulation agreement,
  and each record states its basis; they are records of the commons service, not entities here.
- **F4.** Licensing: the commons MAY publish reference entities under terms other than CC BY-SA 4.0
  (`license` is required and explicit per record), because catalog data has its own sources and
  the owner's boundary decision (DIY Degree OQ-19) is made before the first contribution.

## 8. Change G: producer-minted identifiers in proposals

Today §9.4's checklist says "no `ekgId` on a new entity" and EKG-SPEC-86 has Open Degree mint on
merge, while EKG-SPEC-16 says an id is minted once "by whichever product creates the node". DIY
Degree creates provisional nodes in real time for learners who then master against them; a second id
minted upstream forces a merge and a mastery rewrite (EKG-SPEC-65) for every graduated node.

- **G1.** A proposal opened by a registered product identity (§9.3) MAY carry the `ekgId` that
  product minted, provided it is a valid ULID id of the right type (EKG-SPEC-15/17/18) and the
  product asserts in the pull request that learners or creators already reference it.
- **G2.** Open Degree MUST adopt that id on merge unless the proposal is a duplicate of an existing
  node, in which case the existing node survives and EKG-SPEC-64/65 apply as today.
- **G3.** Proposals from any other source (a human contributor, an AI producer through an import
  bundle) continue to carry no `ekgId`; the checklist line becomes "no `ekgId` on a new entity
  unless a registered product minted it".

Classification: additive for consumers; a process change for the publisher's checklist, which the
editor may treat as additive with a maintainer's sign-off or escalate.

## 9. Change H: import bundles (a new §9.7)

The one format every AI research session, script or tool emits, validated by this package and
imported by the commons service as **proposals**, never as canonical content.

```ts
export const IMPORT_BUNDLE_VERSION = '1.0.0';
const localId = z.string().regex(/^tmp:[a-z0-9-]+$/);          // bundle-local reference
const ref = z.union([anyEkgId, localId]);

export const importProducer = z.object({ tool: z.string(), toolVersion: z.string().optional(),
  modelId: z.string().optional(), promptVersion: z.string().optional(), sessionId: z.string(),
  producedAt: z.string().datetime(), identity: z.string() });      // registered product or 'contributor:<handle>'

const proposed = <T extends z.ZodRawShape>(shape: T) => z.object({ localId,
  confidence: z.number().min(0).max(1), provenance, ...shape });

export const dedupeEvidence = z.object({ queries: z.array(z.string()).min(1),
  topMatches: z.array(z.object({ ekgId: anyEkgId, title: z.string(), score: z.number() })).default([]),
  decision: z.enum(['new', 'alias_of', 'duplicate_of']), of: anyEkgId.optional() });

export const importBundle = z.object({
  bundleVersion: z.literal(IMPORT_BUNDLE_VERSION),
  producer: importProducer,
  scope: z.object({ subject: z.string().optional(), gradeBand: z.string().optional(),
    frameworkIds: z.array(z.string()).default([]),
    sources: z.array(z.object({ title: z.string(), url: z.string().url(), license: z.string().optional(),
      retrievedAt: z.string().datetime() })).default([]) }),
  licenseAcceptance: z.object({ graphContent: z.literal('CC BY-SA 4.0'), referenceContent: z.string() }),
  references: z.array(anyEkgId).default([]),                          // existing ids relied on
  proposals: z.object({
    domains: z.array(proposed({ title: z.string(), description: z.string() })).default([]),
    outcomes: z.array(proposed({ title: z.string(), statement: z.string(), evidence: z.array(z.string()).min(1),
      domain: ref, level: z.enum(LEVELS), prerequisites: z.array(ref).default([]), aliases: z.array(z.string()).default([]),
      learnerAliases: z.array(z.string()).default([]), alignments: z.array(alignment).default([]),
      volatility: z.enum(VOLATILITIES).optional(), dedupe: dedupeEvidence })).default([]),
    edges: z.array(proposed({ from: ref, to: ref, kind: z.literal('prerequisite') })).default([]),
    aliases: z.array(proposed({ outcome: anyEkgId, aliases: z.array(z.string()).min(1) })).default([]),
    alignments: z.array(proposed({ outcome: anyEkgId, alignments: z.array(alignment).min(1) })).default([]),
    courses: z.array(proposed({ title: z.string(), description: z.string(), kind: z.enum(COURSE_KINDS),
      domain: ref, outcomes: z.array(ref).min(1), segments: z.array(segment).default([]),
      alignments: z.array(alignment).default([]), sources: z.array(source).default([]) })).default([]),
    resources: z.array(proposed({ ...resourceFields, outcomes: z.array(ref).min(1),
      audience: audience.optional(), qualityProposal: z.object({ correctness: z.number().min(1).max(5),
        coverage: z.number().min(1).max(5), clarity: z.number().min(1).max(5), efficiency: z.number().min(1).max(5),
        accessibility: z.number().min(1).max(5), trust: z.number().min(1).max(5), reasons: z.string() }).optional() })).default([]),
    frameworks: z.array(proposed({ id: z.string(), name: z.string(), authority: z.string(), kind: z.string(),
      jurisdiction: z.string().optional(), url: z.string().url().optional() })).default([]),
    standards: z.array(proposed(standard.omit({ type: true, ekgId: true, slug: true, previousSlugs: true,
      version: true, license: true, provenance: true, supersededBy: true }).shape)).default([]),
    institutions: z.array(proposed({ /* institution fields minus commons */ })).default([]),
    programs: z.array(proposed({ /* program fields; institution: ref */ })).default([]),
    offerings: z.array(proposed({ /* offering fields; institution: ref; outcomeMappings with ref */ })).default([]),
  }),
});
```

Rules proposed for §9.7:

- **H1.** A producer never mints an `ekgId`. Bundle-local `tmp:` ids reference entities within the
  bundle; existing entities are referenced by `ekgId`, which the producer found by searching the
  current artifact first.
- **H2.** Every new outcome carries `dedupe` evidence: the queries run, the top matches, and the
  decision. A bundle whose outcome lacks it is rejected; a bundle whose outcome names a
  `duplicate_of` is turned into an alias or alignment proposal, never a node.
- **H3.** Every item carries `provenance` and a `confidence`; AI-authored items carry the model id
  and prompt version (V-19 unchanged). Nothing in a bundle is personal data; nothing is learner
  work (EKG-SPEC-59).
- **H4.** Outcomes must pass the authoring rules (one concept, first person, immediate prerequisites
  only, evidence present); resources must carry `license` and `embedPolicy` or are rejected
  (EKG-SPEC-38); reference items must carry `retrievedAt` and a source URL.
- **H5.** The commons imports a bundle as proposals into its review queues. Curriculum entities
  (domains, outcomes, edges, aliases, alignments, courses) become pull requests against the
  standard when accepted; reference entities and resources become rows of the commons service. A
  resource that clears the automated quality and audience floors MAY be published provisional on
  the fast lane before review.
- **H6.** The importer returns a machine-readable validation report (per item: accepted, queued,
  merged-into, rejected with a §9.6 reason) so a research session can correct and resubmit.

## 10. Change I: change feed and webhooks

`changelog.json` lists builds (EKG-SPEC-53). Consumers that create content in real time need to
hear about upstream changes faster than a daily import.

- **I1.** The publisher SHOULD emit `feed.json` beside the changelog: the last 1,000 entity-level
  changes (`ekgId`, `type`, `change: created | updated | merged | deprecated`, `version`, `buildId`,
  `at`), newest first, with the same cache rules as the manifest.
- **I2.** A consumer MAY register a webhook with the commons service to be called on publish;
  the payload is the feed entry. Polling the feed every five minutes is conformant without one.
- **I3.** The commons service's propose API accepts an import bundle from a registered identity and
  answers with the H6 report; the fast-lane latency target is the §6.4 table in DIY Degree's
  requirements (one hour to a provisional node).

## 11. Change J: deferred to the next major

Growing `RESOURCE_KINDS` (`audio`, `course`, `paper`) and `PROVENANCE_SOURCES` (`teacher`) breaks
v0.1 validators, so both wait for the next major release under EKG-SPEC-79's sign-off and comment
window. Until then `subKind` carries the refinement and `source: diydegree` with a product-side
recommender record carries a teacher's authorship.

## 12. Compatibility and sign-off

Changes A to F, H and I are **additive** (§12.1): optional fields, new optional entity families,
new files beside existing ones. Each needs the specification editor and one product maintainer,
with a seven-day comment window. Change G alters a publisher process rule; the editor decides
whether a maintainer's sign-off suffices. Change J is breaking and is only noted. The validator
gains rules for D1 (segment outcomes ⊆ outcomes), H2 (dedupe evidence present) and F2 (a standard
is never an outcome); each gets a V-nn number and a test.

## 13. Rollout

1. Publish 0.1.0 as filed (issue #2), so consumers stop vendoring the tarball.
2. Merge the accepted parts of this proposal as 0.2.0 with the changelog naming every added
   requirement.
3. Open Degree adopts: the site's content schema accepts the new optional fields; the artifact
   emits courses per domain with `crossDomain`; `feed.json` appears beside `changelog.json`.
4. The commons service (`app.opendegree.org`) implements the reference family, the propose API and
   the importer against 0.2.0.
5. DIY Degree pins 0.2.0, enforces A2, renders C2 and D5, and consumes the feed.

## 14. Open questions

- Whether `podcast` should wait for an `audio` kind rather than sit under `reading` (§11).
- Whether program templates belong in the artifact at all before a maintainer adopts one, or only
  in the commons service's own prefix (this proposal: service only until adopted).
- The threshold and the basis vocabulary for derived equivalences (F3), which the commons
  requirements own.
- Whether the descriptor list (A) should be extensible by the commons without a specification
  change; this proposal says no, because three products and every parent read it.
