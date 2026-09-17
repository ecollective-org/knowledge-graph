<!-- Read SPEC.md first. One change per pull request (CONTRIBUTING.md). -->

## What this changes

## Kind of change (`SPEC.md` §12.1, `GOVERNANCE.md` §Decisions)

- [ ] Patch: clarifying prose, fixing an example. Merges on the editor's review.
- [ ] Additive: an optional field, a new entity type, a new artifact file, a warning-level rule.
      The editor plus one product maintainer; seven-day comment window.
- [ ] Breaking: see §12.1. All three product maintainers and the arbiter; fourteen-day window.

## Requirements

Identifiers added or amended (`EKG-SPEC-nn`; assigned by the editor on merge, never renumbered):

Validation rules added (`V-nn`, each with a test that asserts on the rule number):

## What it costs the products

The §13 consumer obligations this moves, and what each product must change:

## Checks

- [ ] `npm run verify` passes
- [ ] Appendix B (`test/fixtures/geometry.json`) still validates with no errors and no warnings
- [ ] Examples come from real Open Degree content; no personal data; no lifecycle token reused
- [ ] `CHANGELOG.md` names every requirement added, amended or withdrawn
