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

### Changed

- `SCHEMA_VERSION` is `0.2.0`; the Appendix B fixture and the specification's artifact examples
  say so.
- `commons.ekgId`, `domainFile.body` keys and `changelogEntry.merges` accept graph-type ids only
  (`graphEkgId`), exactly the 0.1 acceptance set, so a reference id never enters a graph file.
- A validation error's `path` renders as `nodes[8].type`, not `nodes.[8].type`.

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
