# CLAUDE.md

Guidance for Claude Code (claude.ai/code) working in this repository.

## Read `SPEC.md` first

`SPEC.md` is the contract. Nothing in this repository may contradict it, and no answer about the
graph should be given without checking it. If a question is about a field, an identifier, the
lifecycle, the artifact, or the contribution protocol, the answer is in `SPEC.md` and should be
cited by section and by requirement identifier.

## Purpose

This repository is the **framework** for the eCollective Knowledge Graph (EKG): the shared model of
what is worth learning, used by Open Degree (publisher and moderator), DIY Degree (learning engine,
importer and contributor), and InstructOS (mapper).

**Framework and content are separate.** No curriculum lives here — no domain, outcome, course,
assessment, or credential. All of that is in `ecollective-org/www.opendegree.org`. See
`docs/decisions/0001-dedicated-framework-repo.md` for why.

Status: **v0.1 draft specification; package code at 0.1.0, not yet published.** `schema.ts` and
`validate.ts` exist with tests; `build-artifact.ts` does not yet. Publishing to GitHub Packages is
an owner action (`npm publish` with a token for the `@ecollective` scope).

## Layout

```
├── SPEC.md                                    # the specification (read first)
├── GOVERNANCE.md                              # roles, decision process, release cadence
├── README.md                                  # what this is, roadmap, per-product to-do
├── CHANGELOG.md
├── CONTRIBUTING.md
├── LICENSE                                    # MIT
├── CLAUDE.md
├── package.json                               # @ecollective/knowledge-graph, ESM, zod 4 peer
├── tsconfig.json  tsconfig.build.json  vitest.config.ts
├── src/
│   ├── index.ts                               # the public surface; everything is re-exported here
│   ├── ekg-id.ts                              # EKG_TYPES, ekgId(), anyEkgId, mintEkgId, parseEkgId  (§4)
│   ├── schema.ts                              # source and artifact entity schemas, value objects (§3)
│   ├── artifact.ts                            # manifest, domainFile, edge, checksums, changelog (§8)
│   ├── checksums.ts                           # sha256Hex, verifyChecksums (§8.5, V-24)
│   ├── frameworks.ts                          # the framework registry (§6.2)
│   ├── url.ts                                 # normalizeResourceUrl (EKG-SPEC-25)
│   └── validate.ts                            # validateGraph, validateDomainFile (§11)
├── test/                                      # vitest; fixtures/geometry.json is Appendix B verbatim
└── docs/decisions/
    └── 0001-dedicated-framework-repo.md
```

Two schema families live in `schema.ts`: the **source** schemas (`domain`, `outcome`, …, `entity`)
take frontmatter with slug or wikilink references and optional provenance, which is what Open
Degree's `content.config.ts` imports; the **artifact** schemas (`artifact.*`) take `ekgId`
references, `resourceIds`, and required provenance, which is what a consumer validates on import.

## Verify

```
npm install
npm run typecheck      # tsc over src and test
npm test               # vitest; the Appendix B artifact must validate with no errors or warnings
npm run build          # emits dist/ (ESM + .d.ts); `npm pack` runs it via prepack
```

Node 20.19 or later. `zod` is a peer dependency at `^4`, matching the Astro-bundled zod that Open
Degree already uses; the package never bundles its own copy.

## Conventions

- **Requirement identifiers are permanent.** `EKG-SPEC-nn` is never renumbered and never reused. A
  withdrawn requirement is marked withdrawn in place; a new one takes the next free number. Other
  repositories cite these.
- **Every normative statement is numbered.** Unnumbered prose is context, and a reader may treat it
  as non-binding. Do not slip a MUST into a paragraph without an identifier.
- **RFC 2119 keywords are deliberate.** MUST, MUST NOT, SHOULD, SHOULD NOT, MAY. Never use them for
  advice.
- **Examples come from real Open Degree content**, never invented. The Geometry and Data Literacy
  seeds are the source; ULIDs in examples are illustrative and labelled as such.
- **Never introduce personal data**, in examples included. Provenance carries handles and bot
  identities, never emails or learner identifiers.
- **Never reuse a lifecycle token** (`stub`, `draft`, `proposed`, `adopted`, `deprecated`) for
  anything else. DIY Degree renamed an app state to `submitted` for exactly this reason.
- **Changes to this repository follow `GOVERNANCE.md`.** Say whether a change is breaking, additive,
  or patch, per `SPEC.md` §12.1, and name the consumer obligations it moves.
- Prose is plain, direct, and specific: eCollective house voice. No hype. Markdown, wrapped at
  roughly 100 characters.

## Related repositories

| Repository | Relationship |
| --- | --- |
| `ecollective-org/www.opendegree.org` | The canonical content and the artifact publisher. Its `src/content.config.ts` and `src/lib/coherence.ts` are what §3 and §11 were ported from. |
| `ecollective-org/app.diydegree.org` | The learning engine. Its `docs/requirements.md` §5, §6.1 and FR-EKG-01…14 are the application side of this contract. |
| `ecollective-org/www.instructos.org` | The mapper. Its own rules forbid naming sibling brands publicly; `SPEC.md` EKG-SPEC-104 makes conformance compatible with that. |
| `ecollective-org/www.ecollective.org` | The parent brand; `src/data/products.ts` is the family source of truth. |

## What not to do

- Do not add curriculum content here.
- Do not add an export to `src/index.ts` that the specification does not describe; if a consumer
  needs something new, it is a specification change first (`GOVERNANCE.md`).
- Every validation error names the entity by slug and ekgId and states the rule number
  (EKG-SPEC-76). A test that adds a rule asserts on the rule number, not on the prose.
- Test fixtures use only the Crockford alphabet in ULIDs (no I, L, O, U); an invalid id in a
  fixture fails V-09 before the rule under test ever runs.
- Do not change a field's meaning, name, or requiredness without treating it as a breaking change.
- Do not claim conformance on behalf of a product. §13 is a checklist a product's maintainer fills in
  honestly, including the boxes that are not ticked.
