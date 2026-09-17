# eCollective Knowledge Graph Specification, v0.2 draft

> Status: **v0.2 draft**, landing change by change from the adopted v0.2 proposal
> ([`docs/decisions/0002-adopt-v0.2-commons-and-import-bundles.md`](docs/decisions/0002-adopt-v0.2-commons-and-import-bundles.md));
> package 0.2.0, unreleased. No package is published yet. This document is the contract three
> products build against; it is not yet frozen. Requirement identifiers (`EKG-SPEC-nn`) are
> stable once assigned — a withdrawn requirement is marked withdrawn, never renumbered, and a
> requirement amended in 0.2.0 says so in place.
>
> Filed 2026-09-05; v0.2 from 2026-09-17. Governance: [`GOVERNANCE.md`](GOVERNANCE.md). Why this repository exists:
> [`docs/decisions/0001-dedicated-framework-repo.md`](docs/decisions/0001-dedicated-framework-repo.md).

## 1. Purpose and scope

The **eCollective Knowledge Graph (EKG)** is one model of what is worth learning, shared by three
products in the eCollective family. It exists so that a concept has exactly one definition across
all of them, so a learner's proof of mastery survives a rename or a merge, and so anyone outside
the family — a school, an employer, another platform — can read the same graph on the same terms.

The three products and their distinct roles:

- **Open Degree** (`www.opendegree.org`) publishes the standard and the canonical curriculum and
  is the human-moderation layer. It never tracks learners, never remembers what anyone proved, and
  never chooses anyone's next node. It publishes the graph; others walk it.
- **DIY Degree** (`app.diydegree.org`) is the learning engine. It imports the graph, walks it with
  a learner, remembers what they proved, chooses the next node, and contributes back.
- **InstructOS** (`www.instructos.org`) lets creators package lessons and courses that map onto the
  same nodes. It consumes node identifiers and publishes mappings; it never authors canonical
  definitions.

**EKG-SPEC-01** This specification defines the shared model only: entities and fields, identifiers,
the lifecycle, alignments, resources and provenance, the published artifact, the contribution
protocol, evidence aggregates, validation rules, versioning, and licensing. Anything a single
product needs for itself is an **overlay** and is out of scope.

**EKG-SPEC-02** No product may extend, redefine, or narrow the meaning of a field defined here.
Extensions are additive and product-local. A change to a shared field is a proposal against this
specification, decided under `GOVERNANCE.md`.

**EKG-SPEC-03** No product may mint a second node for a concept another product has already
modeled. Discovery before creation — by `slug`, by `title`, and by `aliases` — is mandatory.

### 1.1 What is deliberately not here

- **Learner data of any kind.** No learner identity, mastery record, session, attempt, answer,
  streak, or profile is part of the EKG. Only k-anonymized aggregates (§10) cross the boundary,
  and they carry no learner identity.
- **Ranking, recommendation, and pedagogy.** How a product chooses the next node or ranks a
  resource is that product's business. The graph supplies the edges; it does not supply a policy.
- **Pricing, payouts, creator identity, and commerce.** These belong to the products.
- **Rendering.** The artifact is data. Presentation is a consumer concern.

### 1.2 Relationship to existing documents

This specification is the framework side of a contract whose application side is DIY Degree's
`docs/requirements.md` §5, §6.1 and FR-EKG-01…14, and whose canonical-content side is Open Degree's
`src/content.config.ts`, `src/lib/coherence.ts` and `/standard/*`. Where this document adopts an
Open Degree field, it adopts the field verbatim and says so. Where it adds a field, it says that
too, and §12.4 lists every change Open Degree must make to conform.

## 2. Terminology

The key words **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT** and **MAY** carry their ordinary
RFC 2119 meanings.

| Term | Meaning |
| --- | --- |
| **Node** | An entity in the graph. Every node has an `ekgId` and a `slug`. |
| **Outcome** | The unit of the curriculum: one concept, stated as a measurable first-person "I can…" statement. Nodes of the graph, in the narrow sense, are outcomes. |
| **Edge** | A typed, directed relationship between two nodes. The only authored edge is `prerequisite`; everything else is derived or is a containment relation. |
| **Domain** | A broad skill area grouping outcomes. Also the unit of artifact publication. |
| **Course** | An optional curated path through the graph. Never the unit of the curriculum. |
| **Assessment** | An evidence-producing task measuring named outcomes, with a scoring guide. |
| **Credential** | A bundle of outcomes and the assessments that prove them, issuable as Open Badges 3.0. |
| **Resource** | Something a learner uses to learn an outcome: a video, a reading, a tool, a dataset, a practice set. |
| **Alignment** | A pointer from a node into an external standard or framework, by framework name and code. |
| **Provenance** | The immutable record of who or what authored a thing and who reviewed it. |
| **Stub** | An outcome someone reached for but nobody has written yet. A request, not a commitment. |
| **Supersession** | The replacement of one node by another, recorded with `supersededBy` on the deprecated node. |
| **Artifact** | The versioned JSON publication of the graph (§8). |
| **Consumer** | Any system that reads the artifact. |
| **Contributor** | Any system or person that proposes a change to canonical content. |
| **Overlay** | A product-owned field on a shared entity, never present in the artifact and never overwritten by import. |
| **Canonical field** | A field defined by this specification and owned upstream. A consumer's importer overwrites it on every import. |
| **k-anonymity** | The property that an aggregate describes at least *k* distinct learners. Here *k* = 50 (§10). |

Two words are reserved and must never be reused with a different meaning: **`proposed`**, which is
a lifecycle value (§5), and **`adopted`**, likewise. A product needing a similar-but-different state
must pick a word this specification does not use — as DIY Degree did when it renamed its app-local
state to `submitted`.

## 3. Entities and fields

Eight shapes are defined for the graph. Six are **entities** — they have identity, a lifecycle, and
a place in the artifact: Domain, Outcome, Course, Assessment, Credential, Resource. Two are **value
objects** — Alignment and Provenance — which have no independent identity and always appear inside
an entity. From 0.2.0 the commons adds six **reference entities** (§3.9) — Framework, Standard,
Institution, Program, Offering, Platform — which are facts about the world the graph points at,
never curriculum, and which never appear in a graph domain file.

**Reading the tables.** Every field is adopted **verbatim** from Open Degree's
`src/content.config.ts` unless marked **+**, which means this specification adds it. `?` marks an
optional field, with its default in parentheses.

**EKG-SPEC-04** Every entity carries the **commons**, adopted verbatim from Open Degree's `commons`
object, plus the identity and provenance fields added here:

| Field | Type | Notes |
| --- | --- | --- |
| `ekgId` **+** | `ekg:<type>:<ULID>` | required; §4 |
| `slug` | kebab-case `string` | required; Open Degree's file-name id, now explicit |
| `previousSlugs` **+** | `string[]` ? (`[]`) | slug history; §4.2 |
| `type` | literal | required; the entity's own type |
| `title` | `string` | required |
| `status` | `stub` \| `draft` \| `proposed` \| `adopted` \| `deprecated` ? (`draft`) | §5 |
| `version` | semver `string` ? (`0.1.0`) | the entity's own version; §12.3 |
| `license` | `string` ? (`CC BY-SA 4.0`) | §14 |
| `contributors` | `string[]` ? (`[]`) | handles and bot identities |
| `tags` | `string[]` ? (`[]`) | |
| `provenance` **+** | Provenance | required in the artifact, optional in source; §7.3 |
| `supersededBy` | ref → same type ? | §5.4 |

**EKG-SPEC-05** `supersededBy` MUST be absent unless `status` is `deprecated`. Open Degree enforces
this on outcomes today; this specification generalizes it to every entity.

**EKG-SPEC-06** A reference MUST resolve, in source, to an existing entity of the expected type, and
MUST be expressed in the artifact as an `ekgId`. Source formats MAY be a bare slug
(`define-geometric-terms`) or an Obsidian wikilink (`"[[define-geometric-terms|Definitions]]"`); the
brackets and any `|alias` are stripped before resolution, exactly as Open Degree does today.

### 3.1 Domain

A broad skill area, and the unit of artifact publication.

`type: "domain"`, `title`, `description` (all required); `icon` ? (a single emoji in practice);
`order` ? (`100`), display order; plus the commons.

### 3.2 Outcome

The node of the graph. One concept, one node.

| Field | Type | Notes |
| --- | --- | --- |
| `type` | `"outcome"` | required |
| `title` | `string` | required |
| `statement` | `string` | required. The measurable first-person "I can…" statement; the concept's one definition |
| `description` | `string` ? | |
| `domain` | ref → Domain | required |
| `level` | `foundation` \| `intermediate` \| `advanced` ? (`foundation`) | |
| `prerequisites` | ref[] → Outcome ? (`[]`) | **immediate prerequisites only**; "what comes after" is derived |
| `evidence` | `string[]` ? (`[]`) | what would convince a stranger the outcome is met |
| `alignments` | Alignment[] ? (`[]`) | §6 |
| `aliases` | `string[]` ? (`[]`) | other names for the concept, so a search from any of them lands here |
| `resources` | Resource[] ? (`[]`) | §3.6, §7 |
| `volatility` **+** | `stable` \| `evolving` \| `frontier` ? | how settled the claim is, never how hard; EKG-SPEC-147 |
| `evidenceClass` **+** | `peer_reviewed` \| `preprint` \| `vendor_docs` \| `single_source` \| `mixed` ? | what the claim rests on |
| `supersededBy` | ref → Outcome ? | |

**EKG-SPEC-07** `prerequisites` MUST contain immediate prerequisites only. A conformant consumer
derives "what comes after" (`leadsTo`) and the transitive dependent set (`unlocks`) from other
outcomes' `prerequisites`. There is deliberately no authored "leads to" field, and no publisher may
introduce one.

**EKG-SPEC-08** An outcome's `statement` is the concept's single definition. Two outcomes MUST NOT
state the same concept; the remedy for a duplicate is a merge (§5.4), not a second node.

**EKG-SPEC-147** `volatility` describes how settled an outcome's claim is (`stable`, `evolving`,
`frontier`), never how hard it is; `level` is unchanged, and a `frontier` value on `level` is
rejected (V-01). `evidenceClass` says what the claim rests on. Both are optional; absent means
nobody has said.

**EKG-SPEC-148** A consumer that presents a `frontier` or `evolving` outcome MUST label it as such
beside the EKG-SPEC-30 label, and SHOULD re-verify a learner's mastery when the outcome's `version`
changes: a minor bump invites re-verification, a major bump lapses it (the policy is the
product's).

**EKG-SPEC-149** An overturned claim is a `statement` revision with a major `version` bump
(EKG-SPEC-83), or a deprecation with the reason in the commit. It is never a `supersededBy`, which
means a merge or a retirement (EKG-SPEC-05/31).

### 3.3 Course

An optional curated path through the graph, and from 0.2.0 a **path definition**: a state
curriculum, an exam outline, a program template or a curated path, each a public fact that every
product reads the same way.

| Field | Type | Notes |
| --- | --- | --- |
| `type` | `"course"` | required |
| `title` | `string` | required |
| `description` | `string` | required |
| `domain` | ref → Domain | required; the primary domain |
| `outcomes` | ref[] → Outcome | required, minimum 1; the flat, complete list |
| `assessments` | ref[] → Assessment ? (`[]`) | |
| `estimatedHours` | positive `number` ? | |
| `formats` | `string[]` ? (`[]`) | |
| `resources` | Resource[] ? (`[]`) | §3.6 |
| `kind` **+** | `curated_path` \| `curriculum` \| `exam_outline` \| `program_template` ? (`curated_path`) | what the path mirrors; EKG-SPEC-137 |
| `segments` **+** | Segment[] ? (`[]`) | ordered parts of `outcomes`, each `{ title, kind: core \| elective \| beyond, outcomes[] }`; EKG-SPEC-135 |
| `alignments` **+** | Alignment[] ? (`[]`) | the framework the path mirrors, never an outcome's alignment; §6 |
| `sources` **+** | Source[] ? (`[]`) | `{ title, url, license?, retrievedAt }`: what the definition was drawn from |
| `crossDomain` **+** | `boolean` ? | artifact only; EKG-SPEC-136 |

Plus the commons.

**EKG-SPEC-09** A course MUST map to at least one outcome and MUST NOT be treated by any consumer as
the unit of the curriculum. A consumer MAY ignore courses entirely and still be conformant.

**EKG-SPEC-135** `outcomes` is the flat, complete list of a course's outcomes. `segments` partition
it into ordered, titled parts: every outcome listed in a segment MUST appear in `outcomes` (V-29);
the union of the segments MAY be smaller than `outcomes`. A segment's `kind` is `core`, `elective`,
or `beyond` for a part that chains past the mirrored definition into advanced or frontier work.

**EKG-SPEC-136** A course whose outcomes span domains keeps its primary `domain` and is emitted in
every domain file its outcomes touch, marked `crossDomain: true`, exactly as an assessment or a
credential is (EKG-SPEC-45/46). Consumers MUST deduplicate by `ekgId`.

**EKG-SPEC-137** `kind` says what the path mirrors: a `curriculum` (a published syllabus, such as a
state's Regents course), an `exam_outline` (AP, CLEP, DSST), a `program_template` (what programs
classified under a CIP code typically require, derived from the catalog and adopted by a
maintainer), or a `curated_path` (anything authored). A course's `alignments` name the framework
it mirrors (`ap`, `clep`, `cip-2020`, a state framework), under the registry rules of §6
(EKG-SPEC-33, V-22); they are never an outcome's alignment.

**EKG-SPEC-138** The commons service MAY publish, beside the artifact, per-pair overlap tables for
path definitions (the outcomes two definitions share, and those only in each) so that a consumer
renders a comparison without recomputing it. The format is the service's own.

**EKG-SPEC-139** A `program_template` MUST state the sample it was derived from (the number of
programs, the CIP code, the retrieval window) in `sources`. A consumer that presents one MUST
render it as "assembled to mirror the outcomes typically covered by programs classified under …"
and MUST NOT claim equivalence, credit or a degree.

Example: Open Degree's Geometry course, `congruence-through-rigid-motions`, with its Plan steps as
segments. The course and its outcomes are real; the segmentation is illustrative.

```yaml
kind: curated_path
segments:
  - title: Definitions
    outcomes: ["[[define-geometric-terms]]"]
  - title: Transformations and rigid motions
    outcomes: ["[[represent-transformations]]", "[[describe-rigid-motions]]"]
  - title: Congruence
    outcomes: ["[[prove-congruence-with-rigid-motions]]"]
```

### 3.4 Assessment

`type: "assessment"`, `title`, `description`, `kind` (`project` | `performance-task` | `exam` |
`portfolio` | `observation` | `interview`), and `outcomes` (ref[] → Outcome, minimum 1) are
required. Optional: `evidenceRequirements` (`string[]`, `[]`), `rubricUrl` (URL), and **+**
`domain` (ref → Domain), derived when absent per EKG-SPEC-45. Plus the commons.

The scoring guide lives in the entity body, not in frontmatter, and travels in the artifact as
`body` (§8.4).

### 3.5 Credential

`type: "credential"`, `title`, `description`, and `outcomes` (ref[] → Outcome, minimum 1) are
required. Optional: `assessments` (ref[] → Assessment, `[]`), `format` (`string`, default
`Open Badges 3.0 (W3C Verifiable Credential)`), `issuerRequirements` (`string[]`, `[]`), and **+**
`domain` as above. Plus the commons.

**EKG-SPEC-10** A credential MUST NOT bundle an outcome whose `status` is `stub`. An issuer MUST
record the `ekgId` **and** `version` of every outcome and assessment it issued against, so a later
change never silently alters what an earlier badge means.

### 3.6 Resource

Open Degree's five fields, adopted verbatim, plus the metadata DIY Degree needs to rank, fit, and
lawfully surface a resource. Every added field is **optional in the shared schema** so existing Open
Degree content stays valid; §7.2 states which fields a consumer must have before it will serve a
resource to a learner.

| Field | Type | Notes |
| --- | --- | --- |
| `title` | `string` | required |
| `url` | URL | required |
| `kind` | `video` \| `reading` \| `interactive` \| `book` \| `dataset` \| `tool` \| `practice` \| `reference` | required |
| `cost` | `free` \| `freemium` \| `paid` ? (`free`) | |
| `provider` | `string` ? | |
| `ekgId` **+** | `ekg:resource:<ULID>` ? | required in the artifact; §4.4 |
| `modality` **+** | `watch` \| `read` \| `listen` \| `do` ? | multimodal fit |
| `durationSeconds` **+** | positive `integer` ? | session fit |
| `difficulty` **+** | `integer` 1–5 ? | distinct from an outcome's `level` |
| `language` **+** | BCP 47 `string` ? (`en`) | |
| `hasCaptions` **+** | `boolean` ? | accessibility |
| `license` **+** | `string` ? | the resource's own licence, not the node's |
| `attributionText` **+** | `string` ? | rendered wherever the resource is shown |
| `sourceUrl` **+** | URL ? | the canonical page when `url` is an embed or deep link |
| `embedPolicy` **+** | `embed-allowed` \| `link-only` \| `official-player-only` \| `unknown` ? (`unknown`) | §7.2 |
| `coverage` **+** | `string[]` ? (`[]`) | the outcome `evidence` statements this resource teaches |
| `lastVerifiedAt` **+** | ISO 8601 `string` ? | link-check timestamp |
| `audience` **+** | Audience ? | §7.4; absent means `unrated` (EKG-SPEC-110) |
| `subKind` **+** | `course` \| `lesson_plan` \| `syllabus` \| `worksheet` \| `paper` \| `preprint` \| `docs` \| `changelog` \| `podcast` \| `talk` \| `repo` ? | refines `kind`, never contradicts it; EKG-SPEC-150 |
| `publishedAt` **+** | ISO 8601 date or datetime ? | when the material was published |
| `externalIds` **+** | `{ <scheme>: id }` ? | `doi`, `arxiv`, `openalex`, `isbn`, `youtube`, `vimeo`; EKG-SPEC-153 |
| `evidenceSignals` **+** | `{ citationCount?, citationSource?, venue?, peerReviewed?, retracted?, retractedAt? }` ? | EKG-SPEC-151/152 |
| `transcript` **+** | `{ available, source?, retrievableUnderTerms? }` ? | EKG-SPEC-154 |
| `platformId` **+** | `ekg:platform:<ULID>` ? | the commons platform it comes from; EKG-SPEC-155 |
| `provenance` **+** | Provenance ? | required in the artifact; §7.3 |

**EKG-SPEC-11** `embedPolicy` describes what a consumer is permitted to do, not what is technically
possible. `official-player-only` means the resource may be presented only through the provider's own
embedded player, with no downloading, caching of media, audio extraction, ad-suppression, or
overlay. `link-only` means it must be opened out.

**EKG-SPEC-12** `coverage` entries MUST be exact strings from the `evidence` array of an outcome the
resource is attached to. Free text matching no evidence statement is a validation error (§11).

**EKG-SPEC-150** `subKind` refines `kind` and MUST NOT contradict it (V-01): `paper`, `preprint`,
`docs`, `changelog`, `syllabus`, `lesson_plan` and `worksheet` sit under `reading`; `talk` under
`video`; `repo` under `tool`; `course` under `interactive` or `reading` as the material dictates;
`podcast` under `reading` until an `audio` kind exists (EKG-OQ-10). The `kind` enum itself is
unchanged, because a 0.1 validator rejects an unknown enum value (EKG-SPEC-78).

**EKG-SPEC-151** A resource whose `evidenceSignals.retracted` is true MUST NOT be served as a
primary by any consumer, and a publisher SHOULD move it to `deprecated` on its next build.

**EKG-SPEC-152** Citation counts are advisory ranking input, never a serving gate: new work has
none.

**EKG-SPEC-153** `externalIds` maps a scheme to the resource's identifier in it. The registered
schemes are `doi`, `arxiv`, `openalex`, `isbn`, `youtube` (the video id) and `vimeo`; a scheme is
added by specification change, and a consumer MUST ignore a scheme it does not know. It is stated
once by the curator or harvester that knew it, so no consumer re-derives a provider's id from the
`url`.

**EKG-SPEC-154** `transcript` records whether a caption or transcript text exists for the resource
and whether it may be retrieved under the provider's terms, so that judgement travels with the
resource. When present, a consumer MUST NOT retrieve the text if `retrievableUnderTerms` is false;
when absent, the consumer makes its own judgement under the provider's terms, as today.

**EKG-SPEC-155** `platformId` references the commons `platform` entity (§3.9) the resource comes
from. The platform's own `embedPolicy` and `ageRequirement` are facts about the platform; they
never override the resource's own `embedPolicy` or `audience`.

### 3.7 Alignment (value object)

`framework` (`string`, the framework's full published name) and `code` (`string`, exactly as the
framework writes it) are required; `url` is optional. Added here: **+** `frameworkId` (a stable
short key, §6.2) and **+** `relation` (`exact` | `broader` | `narrower` | `related`, default
`exact`, §6.3).

### 3.8 Provenance (value object)

| Field | Type | Notes |
| --- | --- | --- |
| `source` | `opendegree` \| `diydegree` \| `instructos` \| `ai` \| `curator` \| `learner_request` \| `import` | required |
| `generatedAt` | ISO 8601 `string` | required |
| `modelId`, `promptVersion` | `string` ? | required when `source` is `ai` |
| `reviewedBy` | `string` ? | a handle or bot name, never an email |
| `reviewedAt` | ISO 8601 `string` ? | required when `reviewedBy` is present |
| `sourceRepo`, `sourceCommit` | `string` ? | e.g. `ecollective-org/www.opendegree.org` and the commit |

**EKG-SPEC-13** Provenance is immutable. A correction is a **new** provenance record, never an edit
of an existing one. The artifact carries the most recent record; the repository's git history is
the full record.

**EKG-SPEC-14** Provenance MUST NOT contain personal data. `reviewedBy` is a handle or a bot
identity: no email addresses, no legal names unless the person publishes under one, and no learner
identifier of any kind.

### 3.9 Reference entities (the commons)

The Open Degree commons (`app.opendegree.org`) holds what is too large, too fast-changing or too
crowd-shaped for the Markdown standard: the standards every jurisdiction publishes, the catalog of
what institutions teach, and the platforms resources come from. These are **reference entities**:
facts about the world that the graph points at (an alignment names a standard, an offering maps
onto outcomes, a resource comes from a platform), never curriculum. Six types, each with its own
`ekgId` type (§4.1): `framework`, `standard`, `institution`, `program`, `offering`, `platform`.

**EKG-SPEC-115** Reference entities are published by the commons service under its own prefix,
`https://app.opendegree.org/api/commons/v1/`, with the integrity, cache and retention rules of
§8.5 and §8.6. They MUST NOT appear in a `/api/graph/v1` domain file, in `changelog.json` or in
`feed.json`, and a graph entity field references a reference entity only where this specification
says so. A consumer of the graph artifact MAY ignore them entirely and remain conformant.

Every reference entity carries the reference commons:

| Field | Type | Notes |
| --- | --- | --- |
| `ekgId` | `ekg:<type>:<ULID>` | required; §4.1 |
| `slug` | kebab-case `string` | required; for a framework, its registry `frameworkId` |
| `previousSlugs` | `string[]` ? (`[]`) | §4.2 |
| `type` | literal | required |
| `version` | semver `string` ? (`0.1.0`) | |
| `license` | `string` | required and explicit; EKG-SPEC-119 |
| `provenance` | Provenance | required; §3.8 |
| `retrievedAt` | ISO 8601 `string` | required; when the record was taken from its source |
| `supersededBy` | ref → same type ? | marks a merged or retired record; there is no lifecycle `status` |

**EKG-SPEC-116** Every reference entity carries `provenance`, `retrievedAt` and an explicit
`license`. It MUST NOT contain personal data: an institution is an organisation, an offering is a
catalog entry, and no instructor's name is stored unless that person is the published author of a
licensed syllabus, in which case the syllabus's own licence and URL are recorded with it.

**Framework** (`type: "framework"`): a registry row of §6.2 as reference data, with its tree.
`name`, `authority` and `kind` (`standards` \| `program_classification` \| `exam_outline` \|
`credit_recommendation` \| `credential_format`) are required; `jurisdiction` (`US-NY`, `US`,
`international`), `subject` and `url` are optional. Its `slug` is its registry id.

**Standard** (`type: "standard"`): one node of a framework's own tree, exactly as the publisher
structures it, never paraphrased. `frameworkId`, `code`, `statement` and `kind` (`level` \|
`domain` \| `cluster` \| `objective`) are required; `level`, `parentCode` and `url` are optional.

**EKG-SPEC-117** A standard is an alignment target. It MUST NOT be imported as an Outcome, and its
`statement` MUST NOT be restated as one (EKG-SPEC-34, restated for the reference family; V-25 for
bundles). The reverse index from a standard to the outcomes aligned to it is derived by the
commons from outcome alignments and is never authored.

**Institution** (`type: "institution"`): `name` is required; `ipedsUnitId`, `sector`, `region`,
`url`, `accreditor` and `tuition` (`{ inState?, outOfState?, year? }`) are optional.

**Program** (`type: "program"`): `institution` (ref → Institution), `title` and `degreeLevel`
(`certificate` \| `associate` \| `bachelor` \| `master` \| `doctoral` \| `other`) are required;
`cipCode`, `credits`, `url` and `requiredOfferings` (ref[] → Offering, `[]`) are optional.

**Offering** (`type: "offering"`): `institution`, `code` and `title` are required; `description`,
`credits`, `level`, `prerequisites` (`string[]`, as the catalog writes them), `syllabusUrl`,
`syllabusLicense`, `deliveryModes[]`, `termsOffered[]`, `costEstimate` and `url` are optional;
`outcomeMappings[]` (`[]`) lists the offering's claimed coverage of graph outcomes, each
`{ outcome: ref → Outcome, coverage 0–1, confidence 0–1, provenance }`.

**Platform** (`type: "platform"`): `name`, `url` and `kind` are required; `pricing`,
`accessibility`, `ageRequirement` (integer), `harvestAllowed` (`boolean`, `false`), `embedPolicy`
(§3.6's enum, `unknown`) and `safetyNotes` are optional.

**EKG-SPEC-118** An equivalence between two offerings, or between an offering and a Course, is a
record of the commons service, not an entity of this specification. It is derived from outcome
overlap above a threshold the service publishes, or imported from a public articulation agreement,
and each record states its basis.

**EKG-SPEC-119** The commons MAY publish reference entities under terms other than CC BY-SA 4.0,
because catalog data has its own sources; that is why `license` is required and explicit on every
record. Graph content stays CC BY-SA 4.0 (EKG-SPEC-105).

Validation: the identity, slug and supersession rules of §11 (V-09 to V-16) apply to reference
entities exactly as to graph entities, and V-02 applies to their references (`institution`,
`requiredOfferings`, `outcomeMappings[].outcome`). The package's `validateGraph` accepts them in
source mode, beside graph entities or alone, for that purpose.

## 4. Identifiers

Two identifiers per entity, with different jobs. The `slug` is for humans and URLs and changes; the
`ekgId` is for machines and foreign keys and never changes.

### 4.1 `ekgId`

**EKG-SPEC-15** Every entity has an `ekgId` of the form `ekg:<type>:<ULID>`, where `<type>` is one
of the six graph types `domain`, `outcome`, `course`, `assessment`, `credential`, `resource`, or
one of the six reference types `framework`, `standard`, `institution`, `program`, `offering`,
`platform` (§3.9), and `<ULID>` is a Crockford base-32 ULID: 26 characters, alphabet
`0123456789ABCDEFGHJKMNPQRSTVWXYZ`, uppercase. *Amended in 0.2.0: the reference types were added;
a graph entity never carries a reference-type id (EKG-SPEC-115).*

```
ekg:outcome:01JBWX3QK7Z8Y4N2M5R6T7V8W9
```

**EKG-SPEC-16** An `ekgId` is minted exactly once, at node creation, by whichever product creates
the node. It is never reused, never recycled after deletion, and never changed by a rename, a
merge, a re-domaining, a status change, or a licence change.

**EKG-SPEC-17** An `ekgId` MUST be globally unique across all types and all products. The `<type>`
segment is a readability affordance and a validation aid; uniqueness does not depend on it.

**EKG-SPEC-18** The `<type>` segment MUST match the entity's `type` field. A merge across types is
not a merge — it is a deprecation of one node and the creation of another.

ULID is chosen over UUIDv4 because it sorts lexicographically by creation time, which makes a
diff of the artifact readable and makes "everything minted since build X" a string comparison. It
is chosen over a content hash because content changes and identity must not.

### 4.2 `slug`

**EKG-SPEC-19** Every entity has a `slug`: kebab-case, lowercase, `[a-z0-9]+(-[a-z0-9]+)*`, unique
**within its type**. In the Open Degree repository the slug is the file name without `.md`, which
is how references are written in source today; this specification makes the slug an explicit field
so it survives into the artifact and into every consumer.

**EKG-SPEC-20** When a slug changes, the old value MUST be prepended to `previousSlugs[]`. A slug
that has ever been used by an entity MUST NOT later be used by a different entity of the same type.
Publishers MUST serve a redirect from every entry in `previousSlugs[]` to the current slug.

**EKG-SPEC-21** No consumer may use a `slug` as a foreign key, a primary key, or the key of any
stored record about a learner. Slug-to-`ekgId` resolution happens once, at import; everything
downstream stores `ekgId`.

### 4.3 Merges and supersession

A merge is routine here, not an edge case: "one concept, one node" means duplicates are found and
resolved continually. A merge never deletes anything.

**EKG-SPEC-22** A merge sets, on the losing node: `status: deprecated` and `supersededBy` pointing
at the survivor. The losing node's `title` SHOULD become an `alias` on the survivor, and inbound
`prerequisites` SHOULD be re-pointed at the survivor. The losing file stays, so every link and every
credential that pointed at it still resolves.

**EKG-SPEC-23** Consumers MUST follow `supersededBy` transitively on every read, to a maximum depth
of **8**. A chain longer than 8, or a cycle, is a validation error (§11) and MUST be reported, not
silently truncated.

### 4.4 Resource identity

Open Degree's resources are inline objects on an outcome or a course today, with no identifier.
They need identity anyway: two outcomes routinely point at the same Khan Academy page, and
effectiveness evidence (§10) is per resource, not per resource-mention.

**EKG-SPEC-24** A resource's identity is its `ekgId`, minted once in the content repository
before the build (in Open Degree, a backfill committed by a person or a bot: `npm run
backfill:ekg`) and never by the build. A build MUST refuse a resource without an `ekgId` rather
than mint one, so that the identifier is stable from the resource's first build onward. *Amended
in 0.2.0, resolving EKG-OQ-3: the 0.1 text had the builder mint and write back in the same
commit; a build that mints is a build that can mint twice, and the conformant pattern is the one
Open Degree adopted and the package's `buildArtifact` enforces.*

**EKG-SPEC-25** Two resource mentions with the same normalized `url` — scheme and host lowercased,
default port removed, tracking query parameters (`utm_*`, `gclid`, `fbclid`, `ref`) removed,
trailing slash removed, fragment removed — are the same resource and MUST share one `ekgId`.

## 5. Lifecycle and moderation

### 5.1 The shared states

**EKG-SPEC-26** The shared lifecycle is exactly Open Degree's, with exactly these five values and no
others:

| `status` | Meaning |
| --- | --- |
| `stub` | Someone reached for this concept; nobody has written it. A request, not a commitment. |
| `draft` | Written, not yet reviewed for adoption. The default for new content. |
| `proposed` | In review upstream, moving toward adoption. |
| `adopted` | The shared definition. Only `adopted` entities should back an issued credential. |
| `deprecated` | Retired or merged. Reads follow `supersededBy`. |

The default is `draft`. A stub has to say so.

### 5.2 Transitions and who may make them

| From → To | Who | Trigger |
| --- | --- | --- |
| — → `stub` | any contributor, any product's bot | a reference to a concept nobody has written |
| `stub` → `draft` | any contributor | the entity is written and passes validation |
| — → `draft` | any contributor, any product's bot | a new entity is authored |
| `draft` → `proposed` | an Open Degree maintainer | the entity is put up for adoption |
| `proposed` → `adopted` | an Open Degree maintainer | adoption review passes |
| `proposed` → `draft` | an Open Degree maintainer | adoption review sends it back, with a reason |
| `adopted` → `deprecated` | an Open Degree maintainer | retirement or merge, always with `supersededBy` on a merge |
| any → `deprecated` | an Open Degree maintainer | retirement, with a reason in the commit |

**EKG-SPEC-27** Only Open Degree maintainers may move an entity to `proposed`, `adopted`, or
`deprecated`. Any contributor, including another product's bot, may create `stub` and `draft`
content by pull request. This is the whole of the moderation model: Open Degree's existing pull
request review **is** the human gate, and its build validation is the automated gate. No second
moderation system is specified, and consumers MUST NOT present their own review as adoption.

**EKG-SPEC-28** A status change is a content change: it happens in the source repository, in a
commit, and appears in the next artifact build. Nothing outside the source repository may assert a
shared `status`.

### 5.3 Product overlay states

Products need states the shared model does not have — "I have opened a pull request", "usable here
but not yet reviewed upstream". Those are **overlay** states.

**EKG-SPEC-29** Overlay states are product-local. They MUST NOT appear in the artifact, MUST NOT be
contributed upstream, and MUST NOT reuse any of the five shared tokens for a different meaning.

DIY Degree's overlay (`graphState`) maps as follows. `submitted` and `provisional` are explicitly
**not** part of the shared model:

| DIY Degree `graphState` | Shared `status` | Notes |
| --- | --- | --- |
| `submitted` | *(none — pre-merge)* | The bot's pull request is open. Nothing upstream has a status yet. The pull request itself requests `status: stub` or `draft`. |
| `provisional` | `stub` or `draft` | Usable in the app now, always labelled as not yet reviewed upstream. Purely an app judgement about learner-readiness; it asserts nothing about the shared graph. |
| `canonical` | `adopted` | The shared definition. |
| `deprecated` | `deprecated` | Reads redirect via `supersededBy`. |
| `rejected` | *(none — app-local)* | The upstream pull request was closed. Recorded so the node is not re-proposed. |
| *(no overlay equivalent)* | `proposed` | Open Degree's own in-review state. A consumer MUST NOT assume anything it submitted passes through `proposed` specifically. |

InstructOS's authoring states, whatever they are, are overlay states under the same rule.

**EKG-SPEC-30** A consumer that presents non-`adopted` content to a learner MUST label it as not
yet adopted, in every surface that renders it, including public pages.

### 5.4 Supersession in the shared model

**EKG-SPEC-31** `supersededBy` is valid on every entity type, not only outcomes, and always points
at an entity of the same type. It MUST be accompanied by `status: deprecated` (EKG-SPEC-05).

## 6. Alignments to external standards

An alignment says "this outcome corresponds to that code in that published framework". It is how a
learner's progress becomes legible to a school, a state, or an employer.

**EKG-SPEC-32** An outcome MAY carry any number of alignments. Each names a `framework` by its full
published name, a `code` exactly as the framework writes it, and SHOULD carry a `url` to the
framework's own publication.

**EKG-SPEC-33** `framework` strings MUST be consistent across the graph. The framework registry in
§6.2 is normative for every framework listed there; a new framework is added to the registry by the
same process as any other change to this specification.

### 6.1 Worked example: the NYS mathematics standards

The New York State Next Generation Mathematics Learning Standards are the first framework aligned,
and the worked example for every other. Open Degree's Geometry seed already aligns to it:

```yaml
alignments:
  - framework: NYS Next Generation Mathematics Learning Standards
    code: GEO-G.CO.1
    url: https://www.nysed.gov/standards-instruction/mathematics
```

DIY Degree holds the framework's own tree — 26 files under
`src/content/standards/nys-next-generation-mathematics-learning-standards/{levels,domains,clusters,outcomes}/`
— with each standard's `code`, `description`, and its cluster, domain and level parents. That tree
is **not** part of the EKG. It is a framework mirror, useful for two things: proposing candidate
alignments for human review, and seeding candidate prerequisite edges from the framework's own
predecessor relations.

**EKG-SPEC-34** A framework mirror MUST NOT be imported as EKG outcomes. An external standard is
aligned to, never absorbed. The reason is directional: a state standard describes coverage
requirements; an EKG outcome states what a learner can do. They are not the same claim, and merging
them would make the graph a copy of one jurisdiction's curriculum.

**EKG-SPEC-35** A candidate alignment derived automatically from a framework mirror MUST carry
`provenance.source: ai` and MUST be reviewed by a human before the entity reaches `proposed`.

### 6.2 Framework registry

| `frameworkId` | `framework` | Authority | `kind` | Jurisdiction | Subject |
| --- | --- | --- | --- | --- | --- |
| `nys-nextgen-math` | NYS Next Generation Mathematics Learning Standards | New York State Education Department | `standards` | `US-NY` | mathematics |
| `ccss-math` | Common Core State Standards for Mathematics | CCSSO / NGA | `standards` | `US` | mathematics |
| `ngss` | Next Generation Science Standards | Achieve, Inc. | `standards` | `US` | science |
| `ob3` | Open Badges 3.0 | 1EdTech | `credential_format` | international | all |
| `cip-2020` | Classification of Instructional Programs, 2020 | National Center for Education Statistics | `program_classification` | `US` | all |
| `ap` | Advanced Placement Course and Exam Descriptions | College Board | `exam_outline` | `US` | all |
| `clep` | College-Level Examination Program | College Board | `exam_outline` | `US` | all |
| `dsst` | DSST Exams | Prometric | `exam_outline` | `US` | all |
| `ace-credit` | ACE CREDIT Recommendations | American Council on Education | `credit_recommendation` | `US` | all |

`frameworkId` is optional in content and is added by the artifact builder when the `framework`
string matches a registry row exactly. A row's `kind` says what the framework is (`standards`,
`program_classification`, `exam_outline`, `credit_recommendation`, `credential_format`); the
package's registry also carries each row's `url`. *The last five rows and the `kind`, jurisdiction
and subject columns were added in 0.2.0.*

**EKG-SPEC-140** A state framework's `frameworkId` follows `<iso-region>-<subject>-<year>`,
lowercased, with the ISO 3166-2 region code: `us-ny-science-2016`. `nys-nextgen-math` predates the
convention and is kept. The commons service MAY hold a framework as reference data (§3.9) before
it is registered here, but an alignment to an unregistered framework stays a warning (V-22) until
the row is added by the same process as any other change to this specification.

**EKG-SPEC-141** A `program_classification` framework MAY be aligned from a Course (EKG-SPEC-137)
and from a reference `program` (§3.9), and MUST NOT be aligned from an Outcome: a program code says
nothing about one "I can" statement (V-30).

**EKG-SPEC-142** An Outcome's alignment to an `exam_outline` framework MUST carry `relation`
`narrower` or `related`, because an outline item is a topic, not one statement (V-30). A
machine-derived one carries `provenance.source: ai` and is reviewed by a human before the entity
reaches `proposed` (EKG-SPEC-35).

### 6.3 Relation

`relation` records how tight the correspondence is: `exact` (the default) when the outcome and the
external code make the same claim; `broader` when the outcome covers more; `narrower` when it
covers part; `related` when they overlap without either containing the other. Nothing in this
specification derives behaviour from `relation` — it exists so a human reader of the alignment is
not misled, and so a later version can act on it without a schema break.

## 7. Resources and provenance

### 7.1 What a resource is and is not

**EKG-SPEC-36** A resource is a **pointer**. The EKG carries metadata about material; it never
carries the material. No consumer may re-host, mirror, cache media from, or redistribute a resource.
A book resource points at a section, never at a file.

**EKG-SPEC-37** Free and open resources come first. A paid resource MUST carry `cost: paid` and
MUST be labelled as paid wherever it is shown. Whether a paid resource may be a consumer's default
choice is the consumer's policy; this specification only requires the label and the honest `cost`.

### 7.2 Required metadata before serving

The shared schema keeps the added resource fields optional so that existing Open Degree content
remains valid. Serving a resource to a learner is a higher bar:

**EKG-SPEC-38** A consumer MUST NOT serve a resource to a learner unless it has `title`, `url`,
`kind`, `cost`, `provider`, `license`, `attributionText`, and an `embedPolicy` other than `unknown`.
A resource missing `license` or with `embedPolicy: unknown` MUST NOT be surfaced.

**EKG-SPEC-39** A consumer MUST render attribution wherever a resource or a node definition is
shown: the provider name, the licence, and a link to the source. For Open Degree-derived text this
means naming Open Degree and CC BY-SA 4.0 with a link, which is a licence obligation, not a
courtesy.

**EKG-SPEC-40** A consumer SHOULD verify resource URLs on a recurring schedule and SHOULD write the
result to `lastVerifiedAt` when it contributes the resource back. A resource failing verification
twice consecutively SHOULD be withheld from learners and flagged for review upstream.

### 7.3 Provenance obligations

**EKG-SPEC-41** Every entity and every resource in the artifact carries a `provenance` object.
Content authored directly in Open Degree carries `source: opendegree` with `sourceRepo` and
`sourceCommit`. Content originating from another product carries that product's `source` value and,
where AI generated it, `modelId` and `promptVersion`.

**EKG-SPEC-42** Provenance travels with the content. A consumer's import MUST preserve it verbatim
and MUST expose it — at minimum `source`, `reviewedBy` where present, and the upstream `buildId` the
content was imported from — in its own API and in its user interface.

### 7.4 Audience ratings

A parent decides what a child may see, and three products and every reader of the commons must
read the same rating. The `audience` block on a resource is that rating: a band, the descriptors
that explain it, and the basis it rests on. The scale is plain words rather than a rating board's
letters, which are trademarks, and a single letter could not carry "strong language is fine,
commercial pressure is not". Ratings are produced in the Open Degree commons, by an automated pass
and by human review, and travel in the artifact so no consumer rates on its own.

| Field | Type | Notes |
| --- | --- | --- |
| `rating` | `all` \| `teen` \| `older_teen` \| `adult` \| `unrated` ? (`unrated`) | `teen` is 13 and over, `older_teen` 16 and over, `adult` 18 and over |
| `descriptors` | Descriptor[] ? (`[]`) | why the rating is what it is; the fixed list below |
| `basis.automated` | `{ modelId, promptVersion, at, signals[] }` ? | the automated pass: model, prompt, when, and what it read (`captions`, `title`, `provider_flag`, `text`) |
| `basis.human` | `{ count, lastAt }` ? | human reviews: how many, and when the last was |
| `confidence` | `number` 0–1 ? | the rater's confidence |
| `disputes` | non-negative `integer` ? (`0`) | reports open against the rating |
| `version` | positive `integer` ? (`1`) | bumped on every re-rating |

The descriptors, exactly: `strong_language`, `violence`, `sexual_content`, `substance_use`,
`mature_themes`, `frightening_content`, `discriminatory_content`, `self_harm_references`,
`gambling`, `commercial_pressure`, `unmoderated_comments`, `external_links_or_chat`,
`account_required`, `data_collection`, `perspective_content` (a religious or political viewpoint
presented as such).

**EKG-SPEC-110** `audience` is optional in source and in the artifact. A resource with no block is
`unrated`; a consumer MUST treat an absent block and `rating: unrated` identically.

**EKG-SPEC-111** A consumer that serves resources to a person under 18 MUST enforce a ceiling by
age band (`teen` at 13 to 15, `older_teen` at 16 and 17) as a hard filter applied before ranking,
never as a ranking weight, and MUST NOT serve an `unrated` resource as a minor's primary
recommendation. An `unrated` resource MAY be offered to a minor as an alternative, labelled as
unrated.

**EKG-SPEC-112** A report from a consumer MAY lower that consumer's own effective rating for the
resource immediately. Only a human review in the commons raises an effective rating. A consumer
MUST NOT publish, contribute, or serve a rating looser than the one the artifact carries; it MAY
hold a stricter one. `disputes` counts the reports open against the rating.

**EKG-SPEC-113** `basis` is provenance in the sense of EKG-SPEC-13: a re-rating appends a new
basis and bumps `version`; it never edits history. The `rating` and `descriptors` vocabularies are
fixed by this specification and change only by a specification change; no product or service MAY
add a value. Rating names are plain words and MUST NOT be the marks of any film, game, or
television rating board.

Example: the Khan Academy resource of Appendix B with a rating. The resource is real; the rating
values are illustrative.

```json
{
  "ekgId": "ekg:resource:01JBXKHANACADEMY0000000000",
  "title": "Khan Academy, High School Geometry",
  "url": "https://www.khanacademy.org/math/geometry",
  "kind": "video", "cost": "free", "provider": "Khan Academy",
  "audience": {
    "rating": "all",
    "descriptors": [],
    "basis": {
      "automated": { "modelId": "claude-sonnet-5", "promptVersion": "audience-v1",
        "at": "2026-09-16T02:00:00Z", "signals": ["title", "captions", "provider_flag"] },
      "human": { "count": 2, "lastAt": "2026-09-16T15:20:00Z" }
    },
    "confidence": 0.9, "disputes": 0, "version": 2
  }
}
```

## 8. The published artifact

The artifact is the contract. It is how the graph leaves Open Degree, and it is the only supported
way to read the graph programmatically. Reading the Git repository directly is not conformant:
it couples a consumer to a directory layout, is not cacheable at a CDN edge, and gives no version.

### 8.1 File layout

**EKG-SPEC-43** Open Degree publishes the artifact under a stable, versioned prefix:

```
https://www.opendegree.org/api/graph/v1/index.json              # manifest
https://www.opendegree.org/api/graph/v1/domains/<slug>.json     # one domain: nodes, edges, resources
https://www.opendegree.org/api/graph/v1/all.json.gz             # everything, for a full reimport
https://www.opendegree.org/api/graph/v1/checksums.json          # sha256 of every file above
https://www.opendegree.org/api/graph/v1/changelog.json          # the last 100 builds
https://www.opendegree.org/api/graph/v1/feed.json               # the last 1,000 entity-level changes (0.2.0)
https://www.opendegree.org/api/graph/v1/builds/<buildId>/…      # immutable snapshot of one build
```

The `v1` segment is the artifact's **major** version and changes only on a breaking change (§12).

### 8.2 The manifest

```json
{
  "schemaVersion": "0.2.0",
  "artifactVersion": "1.0.0",
  "buildId": "8f3c1d0e5a9b4c72e6d18a03f5b9c4e77a2d6013",
  "generatedAt": "2026-09-05T04:12:07Z",
  "publisher": "opendegree",
  "license": { "content": "CC BY-SA 4.0", "aggregates": "CC0-1.0" },
  "counts": { "domains": 2, "outcomes": 8, "courses": 2, "assessments": 2, "credentials": 2, "resources": 9 },
  "domains": [
    { "ekgId": "ekg:domain:01JBWX3QK7Z8Y4N2M5R6T7V8W9", "slug": "geometry", "title": "Geometry",
      "order": 10, "status": "draft", "counts": { "outcomes": 5 },
      "path": "domains/geometry.json", "sha256": "…", "bytes": 24117 }
  ],
  "previousBuildId": "1c8a…",
  "changelogPath": "changelog.json"
}
```

**EKG-SPEC-44** `buildId` is the publishing repository's commit SHA. `generatedAt` is the build
time in UTC, ISO 8601 with a `Z` suffix. `schemaVersion` is the version of this specification the
artifact conforms to. `artifactVersion` is the artifact format's own semver.

### 8.3 Domain files

A domain file is self-contained for that domain: every node in it, every edge whose source is in
it, every resource attached to those nodes.

**EKG-SPEC-45** An assessment or credential with no explicit `domain` is assigned to the domain of
its **first** listed outcome. When its outcomes span domains, it appears in each of their domain
files and is marked `crossDomain: true`; consumers MUST deduplicate by `ekgId`. From 0.2.0 a
course whose outcomes span domains is emitted the same way (EKG-SPEC-136).

**EKG-SPEC-46** An edge whose target is in another domain is still emitted, with
`targetDomain` naming the other domain's slug, so a consumer holding one domain knows an edge
leaves it rather than seeing a dangling reference.

Shape (abbreviated, and annotated with comments, so not itself parseable JSON; the
complete file is Appendix B):

```jsonc
{
  "schemaVersion": "0.2.0",
  "buildId": "8f3c…",
  "generatedAt": "2026-09-05T04:12:07Z",
  "domain": { "ekgId": "ekg:domain:01J…", "slug": "geometry", "type": "domain", "title": "Geometry",
              "description": "…", "icon": "📐", "order": 10, "status": "draft", "version": "0.1.0",
              "license": "CC BY-SA 4.0", "contributors": [], "tags": ["mathematics", "geometry"],
              "previousSlugs": [], "provenance": { "source": "opendegree", "generatedAt": "…",
              "sourceRepo": "ecollective-org/www.opendegree.org", "sourceCommit": "8f3c…" } },
  "nodes": [ /* every node of the domain, sorted by ekgId (EKG-SPEC-52) */ ],
  "edges": [ { "type": "prerequisite",
               "from": "ekg:outcome:01J…REPRESENT",
               "to": "ekg:outcome:01J…DEFINE",
               "targetDomain": "geometry" } ],
  "resources": [ /* deduplicated by ekgId, referenced from nodes by ekgId */ ],
  "body": { "ekg:outcome:01J…DEFINE": "### Scope\n\n…" }
}
```

**EKG-SPEC-47** Edges are emitted separately from nodes and are directed `from` the dependent node
`to` its prerequisite, matching the direction the field is authored in. The only edge `type` in
v0.1 is `prerequisite`. Derived relations (`leadsTo`, `unlocks`) are NOT emitted; consumers compute
them, so there is one authored truth.

**EKG-SPEC-48** Resources are emitted once per domain file, deduplicated by `ekgId`, and referenced
from nodes by `ekgId` in a `resourceIds` array. This keeps the file small when a dozen outcomes
share one Khan Academy page.

### 8.4 Bodies

**EKG-SPEC-49** Entity bodies (the Markdown after the frontmatter — an outcome's scope notes, an
assessment's scoring guide, a course's plan) are carried as raw CommonMark strings in a `body` map
keyed by `ekgId`. They are never carried as rendered HTML. A consumer that renders them MUST
sanitize, and MUST preserve the CC BY-SA 4.0 attribution.

### 8.5 Integrity and caching

**EKG-SPEC-50** `checksums.json` maps every published path to its `sha256` and byte length. A
consumer MUST verify the checksum of every file it fetches against the manifest or
`checksums.json`, and MUST abort the import on a mismatch.

**EKG-SPEC-51** Cache headers:

| Path | `Cache-Control` | Notes |
| --- | --- | --- |
| `index.json` | `public, max-age=300, stale-while-revalidate=3600` | polled; must turn over quickly |
| `domains/*.json` | `public, max-age=3600, stale-while-revalidate=86400` | ETag required |
| `all.json.gz` | `public, max-age=3600` | ETag required |
| `checksums.json`, `changelog.json` | `public, max-age=300` | — |
| `feed.json` | `public, max-age=300, stale-while-revalidate=3600` | polled like the manifest (0.2.0) |
| `builds/<buildId>/*` | `public, max-age=31536000, immutable` | content-addressed by build |

Every file MUST carry a strong `ETag` and MUST honour `If-None-Match`. Every file MUST be served
with `Content-Type: application/json; charset=utf-8` (`application/gzip` for `all.json.gz`) and
`Access-Control-Allow-Origin: *` — the graph is public.

**EKG-SPEC-52** JSON is UTF-8, with object keys sorted lexicographically and stable array ordering
(nodes by `ekgId`, edges by `from` then `to`, resources by `ekgId`), so a byte diff between two
builds is a semantic diff.

### 8.6 Changelog and retention

**EKG-SPEC-53** `changelog.json` lists the last 100 builds, newest first, each with `buildId`,
`generatedAt`, `schemaVersion`, and per-domain counts of nodes added, changed, deprecated, and
merged, plus the `ekgId`s involved in any merge. It is what a consumer reads to decide what to
re-fetch.

**EKG-SPEC-54** The last 100 builds MUST remain retrievable under `builds/<buildId>/`. A consumer
that has fallen behind can always find the build its stored state came from.

**EKG-SPEC-120** A publisher SHOULD emit `feed.json` beside `changelog.json`: the last 1,000
entity-level changes, newest first, each `{ ekgId, type, change, version, buildId, at }`, where
`change` is `created`, `updated`, `merged` or `deprecated`, `version` is the entity's version after
the change (absent for a resource, which carries none), `buildId` names the build and `at` is that
build's `generatedAt`. It carries graph
entities only (EKG-SPEC-115) and is served with the manifest's cache rules. A consumer that creates
content in real time reads it to hear about upstream changes faster than a daily import.

**EKG-SPEC-121** A consumer MAY register a webhook with the commons service to be called on
publish with each new feed entry. Polling `feed.json` every five minutes is conformant without
one.

**EKG-SPEC-157** `changelog.json` is a JSON array of builds, newest first, each
`{ buildId, generatedAt, schemaVersion, domains, merges, deprecatedFields }`: `domains` maps a
domain slug to `{ added, changed, deprecated, merged }` counts of nodes, `merges` lists
`{ deprecated, survivor }` pairs of `ekgId`s, and `deprecatedFields` names every field inside a
deprecation window (EKG-SPEC-80). EKG-SPEC-53 fixes the fields; this fixes their shape, which the
package's `changelogEntry` has carried since 0.1.0 and the live artifact publishes.

**EKG-SPEC-158** A publisher MUST copy each build's snapshot (`builds/<buildId>/…`) to durable
storage at publish time, so that the last 100 builds of EKG-SPEC-54 survive a stateless rebuild; a
rebuild MUST NOT be the only copy. The store is the publisher's to choose. A publisher that does
not yet meet this says so against EKG-SPEC-84 in its §13 conformance statement rather than claim
it.

### 8.7 Import behaviour

**EKG-SPEC-55** Import MUST be idempotent and diff-based, keyed on `ekgId`. Re-importing the same
`buildId` MUST be a no-op.

**EKG-SPEC-56** Import MUST be atomic. A validation failure anywhere aborts the whole import: nothing
is written, the previously imported snapshot continues to be served, and an operational alert fires.
Partial imports are never acceptable — a half-imported graph has dangling prerequisites, and the
learner-facing failure is silent.

**EKG-SPEC-57** Canonical fields — every field defined in §3 — are owned upstream and are overwritten
by import. Overlay fields are owned by the consumer and MUST NOT be touched by import. A consumer
MUST keep the two sets in distinguishable storage so that "overwrite everything upstream owns" is a
mechanical operation, not a field-by-field judgement.

## 9. Contribution protocol

Products contribute by opening pull requests against the Open Degree content repository. Open
Degree's build validation is the automated gate; its maintainers are the human gate.

### 9.1 What may be contributed

**EKG-SPEC-58** Four channels, and only four: (1) nodes and edges — outcomes, prerequisite edges,
aliases, alignments; (2) resources; (3) assessments, including AI-generated item banks and rubrics;
(4) evidence aggregates (§10). Nothing else crosses the boundary.

**EKG-SPEC-59** Learner work — free-response answers, notes, submitted artefacts, anything a learner
wrote — MUST NEVER be contributed, licensed, published, or used as training data through any channel.
This is absolute and has no exception for consent, anonymization, or aggregation.

### 9.2 Pull request format

**EKG-SPEC-60** One pull request per proposal. A proposal is one node with its resources, or one
coherent batch of resources for a single existing node. A pull request that mixes unrelated nodes
MUST be rejected on sight.

**EKG-SPEC-61** Required in every contribution pull request:

- **Title**: `[<product>] <verb> <entity type>: <title>` — e.g. `[diy-degree] Propose outcome: Prove triangles congruent with SSS, SAS, and ASA`.
- **Files**: one Markdown file per entity, in the correct collection folder, kebab-case file name matching the intended `slug`, valid YAML frontmatter, lists one item per line.
- **Frontmatter**: `status: stub` or `status: draft` only; `version: 0.1.0`; `license: CC BY-SA 4.0`; `contributors` naming the contributing bot; a complete `provenance` block.
- **Body**: the pull request body states why the node is needed, how many distinct learners or creators reached for it, what search was done to confirm no existing node covers it (the slugs and aliases checked), and — for an AI-authored proposal — the model id and prompt version.
- **No `ekgId`** on a genuinely new entity, unless a registered product identity minted it and asserts it under EKG-SPEC-144: otherwise it is minted by the publisher on merge, so that identity is never asserted by a proposal that may be rejected or merged into something else. A proposal that *modifies* an existing entity MUST carry that entity's existing `ekgId` unchanged. *Amended in 0.2.0 (Change G).*

### 9.3 Bot identity

**EKG-SPEC-62** Each contributing product uses one dedicated machine identity, installed as a GitHub
App with the narrowest workable permissions, never a human's personal access token. Registered
identities: `diy-degree-curation` (DIY Degree), `instructos-mapping` (InstructOS),
`opendegree-commons` (the Open Degree commons, §13.5). A new consumer registers its identity under
`GOVERNANCE.md` before its first pull request. *Amended in 0.2.0: `opendegree-commons` added.*

**EKG-SPEC-63** The bot identity appears in `contributors` and in `provenance.reviewedBy` only when
a human actually reviewed the proposal on the contributing side; a bot MUST NOT record itself as a
human reviewer.

### 9.4 Review checklist

An Open Degree maintainer works through this list. Any "no" is a change request or a rejection.

1. Does an existing node already cover this concept, by slug, title, or alias?
2. Is the `statement` first-person, measurable, and about one concept?
3. Are `prerequisites` immediate only, and do they resolve?
4. Do the `evidence` statements describe what would convince a stranger?
5. Do `alignments` cite a real code in a registered framework?
6. Are resources free or open first, with `cost` honest and `license` and `embedPolicy` present?
7. Is `provenance` complete, and free of personal data?
8. Does the build pass — schemas, reference resolution, cycle check?
9. Is the licence grant clear: is the contributing product entitled to offer this under CC BY-SA 4.0?
10. If the proposal carries an `ekgId` for a new entity: did a registered product identity (§9.3) mint it, is it a valid id of the right type (EKG-SPEC-15/17/18), and does the pull request assert that learners or creators already reference it (EKG-SPEC-144)? If the concept already exists, the existing node survives (EKG-SPEC-145).

### 9.5 Conflicts and merges

**EKG-SPEC-64** When a proposal's `statement` or `aliases` overlap an existing node, the outcome is
a merge, never a second node. A maintainer picks the surviving `ekgId`; the loser is deprecated with
`supersededBy` (§4.3).

**EKG-SPEC-65** When a merge lands upstream, every consumer MUST, on its next import, rewrite its own
records from the merged `ekgId` to the survivor **atomically**, retaining the original identifier in
its own history for audit. A consumer that cannot do this atomically MUST NOT import the merge.

**EKG-SPEC-66** On a concurrent edit, upstream wins for canonical fields; overlay fields are never
overwritten (EKG-SPEC-57). A consumer that disagrees with an upstream value opens a pull request; it
does not diverge locally.

### 9.6 Rejection reasons

A rejection is recorded with one of these reasons, so the same proposal is not re-submitted blindly:
`duplicate` (an existing node covers it — the pull request names it), `not-an-outcome` (a topic or a
course, not a measurable statement), `too-broad` (two or more concepts, needs splitting),
`unverifiable-evidence`, `licence-unclear` (the contributor cannot grant CC BY-SA 4.0),
`resource-quality`, `provenance-incomplete`, `out-of-scope`, `withdrawn`.

**EKG-SPEC-67** A rejection MUST name a reason and, for `duplicate`, MUST name the surviving node's
slug. A consumer records the rejection and MUST NOT re-propose the same content without addressing
the reason.

### 9.6.1 Producer-minted identifiers

EKG-SPEC-16 has always said an `ekgId` is minted once, by whichever product creates the node. A
learning engine creates provisional nodes in real time and learners master against them; if the
publisher minted a second id on merge, every graduated node would need a merge and an atomic
mastery rewrite (EKG-SPEC-65) for a concept that never had two identities. From 0.2.0 the id a
registered product minted survives.

**EKG-SPEC-144** A proposal opened by a registered product identity (§9.3) MAY carry the `ekgId`
that product minted for a new entity, provided the id is valid and of the right type
(EKG-SPEC-15/17/18) and the pull request asserts that learners or creators already reference it.
The same holds for a proposal a registered identity submits through an import bundle (§9.7).

**EKG-SPEC-145** Open Degree MUST adopt a producer-minted id on merge, unless the proposal
duplicates an existing node, in which case the existing node survives and EKG-SPEC-64/65 apply as
for any merge: the product's id becomes the deprecated side of a supersession, and the product
rewrites its records to the survivor.

**EKG-SPEC-146** A proposal from any other source (a human contributor, an AI producer that is not a
registered product identity) carries no `ekgId` for a new entity; an import bundle never mints one
(EKG-SPEC-122). The publisher mints on merge, as before.

### 9.7 Import bundles

The graph and the commons are seeded largely by AI research sessions, subject by subject, standard
by standard, catalog by catalog. Each session, script or tool emits one format, the **import
bundle**, which this package validates and the commons imports as proposals, never as canonical
content. A bundle is a container for the channels of §9.1 (nodes and edges, resources, and the
aliases and alignments that ride with them) plus reference data bound for the commons (§3.9). It
is not a fifth channel, and nothing in it changes who may set a `status` (EKG-SPEC-27).

A bundle carries:

| Field | Notes |
| --- | --- |
| `bundleVersion` | the version of this section the bundle follows, semver; `1.x` today |
| `producer` | `tool`, `toolVersion`, `modelId`, `promptVersion`, `sessionId` (a string, never a person), `producedAt`, and `identity`: a registered product identity (§9.3) or `contributor:<handle>` |
| `scope` | `subject`, `gradeBand`, `frameworkIds[]`, and `sources[]`, each `{ title, url, license?, retrievedAt }` |
| `licenseAcceptance` | `graphContent: "CC BY-SA 4.0"` (EKG-SPEC-105) and `referenceContent`, the commons' terms the producer accepts |
| `references[]` | existing `ekgId`s the bundle relies on, found in the current artifact |
| `proposals` | `domains`, `outcomes`, `edges`, `aliases`, `alignments`, `courses`, `resources`, `frameworks`, `standards`, `institutions`, `programs`, `offerings`, each a list |

Every proposal carries a bundle-local `localId` (`tmp:<kebab-case>`), the producer's `confidence`
(0 to 1) and its own `provenance` (§3.8). A reference from one proposal to another is a `tmp:` id;
a reference to an existing entity is its `ekgId`. A resource proposal carries the §3.6 fields, the
outcomes it teaches, and MAY carry a `qualityProposal` (the six rubric dimensions, 1 to 5, with
reasons). Timestamps are UTC with a `Z` suffix.

**EKG-SPEC-122** A producer never mints an `ekgId`. New things carry `tmp:` ids that are unique
within the bundle; existing things are named by the `ekgId` the producer found by searching the
current artifact first (EKG-SPEC-03). A `tmp:` id is replaced by a real identifier only when the
commons or the publisher accepts the proposal (EKG-SPEC-86).

**EKG-SPEC-123** Every new outcome carries `dedupe` evidence: the `queries` run, the `topMatches`
found (each an `ekgId`, a title and a score) and a `decision` of `new`, `alias_of` or
`duplicate_of`, the latter two naming the existing outcome in `of`. A bundle whose new outcome
lacks it is rejected. An outcome whose decision is `alias_of` or `duplicate_of` becomes an alias or
alignment proposal for the outcome it names, never a node.

**EKG-SPEC-124** Every proposal carries `provenance` and a `confidence`; an AI-authored proposal
names the model and the prompt version (V-19). Nothing in a bundle is personal data, and nothing
in it is learner work (EKG-SPEC-59).

**EKG-SPEC-125** A proposed outcome MUST meet the authoring rules of the standard: one concept, a
first-person measurable statement, immediate prerequisites only, at least one evidence statement.
A proposed resource MUST carry `license` and an `embedPolicy` other than `unknown` (EKG-SPEC-38)
or it is rejected. A proposed reference item MUST carry `retrievedAt` and the URL it was retrieved
from.

**EKG-SPEC-126** The commons imports a bundle as proposals into its review queues. Curriculum
proposals (domains, outcomes, edges, aliases, alignments, courses) become pull requests against the
standard when accepted, one proposal per pull request (EKG-SPEC-60/61); resources, standards,
catalog entities and mappings become records of the commons service. A resource that clears the
commons' automated quality and audience floors MAY be published as provisional ahead of review,
labelled as such (EKG-SPEC-30).

**EKG-SPEC-127** The importer answers with a machine-readable report: for every proposal, its
`ref` (the `tmp:` id, or the `ekgId` it modifies), its `collection`, a `decision` of `accepted`,
`queued`, `merged_into` or `rejected`, the surviving `of` for a merge or a duplicate, a `reason`
from §9.6 for a rejection, and the validation errors that led to it, each naming the rule
(EKG-SPEC-76). A producer corrects and resubmits only the rejected items, in a new bundle that
names the accepted ones by their now-real identifiers.

**EKG-SPEC-128** The commons service accepts a bundle through a propose API from a registered
identity and answers with the report of EKG-SPEC-127, synchronously for validation and again when
review outcomes are known. Its latency targets are the commons' own requirements, not this
specification's.

**EKG-SPEC-129** The commons importer MUST validate every bundle with the pinned package, MUST run
V-25 to V-28 over it, and MUST reject a bundle whole on any error, writing nothing; the report says
which items failed and why.

Example: a bundle from a research session over Open Degree's Geometry seed, proposing the outcome
the credential body names as not yet written, its edge to the existing stub, a resource, and the
standard it aligns to. The existing ids are Appendix B's; the proposed values are illustrative.

```json
{
  "bundleVersion": "1.0.0",
  "producer": { "tool": "corthovore-research", "toolVersion": "0.4.0", "modelId": "claude-sonnet-5",
    "promptVersion": "seed-outcomes-v1", "sessionId": "geometry-2026-09-16-a",
    "producedAt": "2026-09-16T02:00:00Z", "identity": "diy-degree-curation" },
  "scope": { "subject": "geometry", "gradeBand": "9-12", "frameworkIds": ["nys-nextgen-math"],
    "sources": [ { "title": "NYS Next Generation Mathematics Learning Standards (P-12)",
      "url": "https://www.nysed.gov/sites/default/files/programs/standards-instruction/nys-next-generation-mathematics-p-12-standards.pdf",
      "retrievedAt": "2026-09-16T02:00:00Z" } ] },
  "licenseAcceptance": { "graphContent": "CC BY-SA 4.0", "referenceContent": "commons catalog terms v1" },
  "references": ["ekg:domain:01JBWX3QK7Z8Y4N2M5R6T7V8W9", "ekg:outcome:01JBX4TRNGCRTRA00000000000"],
  "proposals": {
    "outcomes": [ {
      "localId": "tmp:prove-theorems-about-triangles", "confidence": 0.8,
      "provenance": { "source": "ai", "generatedAt": "2026-09-16T02:00:00Z",
        "modelId": "claude-sonnet-5", "promptVersion": "seed-outcomes-v1" },
      "title": "Prove theorems about triangles",
      "statement": "I can prove theorems about triangles, including that the base angles of an isosceles triangle are congruent and that the angles of a triangle sum to 180 degrees.",
      "evidence": ["Writes a two-column or paragraph proof that the base angles of an isosceles triangle are congruent, citing the congruence criterion used."],
      "domain": "ekg:domain:01JBWX3QK7Z8Y4N2M5R6T7V8W9", "level": "advanced",
      "prerequisites": ["ekg:outcome:01JBX4TRNGCRTRA00000000000"],
      "alignments": [ { "framework": "NYS Next Generation Mathematics Learning Standards", "code": "GEO-G.CO.10" } ],
      "dedupe": { "queries": ["prove theorems about triangles", "isosceles base angles"],
        "topMatches": [ { "ekgId": "ekg:outcome:01JBX4TRNGCRTRA00000000000",
          "title": "Prove triangles congruent with SSS, SAS, and ASA", "score": 0.41 } ],
        "decision": "new" }
    } ],
    "edges": [ { "localId": "tmp:edge-triangles-criteria", "confidence": 0.9,
      "provenance": { "source": "ai", "generatedAt": "2026-09-16T02:00:00Z", "modelId": "claude-sonnet-5", "promptVersion": "seed-outcomes-v1" },
      "from": "tmp:prove-theorems-about-triangles", "to": "ekg:outcome:01JBX4TRNGCRTRA00000000000", "kind": "prerequisite" } ],
    "resources": [ { "localId": "tmp:khan-triangle-proofs", "confidence": 0.7,
      "provenance": { "source": "ai", "generatedAt": "2026-09-16T02:00:00Z", "modelId": "claude-sonnet-5", "promptVersion": "seed-outcomes-v1" },
      "title": "Khan Academy, High School Geometry", "url": "https://www.khanacademy.org/math/geometry",
      "kind": "video", "cost": "free", "provider": "Khan Academy", "license": "CC BY-NC-SA 3.0 US",
      "embedPolicy": "link-only", "outcomes": ["tmp:prove-theorems-about-triangles"],
      "qualityProposal": { "correctness": 5, "coverage": 3, "clarity": 4, "efficiency": 4,
        "accessibility": 4, "trust": 5, "reasons": "Captioned, free, but covers the whole course rather than the theorem." } } ],
    "standards": [ { "localId": "tmp:nys-geo-g-co-10", "confidence": 1,
      "provenance": { "source": "import", "generatedAt": "2026-09-16T02:00:00Z" },
      "frameworkId": "nys-nextgen-math", "code": "GEO-G.CO.10", "kind": "objective", "parentCode": "GEO-G.CO",
      "statement": "Prove theorems about triangles.", "url": "https://www.nysed.gov/standards-instruction/mathematics",
      "retrievedAt": "2026-09-16T02:00:00Z" } ]
  }
}
```

## 10. Evidence aggregates

Evidence is what a learning engine knows that a content standard cannot: which nodes learners
actually fail, how long mastery really takes, which resource works. It is the single most valuable
thing a product can give back — and the single most dangerous, because it is derived from learners.

**EKG-SPEC-68** Evidence is contributed **only** as aggregates. No per-learner row, no free text, no
identifier, no timestamp precise enough to single anyone out, ever leaves a product.

**EKG-SPEC-69** An aggregate is published for a node and window only when it describes at least
**k = 50** distinct learners. The publishing job MUST assert the threshold and MUST refuse to emit
rather than emit a suppressed or rounded-up value. Percentages are rounded to the nearest whole
percent; durations to the nearest minute.

**EKG-SPEC-70** Aggregates are published at a stable per-product URL — DIY Degree's is
`https://app.diydegree.org/api/evidence/v1/nodes.json` — under **CC0 1.0**, so that Open Degree or
anyone else may use them without condition.

**EKG-SPEC-71** Cadence is weekly. Each file states its window explicitly. Windows are whole weeks,
Monday to Sunday UTC, plus an all-time rollup.

Shape:

```json
{
  "schemaVersion": "0.1.0",
  "publisher": "diydegree",
  "license": "CC0-1.0",
  "window": { "kind": "week", "start": "2026-08-31", "end": "2026-09-06" },
  "k": 50,
  "generatedAt": "2026-09-07T02:00:00Z",
  "nodes": [
    {
      "ekgId": "ekg:outcome:01JBWX3QK7Z8Y4N2M5R6T7V8W9",
      "learnersN": 412,
      "firstAttemptPassRate": 0.61,
      "masteryRate": 0.88,
      "medianMinutesToMastery": 47,
      "resources": [
        { "ekgId": "ekg:resource:01JBX…", "learnersN": 210, "firstAttemptPassRate": 0.68 }
      ]
    }
  ]
}
```

**EKG-SPEC-72** A per-resource aggregate is itself subject to k ≥ 50; a resource used by fewer than
50 learners in the window is omitted, not zeroed. Suppression MUST be by omission, and a consumer
MUST NOT infer a suppressed value by subtracting published figures from a published total — which
means a publisher MUST NOT publish a total that makes such a subtraction possible.

**EKG-SPEC-73** Aggregates are advisory. Open Degree MAY use them to prioritize review — a node with
a 20% first-attempt pass rate is probably two nodes — but an aggregate never changes a node's
`status` automatically, and no adoption decision is made by a number.

## 11. Validation rules

These are the rules a conformant validator enforces. Rules V-01 through V-08 are ported from Open
Degree's current build (`src/content.config.ts` refinements and `src/lib/coherence.ts`); V-09 onward
are added by this specification.

**EKG-SPEC-74** A conformant publisher MUST run every rule below and MUST fail the build on any
violation. A conformant consumer MUST run V-01 through V-16 on import and MUST abort the import on
any violation (EKG-SPEC-56).

| # | Rule | Origin |
| --- | --- | --- |
| V-01 | Every entity validates against its schema: required fields present, enums in range, `url` fields are absolute URLs, `estimatedHours` positive. | `content.config.ts` |
| V-02 | Every reference resolves to an existing entity of the expected collection. Astro's own `reference()` does not check existence for these collections, so this is a separate pass. | `coherence.ts` `resolveRefs()` |
| V-03 | Prerequisite edges contain no cycle. The error names the full cycle path. | `coherence.ts` `layerOutcomes()` |
| V-04 | `supersededBy` is present only when `status: deprecated`. | `content.config.ts` refinement |
| V-05 | A course lists at least one outcome; an assessment lists at least one outcome; a credential lists at least one outcome. | `content.config.ts` `.min(1)` |
| V-06 | Wikilink references parse: brackets and `\|alias` stripped, remainder non-empty. | `content.config.ts` `wikilink` |
| V-07 | Every entity has exactly the `type` literal of its collection. | `content.config.ts` |
| V-08 | Entity ids (file names) are unique within a collection and kebab-case. | Astro loader |
| V-09 | `ekgId` matches `^ekg:(domain\|outcome\|course\|assessment\|credential\|resource\|framework\|standard\|institution\|program\|offering\|platform):[0-9A-HJKMNP-TV-Z]{26}$`; in a domain file, the changelog and the feed, only the first six types (EKG-SPEC-115). | added; amended 0.2.0 |
| V-10 | `ekgId` is unique across the whole graph, all types. | added |
| V-11 | The `<type>` segment of `ekgId` equals the entity's `type`. | added |
| V-12 | `slug` is unique within its type, and matches `^[a-z0-9]+(-[a-z0-9]+)*$`. | added |
| V-13 | No `slug` appears in another entity's `previousSlugs[]`, and no value appears in more than one entity's `previousSlugs[]`. Slug history is globally consistent. | added |
| V-14 | An entity's own `slug` does not appear in its own `previousSlugs[]`. | added |
| V-15 | `supersededBy` chains are acyclic and no longer than 8 hops. | added |
| V-16 | `supersededBy` points at an entity of the same `type`. | added |
| V-17 | Every `resource.coverage` string is an exact member of the `evidence` array of an outcome the resource is attached to. | added |
| V-18 | Two resources with the same normalized `url` (EKG-SPEC-25) share one `ekgId`. | added |
| V-19 | `provenance.modelId` and `provenance.promptVersion` are present when `provenance.source` is `ai`; `provenance.reviewedAt` is present when `reviewedBy` is. | added |
| V-20 | `provenance` contains no string matching an email address pattern. | added |
| V-21 | A credential references no outcome whose `status` is `stub`. | added |
| V-22 | Every `alignment.framework` string, on an outcome or a course, that matches a registry name matches it exactly, including case; an unregistered framework is a warning, not an error. | added; amended 0.2.0 (courses) |
| V-23 | Artifact only: every `resourceIds` entry resolves to a resource in the same domain file; every edge `from` is in the file; every edge whose `to` is outside carries `targetDomain`; a node reference that leaves the file (a cross-domain node's outcomes, a prerequisite in another domain) is a well-formed `ekgId` of the expected type, and V-02 for it runs over the union of files a consumer imports. | added; amended 0.2.0 |
| V-24 | Artifact only: every published file's `sha256` matches `checksums.json`. | added |
| V-25 | Bundle only: a proposed outcome's `statement`, with whitespace collapsed and case folded, is not the `statement` of a standard proposed in the same bundle (EKG-SPEC-117). | added 0.2.0 |
| V-26 | Bundle only: `tmp:` ids are unique within the bundle; every `tmp:` reference resolves to a proposal of the expected collection; every `ekgId` reference is well-formed and of the expected type; a proposal carries a minted `ekgId` only when the producer is a registered product identity (EKG-SPEC-122/144). | added 0.2.0 |
| V-27 | Bundle only: every new outcome carries `dedupe` evidence, and an `alias_of` or `duplicate_of` decision names the existing outcome in `of` (EKG-SPEC-123). | added 0.2.0 |
| V-28 | Bundle only: every proposed resource carries `license` and an `embedPolicy` other than `unknown`; every proposed reference item carries `retrievedAt` and a URL (EKG-SPEC-125). | added 0.2.0 |
| V-29 | Every outcome listed in a course's `segments[]` appears in that course's `outcomes` (EKG-SPEC-135). Also run over bundle courses. | added 0.2.0 |
| V-30 | An outcome's alignment never names a `program_classification` framework, and one that names an `exam_outline` framework carries `relation` `narrower` or `related` (EKG-SPEC-141/142); the kind comes from the registry. Also run over bundle outcomes. | added 0.2.0 |

V-25 to V-28 apply to import bundles (§9.7) and are run by the commons importer (EKG-SPEC-129). A
publisher's build and a consumer's import never see a bundle, so EKG-SPEC-74 is unchanged by them.
V-29 and V-30 reach only fields no 0.1 content has (`segments`, and alignments to frameworks
registered in 0.2.0), so existing conformant content cannot fail them.

**EKG-SPEC-75** V-03's cycle check runs over the whole graph, not per domain. A per-domain
coherence view ignores prerequisites outside the domain when it computes layers, which is correct
for display; it is not sufficient for validation, where a cycle crossing a domain boundary is still
a cycle.

**EKG-SPEC-76** A validation error names the entity by both `slug` and `ekgId` and states the rule
number. A validator that reports "invalid" without naming the entity is not conformant.

## 12. Versioning and compatibility

Three things version independently: this specification (`schemaVersion`), the artifact format
(`artifactVersion` and the `/v1/` path segment), and each entity (`version` in its own frontmatter).

**EKG-SPEC-77** All three follow semantic versioning.

### 12.1 What counts as breaking

**Breaking (major).** Removing a field; renaming a field; making an optional field required;
removing a value from an enum; changing a field's type or cardinality; changing the meaning of an
existing field; changing the `ekgId` format; changing the artifact's file layout or URL prefix;
adding a validation rule that existing conformant content would fail.

**Additive (minor).** Adding an optional field; adding a value to an enum *whose consumers are
specified to ignore unknown values*; adding a new entity type; adding a new file to the artifact;
adding a warning-level validation rule.

**Patch.** Clarifying prose; fixing an example; correcting a typo in a rule that does not change
what it enforces.

**EKG-SPEC-78** Consumers MUST ignore unknown fields in the artifact rather than failing on them,
so that adding an optional field is genuinely non-breaking. Consumers MUST NOT ignore unknown enum
values on `status` or `type`; those are breaking by construction and a consumer encountering one
MUST abort the import.

**EKG-SPEC-79** A breaking change requires sign-off from all three products before release, per
`GOVERNANCE.md`. A non-breaking change requires the publisher's own review.

### 12.2 Deprecation windows

**EKG-SPEC-80** A field being removed is first marked deprecated in the specification and continues
to be emitted for **two minor releases or 90 days, whichever is longer**, before a major release
removes it. The `changelog.json` names every deprecated field in every build during the window.

**EKG-SPEC-81** When the artifact's major version changes, the previous major MUST continue to be
published, unchanged in shape, for **180 days**. `/api/graph/v1/` and `/api/graph/v2/` coexist; a
consumer migrates on its own schedule inside that window.

**EKG-SPEC-82** Consumers pin an exact `@ecollective/knowledge-graph` version, never a range, and
record the pinned version in their own build output. "It worked yesterday" must be reproducible.

### 12.3 Entity versions

**EKG-SPEC-83** An entity's `version` is bumped by the author when its meaning changes: a major bump
when the `statement` changes what the learner must be able to do, a minor bump when evidence,
alignments or resources change, a patch bump for wording. A credential records the entity versions
it was issued against (EKG-SPEC-10), so a later bump never rewrites history.

### 12.4 What Open Degree must change to conform

This specification is written against Open Degree's current schema and diverges from it in exactly
these places. Each is a change Open Degree must make; none changes the meaning of an existing field.

1. Add `ekgId` (required, unique) to every curriculum entity, and backfill it once over existing content.
2. Add `slug` as an explicit field, defaulting to the file-name id, plus `previousSlugs[]`.
3. Add `provenance` to every entity and every resource.
4. Generalize the `supersededBy` refinement (currently on outcomes only) to every entity type.
5. Extend the inline `resource` object with the optional fields in §3.6, and mint and persist `ekgId` for each distinct resource URL.
6. Add optional `domain` to assessments and credentials (or accept the derivation in EKG-SPEC-45).
7. Extend `alignment` with optional `frameworkId` and `relation`.
8. Emit the artifact (§8) from the site build, with checksums, changelog, and per-build snapshots.
9. Move the cycle check to whole-graph scope (EKG-SPEC-75), keeping the per-domain layering for display.

### 12.5 Notes for publishers

This subsection is context, not requirements.

**Astro and zod.** Astro 5.x pins zod 3 for `astro:content` (its typegen and `reference()` are
zod-3 schemas), while this package is on zod 4, and the two cannot be composed in one schema. A
publisher on Astro therefore keeps a typed adapter in its `content.config.ts` that mirrors the
source schemas of §3 field for field, and runs this package's `validateGraph` and
`validateDomainFile` (or `buildArtifact`, which runs both) at build time, so the package stays the
authority and any disagreement fails the build. Revisit when Astro adopts zod 4.

## 13. Consumer obligations

Each product's checklist. A product that cannot tick every MUST is not conformant, and should say so
rather than claim the contract.

### 13.1 Open Degree — publisher and moderator

- [ ] **EKG-SPEC-84** Publishes the artifact at `https://www.opendegree.org/api/graph/v1/` per §8, on every build, with manifest, per-domain files, `all.json.gz`, checksums, changelog, and per-build snapshots.
- [ ] **EKG-SPEC-85** Runs every validation rule in §11 in its build and fails the build on any violation.
- [ ] **EKG-SPEC-86** Mints `ekgId` on merge for every new entity that arrives without one, adopts a producer-minted id under EKG-SPEC-145, and never re-mints. *Amended in 0.2.0 (Change G).*
- [ ] **EKG-SPEC-87** Maintains slug history: `previousSlugs[]` on rename, and an HTTP redirect from every previous slug.
- [ ] **EKG-SPEC-88** Reviews inbound contribution pull requests against §9.4, records a rejection reason from §9.6, and publishes its review SLA.
- [ ] **EKG-SPEC-89** Owns the shared `status` field. Never asks another product to assert adoption.
- [ ] **EKG-SPEC-90** Never stores, requests, or accepts learner data — not from a contribution, not from an aggregate, not from anywhere. It remains true that Open Degree does not track learners.

### 13.2 DIY Degree — importer and contributor

- [ ] **EKG-SPEC-91** Stores every graph reference by `ekgId`. No table uses a slug as a foreign key (FR-EKG-01).
- [ ] **EKG-SPEC-92** Imports daily and on demand; validates against the pinned package; import is idempotent, diff-based, and atomic on failure (FR-EKG-02/03).
- [ ] **EKG-SPEC-93** Never overwrites overlay fields on import, and never writes canonical fields except from an import (FR-EKG-04).
- [ ] **EKG-SPEC-94** Follows `supersededBy` transitively to depth 8 on every read, and rewrites its own records atomically on a merge (FR-EKG-09/10).
- [ ] **EKG-SPEC-95** Labels every non-`adopted` node in every surface, including public pages (FR-EKG-06).
- [ ] **EKG-SPEC-96** Exposes `provenance` and the upstream `buildId` in its API and UI (FR-EKG-05).
- [ ] **EKG-SPEC-97** Contributes only through the four channels of §9.1, by bot pull request as `diy-degree-curation`, under CC BY-SA 4.0; publishes aggregates only above k = 50, under CC0 (FR-EKG-07/11).
- [ ] **EKG-SPEC-98** Never contributes learner work or personal data through any channel (FR-EKG-12).
- [ ] **EKG-SPEC-99** Renders attribution for Open Degree-derived definitions and for every resource (FR-EKG-13).
- [ ] **EKG-SPEC-114** Enforces the audience ceiling of EKG-SPEC-111 for every learner under 18 from the artifact's `audience` block, holds any stricter rating of its own as an overlay, and never serves an `unrated` resource as a minor's primary (decision record 0008 there).
- [ ] **EKG-SPEC-143** Follows a path definition by its `segments`, deduplicates a cross-domain course by `ekgId` (EKG-SPEC-136), and renders a program template with the phrase of EKG-SPEC-139 and never a claim of equivalence, credit or a degree (decision record 0005 there).
- [ ] **EKG-SPEC-156** Labels every `frontier` and `evolving` outcome beside the EKG-SPEC-30 label, never serves a retracted resource as a primary, and treats `volatility`, `evidenceClass`, `subKind`, `publishedAt`, `externalIds` and `platformId` as canonical fields overwritten by import (EKG-SPEC-57; decision record 0006 there).

### 13.3 InstructOS — mapper

- [ ] **EKG-SPEC-100** Maps creator lessons and courses onto existing `ekgId`s. Never mints a node for a concept the graph already has; proposes a new node by pull request when one is genuinely missing.
- [ ] **EKG-SPEC-101** Publishes mappings keyed by `ekgId`, each with a resource URL, an `embedPolicy`, a `license`, and an `attributionText`, in the Resource shape of §3.6.
- [ ] **EKG-SPEC-102** Never publishes creator personal data, pricing, payout, or revenue information through the EKG. Commerce stays entirely inside InstructOS.
- [ ] **EKG-SPEC-103** Consumes the artifact read-only. No consumer writes into InstructOS, and InstructOS writes nothing into a consumer.

**EKG-SPEC-104** Conformance is a technical property of a system, not a marketing claim about it.
Nothing in this specification requires a consumer to name the other products, link to them, or
describe its own software as open source. A product whose own positioning forbids naming a sibling
brand publicly can be fully conformant: it interoperates by `ekgId` and by artifact, and says
nothing at all on its website. This resolves the surface tension with InstructOS's current rules
(DIY Degree's OQ-14) at the technical level; the positioning question remains the owner's.

### 13.4 Any other consumer

A school, an employer, or a third-party platform is a consumer too. It MUST honour §14's licence
terms, MUST render attribution, MUST NOT re-host resources, and MUST NOT present non-`adopted`
content as adopted. It need do nothing else, and it needs nobody's permission.

### 13.5 Open Degree commons — importer of bundles, publisher of reference data

- [ ] **EKG-SPEC-130** Validates every import bundle with the pinned package, runs V-25 to V-28, and rejects a bundle whole on any error (EKG-SPEC-129).
- [ ] **EKG-SPEC-131** Imports bundles as proposals only: curriculum proposals reach the standard as pull requests from `opendegree-commons`, one per proposal (EKG-SPEC-60/61/126); nothing it holds asserts a shared `status` (EKG-SPEC-28).
- [ ] **EKG-SPEC-132** Answers every bundle with the report of EKG-SPEC-127 and records each rejection with a §9.6 reason.
- [ ] **EKG-SPEC-133** Publishes reference entities under `https://app.opendegree.org/api/commons/v1/` only, never in a graph domain file (EKG-SPEC-115), with an explicit licence on every record (EKG-SPEC-119).
- [ ] **EKG-SPEC-134** Never stores learner data (EKG-SPEC-90 applies to it as to Open Degree) and never publishes a rater's or a contributor's personal data.

## 14. Licensing

**EKG-SPEC-105** Curriculum content — domains, outcomes including stubs, courses, assessments,
credentials, resource metadata, and entity bodies — is licensed **CC BY-SA 4.0**, matching Open
Degree's default `license` value. Contributions are accepted only under the same licence. A
contributor who cannot grant it MUST NOT contribute the content (`licence-unclear`, §9.6).

**EKG-SPEC-106** Evidence aggregates (§10) are published under **CC0 1.0**. They are facts about
learning, offered without condition, and attaching share-alike to them would only discourage use.

**EKG-SPEC-107** This specification and the code in this repository — the schemas, identifier
helpers, artifact types, and validator — are licensed **MIT**, matching the licence of the sibling
reference implementation. The permissive choice is deliberate: a schema that anyone can embed
anywhere is worth more than a schema that spreads its own terms.

**EKG-SPEC-108** A resource's own `license` field describes the resource, not this graph. Metadata
about a copyrighted video is CC BY-SA 4.0; the video is not. Nothing here licenses anything a
publisher does not own.

**EKG-SPEC-109** Learner work is licensed to nobody. It is not contributed, not published, not used
as training data, and no term of this specification may be read to grant any right in it
(EKG-SPEC-59).

## 15. Open questions

| # | Question | Blocks |
| --- | --- | --- |
| **EKG-OQ-1** | **Resolved 2026-09-05: yes.** Open Degree adds and backfills `ekgId` (with `slug`, `previousSlugs[]` and `provenance`) through this package and emits the artifact from its build, per §12.4. The slug-plus-alias registry alternative is rejected. (DIY Degree's OQ-4.) | Nothing now; the conformance work is tracked in `www.opendegree.org`. |
| **EKG-OQ-2** | Who are Open Degree's maintainers, and what is their SLA on an inbound bot pull request? (DIY Degree's OQ-3.) **Open at 0.2.0; the owner's to answer** (www.opendegree.org#4). Meanwhile the commons' fast lane keeps learners unblocked without upstream review (EKG-SPEC-126). | The contribution protocol's throughput, and any consumer staffing plan built on it. |
| **EKG-OQ-3** | **Resolved 2026-09-17: a manual backfill, enforced by the build.** The resource `ekgId` is minted in the content repository (`npm run backfill:ekg` in Open Degree, committed by a person or a bot) and the build refuses a resource without one; EKG-SPEC-24 is amended to say so. | Nothing now. |
| **EKG-OQ-4** | Should `resource` become a first-class collection in Open Degree rather than an inline object? It has identity, provenance, and a lifecycle already. **Still open at 0.2.0.** Source resources stay inline; the commons holds resources as records of its own service (§9.7, its requirements OD-RES), which takes the pressure off the source layout. | A source-layout question, not a contract question: the artifact (§8.3) already treats resources as first-class. |
| **EKG-OQ-5** | Does `Alignment` need its own `ekgId`? Today it is a value object. **Still open at 0.2.0.** Bundles propose alignments per outcome (§9.7), which needs no alignment identity. | Independent proposal, review and supersession of alignments, if ever wanted. |
| **EKG-OQ-6** | Is a second edge type needed — `related`, `broader`, or `part-of`? **Still open at 0.2.0.** Bundle edges are `prerequisite` only; adding an edge type is additive (§12.1). | Nothing yet. |
| **EKG-OQ-7** | InstructOS's integration posture: its current rules forbid naming sibling brands publicly and forbid describing its work as open source. EKG-SPEC-104 says conformance never requires either. Is that sufficient, or does the owner want the positioning revisited? (DIY Degree's OQ-14.) | InstructOS integration work. |
| **EKG-OQ-8** | Is k = 50 the right threshold? It is conservative, and it means a new node publishes no evidence for a long time. Lowering it is a privacy decision, not an engineering one. | Nothing yet; revisit with real volume. |
| **EKG-OQ-9** | Who arbitrates a disagreement between an Open Degree maintainer and a consumer's curator? Today: the owner. When a governance body exists, this changes. **Open at 0.2.0; the owner's to answer.** | `GOVERNANCE.md` §Roles. |
| **EKG-OQ-10** | Enum growth deferred to the next major (the v0.2 proposal's Change J): `audio`, `course` and `paper` as resource `kind` values, and `teacher` as a provenance `source`. Adding an enum value breaks a 0.1 validator (EKG-SPEC-78 covers unknown fields, not unknown values), so this waits for EKG-SPEC-79's sign-off and window. Until then `subKind` carries the refinement and `source: diydegree` with a product-side recommender record carries a teacher's authorship. | The next major release. |

---

## Appendix A — `schema.ts` sketch

A sketch of what `@ecollective/knowledge-graph` would export. Zod, so that Open Degree's
`content.config.ts` can import it directly and the site build stays the schema's continuous test.
This sketch is v0.1's and is retained for history, annotated where 0.2.0 added fields. From 0.2.0
the package itself (`src/`) is the reference, and every export it adds is described in the section
it implements.

```ts
import { z } from 'zod';

export const EKG_TYPES = ['domain', 'outcome', 'course', 'assessment', 'credential', 'resource'] as const;
export type EkgType = (typeof EKG_TYPES)[number];

/** Crockford base-32, uppercase, 26 chars — excludes I, L, O, U. */
const ULID = /^[0-9A-HJKMNP-TV-Z]{26}$/;
export const ekgId = <T extends EkgType>(type: T) =>
  z.string().regex(new RegExp(`^ekg:${type}:[0-9A-HJKMNP-TV-Z]{26}$`), `Expected ekg:${type}:<ULID>`);
export const anyEkgId = z.string().regex(new RegExp(`^ekg:(${EKG_TYPES.join('|')}):[0-9A-HJKMNP-TV-Z]{26}$`));
export const mintEkgId = (type: EkgType): string => `ekg:${type}:${ulid()}`;   // ulid() from `ulid`
export const parseEkgId = (id: string) => { const [, type, ulidPart] = id.split(':'); return { type: type as EkgType, ulid: ulidPart }; };

export const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);
export const status = z.enum(['stub', 'draft', 'proposed', 'adopted', 'deprecated']);
export type Status = z.infer<typeof status>;

/** Accepts a bare id or an Obsidian wikilink, and yields the bare id. */
export const wikilink = z.string().transform((v) =>
  v.trim().replace(/^\[\[/, '').replace(/\]\]$/, '').split('|')[0].trim());

export const provenance = z.object({
  source: z.enum(['opendegree', 'diydegree', 'instructos', 'ai', 'curator', 'learner_request', 'import']),
  generatedAt: z.string().datetime(),
  modelId: z.string().optional(),
  promptVersion: z.string().optional(),
  reviewedBy: z.string().optional(),
  reviewedAt: z.string().datetime().optional(),
  sourceRepo: z.string().optional(),
  sourceCommit: z.string().optional(),
})
  .refine((p) => p.source !== 'ai' || (p.modelId && p.promptVersion), {
    message: 'AI-sourced provenance requires modelId and promptVersion (V-19)' })
  .refine((p) => !p.reviewedBy || !!p.reviewedAt, {
    message: 'reviewedBy requires reviewedAt (V-19)' })
  .refine((p) => !/[^\s@]+@[^\s@]+\.[^\s@]+/.test(JSON.stringify(p)), {
    message: 'Provenance must not contain an email address (V-20)' });

export const alignment = z.object({
  framework: z.string(),
  code: z.string(),
  url: z.string().url().optional(),
  frameworkId: z.string().optional(),
  relation: z.enum(['exact', 'broader', 'narrower', 'related']).default('exact'),
});

export const AUDIENCE_RATINGS = ['all', 'teen', 'older_teen', 'adult', 'unrated'] as const;
export const AUDIENCE_DESCRIPTORS = ['strong_language', 'violence', 'sexual_content', 'substance_use',
  'mature_themes', 'frightening_content', 'discriminatory_content', 'self_harm_references', 'gambling',
  'commercial_pressure', 'unmoderated_comments', 'external_links_or_chat', 'account_required',
  'data_collection', 'perspective_content'] as const;
export const audience = z.object({                                             // §7.4 (0.2.0)
  rating: z.enum(AUDIENCE_RATINGS).default('unrated'),
  descriptors: z.array(z.enum(AUDIENCE_DESCRIPTORS)).default([]),
  basis: z.object({
    automated: z.object({ modelId: z.string(), promptVersion: z.string(), at: z.iso.datetime(),
      signals: z.array(z.string()).default([]) }).optional(),
    human: z.object({ count: z.number().int().nonnegative(), lastAt: z.iso.datetime() }).optional(),
  }).default({}),
  confidence: z.number().min(0).max(1).optional(),
  disputes: z.number().int().nonnegative().default(0),
  version: z.number().int().positive().default(1),
});

export const resource = z.object({
  ekgId: ekgId('resource').optional(),           // required in the artifact, minted on first build
  title: z.string(),
  url: z.string().url(),
  kind: z.enum(['video', 'reading', 'interactive', 'book', 'dataset', 'tool', 'practice', 'reference']),
  cost: z.enum(['free', 'freemium', 'paid']).default('free'),
  provider: z.string().optional(),
  modality: z.enum(['watch', 'read', 'listen', 'do']).optional(),
  durationSeconds: z.number().int().positive().optional(),
  difficulty: z.number().int().min(1).max(5).optional(),
  language: z.string().default('en'),
  hasCaptions: z.boolean().optional(),
  license: z.string().optional(),
  attributionText: z.string().optional(),
  sourceUrl: z.string().url().optional(),
  embedPolicy: z.enum(['embed-allowed', 'link-only', 'official-player-only', 'unknown']).default('unknown'),
  coverage: z.array(z.string()).default([]),
  lastVerifiedAt: z.string().datetime().optional(),
  audience: audience.optional(),                 // §7.4 (0.2.0)
  subKind: z.enum(RESOURCE_SUBKINDS).optional(), // §3.6 (0.2.0), with publishedAt, externalIds,
                                                 // evidenceSignals, transcript, platformId
  provenance: provenance.optional(),
});

/** Commons + identity, on every entity. */
export const commons = {
  ekgId: anyEkgId,
  slug,
  previousSlugs: z.array(slug).default([]),
  status: status.default('draft'),
  version: z.string().default('0.1.0'),
  license: z.string().default('CC BY-SA 4.0'),
  contributors: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  provenance: provenance.optional(),
};

/** supersededBy only on a deprecated entity (V-04, EKG-SPEC-05). */
const superseded = <T extends z.ZodTypeAny>(s: T) =>
  s.superRefine((v: any, ctx) => {
    if (v.supersededBy && v.status !== 'deprecated')
      ctx.addIssue({ code: 'custom', path: ['supersededBy'],
        message: 'supersededBy requires status: deprecated (V-04)' });
  });

export const outcome = superseded(z.object({
  type: z.literal('outcome'),
  title: z.string(),
  statement: z.string(),
  description: z.string().optional(),
  domain: wikilink,
  level: z.enum(['foundation', 'intermediate', 'advanced']).default('foundation'),
  prerequisites: z.array(wikilink).default([]),
  evidence: z.array(z.string()).default([]),
  alignments: z.array(alignment).default([]),
  aliases: z.array(z.string()).default([]),
  resources: z.array(resource).default([]),
  supersededBy: wikilink.optional(),
  ...commons,
}));

export const domain = superseded(z.object({
  type: z.literal('domain'), title: z.string(), description: z.string(),
  icon: z.string().optional(), order: z.number().default(100),
  supersededBy: wikilink.optional(), ...commons,
}));

// course, assessment, credential follow the same shape; see §3.3–3.5.

/** The artifact (§8). */
export const manifest = z.object({
  schemaVersion: z.string(), artifactVersion: z.string(), buildId: z.string(),
  generatedAt: z.string().datetime(), publisher: z.string(),
  license: z.object({ content: z.string(), aggregates: z.string() }),
  counts: z.record(z.number().int().nonnegative()),
  domains: z.array(z.object({
    ekgId: ekgId('domain'), slug, title: z.string(), order: z.number(), status,
    counts: z.record(z.number()), path: z.string(), sha256: z.string(), bytes: z.number().int(),
  })),
  previousBuildId: z.string().optional(), changelogPath: z.string(),
});

export const edge = z.object({
  type: z.literal('prerequisite'), from: anyEkgId, to: anyEkgId, targetDomain: slug.optional(),
});

export const domainFile = z.object({
  schemaVersion: z.string(), buildId: z.string(), generatedAt: z.string().datetime(),
  domain: z.unknown(), nodes: z.array(z.unknown()), edges: z.array(edge),
  resources: z.array(resource), body: z.record(z.string()),
});

/**
 * Whole-graph checks that no per-entity schema can express: V-02 reference resolution,
 * V-03 prerequisite cycles (whole-graph scope, EKG-SPEC-75), V-10 ekgId uniqueness,
 * V-12/V-13/V-14 slug and slug-history uniqueness, V-15/V-16 supersession chains,
 * V-17 coverage strings, V-18 resource URL dedup, V-21 no stub in a credential.
 */
export declare function validateGraph(entities: unknown[]): { ok: boolean; errors: ValidationError[] };
export interface ValidationError { rule: string; slug: string; ekgId?: string; message: string; }
```

---

## Appendix B — A complete example artifact

The Geometry domain of Open Degree's seed content, rendered as
`https://www.opendegree.org/api/graph/v1/domains/geometry.json`. Five outcomes (one of them a stub),
one course, one assessment, one credential, four deduplicated resources, four prerequisite edges.
ULIDs are illustrative. Bodies are truncated with `…` for length only; in a real artifact they are
the complete Markdown. Arrays are in the order EKG-SPEC-52 requires, and the package's
`buildArtifact` reproduces this file byte for byte from the seed's source entries.

```json
{
  "schemaVersion": "0.2.0",
  "buildId": "8f3c1d0e5a9b4c72e6d18a03f5b9c4e77a2d6013",
  "generatedAt": "2026-09-05T04:12:07Z",
  "domain": {
    "ekgId": "ekg:domain:01JBWX3QK7Z8Y4N2M5R6T7V8W9",
    "slug": "geometry", "previousSlugs": [], "type": "domain", "title": "Geometry",
    "description": "Reasoning about shapes, transformations, and congruence in the plane, from precise definitions to proof.",
    "icon": "📐", "order": 10,
    "status": "draft", "version": "0.1.0", "license": "CC BY-SA 4.0",
    "contributors": [], "tags": ["mathematics", "geometry"],
    "provenance": { "source": "opendegree", "generatedAt": "2026-09-05T04:12:07Z",
      "sourceRepo": "ecollective-org/www.opendegree.org", "sourceCommit": "8f3c1d0e" }
  },
  "nodes": [
    {
      "ekgId": "ekg:assessment:01JBX6TASKRGDMTN0000000000", "slug": "rigid-motion-congruence-task",
      "previousSlugs": [], "type": "assessment", "title": "Rigid Motion Congruence Task",
      "description": "A performance task in which the learner decides whether pairs of figures are congruent and proves it with rigid motions.",
      "kind": "performance-task", "domain": "ekg:domain:01JBWX3QK7Z8Y4N2M5R6T7V8W9",
      "outcomes": ["ekg:outcome:01JBX2RGDMTNS0000000000000", "ekg:outcome:01JBX3PRVCNGRNCE0000000000"],
      "evidenceRequirements": [
        "A portfolio of five figure pairs, at least two congruent and at least two not, designed by the learner.",
        "For each congruent pair, an explicit sequence of rigid motions carrying one figure onto the other, drawn and described.",
        "For each non-congruent pair, an explanation of why no rigid motion can exist.",
        "One written proof that two given triangles are congruent, concluding that corresponding parts are congruent."
      ],
      "status": "draft", "version": "0.1.0", "license": "CC BY-SA 4.0",
      "contributors": [], "tags": ["geometry", "congruence"],
      "provenance": { "source": "opendegree", "generatedAt": "2026-09-05T04:12:07Z",
        "sourceRepo": "ecollective-org/www.opendegree.org", "sourceCommit": "8f3c1d0e" }
    },
    {
      "ekgId": "ekg:course:01JBX5CRSCNGRNCE0000000000", "slug": "congruence-through-rigid-motions",
      "previousSlugs": [], "type": "course", "title": "Congruence Through Rigid Motions",
      "description": "Go from precise geometric definitions to proving triangles congruent with rigid motions, using only free resources.",
      "domain": "ekg:domain:01JBWX3QK7Z8Y4N2M5R6T7V8W9",
      "outcomes": ["ekg:outcome:01JBX0DEFNTERMS00000000000", "ekg:outcome:01JBX1REPRESENT00000000000",
                   "ekg:outcome:01JBX2RGDMTNS0000000000000", "ekg:outcome:01JBX3PRVCNGRNCE0000000000"],
      "assessments": ["ekg:assessment:01JBX6TASKRGDMTN0000000000"],
      "estimatedHours": 12, "formats": ["video", "interactive", "practice", "project"],
      "kind": "curated_path", "segments": [], "alignments": [], "sources": [],
      "resourceIds": ["ekg:resource:01JBXKHANACADEMY0000000000", "ekg:resource:01JBXGEGEBRA00000000000000",
                      "ekg:resource:01JBXNYSSTANDARDSPDF000000", "ekg:resource:01JBXREGENTSPAST0000000000"],
      "status": "draft", "version": "0.1.0", "license": "CC BY-SA 4.0",
      "contributors": [], "tags": ["geometry", "congruence"],
      "provenance": { "source": "opendegree", "generatedAt": "2026-09-05T04:12:07Z",
        "sourceRepo": "ecollective-org/www.opendegree.org", "sourceCommit": "8f3c1d0e" }
    },
    {
      "ekgId": "ekg:credential:01JBX7BADGECNGRNC000000000", "slug": "congruence-and-rigid-motions",
      "previousSlugs": [], "type": "credential", "title": "Congruence and Rigid Motions",
      "description": "The holder can define the objects of plane geometry, represent and perform rigid motions, and prove figures congruent using rigid motions.",
      "domain": "ekg:domain:01JBWX3QK7Z8Y4N2M5R6T7V8W9",
      "outcomes": ["ekg:outcome:01JBX0DEFNTERMS00000000000", "ekg:outcome:01JBX1REPRESENT00000000000",
                   "ekg:outcome:01JBX2RGDMTNS0000000000000", "ekg:outcome:01JBX3PRVCNGRNCE0000000000"],
      "assessments": ["ekg:assessment:01JBX6TASKRGDMTN0000000000"],
      "format": "Open Badges 3.0 (W3C Verifiable Credential)",
      "issuerRequirements": [
        "Assess with the adopted version of the Rigid Motion Congruence Task, scored Proficient by a reviewer who did not teach the learner.",
        "Retain the learner's evidence for verification, with the learner's consent, and give the learner a copy.",
        "Issue as an Open Badges 3.0 credential referencing this credential's id and version."
      ],
      "status": "draft", "version": "0.1.0", "license": "CC BY-SA 4.0",
      "contributors": [], "tags": ["geometry"],
      "provenance": { "source": "opendegree", "generatedAt": "2026-09-05T04:12:07Z",
        "sourceRepo": "ecollective-org/www.opendegree.org", "sourceCommit": "8f3c1d0e" }
    },
    {
      "ekgId": "ekg:outcome:01JBX0DEFNTERMS00000000000", "slug": "define-geometric-terms",
      "previousSlugs": [], "type": "outcome",
      "title": "Define the basic objects of plane geometry",
      "statement": "I can give precise definitions of angle, circle, perpendicular lines, parallel lines, and line segment, using the undefined notions of point, line, distance along a line, and distance around a circular arc.",
      "description": "The vocabulary every later geometry outcome depends on.",
      "domain": "ekg:domain:01JBWX3QK7Z8Y4N2M5R6T7V8W9", "level": "foundation",
      "prerequisites": [],
      "evidence": [
        "Writes a definition of each term that a peer can use to decide whether a given figure is an example.",
        "Sorts a set of figures into examples and non-examples of each term and justifies each choice."
      ],
      "alignments": [ { "framework": "NYS Next Generation Mathematics Learning Standards",
        "frameworkId": "nys-nextgen-math", "code": "GEO-G.CO.1", "relation": "exact",
        "url": "https://www.nysed.gov/standards-instruction/mathematics" } ],
      "aliases": [], "resourceIds": ["ekg:resource:01JBXKHANACADEMY0000000000"],
      "status": "draft", "version": "0.1.0", "license": "CC BY-SA 4.0",
      "contributors": [], "tags": ["definitions", "congruence"],
      "provenance": { "source": "opendegree", "generatedAt": "2026-09-05T04:12:07Z",
        "sourceRepo": "ecollective-org/www.opendegree.org", "sourceCommit": "8f3c1d0e" }
    },
    {
      "ekgId": "ekg:outcome:01JBX1REPRESENT00000000000", "slug": "represent-transformations",
      "previousSlugs": [], "type": "outcome", "title": "Represent transformations in the plane",
      "statement": "I can represent transformations in the plane, describe them as functions that take points as inputs and give points as outputs, and compare transformations that preserve distance and angle to those that do not.",
      "domain": "ekg:domain:01JBWX3QK7Z8Y4N2M5R6T7V8W9", "level": "foundation",
      "prerequisites": ["ekg:outcome:01JBX0DEFNTERMS00000000000"],
      "evidence": [
        "Given a figure and a rule (for example, a reflection over a line), draws the image and labels corresponding points.",
        "Sorts a set of transformations into those that preserve distance and angle and those that do not, with a one-sentence justification for each."
      ],
      "alignments": [ { "framework": "NYS Next Generation Mathematics Learning Standards",
        "frameworkId": "nys-nextgen-math", "code": "GEO-G.CO.2", "relation": "exact",
        "url": "https://www.nysed.gov/standards-instruction/mathematics" } ],
      "aliases": [], "resourceIds": ["ekg:resource:01JBXGEGEBRA00000000000000"],
      "status": "draft", "version": "0.1.0", "license": "CC BY-SA 4.0",
      "contributors": [], "tags": ["transformations", "congruence"],
      "provenance": { "source": "opendegree", "generatedAt": "2026-09-05T04:12:07Z",
        "sourceRepo": "ecollective-org/www.opendegree.org", "sourceCommit": "8f3c1d0e" }
    },
    {
      "ekgId": "ekg:outcome:01JBX2RGDMTNS0000000000000", "slug": "describe-rigid-motions",
      "previousSlugs": [], "type": "outcome",
      "title": "Describe and draw rotations, reflections, and translations",
      "statement": "I can define rotations, reflections, and translations in terms of angles, circles, perpendicular lines, parallel lines, and line segments, and, given a figure and a rigid motion, draw the transformed figure and specify a sequence of rigid motions that carries one figure onto another.",
      "domain": "ekg:domain:01JBWX3QK7Z8Y4N2M5R6T7V8W9", "level": "intermediate",
      "prerequisites": ["ekg:outcome:01JBX1REPRESENT00000000000"],
      "evidence": [
        "States a definition of each rigid motion using the terms from the definitions outcome.",
        "Given a figure and a rigid motion, draws the image accurately by hand or in free geometry software.",
        "Given two congruent figures, writes a sequence of rigid motions carrying one onto the other."
      ],
      "alignments": [
        { "framework": "NYS Next Generation Mathematics Learning Standards", "frameworkId": "nys-nextgen-math",
          "code": "GEO-G.CO.4", "relation": "exact", "url": "https://www.nysed.gov/standards-instruction/mathematics" },
        { "framework": "NYS Next Generation Mathematics Learning Standards", "frameworkId": "nys-nextgen-math",
          "code": "GEO-G.CO.5", "relation": "exact", "url": "https://www.nysed.gov/standards-instruction/mathematics" }
      ],
      "aliases": ["Rigid transformations"], "resourceIds": ["ekg:resource:01JBXGEGEBRA00000000000000"],
      "status": "draft", "version": "0.1.0", "license": "CC BY-SA 4.0",
      "contributors": [], "tags": ["rigid-motions", "congruence"],
      "provenance": { "source": "opendegree", "generatedAt": "2026-09-05T04:12:07Z",
        "sourceRepo": "ecollective-org/www.opendegree.org", "sourceCommit": "8f3c1d0e" }
    },
    {
      "ekgId": "ekg:outcome:01JBX3PRVCNGRNCE0000000000", "slug": "prove-congruence-with-rigid-motions",
      "previousSlugs": [], "type": "outcome", "title": "Use rigid motions to decide and prove congruence",
      "statement": "I can use the definition of congruence in terms of rigid motions to decide whether two figures are congruent, and to show that two triangles are congruent if and only if corresponding pairs of sides and corresponding pairs of angles are congruent.",
      "domain": "ekg:domain:01JBWX3QK7Z8Y4N2M5R6T7V8W9", "level": "advanced",
      "prerequisites": ["ekg:outcome:01JBX2RGDMTNS0000000000000"],
      "evidence": [
        "Given two figures, decides whether they are congruent and justifies the decision with a rigid motion or with an argument that none exists.",
        "Writes a proof that two triangles are congruent by exhibiting a sequence of rigid motions, and explains why corresponding parts are therefore congruent."
      ],
      "alignments": [
        { "framework": "NYS Next Generation Mathematics Learning Standards", "frameworkId": "nys-nextgen-math",
          "code": "GEO-G.CO.6", "relation": "exact", "url": "https://www.nysed.gov/standards-instruction/mathematics" },
        { "framework": "NYS Next Generation Mathematics Learning Standards", "frameworkId": "nys-nextgen-math",
          "code": "GEO-G.CO.7", "relation": "exact", "url": "https://www.nysed.gov/standards-instruction/mathematics" }
      ],
      "aliases": [], "resourceIds": ["ekg:resource:01JBXREGENTSPAST0000000000"],
      "status": "draft", "version": "0.1.0", "license": "CC BY-SA 4.0",
      "contributors": [], "tags": ["proof", "congruence"],
      "provenance": { "source": "opendegree", "generatedAt": "2026-09-05T04:12:07Z",
        "sourceRepo": "ecollective-org/www.opendegree.org", "sourceCommit": "8f3c1d0e" }
    },
    {
      "ekgId": "ekg:outcome:01JBX4TRNGCRTRA00000000000", "slug": "triangle-congruence-criteria",
      "previousSlugs": [], "type": "outcome", "title": "Prove triangles congruent with SSS, SAS, and ASA",
      "statement": "I can explain how the SSS, SAS, and ASA criteria for triangle congruence follow from the definition of congruence in terms of rigid motions, and use them to prove two triangles congruent.",
      "domain": "ekg:domain:01JBWX3QK7Z8Y4N2M5R6T7V8W9", "level": "advanced",
      "prerequisites": ["ekg:outcome:01JBX3PRVCNGRNCE0000000000"],
      "evidence": [],
      "alignments": [ { "framework": "NYS Next Generation Mathematics Learning Standards",
        "frameworkId": "nys-nextgen-math", "code": "GEO-G.CO.8", "relation": "exact",
        "url": "https://www.nysed.gov/standards-instruction/mathematics" } ],
      "aliases": ["SSS, SAS, ASA", "Triangle congruence theorems", "Triangle congruence postulates"],
      "resourceIds": [],
      "status": "stub", "version": "0.1.0", "license": "CC BY-SA 4.0",
      "contributors": [], "tags": ["proof", "congruence"],
      "provenance": { "source": "opendegree", "generatedAt": "2026-09-05T04:12:07Z",
        "sourceRepo": "ecollective-org/www.opendegree.org", "sourceCommit": "8f3c1d0e" }
    }
  ],
  "edges": [
    { "type": "prerequisite", "from": "ekg:outcome:01JBX1REPRESENT00000000000", "to": "ekg:outcome:01JBX0DEFNTERMS00000000000", "targetDomain": "geometry" },
    { "type": "prerequisite", "from": "ekg:outcome:01JBX2RGDMTNS0000000000000", "to": "ekg:outcome:01JBX1REPRESENT00000000000", "targetDomain": "geometry" },
    { "type": "prerequisite", "from": "ekg:outcome:01JBX3PRVCNGRNCE0000000000", "to": "ekg:outcome:01JBX2RGDMTNS0000000000000", "targetDomain": "geometry" },
    { "type": "prerequisite", "from": "ekg:outcome:01JBX4TRNGCRTRA00000000000", "to": "ekg:outcome:01JBX3PRVCNGRNCE0000000000", "targetDomain": "geometry" }
  ],
  "resources": [
    { "ekgId": "ekg:resource:01JBXGEGEBRA00000000000000", "title": "GeoGebra Geometry",
      "url": "https://www.geogebra.org/geometry", "kind": "tool", "cost": "free", "provider": "GeoGebra",
      "modality": "do", "language": "en", "license": "GeoGebra Non-Commercial License Agreement",
      "attributionText": "GeoGebra Geometry, geogebra.org", "embedPolicy": "link-only", "coverage": [],
      "lastVerifiedAt": "2026-09-01T00:00:00Z",
      "provenance": { "source": "opendegree", "generatedAt": "2026-09-05T04:12:07Z",
        "sourceRepo": "ecollective-org/www.opendegree.org", "sourceCommit": "8f3c1d0e" } },
    { "ekgId": "ekg:resource:01JBXKHANACADEMY0000000000", "title": "Khan Academy, High School Geometry",
      "url": "https://www.khanacademy.org/math/geometry", "kind": "video", "cost": "free",
      "provider": "Khan Academy", "modality": "watch", "language": "en", "hasCaptions": true,
      "license": "CC BY-NC-SA 3.0 US", "attributionText": "Khan Academy, High School Geometry (CC BY-NC-SA 3.0 US)",
      "embedPolicy": "link-only", "coverage": [], "lastVerifiedAt": "2026-09-01T00:00:00Z",
      "provenance": { "source": "opendegree", "generatedAt": "2026-09-05T04:12:07Z",
        "sourceRepo": "ecollective-org/www.opendegree.org", "sourceCommit": "8f3c1d0e" } },
    { "ekgId": "ekg:resource:01JBXNYSSTANDARDSPDF000000", "title": "NYS Next Generation Mathematics Learning Standards (P-12)",
      "url": "https://www.nysed.gov/sites/default/files/programs/standards-instruction/nys-next-generation-mathematics-p-12-standards.pdf",
      "kind": "reference", "cost": "free", "provider": "New York State Education Department",
      "modality": "read", "language": "en", "license": "New York State Education Department, public materials",
      "attributionText": "NYS Next Generation Mathematics Learning Standards, New York State Education Department",
      "embedPolicy": "link-only", "coverage": [], "lastVerifiedAt": "2026-09-01T00:00:00Z",
      "provenance": { "source": "opendegree", "generatedAt": "2026-09-05T04:12:07Z",
        "sourceRepo": "ecollective-org/www.opendegree.org", "sourceCommit": "8f3c1d0e" } },
    { "ekgId": "ekg:resource:01JBXREGENTSPAST0000000000", "title": "Past Geometry Regents examinations",
      "url": "https://www.nysedregents.org/geometryre/", "kind": "practice", "cost": "free",
      "provider": "New York State Education Department", "modality": "do", "language": "en",
      "license": "New York State Education Department, public materials",
      "attributionText": "Past Geometry Regents examinations, New York State Education Department",
      "embedPolicy": "link-only", "coverage": [], "lastVerifiedAt": "2026-09-01T00:00:00Z",
      "provenance": { "source": "opendegree", "generatedAt": "2026-09-05T04:12:07Z",
        "sourceRepo": "ecollective-org/www.opendegree.org", "sourceCommit": "8f3c1d0e" } }
  ],
  "body": {
    "ekg:outcome:01JBX0DEFNTERMS00000000000": "### Scope\n\nAngle, circle, perpendicular lines, parallel lines, and line segment, each defined in terms of point, line, distance along a line, and distance around a circular arc.\n\n### Common misconceptions\n\n- Treating \"perpendicular\" as \"looks like a corner\" rather than as lines meeting at a right angle.\n- Defining a circle by its shape instead of as the set of points at a fixed distance from a center.",
    "ekg:outcome:01JBX1REPRESENT00000000000": "### Scope\n\nTransformations described as functions on points, using transparencies, free geometry software, or coordinates. …",
    "ekg:outcome:01JBX2RGDMTNS0000000000000": "### Scope\n\nRotations, reflections, and translations, defined precisely and performed on given figures. …",
    "ekg:outcome:01JBX3PRVCNGRNCE0000000000": "### Scope\n\nCongruence defined through rigid motions, applied to deciding congruence of figures and to triangle congruence in terms of corresponding parts. …",
    "ekg:outcome:01JBX4TRNGCRTRA00000000000": "Reached for from [Use rigid motions to decide and prove congruence](/outcomes/prove-congruence-with-rigid-motions), whose notes name the triangle congruence criteria as the natural next outcome.",
    "ekg:course:01JBX5CRSCNGRNCE0000000000": "## Plan\n\n### Step 1: Definitions\n\nOutcome: [Define the basic objects of plane geometry](/outcomes/define-geometric-terms). …",
    "ekg:assessment:01JBX6TASKRGDMTN0000000000": "## Task\n\nYou will be given two pairs of figures by the assessor and will add three pairs of your own. …\n\n## Scoring guide\n\n| Level | Description |\n| --- | --- |\n| **Proficient** | Every decision is correct. … |",
    "ekg:credential:01JBX7BADGECNGRNC000000000": "This micro-credential covers the congruence strand of high school geometry as expressed in the New York State Next Generation Mathematics Learning Standards (GEO-G.CO.1 through GEO-G.CO.7). …"
  }
}
```

Note what this example demonstrates: the stub (`triangle-congruence-criteria`) is published like any
other node, so a consumer can show a learner that the concept is known and unwritten; the GeoGebra
resource is deduplicated to one `ekgId` and referenced from two outcomes; every edge points from the
dependent node to its prerequisite; and every entity carries the provenance and licence it was
published under.
