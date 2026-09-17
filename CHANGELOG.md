# Changelog

All notable changes to `@ecollective/knowledge-graph`. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow `SPEC.md` §12.

## 0.2.0 — unreleased

Implements `SPEC.md` v0.2 draft as it lands, one change per pull request
(`docs/decisions/0002-adopt-v0.2-commons-and-import-bundles.md`). Not yet published; publishing
is blocked on the package namespace (#2). A 0.1 artifact validates unchanged: every field added
is optional, and nothing here changes the meaning of an existing field.

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
