# Decision: adopt v0.2 — the commons layer, audience ratings, path definitions and import bundles

> Decision record, 2026-09-17. Status: **approved; landing by pull request.** This adopts the
> proposal in [`docs/proposals/spec-0.2-commons-and-import-bundles.md`](../proposals/spec-0.2-commons-and-import-bundles.md)
> (PR #6, filed as issues #7 to #11), change by change, into `SPEC.md` and the package. Each change
> lands in its own pull request; the status table at the end records what has merged, with the
> permanent identifiers the editor assigned. Until a row says merged, that change is not in the
> specification.

## Context

On 2026-09-16 the owner decided the family plan: Open Degree becomes a crowd-sourced commons of
resources, ratings, standards, catalog data and path definitions, with a contributor app and a data
service beside the git-canonical standard; DIY Degree is the AI tutor over that commons and never
its own graph; the graph is seeded largely by AI research sessions, subject by subject. DIY Degree's
maintainer filed the v0.2 proposal the same day, classified per `SPEC.md` §12.1, with zod sketches
for every new shape. It merged as a document. Nothing of it was in `SPEC.md` or `src/`.

The consumers had already moved. DIY Degree enforces an audience ceiling for minors from a
per-platform default (`src/features/resources/audience.ts`) and holds `volatility`,
`evidenceClass`, `subKind`, `publishedAt`, `externalIds` and `platformId` as app overlays its
importer never overwrites (`src/features/graph/import.ts`). Its fast lane mints
`ekg:outcome:<ULID>` for provisional nodes learners master against
(`src/features/fastlane/proposal.ts`). The commons' requirements (`app.opendegree.org/docs/requirements.md`
§4.9 to §4.13) and its seeding playbook name `validateImportBundle`, which did not exist. The live
artifact at `https://www.opendegree.org/api/graph/v1/` is v0.1 and must keep validating for every
consumer that has not repinned (EKG-SPEC-78).

## Decision

Adopt Changes A to I of the proposal as **additive** changes to the specification and the package,
one pull request per issue, in the order the consumers need them: A (#7), then F, H and I (#9),
then D and E (#8), then G (#10), then B and C with issue #5 (#11). Change J (enum growth) is
**breaking**, is not done, and is recorded as an open question for the next major. Then the
artifact builder (#3) moves into the package and the v0.1 follow-ups (#4) close. The package goes
to 0.2.0 in the first of these pull requests and is tagged `v0.2.0` when all have landed.

The concrete decisions inside each change, where the proposal left a choice or the review found one:

- **A, `audience`.** Exactly the proposal's enums and shape, optional with no default (an absent
  block means `unrated`; a default would add a nine-key block to every resource on the first 0.2
  build). The rating scale and the descriptor list are fixed by the specification and change only
  by specification change; the commons does not extend them (the proposal's §14 last question:
  no).
- **F, the reference family.** Six new `ekgId` types. Reference entities are published under the
  commons' own prefix and never appear in `/api/graph/v1` domain files, `changelog.json` or
  `feed.json`; the package keeps a six-type `graphEkgId` for every place the specification means
  a graph entity, so a v0.1 consumer's acceptance set is unchanged. A standard is an alignment
  target, never an outcome. Program templates stay in the commons service until a maintainer
  adopts one as an authored Course (the proposal's §14 second question).
- **H, import bundles.** Bundle-local `tmp:` ids; a producer never mints an `ekgId` (with the one
  exception Change G adds for registered product identities); dedupe evidence on every new
  outcome; every item carries `provenance` and `confidence`; `bundleVersion` is a semver with the
  same major, not an exact literal; timestamps are UTC `Z`; `learnerAliases` is not a bundle field
  (it is a DIY Degree overlay, and `aliases` already include how a learner phrases a concept).
  The per-item validation report shape is in the package so producers and the commons share it.
- **I, the feed.** `feed.json` beside the changelog: the last 1,000 entity-level changes, nodes
  only, newest first, manifest cache rules. A webhook is optional; polling every five minutes is
  conformant.
- **D, Course as a path definition.** `kind` defaults to `curated_path`, the arrays to `[]`, on
  both source and artifact courses; a course whose outcomes span domains is emitted in every
  domain file it touches with `crossDomain: true`, on the assessment and credential pattern, and
  one spanning rule now serves all three. `segments` partition `outcomes` (a new validation rule).
  The consumer phrase for a program template is mandatory and never claims equivalence, credit or
  a degree.
- **E, the registry.** Rows `cip-2020`, `ap`, `clep`, `dsst`, `ace-credit`; registry fields
  `kind`, `jurisdiction`, `subject`, `url`; state framework ids follow
  `<iso-region>-<subject>-<year>`, lowercased, with `nys-nextgen-math` grandfathered. A
  `program_classification` framework is never aligned from an Outcome; an `exam_outline` framework
  is aligned from an Outcome only as `narrower` or `related`.
- **G, producer-minted ids.** A registered product identity may carry the id it minted; Open
  Degree adopts it on merge unless the proposal is a duplicate; every other source carries none.
  EKG-SPEC-16 is unchanged (it already says "whichever product creates the node"); EKG-SPEC-61 and
  EKG-SPEC-86 are amended in place. Classified as **additive for consumers** (no shape changes;
  the id a consumer already stores is the one that survives) and a **process change for the
  publisher**, so it needs the specification editor plus the Open Degree product maintainer, the
  role whose checklist changes.
- **B and C, frontier overlays.** `volatility` and `evidenceClass` on Outcome; `subKind`,
  `publishedAt` (a date or a datetime), `externalIds`, `evidenceSignals`, `transcript` and
  `platformId` on Resource. `externalIds` is a map from a registered scheme (`doi`, `arxiv`,
  `openalex`, `isbn`, `youtube`, `vimeo`) to an id, which answers issue #5's provider-scoped id;
  `transcript` answers its second gap, so the "may this caption text be used" judgement travels
  with the resource. `platformId` is in the list of DIY Degree overlays that become canonical and
  is added as a reference to a commons `platform` entity. `podcast` sits under `reading` until an
  `audio` kind exists at the next major (the proposal's §14 first question).
- **The builder (#3).** `buildArtifact` is pure and Astro-free, returns a result object like
  `validateDomainFile`, orders arrays by code-point comparison, derives `feed.json` from the
  previous artifact, and lists every published path in `checksums.json`, including the build
  snapshot's. Appendix B is reordered to EKG-SPEC-52 order so the builder's test is byte-exact
  where the specification is exact.

### Classification and sign-off

Per `SPEC.md` §12.1 and `GOVERNANCE.md` §Decisions. "Editor" is the specification editor;
"maintainer" is a product maintainer. Every role below is held by the owner today.

| Change | Kind | Sign-off | Window | Amends in place |
| --- | --- | --- | --- | --- |
| A `audience` | additive | editor + one maintainer | 7 days | — |
| B resource metadata | additive | editor + one maintainer | 7 days | — |
| C `volatility`, `evidenceClass` | additive | editor + one maintainer | 7 days | — |
| D Course as a path | additive (new validation rule reaches only fields no v0.1 content has) | editor + one maintainer | 7 days | — |
| E registry rows and fields | additive | editor + one maintainer | 7 days | EKG-SPEC-33's registry table |
| F reference family | additive (new entity types) | editor + one maintainer | 7 days | EKG-SPEC-15, V-09 (type list) |
| G producer-minted ids | additive for consumers; process change for the publisher | editor + the Open Degree maintainer | 7 days | EKG-SPEC-61, EKG-SPEC-86, §9.4 checklist |
| H import bundles | additive (new §9.7; new rules apply to bundles only) | editor + one maintainer | 7 days | EKG-SPEC-62 (registered identities) |
| I feed and webhook | additive (new artifact file) | editor + one maintainer | 7 days | — |
| J enum growth | **breaking** | all three maintainers + arbiter | 14 days | not done; EKG-OQ-10 |
| #3 builder | additive (package); Appendix B reorder is a patch | editor | on review | Appendix B, §8.3 note |
| #4 follow-ups | changelog layout additive; EKG-SPEC-24 amendment is a publisher process change; build retention additive; Astro note non-normative | editor + the Open Degree maintainer | 7 days | EKG-SPEC-24, §15 rows |

### Waiver of the comment window

The owner holds the specification editor role and every product maintainer role today
(`GOVERNANCE.md` §Roles). On 2026-09-17 the owner authorised merging each additive change above on
green CI in the session that lands them, and waived the seven-day comment window for the v0.2
changes. This record is where that waiver is written down, as `GOVERNANCE.md` requires of any
decision of consequence. The waiver does not extend to Change J or to any other breaking change,
which keep the fourteen-day window and the three-maintainer sign-off.

### Governance amendment made on the arbiter's authority

`GOVERNANCE.md` §Roles gains a product row for the Open Degree commons (`app.opendegree.org`,
importer of bundles and publisher of reference data, bot identity `opendegree-commons`), and
`SPEC.md` EKG-SPEC-62's list of registered identities gains the same name. Only the arbiter may
amend `GOVERNANCE.md`; the owner is the arbiter and authorised it with the rest of this adoption.

## Rejected alternatives

- **A film or game board's letters for the audience rating.** Trademarks, and a single letter
  cannot carry what a parent decides on; plain words plus descriptors (DIY Degree record 0008).
- **Free-text ratings or a commons-extensible descriptor list.** Three products and every parent
  read the same list; changing it is a specification change on purpose.
- **A `frontier` value on the shared `level` enum.** Conflates difficulty with epistemic status,
  and an enum addition breaks every v0.1 validator (DIY Degree record 0006).
- **`supersededBy` for an overturned claim.** It means merge or retirement (EKG-SPEC-05/31); an
  overturned claim is a statement revision with a major version bump, or a deprecation.
- **Growing `RESOURCE_KINDS` or `PROVENANCE_SOURCES` now** (`audio`, `paper`, `course`,
  `teacher`). EKG-SPEC-78 covers unknown fields, not unknown enum values; this is Change J and
  waits for the next major with its full sign-off.
- **An app-local path template as the system of record.** Makes DIY Degree the only place that
  knows what a curriculum consists of; path definitions are commons objects (DIY Degree record
  0005, OQ-23).
- **Importing a standard, a program code or the CIP taxonomy as outcomes or domains.** EKG-SPEC-34;
  restated for the reference family.
- **A fixed four-key `externalIds` object.** It cannot carry the provider-scoped id issue #5 asks
  for without a schema change per provider; a map keyed by registered scheme can.
- **`learnerAliases` in bundles.** A product overlay, not shared content.
- **An EKG-SPEC-52 ordering check in `validateDomainFile`.** DIY Degree's fixtures are Appendix B
  copies in the old order and its contract test fails on any warning; ordering is the builder's
  job and is tested there.
- **Deferring Change G to the next major.** Every graduated fast-lane node would otherwise force a
  merge and an atomic mastery rewrite (EKG-SPEC-65) for a concept that never had two identities.

## Consequences

- The specification grows from 109 to roughly 150 requirements and from V-24 to V-30. Every new
  MUST is numbered; nothing is renumbered. `schemaVersion` becomes `0.2.0`.
- A v0.1 consumer keeps validating every 0.2 artifact: every new field is optional or defaulted,
  new types never reach the graph files, and the new validation rules reach only content that
  does not exist yet. DIY Degree's contract test (no errors, no warnings on its fixtures) stays
  green on the 0.1.0 pin, and its contract job against the live artifact stays green until Open
  Degree content aligns to a new registry row, which is why DIY Degree must repin before that.
- DIY Degree's importer stops shadowing upstream: `volatility`, `evidenceClass`, `subKind`,
  `publishedAt`, `externalIds` and `platformId` are canonical and are overwritten by import
  (EKG-SPEC-57); `lastEvidenceReviewAt` and `reviewBy` remain overlays. Its snapshot has to
  deduplicate cross-domain courses and carry the Change D fields.
- The commons' Phase 1 importer and every AI research session have one normative bundle format,
  validated by the same package the publisher and the tutor pin.
- Open Degree's site adopts the optional fields in its zod-3 adapter, emits courses per domain
  with `crossDomain`, publishes `feed.json`, and swaps its own builder for the package's
  (www.opendegree.org#10 and a new issue for the swap).
- Publishing the package is still blocked on the owner's namespace decision (issue #2): the
  `@ecollective` scope names a GitHub user that is not this organisation. Until then every consumer
  vendors the packed tarball, which is conformant.

## Follow-ups

1. Owner: the package namespace (issue #2), and the `read:packages` tokens for both consumers'
   builds once a registry exists.
2. Owner: EKG-OQ-2 (Open Degree's maintainers and their review SLA) and EKG-OQ-9 (arbitration).
   Flagged, not answered, by this adoption. *2026-09-23: the owner named themself the only
   maintainer and the only arbiter for now; the review SLA is still to be published.*
3. `app.diydegree.org`: pin 0.2.0; prefer the artifact's `audience` block over the platform
   default; consume `feed.json`; move the canonical fields out of the overlay lists; deduplicate
   cross-domain courses in the snapshot.
4. `www.opendegree.org`: #10 (adopt the fields, emit courses per domain, publish `feed.json`) and
   the builder swap (https://github.com/ecollective-org/www.opendegree.org/issues/19).
5. `app.opendegree.org`: #3 there builds against `importBundle`, `validateImportBundle`, the
   report shape, the reference schemas and the feed.
6. Change J at the next major: `audio`, `course` and `paper` kinds; a `teacher` provenance source.

## Status

Filled in as each pull request merges. Identifiers are assigned by the editor on merge and are
permanent from then on.

| Change | Issue | Pull request | Requirements | Rules | Merged |
| --- | --- | --- | --- | --- | --- |
| CI and publish workflows | #2 | #12 | — | — | 2026-09-17 |
| This record | — | #13 | — | — | 2026-09-17 |
| A `audience` | #7 | #14 | EKG-SPEC-110 to 114 | — | 2026-09-17 |
| F, H, I reference family, bundles, feed | #9 | #15 | EKG-SPEC-115 to 134; 15, 62 amended | V-25 to V-28 | 2026-09-17 |
| D, E path definitions, registry | #8 | #16 | EKG-SPEC-135 to 143; 45 prose, V-22 amended | V-29, V-30 | 2026-09-17 |
| G producer-minted ids | #10 | #17 | EKG-SPEC-144 to 146; 61, 86, §9.4, V-26 amended | — | 2026-09-17 |
| B, C, #5 frontier overlays, `transcript`, `platformId` | #11 | #18 | EKG-SPEC-147 to 156; EKG-OQ-10 | — | 2026-09-17 |
| Builder `build-artifact.ts` | #3 | #19 | V-23, EKG-SPEC-120 prose, Appendix B amended | — | 2026-09-17 |
| Follow-ups | #4 | #20 | EKG-SPEC-157, 158; 24 amended; EKG-OQ-3 resolved; EKG-OQ-2, 9 flagged | — | 2026-09-17 |
| `v0.2.0` tag | — | — | — | — | 2026-09-17, on the merge of #20; the publish workflow runs and its publish step fails on the namespace until the owner decides (#2) |
