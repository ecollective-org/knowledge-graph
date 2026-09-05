# eCollective Knowledge Graph Specification, v0.1 draft

> Status: **v0.1 draft**. No package is published yet. This document is the contract three
> products build against; it is not yet frozen. Requirement identifiers (`EKG-SPEC-nn`) are
> stable once assigned — a withdrawn requirement is marked withdrawn, never renumbered.
>
> Filed 2026-09-05. Governance: [`GOVERNANCE.md`](GOVERNANCE.md). Why this repository exists:
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

Eight shapes are defined. Six are **entities** — they have identity, a lifecycle, and a place in
the artifact: Domain, Outcome, Course, Assessment, Credential, Resource. Two are **value objects** —
Alignment and Provenance — which have no independent identity and always appear inside an entity.

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
| `supersededBy` | ref → Outcome ? | |

**EKG-SPEC-07** `prerequisites` MUST contain immediate prerequisites only. A conformant consumer
derives "what comes after" (`leadsTo`) and the transitive dependent set (`unlocks`) from other
outcomes' `prerequisites`. There is deliberately no authored "leads to" field, and no publisher may
introduce one.

**EKG-SPEC-08** An outcome's `statement` is the concept's single definition. Two outcomes MUST NOT
state the same concept; the remedy for a duplicate is a merge (§5.4), not a second node.

### 3.3 Course

An optional curated path through the graph.

`type: "course"`, `title`, `description`, `domain` (ref → Domain), and `outcomes` (ref[] → Outcome,
minimum 1) are required. Optional: `assessments` (ref[] → Assessment, `[]`), `estimatedHours`
(positive `number`), `formats` (`string[]`, `[]`), `resources` (Resource[], `[]`). Plus the commons.

**EKG-SPEC-09** A course MUST map to at least one outcome and MUST NOT be treated by any consumer as
the unit of the curriculum. A consumer MAY ignore courses entirely and still be conformant.

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
| `provenance` **+** | Provenance ? | required in the artifact; §7.3 |

**EKG-SPEC-11** `embedPolicy` describes what a consumer is permitted to do, not what is technically
possible. `official-player-only` means the resource may be presented only through the provider's own
embedded player, with no downloading, caching of media, audio extraction, ad-suppression, or
overlay. `link-only` means it must be opened out.

**EKG-SPEC-12** `coverage` entries MUST be exact strings from the `evidence` array of an outcome the
resource is attached to. Free text matching no evidence statement is a validation error (§11).

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

## 4. Identifiers

Two identifiers per entity, with different jobs. The `slug` is for humans and URLs and changes; the
`ekgId` is for machines and foreign keys and never changes.

### 4.1 `ekgId`

**EKG-SPEC-15** Every entity has an `ekgId` of the form `ekg:<type>:<ULID>`, where `<type>` is one
of `domain`, `outcome`, `course`, `assessment`, `credential`, `resource`, and `<ULID>` is a
Crockford base-32 ULID: 26 characters, alphabet `0123456789ABCDEFGHJKMNPQRSTVWXYZ`, uppercase.

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

**EKG-SPEC-24** A resource's identity is its `ekgId`. When source content carries no `ekgId` on a
resource, the artifact builder MUST mint one and MUST write it back to the source content in the
same build's commit, so that the identifier is stable from the next build onward. A builder that
cannot write back MUST fail rather than mint a fresh identifier on every build.

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

| `frameworkId` | `framework` | Authority |
| --- | --- | --- |
| `nys-nextgen-math` | NYS Next Generation Mathematics Learning Standards | New York State Education Department |
| `ccss-math` | Common Core State Standards for Mathematics | CCSSO / NGA |
| `ngss` | Next Generation Science Standards | Achieve, Inc. |
| `ob3` | Open Badges 3.0 | 1EdTech |

`frameworkId` is optional in content and is added by the artifact builder when the `framework`
string matches a registry row exactly.

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
https://www.opendegree.org/api/graph/v1/builds/<buildId>/…      # immutable snapshot of one build
```

The `v1` segment is the artifact's **major** version and changes only on a breaking change (§12).

### 8.2 The manifest

```json
{
  "schemaVersion": "0.1.0",
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
files and is marked `crossDomain: true`; consumers MUST deduplicate by `ekgId`.

**EKG-SPEC-46** An edge whose target is in another domain is still emitted, with
`targetDomain` naming the other domain's slug, so a consumer holding one domain knows an edge
leaves it rather than seeing a dangling reference.

Shape (abbreviated, and annotated with comments, so not itself parseable JSON; the
complete file is Appendix B):

```jsonc
{
  "schemaVersion": "0.1.0",
  "buildId": "8f3c…",
  "generatedAt": "2026-09-05T04:12:07Z",
  "domain": { "ekgId": "ekg:domain:01J…", "slug": "geometry", "type": "domain", "title": "Geometry",
              "description": "…", "icon": "📐", "order": 10, "status": "draft", "version": "0.1.0",
              "license": "CC BY-SA 4.0", "contributors": [], "tags": ["mathematics", "geometry"],
              "previousSlugs": [], "provenance": { "source": "opendegree", "generatedAt": "…",
              "sourceRepo": "ecollective-org/www.opendegree.org", "sourceCommit": "8f3c…" } },
  "nodes": [ /* outcomes, then courses, assessments, credentials */ ],
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
- **No `ekgId`** on a genuinely new entity: it is minted by the publisher on merge, so that identity is never asserted by a proposal that may be rejected or merged into something else. A proposal that *modifies* an existing entity MUST carry that entity's existing `ekgId` unchanged.

### 9.3 Bot identity

**EKG-SPEC-62** Each contributing product uses one dedicated machine identity, installed as a GitHub
App with the narrowest workable permissions, never a human's personal access token. Registered
identities: `diy-degree-curation` (DIY Degree), `instructos-mapping` (InstructOS). A new consumer
registers its identity under `GOVERNANCE.md` before its first pull request.

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
| V-09 | `ekgId` matches `^ekg:(domain\|outcome\|course\|assessment\|credential\|resource):[0-9A-HJKMNP-TV-Z]{26}$`. | added |
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
| V-22 | Every `alignment.framework` string that matches a registry name matches it exactly, including case; an unregistered framework is a warning, not an error. | added |
| V-23 | Artifact only: every `resourceIds` entry resolves to a resource in the same domain file; every edge `from` is in the file; every edge whose `to` is outside carries `targetDomain`. | added |
| V-24 | Artifact only: every published file's `sha256` matches `checksums.json`. | added |

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

## 13. Consumer obligations

Each product's checklist. A product that cannot tick every MUST is not conformant, and should say so
rather than claim the contract.

### 13.1 Open Degree — publisher and moderator

- [ ] **EKG-SPEC-84** Publishes the artifact at `https://www.opendegree.org/api/graph/v1/` per §8, on every build, with manifest, per-domain files, `all.json.gz`, checksums, changelog, and per-build snapshots.
- [ ] **EKG-SPEC-85** Runs every validation rule in §11 in its build and fails the build on any violation.
- [ ] **EKG-SPEC-86** Mints `ekgId` on merge for every new entity, and never re-mints.
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
| **EKG-OQ-1** | Will Open Degree add and backfill `ekgId`? The alternative — a slug-plus-alias registry held by each consumer — is strictly worse and would have to be recorded as a deliberate downgrade. (DIY Degree's OQ-4.) | Everything. This is the one decision that, deferred, forces a data migration later. |
| **EKG-OQ-2** | Who are Open Degree's maintainers, and what is their SLA on an inbound bot pull request? (DIY Degree's OQ-3.) | The contribution protocol's throughput, and any consumer staffing plan built on it. |
| **EKG-OQ-3** | Where does the resource `ekgId` write-back land (EKG-SPEC-24) — a build-time commit from Open Degree's own CI, or a manual pass? A build that mints without persisting is not acceptable. | The artifact builder. |
| **EKG-OQ-4** | Should `resource` become a first-class collection in Open Degree rather than an inline object? It has identity, provenance, and a lifecycle already; keeping it inline is the reason EKG-SPEC-24 is awkward. | Deferred to v0.2; the artifact shape (§8.3) already treats resources as first-class, so this is a source-layout question, not a contract question. |
| **EKG-OQ-5** | Does `Alignment` need its own `ekgId`? Today it is a value object. If alignments are ever to be proposed, reviewed, and superseded independently, they need identity. | v0.2. |
| **EKG-OQ-6** | Is a second edge type needed in v0.1 — `related`, `broader`, or `part-of`? The graph is currently prerequisite-only, which is a deliberate simplification. | v0.2; adding an edge type is additive (§12.1). |
| **EKG-OQ-7** | InstructOS's integration posture: its current rules forbid naming sibling brands publicly and forbid describing its work as open source. EKG-SPEC-104 says conformance never requires either. Is that sufficient, or does the owner want the positioning revisited? (DIY Degree's OQ-14.) | InstructOS integration work. |
| **EKG-OQ-8** | Is k = 50 the right threshold? It is conservative, and it means a new node publishes no evidence for a long time. Lowering it is a privacy decision, not an engineering one. | Nothing yet; revisit with real volume. |
| **EKG-OQ-9** | Who arbitrates a disagreement between an Open Degree maintainer and a consumer's curator? Today: the owner. When a governance body exists, this changes. | `GOVERNANCE.md` §Roles. |

---

## Appendix A — `schema.ts` sketch

A sketch of what `@ecollective/knowledge-graph` would export. Zod, so that Open Degree's
`content.config.ts` can import it directly and the site build stays the schema's continuous test.
Illustrative, not published; the package does not exist yet.

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
the complete Markdown.

```json
{
  "schemaVersion": "0.1.0",
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
      "resourceIds": ["ekg:resource:01JBXKHANACADEMY0000000000", "ekg:resource:01JBXGEGEBRA00000000000000",
                      "ekg:resource:01JBXNYSSTANDARDSPDF000000", "ekg:resource:01JBXREGENTSPAST0000000000"],
      "status": "draft", "version": "0.1.0", "license": "CC BY-SA 4.0",
      "contributors": [], "tags": ["geometry", "congruence"],
      "provenance": { "source": "opendegree", "generatedAt": "2026-09-05T04:12:07Z",
        "sourceRepo": "ecollective-org/www.opendegree.org", "sourceCommit": "8f3c1d0e" }
    },
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
    }
  ],
  "edges": [
    { "type": "prerequisite", "from": "ekg:outcome:01JBX1REPRESENT00000000000", "to": "ekg:outcome:01JBX0DEFNTERMS00000000000", "targetDomain": "geometry" },
    { "type": "prerequisite", "from": "ekg:outcome:01JBX2RGDMTNS0000000000000", "to": "ekg:outcome:01JBX1REPRESENT00000000000", "targetDomain": "geometry" },
    { "type": "prerequisite", "from": "ekg:outcome:01JBX3PRVCNGRNCE0000000000", "to": "ekg:outcome:01JBX2RGDMTNS0000000000000", "targetDomain": "geometry" },
    { "type": "prerequisite", "from": "ekg:outcome:01JBX4TRNGCRTRA00000000000", "to": "ekg:outcome:01JBX3PRVCNGRNCE0000000000", "targetDomain": "geometry" }
  ],
  "resources": [
    { "ekgId": "ekg:resource:01JBXKHANACADEMY0000000000", "title": "Khan Academy, High School Geometry",
      "url": "https://www.khanacademy.org/math/geometry", "kind": "video", "cost": "free",
      "provider": "Khan Academy", "modality": "watch", "language": "en", "hasCaptions": true,
      "license": "CC BY-NC-SA 3.0 US", "attributionText": "Khan Academy, High School Geometry (CC BY-NC-SA 3.0 US)",
      "embedPolicy": "link-only", "coverage": [], "lastVerifiedAt": "2026-09-01T00:00:00Z",
      "provenance": { "source": "opendegree", "generatedAt": "2026-09-05T04:12:07Z",
        "sourceRepo": "ecollective-org/www.opendegree.org", "sourceCommit": "8f3c1d0e" } },
    { "ekgId": "ekg:resource:01JBXGEGEBRA00000000000000", "title": "GeoGebra Geometry",
      "url": "https://www.geogebra.org/geometry", "kind": "tool", "cost": "free", "provider": "GeoGebra",
      "modality": "do", "language": "en", "license": "GeoGebra Non-Commercial License Agreement",
      "attributionText": "GeoGebra Geometry, geogebra.org", "embedPolicy": "link-only", "coverage": [],
      "lastVerifiedAt": "2026-09-01T00:00:00Z",
      "provenance": { "source": "opendegree", "generatedAt": "2026-09-05T04:12:07Z",
        "sourceRepo": "ecollective-org/www.opendegree.org", "sourceCommit": "8f3c1d0e" } },
    { "ekgId": "ekg:resource:01JBXREGENTSPAST0000000000", "title": "Past Geometry Regents examinations",
      "url": "https://www.nysedregents.org/geometryre/", "kind": "practice", "cost": "free",
      "provider": "New York State Education Department", "modality": "do", "language": "en",
      "license": "New York State Education Department, public materials",
      "attributionText": "Past Geometry Regents examinations, New York State Education Department",
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
