# Decision: the commons' resource records, a platforms proposal collection, and the handle rule (0.3.0)

> Decision record, 2026-09-23. Status: **approved; landing by pull request.** The owner asked for
> issue #29 with #28 and #30 folded in. Each lands in its own pull request; the status table at the
> end records what has merged with the identifiers the editor assigned. Until a row says merged,
> that change is not in the specification.

## Context

v0.2 pinned the six reference entities of the commons (§3.9) and the import bundle (§9.7), and
left a commons *resource* as "a record of the commons service" (EKG-SPEC-126). Three consumers
then hit the edges of that:

- **www.opendegree.org** built the pages for every reference entity type (its #23) and stopped at
  the two pages that need a resource record with its audience rating and quality summary: "free
  ways to learn Y" and audience filtering on every resource list (OD-PUB-01/03). It reads the
  commons artifact through `checksums.json` and validates every record with the package's
  schemas, so an unpinned shape is a shape it cannot render (#29).
- **app.opendegree.org** now has the propose API and importer (its decision record 0002) and a
  `Resource` model with `state`, `quality`, `effectiveness` and a registered `qualityBreakdown`.
  Its first bundle from the sandbox was refused because its handles allowed underscores and the
  package's identity pattern does not; it changed its handle rule to hyphens and asked for the
  rule to be stated in prose (#30). Its platform seeding (OD-RES-08) has nothing to import into,
  because a bundle has no `platforms` collection (#28); www.diydegree.org has already committed
  the 23 platform reviews as a bundle in the shape #28 proposes.

## Decision

Land the three as additive changes to the specification and the package, in the order #30, #28,
#29, as 0.3.0 (additive is a minor release; the issues said "0.2.x").

- **#30, the handle rule.** EKG-SPEC-159 states in prose what `CONTRIBUTOR_IDENTITY_PATTERN`
  enforces: lowercase letters, digits and hyphens, beginning with a letter or a digit;
  case-insensitive uniqueness is the consumer's; a consumer may be stricter. The pattern is
  unchanged, so no behaviour changes; the commons' stricter `[a-z][a-z0-9-]{2,19}` is within it.
- **#28, `platforms` in a bundle.** A `platforms` proposal collection carrying the §3.9 platform
  fields, `retrievedAt`, an optional `audience` proposal for the platform as a whole, and an
  optional `rating` (`overall` 1 to 5 with `strengths` and `limitations`) for the case the
  six-dimension rubric does not fit, exactly the shape www.diydegree.org committed. A resource
  proposal's `platformId` may name a `tmp:` platform in the same bundle. An unknown key under
  `proposals` becomes a warning rather than a silent drop.
- **#29, the commons' resource records.** A new §3.10 pins the public shape of a commons resource
  record and the per-concept file it is published in, with the open and registered layers of the
  commons' requirements §3 written into the specification and enforced by a validator. The record
  is the §3.6 artifact resource plus the concepts it teaches, a quality summary, effectiveness
  aggregates and a record state. The state tokens are the commons' own (`pending`,
  `provisional`, `published`, `retired`), none of them a shared lifecycle token (EKG-SPEC-29); the
  commons had already chosen them over the requirements' `proposed`. The open artifact carries
  `provisional` and `published` records only. Effectiveness entries follow the shape DIY Degree
  publishes live (whole percents, `learners`), which the commons already reads; §10's example
  still disagrees with that shape and stays with #21.

### Classification and sign-off

| Change | Kind | Sign-off | Window |
| --- | --- | --- | --- |
| #30 handle rule | additive (a requirement stating an existing constraint) | editor + one maintainer | 7 days |
| #28 platforms collection; unknown-collection warning | additive (a new optional collection; a warning-level rule) | editor + one maintainer | 7 days |
| #29 commons resource records | additive (a new record shape, a new file, new validation rules that reach only the new file) | editor + one maintainer | 7 days |

The owner holds every role and authorised merging on green CI in the session of 2026-09-23 with
the comment window waived, as for v0.2 (decision record 0002, waiver).

## Rejected alternatives

- **Mapping `_` to `-` at the commons' door** instead of a stated rule: two handles would collide
  on one identity (the commons' own record 0002, item 9).
- **Carrying a platform as a resource proposal**: a resource must name an outcome, and linking 23
  platforms to eight outcomes would be false data (#28).
- **A six-dimension `qualityProposal` on a platform**: the reviews give one overall score with
  reasons; inventing six numbers from one would be worse than carrying the one honestly.
- **`proposed` as a commons record state**: a shared lifecycle token may not be reused
  (EKG-SPEC-29); the commons already uses `pending`.
- **Pinning the whole commons artifact layout now**: the consumers read `checksums.json` as the
  index and validate per record; only the resource record and its file need a shape today. The
  reference collections' files are lists of records the site already reads.
- **Keying the per-concept file by slug**: slugs change (EKG-SPEC-20); the outcome's ULID does
  not.

## Consequences

- www.opendegree.org can build its two blocked pages against `commonsResource` and
  `commonsResourceList` and read the audience rating and quality summary from the open artifact.
- app.opendegree.org's publisher (its #14) has a target for `resources/`; its importer gains a
  `platforms` collection and can import the 23 reviews unchanged; its handle rule is now the
  specification's.
- DIY Degree can import the commons' resource records for its own resource lists (its #144), with
  the audience block and the quality summary as canonical fields.
- 0.3.0 is a minor release; consumers repin at their own pace, and a 0.2 consumer keeps working.

## Follow-ups

1. #21: bring §10's evidence-aggregate example in line with the live shape and export a validator.
2. app.opendegree.org: publish `resources/` per concept (its #14) and import the platform bundle
   (its #19).
3. www.opendegree.org: the two pages (its #23 follow-up).
4. app.diydegree.org: read the commons' resource records (its #144).

## Status

| Change | Issue | Pull request | Requirements | Rules | Merged |
| --- | --- | --- | --- | --- | --- |
| Handle rule; 0.3.0 opened; this record | #30 | #34 | EKG-SPEC-159 | — | 2026-09-23 |
| `platforms` collection | #28 | #35 | EKG-SPEC-160, 161 | — | 2026-09-23 |
| Commons resource records | #29 | #36 | EKG-SPEC-162 to 168; EKG-OQ-11 | V-31, V-32 | 2026-09-23 |
| `v0.3.0` tag | — | — | — | — | 2026-09-23, on the merge of the release notes; published through trusted publishing |
