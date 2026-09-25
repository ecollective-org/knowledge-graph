# Governance

How the eCollective Knowledge Graph is stewarded. This document governs the **specification and the
package** in this repository. It does not govern curriculum content, which is stewarded by Open
Degree under its own `/standard/governance` page.

Status: **v0.1 draft**, filed 2026-09-05. The roles below are named by function; several are held by
the same person today, and that is stated rather than disguised.

## Roles

### Owner and arbiter

One person, currently the eCollective owner, `jmcwilliam` on GitHub. The arbiter:

- breaks ties when the three products disagree;
- approves or rejects a breaking change when consensus is not reached;
- appoints and removes product maintainers;
- is the only role that can amend this document.

There is no governance body yet. Until one exists, the owner is the arbiter, and this document says
so plainly rather than implying a committee that does not meet. When a body is formed, its charter
replaces this section and the arbiter role becomes an appeal, not a first instance.

The same holds for content: a disagreement between an Open Degree maintainer and a consumer's
curator is arbitrated by the owner, the only arbiter for the moment (`SPEC.md` EKG-OQ-9, decided
2026-09-23). The appeal path is an issue in this repository naming the entities and the two
positions.

### Product maintainers

One named maintainer per consuming product. Each maintainer:

- speaks for their product in a breaking-change decision, and their sign-off is required (§Decisions);
- keeps their product's pinned `@ecollective/knowledge-graph` version current, and says publicly when it is not;
- keeps their product's row in `SPEC.md` §13 (consumer obligations) honest — including reporting a MUST their product does not yet meet;
- registers and operates their product's contribution bot identity (`SPEC.md` §9.3).

| Product | Role | Maintainer | Bot identity |
| --- | --- | --- | --- |
| Open Degree | Publisher and moderator | `jmcwilliam` | — (it is the publisher) |
| DIY Degree | Importer and contributor | `jmcwilliam` | `diy-degree-curation` |
| InstructOS | Mapper | `jmcwilliam` | `instructos-mapping` |
| Open Degree commons (`app.opendegree.org`) | Importer of bundles, publisher of reference data | `jmcwilliam` | `opendegree-commons` |

One person holds every maintainer seat today (decided 2026-09-23, "for now"). A breaking change
therefore has one signatory in practice; the fourteen-day window still applies, because it is
what gives a future maintainer a say.

<<<<<<< HEAD
#### Bot identities (`SPEC.md` §9.3, EKG-SPEC-62)

The registered identities are the ones in the table: `diy-degree-curation`, `instructos-mapping`
and `opendegree-commons`. Each is a GitHub App installed on `ecollective-org/www.opendegree.org`
alone with the permissions `www.opendegree.org/docs/contributor-apps.md` sets out (Contents and
Pull requests read and write, Metadata read, Checks read, nothing else), never a person's token.

`opendegree-commons` is the one identity operated by the publisher itself: the commons service
(`app.opendegree.org`) opens pull requests into the standard for resources written back onto
outcomes and for the nodes, aliases and alignments its review queues accept (OD-PR-01, OD-PR-03,
OD-MOD-05). Being the publisher's does not shorten its path. A proposal from `opendegree-commons`
gets the same §9.4 review and, on rejection, a §9.6 reason from a human Open Degree moderator,
exactly as one from any other consumer; the service never merges its own pull request and never
records itself as a human reviewer (EKG-SPEC-63). The one thing that differs is provenance: the
commons carries the original producer forward (`provenance.source: ai` with the model and prompt,
or `contributor:<handle>` for a person), so a maintainer reviewing the pull request sees who
proposed the content, not only which service relayed it.
=======
`opendegree-commons` is unusual in one way: Open Degree is both the publisher and the operator of
that identity. A proposal it opens is reviewed against `SPEC.md` §9.4 exactly as any other
product's, by a maintainer and never by the bot, and the bot is never a reviewer of record
(EKG-SPEC-63). Operating the identity confers no standing that another product's bot lacks.
>>>>>>> origin/main

### Open Degree moderators

Open Degree's own maintainers. They are the human gate on every change to canonical content, and
the only role that may set `status` to `proposed`, `adopted`, or `deprecated` (`SPEC.md`
EKG-SPEC-27). They review inbound contribution pull requests against the checklist in `SPEC.md`
§9.4, and record a rejection reason from §9.6.

The only moderator, for now, is the owner, `jmcwilliam` (`SPEC.md` EKG-OQ-2, decided 2026-09-23).

The review SLA on an inbound contribution pull request, decided 2026-09-23 and published on Open
Degree's governance page (`/standard/governance`, "Review commitment"):

- a first response within 7 days of the pull request opening;
- a decision within 14 days: merged, changes requested, or rejected with a reason from `SPEC.md`
  §9.6;
- past 14 days with no decision, the proposer may open an issue in this repository naming the
  pull request, and the arbiter decides.

Days are calendar days. It covers pull requests from registered product identities (`SPEC.md`
§9.3) and from people alike, and it is one reviewer's commitment about response time, not about
volume: no consumer should build a throughput plan on upstream review, which is why every consumer
is permitted to serve non-`adopted` content, clearly labelled, and why the commons' fast lane
exists (`SPEC.md` EKG-SPEC-126).

### Specification editor

Maintains this repository: merges accepted changes into `SPEC.md`, assigns `EKG-SPEC-nn` identifiers,
keeps the changelog, and cuts releases. Held by the owner today.

## Decisions

Every change to the specification or the package is one of three kinds. The kind determines who must
sign off, not how large the diff is. The definitions of breaking, additive, and patch are in
`SPEC.md` §12.1 and are normative here.

| Kind | Who signs off | Timeline |
| --- | --- | --- |
| **Breaking** (major) | All three product maintainers **and** the arbiter | 14-day comment window before merge; no exceptions for urgency, because a breaking change that cannot wait 14 days is a bug fix in disguise |
| **Additive** (minor) | The specification editor, plus any one product maintainer | 7-day comment window; a maintainer's objection escalates it to a breaking-change vote |
| **Patch** | The specification editor | Merge on review |

**A breaking change with a missing sign-off does not ship.** If a product maintainer is unreachable
for 30 days, the arbiter may vote in their place, and the record must say that is what happened.

Every decision of consequence is written up as a numbered record in `docs/decisions/`, in the style
of `0001-dedicated-framework-repo.md`: context, decision, rejected alternatives, consequences,
follow-ups. A decision that is not written down did not happen.

**Emergency exception.** A change that removes personal data, closes a licence violation, or fixes a
security defect may be merged immediately by the editor with the arbiter's assent, and is
retroactively documented within 72 hours. Nothing else qualifies.

## Release cadence

- **Specification**: released when there is something to release, not on a calendar. Each release is
  a tagged commit with a changelog entry naming every requirement added, changed, or withdrawn.
- **Package** (`@ecollective/knowledge-graph`, not yet published): semver, published to GitHub
  Packages under the `@ecollective` scope. Consumers pin exact versions (`SPEC.md` EKG-SPEC-82).
- **Deprecation windows**: a field marked deprecated is emitted for two minor releases or 90 days,
  whichever is longer; a superseded artifact major version is published unchanged for 180 days
  (`SPEC.md` §12.2).
- **No release removes a requirement identifier.** A withdrawn requirement is marked withdrawn in
  place, so a citation from another document never dangles.

## How a new consumer joins

Anyone may read the artifact under its licence without asking. Joining as a *governed consumer* —
one whose maintainer signs off on breaking changes and whose bot may open contribution pull requests
— is a deliberate step:

1. Open an issue in this repository stating the product, its role (publisher, importer, contributor,
   mapper), and which obligations in `SPEC.md` §13 it commits to.
2. Publish a conformance statement: which MUSTs are met, which are not yet, and by when. An honest
   "not yet" is acceptable; a false claim is not.
3. Register a bot identity (`SPEC.md` §9.3) and have it approved by the Open Degree moderators.
4. Name a product maintainer, who becomes a sign-off holder from the next release onward.
5. Pin an exact package version and record it in the product's build output.

The arbiter approves or declines. A consumer that stops meeting its obligations, or whose maintainer
goes silent for 90 days, is moved to read-only: its bot's pull-request access is suspended and its
sign-off is no longer required, until it re-joins.

## Conduct

Contributors are expected to be direct, kind, and specific. Disagreement about the model is the
point of the process; personal attacks, harassment, and bad-faith participation are not, and result
in removal by the arbiter.

A formal code of conduct will be adopted alongside Open Degree's when its contributor base grows;
until then, the paragraph above is the whole of it, and the arbiter is where a concern goes. This
repository is public, so its issues are too; report a concern about a person to the arbiter
directly rather than in an issue.
