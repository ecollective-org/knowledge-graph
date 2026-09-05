# Decision: the framework lives in a dedicated repository

> Decision record, 2026-09-05. Status: **approved**. This resolves **OQ-2** in DIY Degree's
> `docs/requirements.md` §13.3, which asked whether `@ecollective/knowledge-graph` should be
> published from the Open Degree repository or from a dedicated one. It is resolved in favour of a
> dedicated repository: `ecollective-org/knowledge-graph`, this one.

## Context

Three products need one model of what is worth learning. Open Degree publishes canonical content and
moderates it; DIY Degree imports the graph, walks it with a learner, and contributes back; InstructOS
maps creator lessons onto the same nodes. None of the three may mint a competing node for a concept
another has modelled, and none may fork the schema.

DIY Degree's requirements (`docs/requirements.md` §5.3, filed as v1.0) recommended publishing the
schema package from `ecollective-org/www.opendegree.org`, on the grounds that Open Degree's stated
identity *is* the standard and that a fourth release process before Phase 1 is a cost. It explicitly
left the question open as **OQ-2**, to be decided before Phase 1 starts, and noted that moving later
would be a mechanical `git subtree split`. The owner has now decided, ahead of Phase 1, in the other
direction.

## Decision

**The framework and the content are separate. The framework lives here.**

- This repository holds `SPEC.md`, `GOVERNANCE.md`, the decision records, and — when written — the
  `@ecollective/knowledge-graph` package: Zod schemas, `ekgId` helpers, artifact types, and a
  validator.
- Open Degree keeps every domain, outcome, course, assessment, and credential, and remains the
  publisher of the artifact and the human-moderation layer. It becomes a *consumer* of the package
  its own build validates against.
- The specification is `SPEC.md` in this repository. Its requirements carry `EKG-SPEC-nn`
  identifiers so DIY Degree's requirements, Open Degree's standard pages, and any future consumer
  can cite them without copying them.
- Governance is at the eCollective level (`GOVERNANCE.md`): a breaking change needs sign-off from all
  three product maintainers plus the arbiter. The owner is the arbiter until a governance body
  exists.

Three things about the decision are worth stating explicitly, because they are what makes it work:

1. **The separation is between framework and content, not between Open Degree and the rest.** Open
   Degree does not lose the standard; it stops being the place where the *schema for the standard*
   is versioned. Its identity as the public standard for learning is about the curriculum and the
   moderation, both of which stay.
2. **Nothing here governs content.** Content governance stays on Open Degree's `/standard/governance`
   page. This repository governs field definitions, identifiers, the artifact shape, and the
   contribution protocol.
3. **Conformance is technical, never promotional** (`SPEC.md` EKG-SPEC-104). No consumer is required
   to name the other products or to describe its own software as open source, which is what makes
   InstructOS's participation possible at all under its current rules.

## Rejected alternatives

- **Publish the package from the Open Degree repository** (the recommendation this decision
  overturns). It reads well — the standard's home publishing the standard's types — but it conflates
  two things that version at different speeds and have different audiences. Content changes daily
  and is CC BY-SA 4.0; the schema changes rarely, is MIT, and every change is a migration for three
  products. It also makes Open Degree's maintainers the de facto owners of a schema that governs
  products they do not run, and it makes "who signs off on a breaking change" a question about
  commit access to a content repository. The cost it avoided — a fourth release process — is real
  but small, and it is smaller now than after Phase 1 ships.
- **A fourth repository holding the schema *and* the content.** Moves the curriculum out of Open
  Degree, contradicting its stated identity, and gains nothing.
- **Each product defines its own types and syncs.** A fork with extra steps. The directive forbids
  forking nodes; forking the schema is worse — every outside consumer would have to reconcile three
  schemas instead of pinning one.
- **No package at all, just prose.** A specification nobody can `npm install` is a specification
  three products will each interpret slightly differently, and the differences surface as data
  corruption, not as compile errors.
- **Vendoring the schema into each product.** Same failure, delayed.

## Consequences

- **A fourth release process now exists.** This repository has its own versioning, changelog, and
  publishing cadence. `GOVERNANCE.md` §Release cadence keeps it light: releases happen when there is
  something to release, not on a calendar.
- **Open Degree's build becomes the schema's continuous test**, as it would have been either way: its
  `src/content.config.ts` imports the published package instead of defining the types itself. If the
  schema breaks the seed content, Open Degree's build goes red.
- **Open Degree has real work to do before it conforms** — `ekgId`, `slug`/`previousSlugs`,
  `provenance`, extended resource metadata, generalized supersession, whole-graph cycle checking, and
  the artifact build. The complete list is `SPEC.md` §12.4.
- **DIY Degree's requirements are now out of date in one place.** §5.3 and OQ-2 describe the package
  as shipping from the Open Degree repository. That text needs correcting; the *reasoning* in its
  decision record `0001-ecollective-knowledge-graph.md` is otherwise unaffected.
- **Three repositories pin one package exactly.** A breaking change is a coordinated release, which
  is the point: the friction is deliberate and is what stops a schema drifting.
- **The spec is citable from day one**, before any code exists. `EKG-SPEC-nn` identifiers are stable
  and never renumbered, so DIY Degree's requirements can cite them now.

## Follow-ups

1. **Open Degree adoption.** File a decision record in `www.opendegree.org` accepting this
   specification, then do the §12.4 work. The `ekgId` question (`EKG-OQ-1`, DIY Degree's OQ-4) is the
   blocker: without immutable identifiers, every consumer needs a slug-plus-alias registry, which is
   strictly worse and must be recorded as a deliberate downgrade rather than defaulted into.
2. **Update DIY Degree's requirements.** Correct §5.3 to name this repository, and mark **OQ-2
   resolved** in §13.3 with a pointer here. *(Its decision record has since been updated to reflect
   this; the requirements body still needs the same correction.)*
3. **Name Open Degree's moderators and publish an inbound review SLA** (`EKG-OQ-2`, DIY Degree's
   OQ-3) before any consumer plans throughput against upstream review.
4. **Write the package**: `schema.ts`, `validate.ts`, `build-artifact.ts`, then publish
   `@ecollective/knowledge-graph@0.1.0` to GitHub Packages under the `@ecollective` scope.
5. **Register bot identities** `diy-degree-curation` and `instructos-mapping` with Open Degree before
   the first contribution pull request.
6. **Settle the InstructOS posture** (`EKG-OQ-7`, DIY Degree's OQ-14). EKG-SPEC-104 removes the
   technical obstacle; the positioning question is still the owner's.
