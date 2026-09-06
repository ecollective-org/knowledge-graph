# Changelog

All notable changes to `@ecollective/knowledge-graph`. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow `SPEC.md` §12.

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
