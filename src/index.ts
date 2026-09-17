/**
 * @ecollective/knowledge-graph — the shared model of the eCollective Knowledge Graph.
 *
 * Read `SPEC.md` first. This package is the code side of that contract: Zod schemas for
 * every entity and value object (§3), the `ekgId` helpers (§4), the artifact types (§8),
 * the framework registry (§6.2), resource URL identity (§4.4), audience ratings (§7.4),
 * integrity helpers (§8.5), and the whole-graph validator (§11).
 */

export {
  EKG_ID_PATTERN,
  EKG_TYPES,
  ULID_PATTERN,
  anyEkgId,
  ekgId,
  isEkgId,
  isEkgIdOf,
  isEkgType,
  mintEkgId,
  parseEkgId,
} from './ekg-id.js';
export type { EkgId, EkgType } from './ekg-id.js';

export {
  ASSESSMENT_KINDS,
  AUDIENCE_DESCRIPTORS,
  AUDIENCE_RATINGS,
  COSTS,
  EMBED_POLICIES,
  LEVELS,
  MODALITIES,
  PROVENANCE_SOURCES,
  RELATIONS,
  RESOURCE_KINDS,
  SEMVER_PATTERN,
  SLUG_PATTERN,
  STATUSES,
  alignment,
  artifact,
  artifactResource,
  assessment,
  audience,
  commons,
  course,
  credential,
  domain,
  entity,
  outcome,
  provenance,
  resource,
  semver,
  slug,
  status,
  superseded,
  wikilink,
} from './schema.js';
export type {
  Alignment,
  ArtifactAssessment,
  ArtifactCourse,
  ArtifactCredential,
  ArtifactDomain,
  ArtifactEntity,
  ArtifactNode,
  ArtifactOutcome,
  ArtifactResource,
  Assessment,
  AssessmentKind,
  Audience,
  AudienceDescriptor,
  AudienceRating,
  Cost,
  Course,
  Credential,
  Domain,
  EmbedPolicy,
  Entity,
  Level,
  Modality,
  Outcome,
  Provenance,
  ProvenanceSource,
  Relation,
  Resource,
  ResourceKind,
  Status,
} from './schema.js';

export {
  ARTIFACT_PATHS,
  ARTIFACT_PREFIX,
  ARTIFACT_VERSION,
  CACHE_CONTROL,
  SCHEMA_VERSION,
  changelog,
  changelogDomainCounts,
  changelogEntry,
  checksums,
  domainFile,
  edge,
  manifest,
  manifestDomain,
  sha256Hex as sha256HexSchema,
} from './artifact.js';
export type { Changelog, ChangelogEntry, Checksums, DomainFile, Edge, Manifest } from './artifact.js';

export { sha256Hex, verifyChecksums } from './checksums.js';
export type { ChecksumMismatch } from './checksums.js';

export { FRAMEWORKS, frameworkById, frameworkByName, frameworkByNameLoosely } from './frameworks.js';
export type { Framework } from './frameworks.js';

export { normalizeResourceUrl, sameResourceUrl } from './url.js';

export { validateDomainFile, validateGraph } from './validate.js';
export type {
  DomainFileValidation,
  RefMode,
  Severity,
  ValidateOptions,
  ValidationError,
  ValidationResult,
} from './validate.js';
