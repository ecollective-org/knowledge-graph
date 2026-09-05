# Contributing

This repository holds the **framework**: the specification, the governance, and (later) the
`@ecollective/knowledge-graph` package.

**Curriculum content does not belong here.** A new outcome, a corrected statement, a better resource,
a new alignment — all of that is a pull request against Open Degree's content repository, following
`SPEC.md` §9. Content pull requests opened here will be closed with a pointer.

## What belongs here

- Changes to `SPEC.md`: new or amended requirements, corrections, worked examples.
- Changes to `GOVERNANCE.md`, by the arbiter only.
- Decision records under `docs/decisions/`.
- Package code, once it exists: schemas, helpers, artifact types, validator.

## Before you open a pull request

1. **Read [`SPEC.md`](SPEC.md) first.** Cite the sections and requirement identifiers your change
   affects; a change that touches a requirement without naming it is hard to review and harder to
   audit later.
2. **Say which kind of change it is** — breaking, additive, or patch, per `SPEC.md` §12.1. That
   determines who must sign off and how long the comment window is (`GOVERNANCE.md` §Decisions).
   Guessing wrong is fine; not saying is not.
3. **Say what it costs the three products.** A change that is trivial here can be a migration
   elsewhere. Name the consumer obligations in §13 that change.
4. **Never renumber a requirement.** `EKG-SPEC-nn` identifiers are permanent once assigned. A
   withdrawn requirement is marked withdrawn in place; a new one takes the next free number.
5. **New requirements get identifiers on merge**, assigned by the specification editor. Write the
   requirement without a number, or with `EKG-SPEC-XX`, and it will be assigned.

## Style

- One change per pull request. A mixed pull request is rejected on sight.
- Prose is plain, direct, and specific. MUST / MUST NOT / SHOULD / MAY carry RFC 2119 meanings — use
  them deliberately, and do not use them for advice.
- Every normative statement is a numbered requirement. Anything not numbered is context, and a
  reviewer is entitled to treat it as non-binding.
- Examples come from real content in Open Degree's repository, never invented.
- No personal data anywhere, in examples included.

## Decision records

A change of consequence gets a record in `docs/decisions/`, numbered sequentially, in the style of
[`0001-dedicated-framework-repo.md`](docs/decisions/0001-dedicated-framework-repo.md): context,
decision, rejected alternatives, consequences, follow-ups. Record what was rejected and why — that
is the part that is expensive to reconstruct later.

## Licence of contributions

Contributions to this repository are accepted under the MIT licence in [`LICENSE`](LICENSE).
Contributions of curriculum content to Open Degree are accepted under CC BY-SA 4.0. If you cannot
grant the relevant licence, do not contribute the material.
