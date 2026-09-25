# Changelog

All notable changes to `@ecollective/knowledge-graph`. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow `SPEC.md` §12.

## Unreleased

### Changed

- `GOVERNANCE.md` publishes Open Degree's review SLA on inbound contribution pull requests (a
  first response within 7 days, a decision within 14, then an issue here for the arbiter),
  decided by the owner on 2026-09-23 and published on Open Degree's governance page. `SPEC.md`
  §15 marks EKG-OQ-2 resolved and EKG-OQ-7 resolved (posture (a), InstructOS's decision record
  0013); §13.1 ticks EKG-SPEC-88. No package change.
- The repository is public (2026-09-23). `GOVERNANCE.md` no longer suggests a private issue for a
  conduct concern; the next publish carries an npm provenance attestation, which `publish.yml`
  switches on for a public repository.

## 0.4.1 — 2026-09-23

Two amendments from `docs/decisions/0004-reproducible-builds-and-encoded-etags.md`, both catching
the specification up with what the publisher already does. Patch: no export, field or rule
changes; `SCHEMA_VERSION` stays `0.4.0`. Published on npmjs.com through trusted publishing.

### Changed

- `buildArtifact`: a redeploy of the commit the previous artifact already names is that build
  again. The builder keeps the build's changelog entry, feed entries and `previousBuildId` instead
  of diffing the build against itself, so the redeploy is byte-identical to the first deploy and
  `previousBuildId` never names the build itself (SPEC EKG-SPEC-171; #23). `BuildOptions.generatedAt`
  is documented as the commit's timestamp (EKG-SPEC-44, amended); the builder reads no clock.
- SPEC: EKG-SPEC-51 amended, the strong `ETag` is required on the unencoded representation and a
  content-encoded response may carry a weak one, with `If-None-Match` still answering 304 (#22).
  EKG-SPEC-44 amended (`generatedAt` is the commit's timestamp); EKG-SPEC-171 added (a publisher
  SHOULD build byte-reproducibly from the commit) and EKG-SPEC-172 added (a consumer SHOULD NOT
  infer build order from `generatedAt`) (#23).

## 0.4.0 — 2026-09-23

One addition, from the addendum to `docs/decisions/0003-commons-resource-records.md`: the evidence
aggregate shape (#21). Additive: a 0.3 artifact, bundle and commons file validate unchanged.
Published on npmjs.com through trusted publishing.

### Added

- `evidence`: one shape for evidence aggregates, `evidence/v1` (SPEC §10, EKG-SPEC-169, the
  shape DIY Degree publishes live), with `evidenceReport`, `evidenceNode`, `evidenceResource`,
  `evidenceWindow`, `EVIDENCE_SCHEMA_VERSION`, `EVIDENCE_K`, `EVIDENCE_LICENSE` and
  `validateEvidenceReport` (V-33: the k floor on every row, the row count, uniqueness, the window;
  `publisher` and `license` missing or the `licence` spelling are warnings through 0.4.x and
  errors from 0.5.0; EKG-SPEC-170). Every object is strict, so no free text or identifier can ride
  along (EKG-SPEC-68). EKG-OQ-11 resolved; the 0.1 example's field names are withdrawn (#21).

### Changed

- `SCHEMA_VERSION` is `0.4.0`; the Appendix B and §3.10 fixtures and the artifact examples say so.
- `effectiveness.window` in a commons resource record accepts a date or a datetime, as the
  publisher's file states it.

## 0.3.0 — 2026-09-23

The 0.3.0 additions, one change per pull request
(`docs/decisions/0003-commons-resource-records.md`): the handle rule (#30), a `platforms`
proposal collection (#28) and the commons' resource records (#29). Additive: a 0.2 artifact and a
0.2 bundle validate unchanged. Published on npmjs.com through trusted publishing.

### Added

- SPEC EKG-SPEC-159: the handle character set behind `contributor:<handle>` (§9.3; #30). No
  package change: `CONTRIBUTOR_IDENTITY_PATTERN` is unchanged and now has prose behind it.

- `import-bundle`: a `platforms` proposal collection (`proposals.platforms`, `platformRating`;
  SPEC §9.7, EKG-SPEC-160; #28): the §3.9 platform fields, `retrievedAt`, an optional `audience`
  for the platform as a whole and an optional overall `rating` with strengths and limitations. A
  resource proposal's `platformId` may name a `tmp:` platform in the same bundle (V-26); V-28
  requires `retrievedAt` and `url` on a platform proposal. An unknown key under `proposals` is now
  a V-01 warning naming the key (EKG-SPEC-161), not a silent drop.

- `commons`: the commons' resource records (SPEC §3.10; EKG-SPEC-162 to EKG-SPEC-167; #29):
  `commonsResource` (the §3.6 artifact resource plus `outcomes[]`, `state`, `linkStatus`,
  `quality`, `effectiveness[]`, `previousUrls`, `priceNote`, `description`, and the registered
  `qualityBreakdown`), `commonsResourceList` (the per-concept file `resources/<ULID>.json`),
  `validateCommonsResourceList` with V-31 (open layer: `provisional` or `published` only, no
  registered field) and V-32 (every record names the file's outcome; sorted, unique; V-18 across
  the file), `COMMONS_PATHS`, `COMMONS_STATES`, `OPEN_COMMONS_STATES`, `LINK_STATUSES`,
  `QUALITY_DIMENSIONS`, `qualitySummary`, `qualityBreakdown`, `effectiveness`,
  `resourceOutcomeLink`. The commons' obligation EKG-SPEC-168. EKG-OQ-11 records the §10 aggregate
  shape mismatch (#21). Fixture: the specification's example, `test/fixtures/commons-resources-geometry.json`.

### Changed

- `SCHEMA_VERSION` is `0.3.0`; the Appendix B fixture and the artifact examples say so.
- `GOVERNANCE.md` states that `opendegree-commons`, operated by the publisher, has no standing
  another product's bot lacks: its proposals are reviewed like any other (#24).

## 0.2.2 — 2026-09-23

Published through npm trusted publishing (OIDC), with no token anywhere; the workflow's first
release that way. No package code changes since 0.2.0.

### Changed

- `publish.yml` authenticates by trusted publishing; the first-release granular token and the
  `NPM_TOKEN` secret are gone (#2). Provenance attestations attach automatically once the
  repository is public and are switched off while it is private.

## 0.2.1 — 2026-09-23

The first published release: `@ecollective/knowledge-graph@0.2.1` on npmjs.com, public, under the
`ecollective` organisation. No package code changes since 0.2.0.

### Changed

- `publishConfig` points at `registry.npmjs.org` with public access; the publish workflow uses an
  `NPM_TOKEN` secret for the first publish and is ready for trusted publishing after it (#2).
- `GOVERNANCE.md` names `jmcwilliam`, the owner, as the only maintainer of every product and the
  only arbiter for now, for content disputes as for the schema (2026-09-23). `SPEC.md` §15 marks
  EKG-OQ-9 resolved and EKG-OQ-2 partly resolved: the review SLA is still to be published, so
  EKG-SPEC-88 stays unticked.

## 0.2.0 — 2026-09-17

Implements `SPEC.md` v0.2 draft, one change per pull request
(`docs/decisions/0002-adopt-v0.2-commons-and-import-bundles.md`). Tagged `v0.2.0`; not published,
because publishing is blocked on the package namespace (#2), so consumers keep vendoring the
packed tarball. A 0.1 artifact validates unchanged: every field added is optional, and nothing
here changes the meaning of an existing field.

### Added

- `schema`: `audience` on `resource` and `artifact.resource`, with `AUDIENCE_RATINGS`,
  `AUDIENCE_DESCRIPTORS` and the `Audience` types (SPEC §7.4; EKG-SPEC-110 to EKG-SPEC-113 and
  the DIY Degree obligation EKG-SPEC-114; #7). Optional with no default: an absent block means
  `unrated`.

- `ekg-id`: the six reference types of the commons (`framework`, `standard`, `institution`,
  `program`, `offering`, `platform`) join `EKG_TYPES`; `GRAPH_TYPES`, `REFERENCE_TYPES`,
  `graphEkgId`, `GRAPH_EKG_ID_PATTERN`, `isGraphType`, `isReferenceType` (EKG-SPEC-15 amended;
  EKG-SPEC-115; #9).
- `reference`: `reference.framework`, `.standard`, `.institution`, `.program`, `.offering`,
  `.platform` and `.entity`, with `referenceCommons`, `outcomeMapping`, `STANDARD_KINDS` and
  `DEGREE_LEVELS` (SPEC §3.9; EKG-SPEC-115 to EKG-SPEC-119). `validateGraph` accepts reference
  entities in source mode and runs V-02 and V-09 to V-16 over them; in artifact mode a reference
  entity fails V-07.
- `import-bundle`: `importBundle`, `proposals`, `validateImportBundle`, `importReport`,
  `importReportItem`, `IMPORT_BUNDLE_VERSION`, `localId`, `bundleRef`, `importProducer`,
  `dedupeEvidence`, `qualityProposal`, `REGISTERED_IDENTITIES`, `REJECTION_REASONS`,
  `IMPORT_DECISIONS`, `PROPOSAL_COLLECTIONS` (SPEC §9.7; EKG-SPEC-122 to EKG-SPEC-129; V-25 to
  V-28).
- `artifact`: `feed`, `feedEntry`, `FEED_CHANGES`, `FEED_LIMIT`, `ARTIFACT_PATHS.feed`,
  `CACHE_CONTROL.feed` (SPEC §8.6; EKG-SPEC-120, EKG-SPEC-121).
- `schema`: `sourceCitation`. `frameworks`: `FRAMEWORK_KINDS` and an optional `kind` on a registry
  row.
- The commons' obligations, §13.5: EKG-SPEC-130 to EKG-SPEC-134. EKG-SPEC-62 amended with
  `opendegree-commons`; `GOVERNANCE.md` names the commons as a product.
- `schema`: Course as a path definition: `kind` (`COURSE_KINDS`, default `curated_path`),
  `segments` (`segment`, `artifactSegment`, `SEGMENT_KINDS`), `alignments` and `sources` on
  `course` and `artifact.course`, and `crossDomain` on the artifact course (SPEC §3.3;
  EKG-SPEC-135 to EKG-SPEC-139; #8). Import-bundle course proposals carry the same fields.
- `frameworks`: rows `cip-2020`, `ap`, `clep`, `dsst`, `ace-credit`; every row carries `kind`,
  `jurisdiction`, `subject` and `url`; `STATE_FRAMEWORK_ID_PATTERN`, `isStateFrameworkId`
  (SPEC §6.2; EKG-SPEC-140 to EKG-SPEC-142).
- `validate`: V-29 (segment outcomes are course outcomes) and V-30 (an outcome never aligns to a
  program classification; an exam-outline alignment is `narrower` or `related`), in
  `validateGraph` and `validateImportBundle`; V-22 now covers course alignments. DIY Degree's
  obligation EKG-SPEC-143.
- Producer-minted identifiers (SPEC §9.6.1; EKG-SPEC-144 to EKG-SPEC-146; #10): an outcome
  proposal in a bundle carries an optional `ekgId`, which `validateImportBundle` accepts from a
  registered product identity and rejects from anyone else (V-26). EKG-SPEC-61's "no `ekgId`"
  bullet, EKG-SPEC-86 and the §9.4 checklist (item 10) are amended in place.
- `schema`: `volatility` and `evidenceClass` on `outcome` and `artifact.outcome` (`VOLATILITIES`,
  `EVIDENCE_CLASSES`; SPEC §3.2, EKG-SPEC-147 to EKG-SPEC-149); `subKind` (`RESOURCE_SUBKINDS`,
  `SUBKIND_KINDS`, `withSubKindRule`), `publishedAt` (a date or a datetime), `externalIds`
  (`EXTERNAL_ID_SCHEMES`, `EXTERNAL_ID_KEY_PATTERN`), `evidenceSignals`, `transcript` and
  `platformId` on every resource (SPEC §3.6, EKG-SPEC-150 to EKG-SPEC-155; #11, closing #5).
  Bundle outcome and resource proposals carry the same fields. DIY Degree's obligation
  EKG-SPEC-156. EKG-OQ-10 records the enum growth deferred to the next major (Change J).

- SPEC follow-ups (#4): EKG-SPEC-157 adopts `changelogEntry`'s layout for `changelog.json`;
  EKG-SPEC-158 requires a durable copy of every build snapshot (EKG-SPEC-54 kept, decided with
  www.opendegree.org#5); EKG-SPEC-24 amended to the conformant pattern that resolves EKG-OQ-3 (a
  backfill in the content repository, a build that refuses a resource without an id); §12.5 notes
  the Astro zod-3 adapter for publishers; EKG-OQ-2 and EKG-OQ-9 flagged as the owner's, EKG-OQ-4
  to -6 annotated as still open.
- `build-artifact`: `buildArtifact(entries, { buildId, generatedAt, previous?, … })`, pure and
  runtime-agnostic, ported from Open Degree's `src/lib/ekg.ts`: the manifest, per-domain files
  with cross-domain assessments, credentials and courses (EKG-SPEC-45, EKG-SPEC-136), edges,
  deduplicated resources and bodies, `all.json.gz`, `checksums.json` over every published path,
  `changelog.json` and `feed.json` diffed against the previous artifact, and the build snapshot;
  with `stableStringify`, `sortKeys`, `diffCounts` and `deriveFeed` (SPEC §8; #3). It refuses a
  resource without an `ekgId` rather than mint one (EKG-SPEC-24).

### Changed

- `SCHEMA_VERSION` is `0.2.0`; the Appendix B fixture and the specification's artifact examples
  say so.
- Appendix B's `nodes` and `resources` are now in the order EKG-SPEC-52 requires (a patch: the
  example was out of the order the rule mandates), so the builder's test compares it byte for
  byte; the §8.3 shape comment says the same.
- `commons.ekgId`, `domainFile.body` keys and `changelogEntry.merges` accept graph-type ids only
  (`graphEkgId`), exactly the 0.1 acceptance set, so a reference id never enters a graph file.
- A validation error's `path` renders as `nodes[8].type`, not `nodes.[8].type`.
- `validateDomainFile` no longer fails V-02 on a reference that legitimately leaves the file (a
  cross-domain node's outcomes, a prerequisite in another domain; EKG-SPEC-45/46, V-23 amended):
  it accepts a well-formed `ekgId` of the expected type, and `validateGraph` over the union of the
  imported files still runs whole-graph V-02 (`allowExternalReferences` is the switch). Before
  0.2.0 a publisher's first cross-domain prerequisite would have failed its build.
- A parsed course carries `kind`, `segments`, `alignments` and `sources` (defaulted), so Appendix
  B's course and a 0.2 publisher's artifact courses gain four keys; a 0.1 consumer ignores them
  (EKG-SPEC-78). `Framework.kind` is required in the registry type.

## 0.1.0 — 2026-09-05

First package release, implementing `SPEC.md` v0.1 draft. Not yet published to GitHub Packages.

### Added

- `ekg-id`: `EKG_TYPES`, `ekgId(type)`, `anyEkgId`, `mintEkgId`, `parseEkgId`, `isEkgId`,
  `isEkgIdOf` (SPEC §4.1).
- `schema`: source schemas for `domain`, `outcome`, `course`, `assessment`, `credential` and the
  `entity` union, with `wikilink`, `slug`, `status`, `semver`, `provenance`, `alignment`, `resource`
  and the `commons` (SPEC §3); artifact schemas under `artifact.*` with `ekgId` references,
  `resourceIds` and required provenance (SPEC §8.3).
- `artifact`: `manifest`, `domainFile`, `edge`, `checksums`, `changelog`, `ARTIFACT_PATHS`,
  `CACHE_CONTROL`, `SCHEMA_VERSION`, `ARTIFACT_VERSION` (SPEC §8).
- `checksums`: `sha256Hex`, `verifyChecksums` over the Web Crypto API (EKG-SPEC-50, V-24).
- `frameworks`: the §6.2 registry and lookups.
- `url`: `normalizeResourceUrl`, `sameResourceUrl` (EKG-SPEC-25).
- `validate`: `validateGraph` (V-01 … V-22 at whole-graph scope, EKG-SPEC-75) and
  `validateDomainFile` (adds V-23), every error naming slug, ekgId and rule (EKG-SPEC-76).
- Tests, including the Appendix B example artifact as a fixture that must validate clean.

### Not yet

- `build-artifact.ts` (SPEC §8 file layout from a validated content set; #3) — the third roadmap
  deliverable, needed by Open Degree's build, not by consumers.
- A `changelog.json` shape is proposed here (`changelogEntry`); SPEC §8.6 fixes the fields but
  not the JSON layout, so treat the shape as the package's proposal until the specification
  adopts it.
