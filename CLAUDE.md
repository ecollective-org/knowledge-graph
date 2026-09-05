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

Status: **v0.1 draft. No package published yet.** There is no build, no test suite, and no code.

## Layout

```
├── SPEC.md                                    # the specification (read first)
├── GOVERNANCE.md                              # roles, decision process, release cadence
├── README.md                                  # what this is, roadmap, per-product to-do
├── CONTRIBUTING.md
├── LICENSE                                    # MIT
├── CLAUDE.md
└── docs/decisions/
    └── 0001-dedicated-framework-repo.md
```

When the package is written it lands as `src/` plus `package.json`, publishing
`@ecollective/knowledge-graph` to GitHub Packages: `schema.ts`, `validate.ts`, `build-artifact.ts`.
Appendix A of `SPEC.md` sketches the first of these.

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
- Do not write package code beyond Appendix A's sketch until the roadmap in `README.md` says so.
- Do not change a field's meaning, name, or requiredness without treating it as a breaking change.
- Do not claim conformance on behalf of a product. §13 is a checklist a product's maintainer fills in
  honestly, including the boxes that are not ticked.
