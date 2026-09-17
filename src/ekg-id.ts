import { ulid } from 'ulid';
import { z } from 'zod';

/** The six graph entity types (SPEC §3, EKG-SPEC-15): what a domain file carries. */
export const GRAPH_TYPES = ['domain', 'outcome', 'course', 'assessment', 'credential', 'resource'] as const;
/** The six reference entity types of the commons (SPEC §3.9): never in a domain file (EKG-SPEC-115). */
export const REFERENCE_TYPES = ['framework', 'standard', 'institution', 'program', 'offering', 'platform'] as const;
/** Every entity type an `ekgId` may name (EKG-SPEC-15, amended in 0.2.0). */
export const EKG_TYPES = [...GRAPH_TYPES, ...REFERENCE_TYPES] as const;
export type GraphType = (typeof GRAPH_TYPES)[number];
export type ReferenceType = (typeof REFERENCE_TYPES)[number];
export type EkgType = (typeof EKG_TYPES)[number];

/**
 * Crockford base-32, uppercase, 26 characters. The alphabet deliberately excludes
 * I, L, O and U (EKG-SPEC-15).
 */
export const ULID_PATTERN = /^[0-9A-HJKMNP-TV-Z]{26}$/;

/** `ekg:<type>:<ULID>` for any of the twelve types (V-09). */
export const EKG_ID_PATTERN = new RegExp(`^ekg:(${EKG_TYPES.join('|')}):[0-9A-HJKMNP-TV-Z]{26}$`);
/** `ekg:<type>:<ULID>` for a graph entity type only: what a domain file, the changelog and the feed carry. */
export const GRAPH_EKG_ID_PATTERN = new RegExp(`^ekg:(${GRAPH_TYPES.join('|')}):[0-9A-HJKMNP-TV-Z]{26}$`);

/** A stable, global, immutable identifier (SPEC §4.1). */
export type EkgId<T extends EkgType = EkgType> = `ekg:${T}:${string}`;

export function isEkgType(value: unknown): value is EkgType {
  return typeof value === 'string' && (EKG_TYPES as readonly string[]).includes(value);
}

export function isGraphType(value: unknown): value is GraphType {
  return typeof value === 'string' && (GRAPH_TYPES as readonly string[]).includes(value);
}

export function isReferenceType(value: unknown): value is ReferenceType {
  return typeof value === 'string' && (REFERENCE_TYPES as readonly string[]).includes(value);
}

export function isEkgId(value: unknown): value is EkgId {
  return typeof value === 'string' && EKG_ID_PATTERN.test(value);
}

export function isEkgIdOf<T extends EkgType>(type: T, value: unknown): value is EkgId<T> {
  return isEkgId(value) && value.startsWith(`ekg:${type}:`);
}

/** Zod schema for an `ekgId` of one specific type. */
export const ekgId = <T extends EkgType>(type: T) =>
  z
    .string()
    .regex(new RegExp(`^ekg:${type}:[0-9A-HJKMNP-TV-Z]{26}$`), `Expected ekg:${type}:<ULID> (V-09)`);

/** Zod schema for an `ekgId` of any type, graph or reference. */
export const anyEkgId = z.string().regex(EKG_ID_PATTERN, 'Expected ekg:<type>:<ULID> (V-09)');

/** Zod schema for an `ekgId` of a graph entity type: exactly what a 0.1 validator accepted. */
export const graphEkgId = z
  .string()
  .regex(GRAPH_EKG_ID_PATTERN, 'Expected ekg:<type>:<ULID> of a graph entity type (V-09)');

/**
 * Mint a new identifier. Minted exactly once, at node creation, by whichever product
 * creates the node; never reused and never changed afterwards (EKG-SPEC-16).
 *
 * `seedTime` (milliseconds since the epoch) is only for deterministic tests.
 */
export function mintEkgId<T extends EkgType>(type: T, seedTime?: number): EkgId<T> {
  if (!isEkgType(type)) throw new Error(`Unknown EKG type: ${String(type)}`);
  return `ekg:${type}:${ulid(seedTime)}`;
}

/** Split an `ekgId` into its type and ULID. Throws on anything that is not an `ekgId`. */
export function parseEkgId(id: string): { type: EkgType; ulid: string } {
  const match = EKG_ID_PATTERN.exec(id);
  if (!match) throw new Error(`Not an ekgId: ${id}`);
  return { type: match[1] as EkgType, ulid: id.slice(id.lastIndexOf(':') + 1) };
}
