# eCollective Knowledge Graph

**One schema for what is worth learning, shared by three products.**

The eCollective Knowledge Graph (EKG) is the shared model behind
[Open Degree](https://www.opendegree.org), [DIY Degree](https://www.diydegree.org), and InstructOS.
It exists so that a concept has exactly one definition across all of them, so a learner's proof of
mastery survives a rename or a merge, and so anyone else — a school, an employer, another platform —
can read the same graph on the same terms.

This repository holds the **framework**: the specification, the governance, and (later) the
`@ecollective/knowledge-graph` package. **Read [`SPEC.md`](SPEC.md) first.**

> **Status: v0.4 draft specification; package 0.3.0 published on npmjs.com, public
> (`npm install @ecollective/knowledge-graph@0.3.0`), 0.4.0 unreleased.** The specification is filed
> and citable.
> `schema.ts` and `validate.ts` exist with
> tests and the Appendix B artifact validates clean; `build-artifact.ts` reproduces it byte for byte.
> Consumers pin the exact version (EKG-SPEC-82). Nothing here is frozen.

## What this repository is

- The **specification** ([`SPEC.md`](SPEC.md)): entities and fields, identifiers, lifecycle,
  alignments, resources and provenance, the published artifact, the contribution protocol, evidence
  aggregates, validation rules, versioning, consumer obligations, licensing, and open questions.
  Requirements carry stable `EKG-SPEC-nn` identifiers so other documents can cite them.
- The **governance** ([`GOVERNANCE.md`](GOVERNANCE.md)): who decides what, what a breaking change
  costs, how a new consumer joins.
- The **decision records** ([`docs/decisions/`](docs/decisions/)): why things are the way they are.
- Later, the **package**: Zod schemas, `ekgId` helpers, artifact types, and a validator.

## What this repository is not

- **Not the curriculum.** Every domain, outcome, course, assessment and credential lives in Open
  Degree's content repository and always will. Framework and content are separate on purpose.
- **Not a product, a platform, or a school.** It is a schema and a contract.
- **Not a place learner data goes.** No learner identity, mastery record, session, or answer is in
  this model, and none ever will be. Only k-anonymized aggregates (k ≥ 50) cross the boundary, and
  they carry no identity.
- **Not a ranking or recommendation engine.** The graph supplies edges; policy belongs to products.

## The three products

| Product | Role in the graph | What it owns |
| --- | --- | --- |
| **[Open Degree](https://www.opendegree.org)** | Publisher and human-moderation layer | The canonical content, the `status` lifecycle, the published artifact. It never tracks learners. |
| **[DIY Degree](https://www.diydegree.org)** | Learning engine: importer and contributor | Learner state, ranking, checks, and the fast lane. It imports the graph, walks it, and contributes nodes, resources, assessments, and aggregates back. |
| **InstructOS** | Mapper | Creator lessons and courses, mapped onto existing `ekgId`s. It never authors canonical definitions, and it never publishes commerce data into the graph. |

Conformance is technical, not promotional: nothing in the specification requires a product to name
the others, link to them, or describe itself as open source (`SPEC.md` EKG-SPEC-104).

## The artifact

The graph leaves Open Degree as a versioned, cacheable JSON artifact — the only supported way to
read it programmatically:

```
https://www.opendegree.org/api/graph/v1/index.json           # manifest: domains, counts, buildId
https://www.opendegree.org/api/graph/v1/domains/<slug>.json  # one domain: nodes, edges, resources
https://www.opendegree.org/api/graph/v1/all.json.gz          # everything, for a full reimport
https://www.opendegree.org/api/graph/v1/checksums.json
https://www.opendegree.org/api/graph/v1/changelog.json
```

Not published yet — building it is the first thing Open Degree owes this specification.
See [`SPEC.md` §8](SPEC.md#8-the-published-artifact), with a complete worked example in
[Appendix B](SPEC.md#appendix-b--a-complete-example-artifact).

## Start here

| If you want to… | Read |
| --- | --- |
| Understand the whole model | [`SPEC.md` §1–§3](SPEC.md#1-purpose-and-scope) |
| Know why `ekgId` exists and how merges work | [§4 Identifiers](SPEC.md#4-identifiers) |
| Know who may change a node's status | [§5 Lifecycle and moderation](SPEC.md#5-lifecycle-and-moderation) |
| Map to an external standard | [§6 Alignments](SPEC.md#6-alignments-to-external-standards) |
| Add or serve a resource lawfully | [§7 Resources and provenance](SPEC.md#7-resources-and-provenance) |
| Build or consume the artifact | [§8 The published artifact](SPEC.md#8-the-published-artifact) |
| Open a contribution pull request | [§9 Contribution protocol](SPEC.md#9-contribution-protocol) |
| Publish evidence without exposing learners | [§10 Evidence aggregates](SPEC.md#10-evidence-aggregates) |
| Implement a validator | [§11 Validation rules](SPEC.md#11-validation-rules) |
| Know what breaks a consumer | [§12 Versioning and compatibility](SPEC.md#12-versioning-and-compatibility) |
| Check your product against the contract | [§13 Consumer obligations](SPEC.md#13-consumer-obligations) |
| Know what you may reuse | [§14 Licensing](SPEC.md#14-licensing) |
| See what is undecided | [§15 Open questions](SPEC.md#15-open-questions) |
| See the proposed Zod schema | [Appendix A](SPEC.md#appendix-a--schemats-sketch) |

## Using the package

```ts
import {
  artifact, entity, validateDomainFile, validateGraph, mintEkgId, normalizeResourceUrl,
} from '@ecollective/knowledge-graph';

// Open Degree's content.config.ts: the source schemas take frontmatter with wikilink references.
const outcomes = defineCollection({ loader: markdown('outcomes'), schema: entity /* or outcome */ });

// A consumer's importer: a domain file must validate with no errors before anything is written.
const result = validateDomainFile(await fetchJson('/api/graph/v1/domains/geometry.json'));
if (!result.ok) abortImport(result.errors); // every error names slug, ekgId and the rule (V-nn)
```

`zod@^4` is a peer dependency. Node 20.19 or later. `npm run verify` runs typecheck, tests and
the build. Install with `npm install @ecollective/knowledge-graph@<exact version>`.

## Roadmap to the v0.1 package

Three deliverables, in order. All three exist.

1. **`schema.ts`** — done. The Zod schemas of `SPEC.md` §3, the `ekgId` mint/parse helpers of §4,
   the artifact types of §8, and the provenance and alignment value objects, in `src/`.
2. **`validate.ts`** — done. Every rule in §11, including the whole-graph checks no per-entity
   schema can express: reference resolution, prerequisite cycles, `ekgId` uniqueness, slug history,
   and supersession chains. Ported from Open Degree's `src/lib/coherence.ts`, which is the reference
   implementation.
3. **`build-artifact.ts`** — done (#3). Turns a validated content set into the §8 file layout:
   manifest, per-domain files (courses, assessments and credentials emitted in every domain they
   span), `all.json.gz`, checksums, changelog and `feed.json` diffed against the previous artifact,
   and the per-build snapshot, with deterministic ordering so a byte diff is a semantic diff. It
   reproduces Appendix B byte for byte from the seed's source entries, and never mints an id.

Then: published. `@ecollective/knowledge-graph` is on npmjs.com, public, under the owner's
`ecollective` organisation (#2); a `v*` tag publishes the next release through npm trusted
publishing, with no token. The v0.2 changes landed per
issue (#7 to #11, `docs/decisions/0002-…`); the v0.1 follow-ups were #4.

## What each product needs before its next phase

**Open Degree** — the publisher, and the one with the most to do:

- `ekgId` adoption (`EKG-OQ-1`) is decided: yes, 2026-09-05. The remaining items are the work.
- Add `ekgId`, `slug`, `previousSlugs[]`, and `provenance` to the content schema and backfill them once.
- Extend the inline `resource` object with §3.6's optional fields, and mint and persist a resource `ekgId` per distinct URL.
- Generalize the `supersededBy` rule to every entity, and move the prerequisite cycle check to whole-graph scope.
- Emit the artifact from the site build.
- Name its moderators and publish an inbound-pull-request review SLA (`EKG-OQ-2`).

The full list is [`SPEC.md` §12.4](SPEC.md#124-what-open-degree-must-change-to-conform).

**DIY Degree** — before Phase 1:

- Pin the package exactly (EKG-SPEC-82). Until it is published, pin the packed tarball by commit; key every table on `ekgId`.
- Build `graph-import` against §8.7: idempotent, diff-based, atomic on failure, canonical fields overwritten and overlay fields never touched.
- Keep its overlay states (`submitted`, `provisional`, `canonical`, `rejected`) out of the shared model, per the mapping in §5.3.
- Build `proposal-publisher` to the pull-request format in §9.2, as `diy-degree-curation`.
- Build `evidence-aggregator` to §10, asserting k ≥ 50 before it emits anything.
- Update `docs/requirements.md` §5.3 and OQ-2: the schema package ships from this repository, not from Open Degree's.

**InstructOS** — before any integration work:

- Nothing is required of it yet. When it integrates, it maps onto existing `ekgId`s and publishes
  mappings in the Resource shape of §3.6. Its own positioning rules are not an obstacle to
  conformance (EKG-SPEC-104), though the posture question remains open (`EKG-OQ-7`).

## Licence

The specification text and the code in this repository are **MIT** (see [`LICENSE`](LICENSE)),
matching the sibling reference implementation. Curriculum content in Open Degree is **CC BY-SA 4.0**;
evidence aggregates are **CC0 1.0**. See [`SPEC.md` §14](SPEC.md#14-licensing).

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md). Changes to the specification follow
[`GOVERNANCE.md`](GOVERNANCE.md). Changes to *content* go to Open Degree, not here.
