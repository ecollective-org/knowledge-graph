# Decision: builds reproducible from the commit, and a weak `ETag` on a content-encoded response (0.4.1)

> Decision record, 2026-09-23. Status: **approved; landing by pull request.** The owner asked for
> issues #22 and #23 after 0.4.0. Both land in one pull request; the status table at the end
> records what has merged with the identifiers the editor assigned.

## Context

Both issues came from Open Degree operating the artifact on Amplify Hosting, and both describe
something the publisher had already changed on its side:

- **#22.** EKG-SPEC-51 required a strong `ETag` on every file. CloudFront gzips JSON on the fly and
  rewrites the tag to `W/"…"` on the encoded response, while the unencoded representation keeps
  the strong tag and `If-None-Match` answers 304 either way. Verified against
  `https://www.opendegree.org/api/graph/v1/domains/geometry.json` on 2026-09-23: an
  `Accept-Encoding: identity` request returns `"fe55…"` and a 304 on `If-None-Match`; a gzip
  request returns `W/"fe55…"` and a 304. RFC 9110 §8.8 permits it, since a content coding is a
  different representation. As written, every publisher behind a compressing CDN was
  non-conformant. Open Degree's `verify:artifact` already judges the tag on the unencoded
  representation (www.opendegree.org#11).
- **#23.** EKG-SPEC-52 wants a byte diff to be a semantic diff, and EKG-SPEC-54 wants
  `builds/<buildId>/` immutable, but `generatedAt` was defined as the build time, so rebuilding
  the same commit produced different bytes that cascaded into every checksum. A retried or
  manually triggered deploy of the same commit then had to rewrite a snapshot a consumer may
  already have checksummed, or serve one that disagreed with the top level. Open Degree derives
  `generatedAt` from the commit's own timestamp (`git show -s --format=%cI`, falling back to the
  clock when there is no commit) and stores each snapshot once, never overwriting
  (www.opendegree.org#20, its decision record 0003). The package's builder had a second defect
  in the same place: given the live artifact as `previous` on a redeploy of the same commit, it
  diffed the build against itself and wrote its own `buildId` as `previousBuildId`.

DIY Degree's feed watcher compares its marker's `generatedAt` with the newest feed entry's `at`
as a fast path for "nothing newer". With commit timestamps that holds for a linear history and
misreads a rollback to an earlier commit, which is why #23 also needs a word to consumers.

## Decision

1. **EKG-SPEC-51 amended in place (#22).** The strong `ETag` is required on the identity
   representation; a content-encoded response MAY carry a weak `ETag`; `If-None-Match` MUST still
   answer 304 on it; a consumer compares tags only under the same `Accept-Encoding` and verifies
   bytes by checksum. The Amplify behaviour is conformant as it stands.
2. **EKG-SPEC-44 amended in place (#23, ask 1).** `generatedAt` is the committer timestamp of the
   commit `buildId` names, the wall clock only when there is no commit. Ask 2 (keep the wall
   clock and describe how to keep snapshots immutable anyway) is rejected: the snapshot would
   still disagree with a rebuilt top level.
3. **EKG-SPEC-171 added.** A publisher SHOULD build byte-reproducibly from the commit; a redeploy
   of the commit the live artifact names is that build again, never a diff against itself.
   `buildArtifact` implements the redeploy: it keeps the build's changelog entry, feed entries and
   `previousBuildId`, and a test shows the redeploy byte-identical to the first deploy.
4. **EKG-SPEC-172 added.** A consumer SHOULD NOT infer build order from `generatedAt`; `buildId`
   says whether a build was imported, the manifest says which is current, `changelog.json` says
   the order. Filed against DIY Degree's feed watcher as a small issue there.

## Classification and sign-off

| Change | Kind (§12.1) | Why | Signs off |
| --- | --- | --- | --- |
| EKG-SPEC-51 amended | Patch | Loosens a publisher requirement; no consumer can observe a difference from what a compressing CDN already served it, and no consumer obligation moves. | Specification editor |
| EKG-SPEC-44 amended; EKG-SPEC-171 added | Patch for consumers; a process change for the publisher, which already meets it | `generatedAt` keeps its type, format and place; which clock the publisher reads is pinned. No field or export changes. | Specification editor and the Open Degree maintainer |
| EKG-SPEC-172 added | Additive guidance (a SHOULD) | Names a consumer behaviour that the commit timestamp makes matter. | Specification editor and the DIY Degree maintainer |
| `buildArtifact` redeploy handling | Patch | Corrects a self-referential `previousBuildId` and a zero-change entry on a redeploy; no signature change. | Specification editor |

The owner holds every role named above and asked for the work; the comment window is waived as
for v0.2 (decision record 0002, waiver). Package version 0.4.1; `SCHEMA_VERSION` stays `0.4.0`,
as 0.2.1 and 0.2.2 stayed at 0.2.0.

## Consequences

- Open Degree changes nothing: its builder already passes the commit timestamp and its verifier
  already judges the tag unencoded. Pinning 0.4.1 gives it the redeploy handling, so a retried
  Amplify deploy of the same commit no longer produces a self-referential manifest.
- DIY Degree decides freshness by `buildId` (its feed watcher), which is a small change filed
  as an issue there; nothing in its import changes.
- The commons and InstructOS: nothing.

## Status

| Change | Issue | Pull request | Requirements | Rules | Merged |
| --- | --- | --- | --- | --- | --- |
| Encoded-response `ETag`; reproducible builds; redeploy handling | #22, #23 | #40 | EKG-SPEC-44, 51 amended; 171, 172 added | — | pending |
| `v0.4.1` tag | — | — | — | — | pending |
